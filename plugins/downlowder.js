const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
    command: 'تحميل',
    description: 'تحميل فيديو أو صوت من يوتيوب، تيك توك، أو إنستغرام.',
    usage: '.تحميل فيديو [الرابط] أو .تحميل صوت [الرابط]',

    async execute(sock, msg, args) {
        try {
            const chatId = msg.key.remoteJid;

            let commandText = msg.message?.extendedTextMessage?.text || '';
            if (commandText && commandText.startsWith('.تحميل')) {
                const commandParts = commandText.split(' ');
                if (commandParts.length < 3) {
                    return await sock.sendMessage(chatId, { text: '❌ الاستخدام: .تحميل [فيديو|صوت] [الرابط]' }, { quoted: msg });
                }
                args = [commandParts[1].toLowerCase(), commandParts.slice(2).join(' ').trim()];
            }

            if (!args || args.length < 2) {
                return await sock.sendMessage(chatId, { text: '❌ الاستخدام: .تحميل [فيديو|صوت] [الرابط]' }, { quoted: msg });
            }

            const [format, url] = [args[0].toLowerCase(), args[1].trim()];
            if (!url.startsWith('http')) {
                return await sock.sendMessage(chatId, { text: '❌ الرابط غير صالح.' }, { quoted: msg });
            }

            const timestamp = Date.now();
            const tempDir = './temp';
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const videoPath = path.join(tempDir, `${timestamp}.mp4`);
            const audioPath = path.join(tempDir, `${timestamp}.mp3`);

            await sock.sendMessage(chatId, { text: '⏳ جاري التحميل...' }, { quoted: msg });

            const cleanupFile = (filePath) => {
                if (fs.existsSync(filePath)) {
                    fs.unlink(filePath, (err) => {
                        if (err) console.error(`❌ فشل في حذف الملف ${filePath}:`, err.message);
                    });
                }
            };

            if (format === 'فيديو') {
                exec(`yt-dlp -f best -o "${videoPath}" "${url}"`, async (errDownload) => {
                    if (errDownload || !fs.existsSync(videoPath)) {
                        console.error('[ERROR] تحميل الفيديو:', errDownload?.message);
                        cleanupFile(videoPath);
                        return await sock.sendMessage(chatId, { text: `❌ فشل تحميل الفيديو.` }, { quoted: msg });
                    }

                    try {
                        await sock.sendMessage(chatId, {
                            video: { url: videoPath },
                            caption: `🎥 *تم تحميل الفيديو*\n🔗 ${url}`,
                        }, { quoted: msg });
                    } catch (sendError) {
                        console.error('❌ خطأ أثناء إرسال الفيديو:', sendError);
                    } finally {
                        cleanupFile(videoPath);
                    }
                });
            } else if (format === 'صوت') {
                exec(`yt-dlp -x --audio-format mp3 -o "${audioPath}" "${url}"`, async (errDownload) => {
                    if (errDownload || !fs.existsSync(audioPath)) {
                        console.error('[ERROR] تحميل الصوت:', errDownload?.message);
                        cleanupFile(audioPath);
                        return await sock.sendMessage(chatId, { text: `❌ فشل تحميل الصوت.` }, { quoted: msg });
                    }

                    try {
                        await sock.sendMessage(chatId, {
                            audio: { url: audioPath },
                            mimetype: 'audio/mpeg',
                        }, { quoted: msg });
                    } catch (sendError) {
                        console.error('❌ خطأ أثناء إرسال الصوت:', sendError);
                    } finally {
                        cleanupFile(audioPath);
                    }
                });
            } else {
                return await sock.sendMessage(chatId, { text: '❌ يجب تحديد نوع التحميل (فيديو أو صوت).' }, { quoted: msg });
            }
        } catch (error) {
            console.error('❌ حدث خطأ أثناء تنفيذ أمر تحميل:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ حدث خطأ أثناء تنفيذ أمر التحميل:\n\n${error.message || error.toString()}`
            }, { quoted: msg });
        }
    }
};