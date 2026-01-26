/**
 * 日志工具模块
 * 提供统一的日志输出格式，包含时间戳和日志等级
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private minLevel: LogLevel;

  constructor() {
    // 从环境变量读取日志等级，默认为 INFO
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    this.minLevel = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
  }

  private formatTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
  }

  private log(level: LogLevel, levelName: string, ...args: any[]): void {
    if (level < this.minLevel) {
      return;
    }

    const timestamp = this.formatTime();
    const prefix = `[${timestamp}] [${levelName}]`;

    // 根据日志等级选择输出方法
    if (level === LogLevel.ERROR) {
      console.error(prefix, ...args);
    } else if (level === LogLevel.WARN) {
      console.warn(prefix, ...args);
    } else {
      console.log(prefix, ...args);
    }
  }

  debug(...args: any[]): void {
    this.log(LogLevel.DEBUG, 'DEBUG', ...args);
  }

  info(...args: any[]): void {
    this.log(LogLevel.INFO, 'INFO', ...args);
  }

  warn(...args: any[]): void {
    this.log(LogLevel.WARN, 'WARN', ...args);
  }

  error(...args: any[]): void {
    this.log(LogLevel.ERROR, 'ERROR', ...args);
  }

  // 设置日志等级
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

// 导出单例
const logger = new Logger();
export default logger;
