const fs = require('fs');
const path = require('path');
const { isElite } = require('../haykala/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const dataDir = path.join(__dirname, '..', 'data');
const muteFilePath = path.join(dataDir, 'muted.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(muteFilePath)) fs.writeFileSync(muteFilePath, JSON.stringify([]));

const loadMuted = () => {
  try {
    return JSON.parse(fs.readFileSync(muteFilePath));
  } catch (err) {
    console.error("خطأ في تحميل ملف الكتم:", err);
    return [];
  }
};

const saveMuted = (data) => {
  try {
    fs.writeFileSync(muteFilePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("خطأ في حفظ ملف الكتم:", err);
  }
};

const normalizeJid = (jid) => {
  const user = jidDecode(jid)?.user || jid.split('@')[0];
  return `${user}@s.whatsapp.net`;
};

let unwatch = null;

module.exports = {
  command: 'كتم',
  description: 'كتم أو إلغاء كتم عضو (للنخبة فقط)',
  async execute(sock, m) {
    const chatId = m.key.remoteJid;
    const sender = m.key.participant || m.participant;

    if (!isElite(sender)) return;

    const body = m.message?.extendedTextMessage?.text || m.message?.conversation || '';
    const args = body.trim().split(/\s+/).slice(1); // تجاهل الكلمة الأولى ".كتم"
    const action = args[0]?.toLowerCase();

    const context = m.message?.extendedTextMessage?.contextInfo;
    const mentioned = context?.mentionedJid?.[0];
    const replied = context?.participant;
    const target = mentioned || replied;

    const mutedUsers = loadMuted();

    try {
      // حالة الكتم
      if (action === 'حالة') {
        if (mutedUsers.length === 0) {
          return sock.sendMessage(chatId, { text: "ℹ️ لا يوجد أي عضو مكتوم حالياً." }, { quoted: m });
        }
        const list = mutedUsers.map(jid => `- @${jid.split('@')[0]}`).join('\n');
        return sock.sendMessage(chatId, {
          text: `🔇 قائمة المكتومين:\n\n${list}`,
          mentions: mutedUsers
        }, { quoted: m });
      }

      // تحرير الكتم
      if (action === 'تحرير') {
        fs.writeFileSync(muteFilePath, JSON.stringify([]));
        if (unwatch) {
          unwatch();
          unwatch = null;
        }
        return sock.sendMessage(chatId, { text: "✅ تم تحرير جميع المكتومين." }, { quoted: m });
      }

      // فك الكتم
      if (action === 'الغاء') {
        if (!target) {
          return sock.sendMessage(chatId, { text: "❌ لم أتمكن من تحديد الشخص لفك الكتم." }, { quoted: m });
        }

        const normalizedTarget = normalizeJid(target);
        if (!mutedUsers.includes(normalizedTarget)) {
          return sock.sendMessage(chatId, { text: "ℹ️ العضو غير مكتوم أصلاً." }, { quoted: m });
        }

        const updated = mutedUsers.filter(jid => jid !== normalizedTarget);
        saveMuted(updated);

        if (updated.length === 0 && unwatch) {
          unwatch();
          unwatch = null;
        }

        return sock.sendMessage(chatId, { text: "✅ تم إلغاء كتم العضو." }, { quoted: m });
      }

      // كتم عضو
      if (!target) {
        return sock.sendMessage(chatId, {
          text: "❌ استخدم:\n.كتم @منشن أو بالرد\n.كتم الغاء @منشن لإلغاء الكتم\n.كتم حالة\n.كتم تحرير"
        }, { quoted: m });
      }

      const normalizedTarget = normalizeJid(target);

      if (mutedUsers.includes(normalizedTarget)) {
        return sock.sendMessage(chatId, { text: "ℹ️ العضو مكتوم بالفعل." }, { quoted: m });
      }

      mutedUsers.push(normalizedTarget);
      saveMuted(mutedUsers);

      sock.sendMessage(chatId, { text: "🔇 تم كتم العضو." }, { quoted: m });

      if (!unwatch) {
        unwatch = watchMutedMessages(sock);
      }

    } catch (err) {
      console.error("حدث خطأ في تنفيذ الأمر:", err);
    }
  }
};

function watchMutedMessages(sock) {
  const listener = async ({ messages }) => {
    const mutedSet = new Set(loadMuted());

    for (const msg of messages) {
      const chatId = msg.key.remoteJid;
      const sender = msg.key.participant || msg.key.remoteJid;
      const normalizedSender = normalizeJid(sender);

      if (mutedSet.has(normalizedSender)) {
        try {
          await sock.sendMessage(chatId, {
            delete: {
              remoteJid: chatId,
              fromMe: false,
              id: msg.key.id,
              participant: sender
            }
          }).catch((err) => console.error("فشل حذف رسالة المكتوم:", err.message));
        } catch (err) {
          console.error("فشل حذف رسالة المكتوم:", err.message);
        }
      }
    }
  };

  sock.ev.on('messages.upsert', listener);
  return () => sock.ev.off('messages.upsert', listener);
}