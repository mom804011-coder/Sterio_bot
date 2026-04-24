// استيراد الألوان من ملف الإعدادات
const { colors } = require('../config');
const crypto = require('crypto');

// كائن يحتوي على دوال تسجيل الرسائل المختلفة
const logger = {
    // تسجيل رسائل النجاح باللون الأخضر
    success(message) {
        console.log(colors.success + '✓ ' + message + colors.reset);
    },
    
    // تسجيل رسائل الخطأ باللون الأحمر
    error(message, error = '') {
        console.error(colors.error + '✗ ' + message + (error ? ': ' + error : '') + colors.reset);
    },
    
    // تسجيل رسائل المعلومات باللون الأزرق
    info(message) {
        console.info(colors.info + 'ℹ ' + message + colors.reset);
    },
    
    // تسجيل رسائل التحذير باللون الأصفر
    warn(message) {
        console.warn(colors.warn + '⚠ ' + message + colors.reset);
    }
};

// تصدير الكائن logger
module.exports = logger;
