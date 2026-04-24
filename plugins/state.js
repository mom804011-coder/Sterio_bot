const { jidDecode } = require('@whiskeysockets/baileys');

module.exports = {
    command: 'حالة',
    category: 'tools',
    async execute(sock, msg) {
        try {
            const chatId = msg.key.remoteJid;

            const start = Date.now();
            const uptimeSeconds = process.uptime();
            const uptimeFormatted = new Date(uptimeSeconds * 1000).toISOString().substr(11, 8);
            const end = Date.now();
            const ping = end - start;

            const statusMessage = `🟢 *حالة البوت:*\n\n⏳ *السرعة:* ${ping}ms\n⏱️ *المدة:* ${uptimeFormatted}`;
            await sock.sendMessage(chatId, { text: statusMessage });

        } catch (error) {
            console.error('❌ خطأ في كود حالة البوت:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ حدث خطأ أثناء جلب حالة البوت، حاول لاحقًا.' });
        }
    }
};