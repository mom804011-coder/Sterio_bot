const { isElite } = require('../haykala/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
    command: 'ارسل',
    description: 'إرسال رسالة لأي رقم عبر واتساب (للنخبة فقط)',
    usage: '.ارسل 966XXXXXXXXX نص الرسالة',

    async execute(sock, msg) {
        const sender = decode(msg.key.participant || msg.key.remoteJid);
        const senderLid = sender.split('@')[0];

        if (!isElite(senderLid)) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ لا تملك صلاحية استخدام هذا الأمر.'
            }, { quoted: msg });
        }

        const body = msg.message?.extendedTextMessage?.text || msg.message?.conversation || '';
        const args = body.trim().split(' ').slice(1);

        if (args.length < 2) {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ استخدم الأمر بالشكل الصحيح:\n.ارسل 966XXXXXXXXX نص الرسالة'
            }, { quoted: msg });
        }

        const number = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        const message = args.slice(1).join(' ');

        try {
            await sock.sendMessage(number, { text: message });
            await sock.sendMessage(msg.key.remoteJid, {
                text: `✅ تم إرسال الرسالة إلى ${args[0]}`
            }, { quoted: msg });
        } catch (error) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ فشل الإرسال: ${error.message || error.toString()}`
            }, { quoted: msg });
        }
    }
};