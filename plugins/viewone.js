const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
  command: 'ع',
  category: 'عام',
  description: 'عرض الصور والفيديوهات والصوتيات',

  async execute(sock, msg, args = []) {
    try {
      if (!msg.message) {
        return sock.sendMessage(msg.key.remoteJid, { text: 'لا يمكن العثور على محتوى الرسالة' }, { quoted: msg });
      }

      const messageType = Object.keys(msg.message)[0];
      if (messageType !== 'extendedTextMessage' || !msg.message[messageType]?.contextInfo?.quotedMessage) {
        return sock.sendMessage(msg.key.remoteJid, { text: 'الرجاء الرد على رسالة بكتابة ع' }, { quoted: msg });
      }

      const quotedMessage = msg.message[messageType].contextInfo.quotedMessage;
      let targetMessage = quotedMessage;
      if (quotedMessage.viewOnceMessage) {
        targetMessage = quotedMessage.viewOnceMessage.message;
      }

      const mediaType = Object.keys(targetMessage)[0];
      if (!['imageMessage', 'videoMessage', 'audioMessage'].includes(mediaType)) {
        return sock.sendMessage(msg.key.remoteJid, { text: 'هذه الرسالة ليست صورة أو فيديو أو صوت' }, { quoted: msg });
      }

      const buffer = await downloadMediaMessage(
        {
          message: {
            [mediaType]: targetMessage[mediaType]
          }
        },
        'buffer',
        {},
        { 
          logger: console,
          reuploadRequest: sock.updateMediaMessage
        }
      );

      if (mediaType === 'imageMessage') {
        return sock.sendMessage(msg.key.remoteJid, { 
          image: buffer,
          caption: targetMessage[mediaType].caption || ''
        }, { quoted: msg });
      } else if (mediaType === 'videoMessage') {
        return sock.sendMessage(msg.key.remoteJid, { 
          video: buffer,
          caption: targetMessage[mediaType].caption || ''
        }, { quoted: msg });
      } else if (mediaType === 'audioMessage') {
        return sock.sendMessage(msg.key.remoteJid, { 
          audio: buffer,
          mimetype: 'audio/mp4'
        }, { quoted: msg });
      }

    } catch (error) {
      return sock.sendMessage(msg.key.remoteJid, { 
        text: 'عذراً، حدث خطأ أثناء معالجة الوسائط' 
      }, { quoted: msg });
    }
  }
};