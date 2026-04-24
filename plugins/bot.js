const fs = require('fs');
const { join } = require('path');
const { eliteNumbers } = require('../haykala/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
    command: 'bot',
    description: 'تشغيل أو إيقاف البوت مؤقتًا',
    usage: '.bot [on/off]',
    category: 'tools',

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;
        const sender = decode(msg.key.participant || jid);
        const senderLid = sender.split('@')[0];


        if (!eliteNumbers.includes(senderLid)) {
            return await sock.sendMessage(jid, {
                text: '❗ لا تملك صلاحية استخدام هذا الأمر.'
            }, { quoted: msg });
        }

        const args = msg.args || [];
        const botPath = join(__dirname, '../data', 'bot.txt');


        if (!args[0]) {
            let current = '[on]';
            try {
                if (fs.existsSync(botPath)) {
                    current = fs.readFileSync(botPath, 'utf8').trim();
                }
            } catch (err) {
                console.error('فشل قراءة حالة البوت:', err.message);
            }

            return await sock.sendMessage(jid, {
                text: `حالة البوت الحالية: ${current}`
            }, { quoted: msg });
        }


        const action = args[0].toLowerCase();
        if (!['on', 'off'].includes(action)) {
            return await sock.sendMessage(jid, {
                text: '❗ استخدم: .bot on أو .bot off'
            }, { quoted: msg });
        }

        try {
            fs.writeFileSync(botPath, `[${action}]`);
            await sock.sendMessage(jid, {
                text: action === 'on' ? '✅ تم تشغيل البوت' : '⛔ تم إيقاف البوت'
            }, { quoted: msg });
        } catch (err) {
            await sock.sendMessage(jid, {
                text: 'حدث خطأ أثناء تحديث حالة البوت.'
            }, { quoted: msg });
        }
    }
};