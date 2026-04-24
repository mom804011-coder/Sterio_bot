const fs = require('fs');
const { eliteNumbers } = require('../haykala/elite.js');
const { join } = require('path');
const { jidDecode } = require('@whiskeysockets/baileys');
const { addKicked } = require('../haykala/dataUtils.js');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

module.exports = {
    command: 'فنش',
    description: 'زرف القروب وتغيير الاسم والوصف والطرد الجماعي',
    usage: '.فنش',
    category: 'zarf',

    async execute(sock, msg) {
        try {
            const groupJid = msg.key.remoteJid;
            const sender = decode(msg.key.participant || groupJid);
            const senderLid = sender.split('@')[0];

            if (!groupJid.endsWith('@g.us'))
                return await sock.sendMessage(groupJid, { text: '❗ هذا الأمر يعمل فقط داخل المجموعات.' }, { quoted: msg });

            if (!eliteNumbers.includes(senderLid))
                return await sock.sendMessage(groupJid, { text: '❗ لا تملك صلاحية استخدام هذا الأمر.' }, { quoted: msg });

            const zarfData = JSON.parse(fs.readFileSync(join(process.cwd(), 'zarf.json')));
            const groupMetadata = await sock.groupMetadata(groupJid);
            const botNumber = decode(sock.user.id);

            const membersToDemote = groupMetadata.participants
                .filter(p => p.admin && p.id !== botNumber && !eliteNumbers.includes(decode(p.id).split('@')[0]))
                .map(p => p.id);

            if (membersToDemote.length > 0) {
                await sock.groupParticipantsUpdate(groupJid, membersToDemote, 'demote').catch(() => {});
            }

            if (zarfData.reaction_status === "on" && zarfData.reaction) {
                await sock.sendMessage(groupJid, {
                    react: { text: zarfData.reaction, key: msg.key }
                }).catch(() => {});
            }

            if (zarfData.group?.status === "on") {
                if (zarfData.group.newSubject)
                    await sock.groupUpdateSubject(groupJid, zarfData.group.newSubject).catch(() => {});
                if (zarfData.group.newDescription)
                    await sock.groupUpdateDescription(groupJid, zarfData.group.newDescription).catch(() => {});
            }

            if (zarfData.media?.status === "on" && zarfData.media.image) {
                const imgPath = join(process.cwd(), zarfData.media.image);
                if (fs.existsSync(imgPath)) {
                    const imageBuffer = fs.readFileSync(imgPath);
                    await sock.updateProfilePicture(groupJid, imageBuffer).catch(() => {});
                }
            }

            if (zarfData.messages?.status === "on") {
                const allParticipants = groupMetadata.participants.map(p => p.id);
                if (zarfData.messages.mention) {
                    await sock.sendMessage(groupJid, {
                        text: zarfData.messages.mention,
                        mentions: allParticipants
                    }).catch(() => {});
                }
                if (zarfData.messages.final) {
                    await sock.sendMessage(groupJid, {
                        text: zarfData.messages.final
                    }).catch(() => {});

                    if (zarfData.audio?.status === "on" && zarfData.audio.file) {
                        const audioPath = join(process.cwd(), zarfData.audio.file);
                        if (fs.existsSync(audioPath)) {
                            const audioBuffer = fs.readFileSync(audioPath);
                            await sock.sendMessage(groupJid, {
                                audio: audioBuffer,
                                mimetype: 'audio/mp4',
                                ptt: true
                            }).catch(() => {});
                        }
                    }
                }
            }

            const toKick = groupMetadata.participants
                .filter(p => p.id !== botNumber && !eliteNumbers.includes(decode(p.id).split('@')[0]))
                .map(p => p.id);

            if (toKick.length > 0) {
                await sleep(10);
                try {
                    await sock.groupParticipantsUpdate(groupJid, toKick, 'remove');
                    addKicked(toKick.map(jid => decode(jid).split('@')[0]));
                } catch (kickErr) {
                    console.error('❌ فشل في طرد الأعضاء:', kickErr);
                    await sock.sendMessage(groupJid, {
                        text: '⚠️ فشل في طرد بعض الأعضاء أو جميعهم.'
                    }, { quoted: msg });
                }
            }

        } catch (error) {
            console.error('❌ خطأ في أمر فنش:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ حدث خطأ أثناء تنفيذ الأمر:\n\n${error.message || error.toString()}`
            }, { quoted: msg });
        }
    }
};