const fs = require('fs');
const { eliteNumbers } = require('../haykala/elite.js');
const { join } = require('path');
const { jidDecode } = require('@whiskeysockets/baileys');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
    command: 'اورا',
    description: 'يطرد 5 أعضاء عشوائيًا مع استثناء النخبة والمشرفين',
    usage: '.اورا',

    async execute(sock, msg) {
        try {
            const groupJid = msg.key.remoteJid;
            const sender = decode(msg.key.participant || groupJid);
            const senderLid = sender.split('@')[0];

            if (!groupJid.endsWith('@g.us'))
                return await sock.sendMessage(groupJid, { text: '❗ هذا الأمر يعمل فقط داخل المجموعات.' }, { quoted: msg });

            if (!eliteNumbers.includes(senderLid))
                return await sock.sendMessage(groupJid, { text: '❗ لا تملك صلاحية استخدام هذا الأمر.' }, { quoted: msg });

            const groupMetadata = await sock.groupMetadata(groupJid);
            const botNumber = decode(sock.user.id);
            const participants = groupMetadata.participants;

            const admins = participants
                .filter(p => p.admin)
                .map(p => decode(p.id).split('@')[0]);

            const protectedSet = new Set([...admins, ...eliteNumbers, botNumber.split('@')[0]]);

            const kickable = participants
                .filter(p => !protectedSet.has(decode(p.id).split('@')[0]))
                .map(p => p.id);

            if (kickable.length < 5)
                return await sock.sendMessage(groupJid, { text: '❗ لا يوجد عدد كافٍ من الأعضاء العاديين (أقل من 5).' }, { quoted: msg });

            const shuffled = kickable.sort(() => 0.5 - Math.random());
            const membersToRemove = shuffled.slice(0, 5);

            await sock.sendMessage(groupJid, { text: '𝑶𝑹𝑨!' });

            for (const member of membersToRemove) {
                try {
                    await sock.groupParticipantsUpdate(groupJid, [member], 'remove');
                    await sleep(500); // تأخير بسيط بين عمليات الطرد
                } catch (err) {
                    console.error(`❌ فشل في طرد ${member}:`, err.message);
                }
            }

            await sock.sendMessage(groupJid, { text: '𝑶𝑹𝑨𝑨𝑨𝑨!!!!' });

        } catch (err) {
            console.error('❌ خطأ أثناء تنفيذ أمر اورا:', err);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ حدث خطأ أثناء تنفيذ أمر اورا:\n\n${err.message || err.toString()}`
            }, { quoted: msg });
        }
    }
};