const { jidDecode } = require('@whiskeysockets/baileys');
const { isElite } = require('../haykala/elite.js');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
    command: 'حذف',
    description: '',
    usage: '.حذف',

    async execute(sock, msg) {
        try {
            const chatId = msg.key.remoteJid;
            const sender = decode(msg.key.participant || chatId);
            const senderLid = sender.split('@')[0];

            if (!isElite(senderLid)) {
                return await sock.sendMessage(chatId, {
                    text: '❌ لا تملك صلاحية استخدام هذا الأمر.'
                }, { quoted: msg });
            }

            const quoted = msg.message?.extendedTextMessage?.contextInfo;
            if (!quoted || !quoted.stanzaId || !quoted.participant) {
                return await sock.sendMessage(chatId, {
                    text: '❌ رد على رسالة بـ "حذف" عشان أحذفها للجميع.'
                }, { quoted: msg });
            }

            await sock.sendMessage(chatId, {
                delete: {
                    remoteJid: chatId,
                    fromMe: quoted.participant === decode(sock.user.id),
                    id: quoted.stanzaId,
                    participant: quoted.participant
                }
            });

            await sock.sendMessage(chatId, {
                delete: {
                    remoteJid: chatId,
                    fromMe: msg.key.fromMe,
                    id: msg.key.id,
                    participant: msg.key.participant || chatId
                }
            });

        } catch (err) {
            console.error('❌ فشل حذف الرسالة:', err);
            await sock.sendMessage(chatId, {
                text: '❌ فشل حذف الرسالة. تأكد أني أقدر أحذفها.'
            }, { quoted: msg });
        }
    }
};