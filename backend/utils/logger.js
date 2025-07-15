// Simple logger utility to control logging verbosity
const isVerboseLogging = process.env.NODE_ENV === 'development' && process.env.VERBOSE_LOGS === 'true';

class Logger {
    static info(message, data = null) {
        if (isVerboseLogging || data) {
            console.log(`ℹ️  ${message}`, data || '');
        }
    }

    static success(message, data = null) {
        console.log(`✅ ${message}`, data || '');
    }

    static error(message, error = null) {
        console.error(`❌ ${message}`, error || '');
    }

    static warn(message, data = null) {
        console.warn(`⚠️  ${message}`, data || '');
    }

    static debug(message, data = null) {
        if (isVerboseLogging) {
            console.log(`🔍 ${message}`, data || '');
        }
    }

    static call(message, data = null) {
        console.log(`📞 ${message}`, data || '');
    }

    static tts(message, data = null) {
        if (isVerboseLogging) {
            console.log(`🎵 ${message}`, data || '');
        }
    }

    static twilio(message, data = null) {
        if (isVerboseLogging) {
            console.log(`📡 ${message}`, data || '');
        }
    }
}

export default Logger; 