const { isElite } = require('../haykala/elite');

module.exports = {
  command: 'خفض',
  category: 'admin',
  description: 'إزالة المشرف من المجموعة (حصري للنخبة).',

  async execute(sock, msg, args = []) {
    const chatId = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    if (!isElite(sender)) {
      return sock.sendMessage(chatId, { text: '❌ هذا الأمر مخصص للنخبة فقط.' }, { quoted: msg });
    }

    if (!chatId.endsWith('@g.us')) {
      return sock.sendMessage(chatId, { text: '❌ هذا الأمر يعمل فقط في المجموعات.' }, { quoted: msg });
    }

    const groupMetadata = await sock.groupMetadata(chatId);
    let target;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const contextParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

    if (mentioned?.length) {
      target = mentioned[0];
    } else if (contextParticipant) {
      target = contextParticipant;
    } else if (args[0]) {
      target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    } else {
      target = sender;
    }

    const isMember = groupMetadata.participants.some(p => p.id === target);
    if (!isMember) {
      return sock.sendMessage(chatId, { text: '❌ العضو غير موجود في المجموعة.' }, { quoted: msg });
    }

    const isAdmin = groupMetadata.participants.find(p => p.id === target)?.admin === 'admin';
    if (!isAdmin) {
      return sock.sendMessage(chatId, { text: '❌ العضو ليس مشرفًا بالفعل!' }, { quoted: msg });
    }

    try {
      await sock.groupParticipantsUpdate(chatId, [target], 'demote');
      return sock.sendMessage(chatId, {
        text: `✅ تم إزالة الإشراف عن @${target.split('@')[0]}!`,
        mentions: [target]
      }, { quoted: msg });
    } catch (error) {
      return sock.sendMessage(chatId, { text: `❌ فشل الخفض: ${error.message}` }, { quoted: msg });
    }
  }
};