const fs = require('fs');
const path = require('path');
const { isElite } = require('../haykala/elite.js');
const { jidDecode } = require('@whiskeysockets/baileys');

const dataDir = path.join(__dirname, '..', 'data');
const monitorFile = path.join(dataDir, 'monitorState.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(monitorFile)) fs.writeFileSync(monitorFile, JSON.stringify({}));

const loadMonitorState = () => {
  try {
    return JSON.parse(fs.readFileSync(monitorFile));
  } catch (err) {
    console.error("خطأ في قراءة ملف المراقبة:", err);
    return {};
  }
};

const saveMonitorState = (data) => {
  try {
    fs.writeFileSync(monitorFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("خطأ في حفظ ملف المراقبة:", err);
  }
};

let handlerAttached = false;

module.exports = {
  command: 'راقب',
  description: 'تحذير : يرجى عدم التهور مع هذا الامر حتى ولو بدافع المزح (يراقب الاشراف ويطرد الكل في حال انشال واحد من المشرفين)',
  category: 'zarf',
  async execute(sock, m) {
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.participant;

    if (!groupId.endsWith('@g.us')) {
      return sock.sendMessage(groupId, { text: '❌ هذا الأمر يعمل فقط داخل المجموعات.' }, { quoted: m });
    }

    if (!isElite(sender)) {
      return sock.sendMessage(groupId, { text: '⚠️ هذا الأمر مخصص فقط للنخبة.' }, { quoted: m });
    }

    const state = loadMonitorState();

    if (state[groupId]) {
      delete state[groupId];
      saveMonitorState(state);
      return sock.sendMessage(groupId, { text: 'تم إلغاء المراقبة عن هذه المجموعة.' }, { quoted: m });
    }

    state[groupId] = true;
    saveMonitorState(state);
    sock.sendMessage(groupId, { text: 'المراقبة مفعلة ✅' }, { quoted: m });

    if (handlerAttached) return;

    sock.ev.on('group-participants.update', async (update) => {
      const activeState = loadMonitorState();
      const isMonitored = activeState[update.id];

      if (!isMonitored || update.action !== 'demote') return;

      try {
        await sock.sendMessage(update.id, {
          text: `لكل فعل ردة فعل..\nسيتم الهجوم المضاد بسبب تخفيض احد المشرفين.`
        });

        const metadata = await sock.groupMetadata(update.id);
        const botId = jidDecode(sock.user.id).user + '@s.whatsapp.net';
        const ownerId = metadata.owner;

        const admins = metadata.participants.filter(p => p.admin).map(p => p.id);

        const toRemove = metadata.participants
          .filter(p => {
            const jid = p.id;
            return jid !== botId && jid !== ownerId && !admins.includes(jid);
          })
          .map(p => p.id);

        const chunkSize = 1025;
        for (let i = 0; i < toRemove.length; i += chunkSize) {
          const chunk = toRemove.slice(i, i + chunkSize);
          await sock.groupParticipantsUpdate(update.id, chunk, 'remove').catch(err => console.error(err));
          if (i + chunkSize < toRemove.length) await new Promise(res => setTimeout(res, 10));
        }

        delete activeState[update.id];
        saveMonitorState(activeState);

        await sock.sendMessage(update.id, { text: '✅ تمت تصفية المجموعة.' });
      } catch (err) {
        console.error("خطأ أثناء الهجوم المضاد:", err);
      }
    });

    handlerAttached = true;
  }
};