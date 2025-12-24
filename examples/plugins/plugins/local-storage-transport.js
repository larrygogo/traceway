/**
 * 自定义 Transport: LocalStorage 存储
 * 
 * 将日志事件保存到浏览器的 LocalStorage 中
 * 适合用于：
 * - 离线场景下的日志存储
 * - 调试时的本地日志查看
 * - 小规模的日志持久化
 */

export class LocalStorageTransport {
  constructor(options = {}) {
    this.options = {
      key: options.key || 'traceway_logs',
      maxSize: options.maxSize || 1000,
    };
  }

  send(events) {
    if (typeof localStorage === 'undefined' || !events || events.length === 0) {
      return;
    }

    try {
      // 读取现有日志
      const existing = localStorage.getItem(this.options.key);
      const logs = existing ? JSON.parse(existing) : [];

      // 添加新事件
      logs.push(...events);

      // 限制大小，保留最新的
      if (logs.length > this.options.maxSize) {
        logs.splice(0, logs.length - this.options.maxSize);
      }

      // 保存回存储
      localStorage.setItem(this.options.key, JSON.stringify(logs));
    } catch (error) {
      // 存储空间不足或其他错误，静默失败
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[Traceway] LocalStorage transport failed:', error);
      }
    }
  }

  /**
   * 读取存储的日志（辅助方法）
   */
  getLogs() {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const existing = localStorage.getItem(this.options.key);
      return existing ? JSON.parse(existing) : [];
    } catch {
      return [];
    }
  }

  /**
   * 清空存储的日志（辅助方法）
   */
  clearLogs() {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(this.options.key);
  }
}

