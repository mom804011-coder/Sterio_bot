const fs = require('fs');
const { join } = require('path');
const { eliteNumbers } = require('../haykala/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
    command: 'مود',
    description: 'تفعيل أو إيقاف وضع النخبة',
    usage: '.مود [on/off]',
    category: 'tools',    

    async execute(sock, msg) {
        try {
            const groupJid = msg.key.remoteJid;
            const sender = decode(msg.key.participant || groupJid);
            const senderLid = sender.split('@')[0];

            if (!eliteNumbers.includes(senderLid))
                return await sock.sendMessage(groupJid, { text: '❗ لا تملك صلاحية استخدام هذا الأمر.' }, { quoted: msg });

            const args = msg.args || [];
            const modePath = join(process.cwd(), 'data', 'mode.txt');

            if (!args[0]) {
                let currentMode = '[off]';
                try {
                    if (fs.existsSync(modePath)) {
                        currentMode = fs.readFileSync(modePath, 'utf8').trim();
                    }
                } catch (err) {
                    console.error('فشل قراءة وضع النخبة:', err.message);
                }

                return await sock.sendMessage(groupJid, {
                    text: `وضع النخبة الحالي هو: ${currentMode}`
                }, { quoted: msg });
            }

            const newMode = args[0].toLowerCase();
            if (!['on', 'off'].includes(newMode)) {
                return await sock.sendMessage(groupJid, {
                    text: '❗ الرجاء استخدام: .مود on أو .مود off'
                }, { quoted: msg });
            }

            fs.writeFileSync(modePath, `[${newMode}]`);
            await sock.sendMessage(groupJid, {
                text: `✅ تم تغيير وضع النخبة إلى: [${newMode}]`
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ خطأ في أمر مود:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ حدث خطأ أثناء تنفيذ الأمر:\n\n${error.message || error.toString()}`
            }, { quoted: msg });
        }
    }
};