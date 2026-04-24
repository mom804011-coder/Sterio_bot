const { jidDecode } = require('@whiskeysockets/baileys');
const { getUniqueKicked } = require('../haykala/dataUtils');

const decode = jid => (jidDecode(jid)?.user || jid?.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
  command: ['هل'],
  description: 'يتحقق مما إذا تم زرف الشخص سابقًا',
  usage: '.هل [منشن | رقم | رد]',
  category: 'zarf',

  async execute(sock, msg, args) {
    try {
      const groupJid = msg.key.remoteJid;
      const sender = decode(msg.key.participant || msg.key.remoteJid);
      let targetJid;
      let showNumber = false;

      const contextInfo = msg.message?.extendedTextMessage?.contextInfo || {};
      const mentionedJid = contextInfo.mentionedJid;
      const quotedParticipant = contextInfo.participant;

      if (Array.isArray(mentionedJid) && mentionedJid.length > 0) {
        targetJid = mentionedJid[0];
      } else if (args?.[0]) {
        const cleaned = args[0].replace(/\D/g, '');
        if (!cleaned) throw new Error('❌ لم يتم تحديد رقم صحيح.');
        targetJid = `${cleaned}@s.whatsapp.net`;
        showNumber = true;
      } else if (quotedParticipant) {
        targetJid = decode(quotedParticipant);
      } else {
        targetJid = sender;
      }

      const number = parseInt(targetJid.split('@')[0], 10);
      const kickedSet = getUniqueKicked();

      const isKicked = kickedSet.has(number);
      const response = showNumber
        ? (isKicked
            ? `✅ الرقم (${number}) تم زرفه مسبقًا.`
            : `❌ الرقم (${number}) لم يتم زرفه من قبل.`)
        : (isKicked
            ? '✅ نعم، تم زرفه'
            : '❌ لا، لم يتم زرفه');

      await sock.sendMessage(groupJid, {
        text: response
      }, { quoted: msg });

    } catch (error) {
      console.error('✗ خطأ في أمر هل:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ حدث خطأ أثناء تنفيذ الأمر:\n${error.message || error.toString()}`
      }, { quoted: msg });
    }
  }
};