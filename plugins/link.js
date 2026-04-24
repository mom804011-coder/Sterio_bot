const { isElite } = require('../haykala/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

module.exports = {
  command: 'خش',
  description: 'يقوم البوت بالدخول إلى مجموعة عند إرسال رابط دعوة (للنخبة فقط).',
  category: 'tools',
  usage: '.خش <رابط_المجموعة>',
  async execute(sock, m, args) {
    try {
      const chatId = m.key.remoteJid;
      const fullJid = m.key.participant || m.key.remoteJid;
      const decoded = jidDecode(fullJid);
      const senderNumber = decoded?.user || fullJid.split('@')[0];

      if (!isElite(senderNumber)) {
        return await sock.sendMessage(chatId, {
          text: '🚫 هذا الأمر مخصص للنخبة فقط.',
        }, { quoted: m });
      }

      // استخراج الرابط من نص الرسالة بالكامل
      const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
      const regex = /https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/;
      const match = text.match(regex);
      const link = match ? match[0] : null;

      if (!link) {
        return await sock.sendMessage(chatId, {
          text: '❌ لم يتم العثور على رابط مجموعة صالح في الرسالة.',
        }, { quoted: m });
      }

      const inviteCode = link.split('https://chat.whatsapp.com/')[1];

      try {
        const result = await sock.groupAcceptInvite(inviteCode);

        if (result) {
          await sock.sendMessage(chatId, { text: '✅ تم الانضمام إلى المجموعة بنجاح!' }, { quoted: m });
        } else {
          await sock.sendMessage(chatId, { text: '❌ تم ارسال طلب انضمام.' }, { quoted: m });
        }

      } catch (err) {
        console.error('❌ خطأ أثناء محاولة الانضمام:', err);
        await sock.sendMessage(chatId, {
          text: '❌ لم يتمكن البوت من الانضمام. تحقق من صلاحية الرابط أو أعد المحاولة لاحقًا.'
        }, { quoted: m });
      }

    } catch (err) {
      console.error('❌ خطأ عام في أمر خش:', err);
      await sock.sendMessage(m.key.remoteJid, {
        text: '❌ حدث خطأ أثناء تنفيذ الأمر.',
      }, { quoted: m });
    }
  }
};