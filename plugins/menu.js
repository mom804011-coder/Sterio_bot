const { getPlugins } = require('../handlers/plugins.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  status: "on",
  name: 'Bot Commands',
  command: ['اوامر'],
  category: 'tools',
  description: 'قائمة الأوامر بحسب الفئة',
  hidden: false,
  version: '3.0',

  async execute(sock, msg) {
    try {
      const zarfData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'zarf.json')));
      const body = msg.message?.extendedTextMessage?.text || msg.message?.conversation || '';
      const args = body.trim().split(' ').slice(1);
      const plugins = getPlugins();
      const categories = {};

      Object.values(plugins).forEach((plugin) => {
        if (plugin.hidden) return;
        const category = plugin.category?.toLowerCase() || 'others';
        if (!categories[category]) categories[category] = [];

        let commandDisplay = '';
        if (Array.isArray(plugin.command) && plugin.command.length > 1) {
          commandDisplay = `- ${plugin.command.map(cmd => `\`${cmd}\``).join(' - ')}`;
        } else {
          const cmd = Array.isArray(plugin.command) ? plugin.command[0] : plugin.command;
          commandDisplay = `- \`${cmd}\``;
        }

        if (plugin.description) {
          commandDisplay += `\nالوصف: \`\`\`${plugin.description}\`\`\``;
        }

        categories[category].push(commandDisplay + '\n');
      });

      let menu = '┏━❀ *𝐀𝐧𝐚𝐬𝐭𝐚𝐬𝐢𝐚 𝓋𝟹* ❀━┓\n\n';

      if (args.length === 0) {
        // عرض قائمة الفئات فقط
        menu += '╭─── *الفئات المتوفرة:*\n';
        for (const cat of Object.keys(categories)) {
          menu += `│ ◦ \`${cat}\`\n`;
        }
        menu += '╰──────────────\n';
        menu += '\nاكتب `.اوامر [فئة]` لعرض أوامرها.\n';
      } else {
        const requestedCategory = args.join(' ').toLowerCase();
        if (!categories[requestedCategory]) {
          return await sock.sendMessage(msg.key.remoteJid, {
            text: `❌ الفئة *${requestedCategory}* غير موجودة.\nاكتب \`.اوامر\` لعرض الفئات.`
          }, { quoted: msg });
        }

        // عرض أوامر الفئة المحددة
        menu += `╭─❒ *${requestedCategory.toUpperCase()}*\n`;
        menu += categories[requestedCategory].join('\n');
        menu += '╰──\n';
      }

      menu += '\n┗━❀ *𝐀𝐧𝐚𝐬𝐭𝐚𝐬𝐢𝐚* ❀━┛';

      if (zarfData.media?.status === 'on' && zarfData.media.image) {
        const imgPath = path.join(process.cwd(), zarfData.media.image);
        if (fs.existsSync(imgPath)) {
          const imageBuffer = fs.readFileSync(imgPath);
          return await sock.sendMessage(msg.key.remoteJid, {
            image: imageBuffer,
            caption: menu
          }, { quoted: msg });
        }
      }

      await sock.sendMessage(msg.key.remoteJid, { text: menu }, { quoted: msg });

    } catch (error) {
      console.error('❌ Menu Error:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ حدث خطأ أثناء إنشاء القائمة.' }, { quoted: msg });
    }
  }
};