
const isProduction = process.env.NODE_ENV === 'production';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: any;
}

const formatError = (error: any) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }
  return error;
};

export const logger = {
  info: (message: string, meta: Record<string, any> = {}) => {
    if (isProduction) {
      const entry: LogEntry = {
        level: 'info',
        message,
        timestamp: new Date().toISOString(),
        ...meta
      };
      console.log(JSON.stringify(entry));
    } else {
      console.log(`ℹ️  [INFO] ${message}`, Object.keys(meta).length ? meta : '');
    }
  },

  warn: (message: string, meta: Record<string, any> = {}) => {
    if (isProduction) {
      const entry: LogEntry = {
        level: 'warn',
        message,
        timestamp: new Date().toISOString(),
        ...meta
      };
      console.log(JSON.stringify(entry));
    } else {
      console.warn(`⚠️  [WARN] ${message}`, Object.keys(meta).length ? meta : '');
    }
  },

  error: (message: string, error?: any, meta: Record<string, any> = {}) => {
    if (isProduction) {
      const entry: LogEntry = {
        level: 'error',
        message,
        timestamp: new Date().toISOString(),
        error: formatError(error),
        ...meta
      };
      console.error(JSON.stringify(entry));
    } else {
      console.error(`❌ [ERROR] ${message}`, error || '', Object.keys(meta).length ? meta : '');
    }
  },

  debug: (message: string, meta: Record<string, any> = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🐛 [DEBUG] ${message}`, Object.keys(meta).length ? meta : '');
    }
    // Debug logs are ignored in production by default
  }
};
