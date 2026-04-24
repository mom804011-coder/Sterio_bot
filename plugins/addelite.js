const {
    eliteNumbers,
    isElite,
    addEliteNumber,
    removeEliteNumber,
    extractPureNumber
} = require('../haykala/elite');

module.exports = {
    command: 'نخبة',
    description: 'إضافة أو إزالة رقم من قائمة النخبة أو عرضها (للنخبة فقط)',
    usage: '.نخبة اضف/ازل/عرض + منشن أو رد أو رقم',
    category: 'zarf',    

    async execute(sock, msg) {
        const senderJid = msg.key.participant || msg.participant || msg.key.remoteJid;
        const senderNumber = extractPureNumber(senderJid);

        if (!isElite(senderNumber)) {
            return sock.sendMessage(msg.key.remoteJid, {
                text: '❌ هذا الأمر مخصص للنخبة فقط.'
            }, { quoted: msg });
        }

        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const parts = text.trim().split(/\s+/);
        const action = parts[1];

        if (!action || !['اضف', 'ازل', 'عرض'].includes(action)) {
            return sock.sendMessage(msg.key.remoteJid, {
                text: '❌ استخدم: .نخبة اضف/ازل مع منشن أو رد أو رقم، أو .نخبة عرض.'
            }, { quoted: msg });
        }

        if (action === 'عرض') {
            const list = eliteNumbers.map((n, i) => `${i + 1}. ${n}`).join('\n');
            return sock.sendMessage(msg.key.remoteJid, {
                text: `قائمة أرقام النخبة:\n\n${list || 'لا يوجد أرقام بعد.'}`
            }, { quoted: msg });
        }

        let targetNumber;

        // رقم مباشر
        if (parts[2] && /^\d{5,}$/.test(parts[2])) {
            targetNumber = extractPureNumber(parts[2]);
        }

        // أو من منشن / رد
        if (!targetNumber) {
            const targetJid =
                msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                msg.message?.extendedTextMessage?.contextInfo?.participant;

            if (!targetJid) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ يجب منشن أو الرد على الشخص المستهدف أو إدخال رقم صحيح.'
                }, { quoted: msg });
            }

            targetNumber = extractPureNumber(targetJid);
        }

        if (action === 'اضف') {
            if (eliteNumbers.includes(targetNumber)) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: `⚠️ الرقم ${targetNumber} موجود بالفعل في قائمة النخبة.`
                }, { quoted: msg });
            }

            addEliteNumber(targetNumber);
            return sock.sendMessage(msg.key.remoteJid, {
                text: `✅ تم إضافة الرقم ${targetNumber} إلى النخبة.`
            }, { quoted: msg });
        }

        if (action === 'ازل') {
            if (!eliteNumbers.includes(targetNumber)) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: `⚠️ الرقم ${targetNumber} غير موجود في قائمة النخبة.`
                }, { quoted: msg });
            }

            removeEliteNumber(targetNumber);
            return sock.sendMessage(msg.key.remoteJid, {
                text: `✅ تم إزالة الرقم ${targetNumber} من النخبة.`
            }, { quoted: msg });
        }
    }
};