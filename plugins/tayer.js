const { isElite } = require('../haykala/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
  command: "طير",
  description: "طرد عضو إذا قام عضو من النخبة بالرد على رسالته أو منشنته.",
  usage: ".طير",

  async execute(sock, msg) {
    try {
      const chatId = msg.key.remoteJid;
      const sender = decode(msg.key.participant || chatId);
      const senderLid = sender.split('@')[0];

      if (!chatId.endsWith('@g.us')) {
        return; 
      }

      if (!(await isElite(senderLid))) {
        
        return await sock.sendMessage(chatId, {
          text: '❌ هذا الأمر مخصص فقط للنخبة!'
        }, { quoted: msg });
      }

      const metadata = await sock.groupMetadata(chatId);
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const reply = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const target = mention || reply;

      if (target && metadata.participants.find(p => p.id === target)) {
        await sock.groupParticipantsUpdate(chatId, [target], 'remove');
      }
    } catch (error) {
      console.error('✗ خطأ في أمر الطير:', error);
    }
  }
};