const { jidDecode } = require('@whiskeysockets/baileys');

const decode = jid => (jidDecode(jid)?.user || jid?.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
    command: ['lid'],
    description: '',
    usage: '.lid [منشن | رقم | رد]',
    category: 'tools',

    async execute(sock, msg, args) {
        try {
            const groupJid = msg.key.remoteJid;
            const sender = decode(msg.key.participant || msg.key.remoteJid);
            let targetJid;

            const contextInfo = msg.message?.extendedTextMessage?.contextInfo || {};
            const mentionedJid = contextInfo.mentionedJid;
            const quotedParticipant = contextInfo.participant;

            if (Array.isArray(mentionedJid) && mentionedJid.length > 0) {
                targetJid = mentionedJid[0];
            } else if (args?.[0]) {
                const cleaned = args[0].replace(/\D/g, '');
                if (!cleaned) throw new Error('❌ لم يتم تحديد رقم صحيح.');
                targetJid = `${cleaned}@s.whatsapp.net`;
            } else if (quotedParticipant) {
                targetJid = decode(quotedParticipant);
            } else {
                targetJid = sender;
            }

            const number = targetJid.split('@')[0];

            await sock.sendMessage(groupJid, {
                text: number
            }, { quoted: msg });

        } catch (error) {
            console.error('✗ خطأ في أمر lid:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ حدث خطأ أثناء جلب المعرف:\n${error.message || error.toString()}`
            }, { quoted: msg });
        }
    }
};