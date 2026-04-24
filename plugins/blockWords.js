const fs = require('fs');
const path = require('path');
const { isElite } = require('../haykala/elite.js');

// تحديد مسار المجلد والملف
const dataDir = path.join(__dirname, '..', 'data');
const filePath = path.join(dataDir, 'bannedWords.json');

// إنشاء المجلد والملف تلقائيًا إن لم يكونا موجودين
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify([]));

module.exports = {
  command: "حظر",
  description: "يضيف كلمة إلى قائمة الكلمات المحظورة.",
  usage: ".حظر [الكلمة]",

  async execute(sock, msg) {
    try {
      const chatId = msg.key.remoteJid;
      const sender = msg.key.participant || chatId;

      if (!(await isElite(sender))) {
        return await sock.sendMessage(chatId, {
          text: "❌ هذا الأمر مخصص للنخبة فقط!"
        }, { quoted: msg });
      }

      const body = msg.message?.extendedTextMessage?.text || msg.message?.conversation || '';
      const wordToBan = body.replace('.حظر', '').trim();

      if (!wordToBan) {
        return await sock.sendMessage(chatId, {
          text: "❌ يجب أن تكتب الكلمة التي تريد حظرها!"
        }, { quoted: msg });
      }

      let bannedWords = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      if (bannedWords.includes(wordToBan)) {
        return await sock.sendMessage(chatId, {
          text: `⚠️ الكلمة "${wordToBan}" محظورة بالفعل!`
        }, { quoted: msg });
      }

      bannedWords.push(wordToBan);
      fs.writeFileSync(filePath, JSON.stringify(bannedWords, null, 2), 'utf8');

      await sock.sendMessage(chatId, {
        text: `✅ تمت إضافة "${wordToBan}" إلى قائمة الكلمات المحظورة.`
      }, { quoted: msg });

    } catch (error) {
      console.error('✗ خطأ في أمر الحظر:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ حدث خطأ أثناء تنفيذ الأمر:\n\n${error.message || error.toString()}`
      }, { quoted: msg });
    }
  }
};