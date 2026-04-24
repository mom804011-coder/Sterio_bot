const fs = require('fs');
const { join } = require('path');
const { eliteNumbers, extractPureNumber } = require('../haykala/elite');
const { addKicked } = require('../haykala/dataUtils');

module.exports = {
  command: 'طرد',
  description: 'طرد كل الأعضاء غير الإداريين من المجموعة',
  category: 'zarf',
  usage: '.طرد',

  async execute(sock, msg) {
    const senderJid = msg.key.participant || msg.participant || msg.key.remoteJid;
    const senderNumber = extractPureNumber(senderJid);

    if (!eliteNumbers.includes(senderNumber)) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: '🚫 هذا الأمر مخصص للنخبة فقط.'
      }, { quoted: msg });
    }

    try {
      const zarfData = JSON.parse(fs.readFileSync(join(process.cwd(), 'zarf.json')));

      await sock.sendMessage(msg.key.remoteJid, {
        react: {
          text: zarfData.reaction || '👢',
          key: msg.key
        }
      }).catch(() => {});

      const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
      const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

      const admins = groupMetadata.participants
        .filter(p => p.admin)
        .map(p => p.id);

      const toRemove = groupMetadata.participants
        .filter(p => !admins.includes(p.id) && p.id !== botJid)
        .map(p => p.id);

      if (toRemove.length > 0) {
        try {
          await sock.groupParticipantsUpdate(msg.key.remoteJid, toRemove, 'remove');

          const kickedNumbers = toRemove.map(id => id.split('@')[0]);
          const totalKicked = addKicked(kickedNumbers);

          await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ تم طرد ${kickedNumbers.length} عضو.\n📦 العدد الإجمالي الفريد للطرد: ${totalKicked}`
          });
        } catch (kickError) {
          console.error('فشل في تنفيذ الطرد:', kickError);
          await sock.sendMessage(msg.key.remoteJid, {
            text: '⚠️ فشل في طرد بعض أو كل الأعضاء.'
          }, { quoted: msg });
        }
      } else {
        await sock.sendMessage(msg.key.remoteJid, {
          text: 'لا يوجد أعضاء يمكن طردهم.'
        });
      }
    } catch (error) {
      console.error('خطأ في أمر الطرد:', error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: '❌ حدث خطأ أثناء محاولة تنفيذ أمر الطرد.'
      }, { quoted: msg });
    }
  }
};