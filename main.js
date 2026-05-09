const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const pino = require('pino');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const logger = require('./utils/console');

// الشعار
const asciiArt = `
${chalk.hex('#FFD700')(' ██████╗████████╗███████╗██████╗ ██╗ ██████╗ ')}
${chalk.hex('#FFD700')('██╔════╝╚══██╔══╝██╔════╝██╔══██╗██║██╔═══██╗')}
${chalk.hex('#FFD700')('╚█████╗    ██║   █████╗  ██████╔╝██║██║   ██║')}
${chalk.hex('#FFD700')(' ╚═══██╗   ██║   ██╔══╝  ██╔══██╗██║██║   ██║')}
${chalk.hex('#FFD700')('██████╔╝   ██║   ███████╗██║  ██║██║╚██████╔╝')}
${chalk.hex('#FFD700')('╚═════╝    ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝ ╚═════╝ ')}
`;

async function startBot() {
    try {
        console.clear();
        console.log(asciiArt);
        console.log(chalk.hex('#FFD700').bold('\nWELCOME TO STERIOBOT :\n'));

        // مجلد الجلسة
        const sessionDir = path.join(__dirname, 'session');
        await fs.ensureDir(sessionDir);

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['MacOS', 'Chrome', '1.0.0'],
            logger: pino({ level: 'silent' }),
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true
        });

        // توليد Pairing Code
        if (!sock.authState.creds.registered) {
            console.log(chalk.bold('\n[ SETUP ] Generating pairing code...\n'));

            const phoneNumber = "249119676596";

            try {
                const code = await sock.requestPairingCode(phoneNumber);

                console.log('\n────────── Pairing Information ──────────');
                console.log(`Pairing Code: ${code}`);
                console.log(`Phone Number: ${phoneNumber}`);
                console.log('─────────────────────────────────────────\n');

            } catch (error) {
                console.log("\n[ ERROR ] Failed to get pairing code.\n");
                console.log(error);
                process.exit(1);
            }
        }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'connecting') {
                logger.info('Connecting to WhatsApp...');
            }

            if (connection === 'open') {
                logger.success(`CONNECTED! USER ID: ${sock.user.id}`);

                try {
                    const { addEliteNumber } = require('./haykala/elite');

                    const botNumber = sock.user.id
                        .split(':')[0]
                        .replace(/[^0-9]/g, '');

                    const jid = `${botNumber}@s.whatsapp.net`;

                    const [info] = await sock.onWhatsApp(jid);

                    if (info?.jid && info?.lid) {

                        const lidNumber = info.lid.replace(/[^0-9]/g, '');

                        await addEliteNumber(botNumber);
                        await addEliteNumber(lidNumber);

                        logger.info(`ADDED ${botNumber} AND ${lidNumber} TO ELITE!`);
                    }

                } catch (e) {
                    logger.error('فشل في إضافة رقم الجلسة:', e.message);
                }

                require('./handlers/handler').handleMessagesLoader();
                listenToConsole(sock);
            }

            if (connection === 'close') {

                const isLoggedOut =
                    lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;

                if (isLoggedOut) {

                    logger.error('Logged out.');
                    process.exit(1);

                } else {

                    logger.warn('Connection lost. Reconnecting in 5 seconds...');

                    setTimeout(() => {
                        startBot();
                    }, 5000);
                }
            }
        });

        // استقبال الرسائل
        sock.ev.on('messages.upsert', async (m) => {
            try {

                const { handleMessages } = require('./handlers/handler');
                await handleMessages(sock, m);

            } catch (err) {

                logger.error('Error while handling message:', err);
            }
        });

        // حفظ الجلسة
        sock.ev.on('creds.update', saveCreds);

    } catch (err) {

        logger.error('Startup error:', err);

        setTimeout(() => {
            startBot();
        }, 5000);
    }
}

// أوامر الكونسول
function listenToConsole(sock) {

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('line', () => {
        console.log('[ CMD ] Unknown command.');
    });
}

startBot();
