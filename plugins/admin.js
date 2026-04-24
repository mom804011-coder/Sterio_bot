const { isElite } = require('../haykala/elite');

module.exports = {
  command: 'ادمن',
  category: 'admin',
  description: 'ترقية المرسل أو عضو محدد إلى مشرف في المجموعة (حصري للنخبة).',

  async execute(sock, msg, args = []) {
    const chatId = msg.key.remoteJid;

    if (!chatId.endsWith('@g.us')) {
      return sock.sendMessage(chatId, { text: '❌ هذا الأمر يعمل فقط في المجموعات.' }, { quoted: msg });
    }

    const sender = msg.key.participant || msg.participant || msg.key.remoteJid;
    if (!isElite(sender)) {
      return sock.sendMessage(chatId, { text: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.' }, { quoted: msg });
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
    if (isAdmin) {
      return sock.sendMessage(chatId, {
        text: '✅ العضو بالفعل مشرف!',
        mentions: [target]
      }, { quoted: msg });
    }

    try {
      await sock.groupParticipantsUpdate(chatId, [target], 'promote');
      return sock.sendMessage(chatId, {
        text: `✅ تم ترقية @${target.split('@')[0]} إلى مشرف!`,
        mentions: [target]
      }, { quoted: msg });
    } catch (error) {
      return sock.sendMessage(chatId, { text: `❌ فشل الترقية: ${error.message}` }, { quoted: msg });
    }
  }
};