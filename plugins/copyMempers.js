const { jidDecode } = require('@whiskeysockets/baileys');
const { isElite } = require('../haykala/elite.js');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
    command: 'نسخ',
    description: 'نسخ احتياطي لجهات اتصال أعضاء المجموعة.',
    usage: '.نسخ',
    
    async execute(sock, msg) {
        const groupJid = msg.key.remoteJid;
        const sender = decode(msg.key.participant || groupJid);
        const senderLid = sender.split('@')[0];

        if (!groupJid.endsWith('@g.us')) {
            return sock.sendMessage(groupJid, { text: '❌ هذا الأمر يعمل فقط داخل المجموعات.' }, { quoted: msg });
        }

        if (!isElite(senderLid)) {
            return sock.sendMessage(groupJid, { text: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.' }, { quoted: msg });
        }

        const metadata = await sock.groupMetadata(groupJid);
        const groupName = metadata.subject || 'مجموعة';

        const words = groupName.split(/\s+/).filter(word => !/[\u{1F300}-\u{1FAD6}]/u.test(word));
        const firstWord = words.length > 0 ? words[0] : "مجموعة";
        const emojis = groupName.match(/[\u{1F300}-\u{1FAD6}]/gu) || [];
        const selectedEmoji = emojis.length === 3 ? emojis[1] : emojis[0] || "";

        const participants = metadata.participants;
        if (!participants || participants.length === 0) {
            return sock.sendMessage(groupJid, { text: '❌ لا يوجد أعضاء في المجموعة.' }, { quoted: msg });
        }

        let contacts = [];
        let index = 1;

        for (const participant of participants) {
            const jid = participant.id;
            const phone = jid.split('@')[0];
            const intl = `+${phone}`;
            const displayName = `${firstWord} ${selectedEmoji} ${index}`.trim();

            contacts.push({
                displayName,
                vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${displayName}\nTEL;TYPE=CELL;waid=${phone}:${intl}\nEND:VCARD`
            });

            index++;

            if (contacts.length === 100) {
                await sock.sendMessage(groupJid, {
                    contacts: {
                        displayName: "جهات اتصال المجموعة",
                        contacts: contacts
                    }
                }, { quoted: msg });
                contacts = [];
            }
        }

        if (contacts.length > 0) {
            await sock.sendMessage(groupJid, {
                contacts: {
                    displayName: "جهات اتصال المجموعة",
                    contacts: contacts
                }
            }, { quoted: msg });
        }
    }
};