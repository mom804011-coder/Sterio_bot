const { isElite } = require('../haykala/elite.js'); const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = { command: 'kill', async execute(sock, msg) { const sender = decode(msg.key.participant || msg.key.remoteJid); const senderLid = sender.split('@')[0];

if (!isElite(senderLid)) {
        return await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ لا تملك الصلاحية.'
        }, { quoted: msg });
    }

    await sock.sendMessage(msg.key.remoteJid, {
        text: '⛔ جاري ايقاف تشغيل البوت..'
    }, { quoted: msg });

    setTimeout(() => {
        process.exit(0);
    }, 1000);
}

};

