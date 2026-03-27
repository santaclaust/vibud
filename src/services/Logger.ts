// 统一日志服务 - 生产环境自动关闭
const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  log: (...args: any[]) => isDev && console.log('[LOG]', ...args),
  warn: (...args: any[]) => isDev && console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERR]', ...args),
  debug: (...args: any[]) => isDev && console.debug('[DBG]', ...args),
};

export default logger;