const fs = require('fs');
const { join } = require('path');
const { jidDecode } = require('@whiskeysockets/baileys');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const decode = jid => (jidDecode(jid)?.user || jid.split('@')[0]) + '@s.whatsapp.net';

const games = {};

class TicTacToe {
    constructor(player1, player2, botLevel = null) {
        this.board = Array(9).fill(null);
        this.players = { '❎': player1, '⭕': player2 };
        this.currentPlayer = '❎';
        this.winner = null;
        this.botLevel = botLevel;
    }

    render() {
        return this.board.map((v, i) => v || (i + 1));
    }

    play(index) {
        if (this.winner || this.board[index] !== null) return false;
        this.board[index] = this.currentPlayer;
        this.checkWinner();
        this.currentPlayer = this.currentPlayer === '❎' ? '⭕' : '❎';
        return true;
    }

    checkWinner() {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (let [a, b, c] of winPatterns) {
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                this.winner = this.board[a];
                return;
            }
        }
        if (this.board.every(cell => cell !== null)) this.winner = "draw";
    }

    getAvailableMoves() {
        return this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);
    }

    botMove() {
        let availableMoves = this.getAvailableMoves();
        if (availableMoves.length === 0 || this.winner) return;

        let move = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        this.play(move);
        return move;
    }
}

module.exports = {
    command: 'اكس',
    description: 'لعبة إكس-أو ضد لاعب أو البوت 🎮',
    usage: '.اكس',
    
    async execute(sock, msg) {
        try {
            const groupJid = msg.key.remoteJid;
            const sender = decode(msg.key.participant || groupJid);
            const senderLid = sender.split('@')[0];

            if (!groupJid.endsWith('@g.us'))
                return await sock.sendMessage(groupJid, { text: '❗ هذا الأمر يعمل فقط داخل المجموعات.' }, { quoted: msg });


            if (msg.message?.conversation?.trim() === 'الغاء' && games[groupJid]) {
                delete games[groupJid];
                return await sock.sendMessage(groupJid, { text: '🚪 تم إنهاء اللعبة!' });
            }

            if (!games[groupJid]) {
                let mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                let botLevelMatch = msg.message?.conversation?.match(/^.اكس بوت (e|n|h)$/i);

                if (botLevelMatch) {
                    let botLevel = botLevelMatch[1].toLowerCase();
                    games[groupJid] = new TicTacToe(sender, "BOT", botLevel);
                    await updateBoard(games[groupJid], sock, groupJid);

                    sock.ev.on('messages.upsert', async ({ messages }) => {
                        const msg = messages[0];
                        if (!msg.message || msg.key.remoteJid !== groupJid) return;

                        const game = games[groupJid];
                        const from = msg.key.participant || msg.key.remoteJid;
                        if (!game || game.winner || from !== game.players[game.currentPlayer]) return;

                        const userResponse = msg.message.conversation?.trim();
                        if (!userResponse || isNaN(userResponse)) return;

                        const move = parseInt(userResponse) - 1;
                        if (move < 0 || move > 8) return;

                        if (!game.play(move)) {
                            await sock.sendMessage(groupJid, { text: "❌ هذا المكان مأخوذ بالفعل!" }, { quoted: msg });
                            return;
                        }

                        await updateBoard(game, sock, groupJid);

                        if (game.winner) {
                            delete games[groupJid];
                            return;
                        }

                        const botPlayed = game.botMove();
                        if (botPlayed !== undefined) {
                            await updateBoard(game, sock, groupJid);
                        }

                        if (game.winner) {
                            delete games[groupJid];
                        }
                    });

                    return;
                }

                if (mentioned.length === 0) {
                    return sock.sendMessage(groupJid, { text: "👥 تحتاج إلى منشن لاعب آخر أو كتابة `.اكس بوت مستوى` لبدء اللعبة!\n\n🔹 *مثال:* `.اكس @player` أو `.اكس بوت h`" });
                }

                let player1 = sender;
                let player2 = mentioned[0];

                if (player1 === player2) return sock.sendMessage(groupJid, { text: "❌ لا يمكنك اللعب ضد نفسك! اختر لاعبًا آخر." });

                games[groupJid] = new TicTacToe(player1, player2);
                await updateBoard(games[groupJid], sock, groupJid);
            }

            sock.ev.on('messages.upsert', async ({ messages }) => {
                const msg = messages[0];
                if (!msg.message || msg.key.remoteJid !== groupJid) return;

                const userResponse = msg.message.conversation?.trim();
                if (!userResponse || isNaN(userResponse)) return;

                let move = parseInt(userResponse) - 1;
                let game = games[groupJid];

                if (!game || game.winner) return;
                if (msg.key.participant !== game.players[game.currentPlayer]) {
                    return sock.sendMessage(groupJid, { text: `⚠️ ليس دورك! انتظر حتى يلعب خصمك.` });
                }

                if (!isNaN(move) && move >= 0 && move < 9) {
                    if (game.play(move)) {
                        await updateBoard(game, sock, groupJid);
                        if (game.winner) {
                            delete games[groupJid];
                        }
                    } else {
                        await sock.sendMessage(groupJid, { text: "❌ حركة غير صالحة! اختر رقمًا متاحًا بين 1-9." });
                    }
                }
            });
        } catch (error) {
            console.error('❌ حدث خطأ أثناء تنفيذ أمر إكس:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ حدث خطأ أثناء تنفيذ أمر إكس:\n\n${error.message || error.toString()}`
            }, { quoted: msg });
        }
    }
};

async function updateBoard(game, sock, groupJid) {
    let arr = game.render().map(v => ({
        '❎': '❎', '⭕': '⭕',
        1: '1️⃣', 2: '2️⃣', 3: '3️⃣',
        4: '4️⃣', 5: '5️⃣', 6: '6️⃣',
        7: '7️⃣', 8: '8️⃣', 9: '9️⃣',
    }[v] || v));

    let winner = game.winner;
    let playerTag = winner ? "" : `👤🌹 *الدور على:* @${game.players[game.currentPlayer].split('@')[0]}`;

    let boardMessage = `
🍓 *لعبة إكس-أو* 🍓

❎ = @${game.players['❎'].split('@')[0]}
⭕ = @${game.players['⭕'].split('@')[0]}

${arr.slice(0, 3).join(' ')}
${arr.slice(3, 6).join(' ')}
${arr.slice(6, 9).join(' ')}

${winner ? `🏆 *الفائز:* ${winner === 'draw' ? 'تعادل!' : `@${game.players[winner].split('@')[0]}`}` : playerTag}
`.trim();

    await sock.sendMessage(groupJid, { text: boardMessage, mentions: Object.values(game.players) });
}