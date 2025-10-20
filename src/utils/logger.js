const config = require('../config');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS[config.logging.level] || LOG_LEVELS.info;
  }

  _log(level, message, data) {
    if (LOG_LEVELS[level] <= this.level) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

      if (data) {
        console.log(logMessage, JSON.stringify(data, null, 2));
      } else {
        console.log(logMessage);
      }
    }
  }

  error(message, data) {
    this._log('error', message, data);
  }

  warn(message, data) {
    this._log('warn', message, data);
  }

  info(message, data) {
    this._log('info', message, data);
  }

  debug(message, data) {
    this._log('debug', message, data);
  }
}

module.exports = new Logger();
