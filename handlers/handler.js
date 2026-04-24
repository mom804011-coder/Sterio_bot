const { loadPlugins } = require('./plugins');
const config = require('../config');
const logger = require('../utils/console');
const fs = require('fs-extra');
const path = require('path');
const { isElite } = require('../haykala/elite');
const { playSound } = require('../main');

const commands = new Map();

function cmd(options = {}) {
    if (!options.name || !options.exec) {
        throw new Error('يجب تحديد اسم الأمر ودالة التنفيذ');
    }

    commands.set(options.name.toLowerCase(), {
        name: options.name,
        exec: options.exec,
        description: options.description || '',
        usage: options.usage || '',
        category: options.category || 'عام',
        cooldown: options.cooldown || 0,
        owner: options.owner || false,
        group: options.group || false,
    });

    logger.info(`تم تسجيل الأمر: ${options.name}`);
}

async function handleMessages(sock, { messages }) {
    let message;
    try {
        message = messages[0];
        if (!message) return;

        const body = message.message?.conversation ||
                     message.message?.extendedTextMessage?.text ||
                     message.message?.imageMessage?.caption ||
                     message.message?.videoMessage?.caption || '';

        if (!body) return;

        const currentPrefix = config.prefix;
        if (!body.toLowerCase().startsWith(currentPrefix.toLowerCase())) return;

        const parts = body.slice(currentPrefix.length).trim().split(/\s+/);
        const command = parts[0]?.toLowerCase();
        const args = parts.slice(1);
        if (!command) return;

        const commandWithoutPrefix = command.replace(currentPrefix, '');
        logger.info(`تم استلام أمر: ${commandWithoutPrefix} من: ${message.key.remoteJid}`);

        const botPath = path.join(__dirname, '../data/bot.txt');
        let botStatus = '[on]';
        try {
            if (fs.existsSync(botPath)) {
                botStatus = fs.readFileSync(botPath, 'utf8').trim();
            }
        } catch (err) {
            logger.warn('تعذر قراءة ملف bot.txt:', err.message);
        }

      
        if (botStatus === '[off]' && commandWithoutPrefix !== 'bot') {
            logger.warn(`البوت موقوف. تجاهل الأمر: ${commandWithoutPrefix}`);
            return;
        }

        
        let senderNumber;
        if (message.key.remoteJid.endsWith('@g.us')) {
            senderNumber = message.key.participant?.split('@')[0] || '';
        } else {
            senderNumber = message.key.remoteJid.split('@')[0];
        }

        // التحقق من وضع النخبة
        const modePath = path.join(__dirname, '../data/mode.txt');
        let eliteMode = false;
        try {
            if (fs.existsSync(modePath)) {
                const modeValue = fs.readFileSync(modePath, 'utf8').trim();
                eliteMode = modeValue === '[on]';
            }
        } catch (err) {
            logger.warn('تعذر قراءة ملف mode.txt:', err.message);
        }

        if (eliteMode && !isElite(senderNumber)) {
            logger.warn(`تجاهل من غير النخبة: ${senderNumber}`);
            return;
        }

        const plugins = await loadPlugins();
        const handler = plugins[commandWithoutPrefix];
        if (!handler) {
            logger.warn(`أمر غير معروف: ${commandWithoutPrefix}`);
            return;
        }

        message.args = args;
        message.command = command;
        message.prefix = currentPrefix;

        if (handler.elite && !config.owners.includes(senderNumber)) {
            logger.warn(`محاولة أمر نخبة من غير مصرح: ${senderNumber}`);
            await sock.sendMessage(message.key.remoteJid, {
                text: config.messages.ownerOnly
            });
            return;
        }

        if (handler.group && !message.key.remoteJid.endsWith('@g.us')) {
            await sock.sendMessage(message.key.remoteJid, {
                text: config.messages.groupOnly
            });
            return;
        }

        if (typeof handler === 'function') {
            await handler(sock, message);
        } else if (typeof handler.execute === 'function') {
            await handler.execute(sock, message);
        } else {
            throw new Error('المعالج غير صالح: لا توجد دالة execute');
        }

        logger.success(`تم تنفيذ الأمر: ${command}`);
    } catch (error) {
        logger.error(`✗ خطأ في معالجة الرسالة: ${error.stack}`);
        playSound('ERROR');
        if (message?.key?.remoteJid) {
            await sock.sendMessage(message.key.remoteJid, {
                text: config.messages.error
            }).catch(() => {});
        }
    }
}

async function handleCommand(sock, msg, command, args) {
    const cmd = commands.get(command.toLowerCase());
    if (!cmd) return;

    try {
        if (cmd.owner && !config.owners.includes(msg.sender)) {
            return msg.reply(config.messages.ownerOnly);
        }

        if (cmd.group && !msg.isGroup) {
            return msg.reply(config.messages.groupOnly);
        }

        if (msg.isGroup && config.allowedGroups.length > 0 && !config.allowedGroups.includes(msg.chat)) {
            return msg.reply(config.messages.notAllowedGroup);
        }

        await cmd.exec(sock, msg, args);
    } catch (error) {
        logger.error(`✗ خطأ في تنفيذ الأمر ${command}:`, error);
        playSound('ERROR');
        msg.reply(config.messages.error);
    }
}

function createPluginHandler(options = {}) {
    const pluginHandler = options.execute || (() => {});
    pluginHandler.elite = options.elite || false;
    pluginHandler.group = options.group || false;
    pluginHandler.desc = options.desc || 'لا يوجد وصف';
    pluginHandler.command = options.command || 'لا يوجد أمر محدد';
    pluginHandler.usage = options.usage || 'لا توجد معلومات استخدام';
    return pluginHandler;
}

function handleMessagesLoader() {
    logger.info("تم تهيئة نظام الرسائل بنجاح.");
}

module.exports = {
    handleMessages,
    handleCommand,
    cmd,
    commands,
    createPluginHandler,
    handleMessagesLoader
};