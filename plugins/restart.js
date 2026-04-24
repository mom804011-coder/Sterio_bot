const { isElite } = require('../haykala/elite');
const { jidDecode } = require('@whiskeysockets/baileys');
const chalk = require('chalk');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
  command: 'ريستارت',
  description: 'إعادة تشغيل البوت (خاص بالنخبة فقط)',

  async execute(sock, msg) {
    try {
      const chatId = msg.key.remoteJid;
      const sender = decode(msg.key.participant || msg.participant || chatId);
      const senderLid = sender.split('@')[0];

      if (!(await isElite(senderLid))) {
        return await sock.sendMessage(chatId, {
          text: '🚫 عذراً، هذا الأمر متاح فقط للنخبة.'
        }, { quoted: msg });
      }

      await sock.sendMessage(chatId, {
        text: '🔄 جاري إعادة تشغيل البوت...'
      }, { quoted: msg });

      console.log(
        '\n' + chalk.bgYellow.black.bold('[ System ]'),
        '🔄',
        chalk.bgHex('#FFD700').black(' Bot restart initiated by elite member')
      );

      process.send?.('reset'); // For PM2 or process manager
      process.exit();

    } catch (error) {
      console.error('❌ خطأ أثناء إعادة التشغيل:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ حدث خطأ أثناء تنفيذ الأمر.'
      }, { quoted: msg });
    }
  }
};