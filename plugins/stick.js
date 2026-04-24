const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: 'ملصق',
  async execute(sock, m) {
    try {
      const contextInfo = m.message?.extendedTextMessage?.contextInfo;
      
      if (!contextInfo || !contextInfo.quotedMessage || !contextInfo.quotedMessage.imageMessage) {
        return await sock.sendMessage(m.key.remoteJid, { 
          text: '⚠️ يرجى الرد على صورة لتحويلها إلى ستيكر.' 
        }, { quoted: m });
      }

      const quotedMsg = contextInfo.quotedMessage.imageMessage;
      const stream = await downloadContentFromMessage(quotedMsg, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      if (!buffer.length) {
        return await sock.sendMessage(m.key.remoteJid, { 
          text: '⚠️ فشل تحميل الصورة، حاول مجددًا.' 
        }, { quoted: m });
      }

      const inputPath = path.join(process.cwd(), 'temp-input.jpg');
      const outputPath = path.join(process.cwd(), 'temp-output.webp');

      fs.writeFileSync(inputPath, buffer);

      exec(`ffmpeg -i ${inputPath} -vf "scale=512:512:force_original_aspect_ratio=decrease" -c:v libwebp -preset default -quality 100 -compression_level 6 -qscale 50 ${outputPath}`, async (error) => {
        if (error) {
          console.error('FFmpeg error:', error);
          return await sock.sendMessage(m.key.remoteJid, { 
            text: '❌ حدث خطأ أثناء تحويل الصورة.' 
          }, { quoted: m });
        }

        try {
          const webpBuffer = fs.readFileSync(outputPath);
          await sock.sendMessage(m.key.remoteJid, { 
            sticker: webpBuffer 
          }, { quoted: m });
        } catch (sendError) {
          console.error('Send error:', sendError);
          await sock.sendMessage(m.key.remoteJid, { 
            text: '❌ حدث خطأ أثناء إرسال الملصق.' 
          }, { quoted: m });
        }

        try {
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      });

    } catch (error) {
      await sock.sendMessage(m.key.remoteJid, { 
        text: '❌ حدث خطأ أثناء معالجة الصورة، حاول مجددًا.' 
      }, { quoted: m });
    }
  }
};