const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/console');
const config = require('../config');

let loadedPlugins = {};

function startsWithPrefix(text) {
    return text.startsWith(config.prefix);
}

async function loadPlugins() {
    try {
        const pluginsDir = path.join(__dirname, '../plugins');
        await fs.ensureDir(pluginsDir);
        const files = await fs.readdir(pluginsDir);
        const pluginFiles = files.filter(file => file.endsWith('.js'));
        for (const file of pluginFiles) {
            const pluginPath = path.join(pluginsDir, file);
            delete require.cache[require.resolve(pluginPath)];
        }
        loadedPlugins = {};
        for (const file of pluginFiles) {
            try {
                const pluginPath = path.join(pluginsDir, file);
                const plugin = require(pluginPath);
                if (plugin && typeof plugin.execute === 'function') {
                    if (!plugin.command) {
                        logger.warn(`تم تجاهل ${file}: لا يوجد اسم أمر`);
                        continue;
                    }
                    loadedPlugins[plugin.command] = plugin;
                    logger.info(`تم تحميل الإضافة: ${plugin.command}`);
                } else {
                    logger.warn(`تم تجاهل ${file}: لا توجد دالة تنفيذ`);
                }
            } catch (error) {
                logger.error(`فشل تحميل الإضافة ${file}:`, error);
            }
        }
        return loadedPlugins;
    } catch (error) {
        logger.error('فشل في تحميل الإضافات:', error);
        return {};
    }
}

module.exports = {
    loadPlugins,
    getPlugins: () => loadedPlugins
};