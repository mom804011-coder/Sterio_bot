const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { isElite } = require('../haykala/elite.js');

module.exports = {
    command: 'icon',
    description: 'تغيير صورة الجروب، متاح فقط للنخبة.',
    usage: '.icon (أرسل صورة أو رد على صورة)',
    
    async execute(sock, msg) {
        try {
            const chatId = msg.key.remoteJid;
            const senderId = msg.key.participant || msg.key.remoteJid;

            if (!isElite(senderId)) {
                return sock.sendMessage(chatId, {
                    text: '❌ هذا الأمر متاح فقط لأعضاء النخبة!'
                }, { quoted: msg });
            }

            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const imageMessage = quoted?.imageMessage || msg.message?.imageMessage;

            if (!imageMessage) {
                return sock.sendMessage(chatId, {
                    text: '❌ يرجى إرسال صورة أو الرد على صورة لتغيير صورة المجموعة.'
                }, { quoted: msg });
            }

            const buffer = await downloadMediaMessage(
                { message: { imageMessage } },
                'buffer',
                {}
            );

            const tempDir = '/sdcard/.bot/bot/temp';
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const inputPath = path.join(tempDir, 'group_profile.webp');
            const outputPath = path.join(tempDir, 'group_profile.jpg');
            fs.writeFileSync(inputPath, buffer);

            exec(`gm convert ${inputPath} ${outputPath}`, async (err) => {
                if (err) {
                    console.error('❌ خطأ في تحويل الصورة:', err);
                    return sock.sendMessage(chatId, {
                        text: '❌ فشل في تحويل الصورة، تأكد من تثبيت GraphicsMagick.'
                    }, { quoted: msg });
                }

                await sock.updateProfilePicture(chatId, { url: outputPath }).catch(() => {});

                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);

                await sock.sendMessage(chatId, {
                    text: '✅ تم تغيير صورة المجموعة بنجاح.'
                }, { quoted: msg });
            });

        } catch (error) {
            console.error('❌ حدث خطأ أثناء تغيير صورة الجروب:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ حدث خطأ أثناء تغيير صورة المجموعة، حاول مرة أخرى لاحقاً.'
            }, { quoted: msg });
        }
    }
};