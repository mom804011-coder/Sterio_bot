
module.exports = {
    command: 'تست',
    description: 'اختبار البوت',
    usage: '.test',
    category: 'tools',    
    
    async execute(sock, msg) {
        try {
            const decoratedText = `*𝐳𝐚𝐜𝐡 𝐛𝐨𝐭 𝐢𝐬 𝐰𝐨𝐫𝐤𝐢𝐧𝐠 𝐧𝐨𝐰*`;
            await sock.sendMessage(msg.key.remoteJid, {
                text: decoratedText,
                mentions: [msg.sender]
            }, { quoted: msg });
        } catch (error) {
            console.error('❌', 'Error executing test:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: responses.error.general(error.message || error.toString())
            }, { quoted: msg });
        }
    }
};