import type { LogEvent, LogLevel, Transport } from './types';
import { getLevelValue } from './utils/sample';

/**
 * 队列配置
 */
export interface QueueOptions {
  /**
   * 批量上报间隔（毫秒）
   */
  flushIntervalMs: number;

  /**
   * 每批最大事件数
   */
  maxBatchSize: number;

  /**
   * 队列最大容量
   */
  maxQueueSize: number;
}

/**
 * 事件队列
 * 支持优先级排序、定时 flush、页面隐藏 flush
 */
export class EventQueue {
  private buffer: LogEvent[] = [];
  private options: QueueOptions;
  private transports: Transport[];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private errorFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  constructor(options: QueueOptions, transports: Transport[]) {
    this.options = options;
    this.transports = transports;

    // 定时 flush
    this.startFlushTimer();

    // 页面隐藏时强制 flush
    this.setupPageHideHandler();
  }

  /**
   * 添加事件到队列
   */
  add(event: LogEvent): void {
    if (this.isDestroyed) {
      return;
    }

    // 队列溢出处理
    if (this.buffer.length >= this.options.maxQueueSize) {
      this.handleOverflow(event);
      return;
    }

    // 插入事件（保持优先级顺序：error > warn > info > debug）
    this.insertEvent(event);

    // Error 事件立即 flush（延迟合并）
    if (event.level === 'error') {
      this.scheduleErrorFlush();
    }
  }

  /**
   * 插入事件（保持优先级顺序）
   */
  private insertEvent(event: LogEvent): void {
    const eventLevel = getLevelValue(event.level);
    let insertIndex = this.buffer.length;

    // 找到第一个优先级小于等于当前事件的索引
    for (let i = 0; i < this.buffer.length; i++) {
      const currentLevel = getLevelValue(this.buffer[i].level);
      if (currentLevel < eventLevel) {
        insertIndex = i;
        break;
      }
    }

    this.buffer.splice(insertIndex, 0, event);
  }

  /**
   * 处理队列溢出
   */
  private handleOverflow(event: LogEvent): void {
    const eventLevel = getLevelValue(event.level);

    // 如果是 error，移除最低优先级的事件
    if (eventLevel >= getLevelValue('warn')) {
      // 移除最后一个（最低优先级）
      this.buffer.pop();
      this.insertEvent(event);
    }
    // 否则直接丢弃
  }

  /**
   * 启动定时 flush
   */
  private startFlushTimer(): void {
    if (this.isDestroyed) {
      return;
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.options.flushIntervalMs);
  }

  /**
   * 调度 error 事件 flush（200ms 延迟合并）
   */
  private scheduleErrorFlush(): void {
    if (this.errorFlushTimer) {
      return; // 已有待执行的 flush
    }

    this.errorFlushTimer = setTimeout(() => {
      this.errorFlushTimer = null;
      this.flush();
    }, 200);
  }

  /**
   * 设置页面隐藏处理
   */
  private setupPageHideHandler(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const flushOnHide = () => {
      this.flush(true); // 强制同步 flush
    };

    // visibilitychange 事件
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushOnHide();
      }
    });

    // pagehide 事件（更可靠）
    window.addEventListener('pagehide', flushOnHide);

    // beforeunload 事件（作为后备）
    window.addEventListener('beforeunload', flushOnHide);
  }

  /**
   * Flush 队列
   */
  async flush(forceSync = false): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    // 取出批量事件
    const batch = this.buffer.splice(0, this.options.maxBatchSize);

    // 发送到所有 transports
    const promises = this.transports.map((transport) => {
      try {
        const result = transport.send(batch);
        return result instanceof Promise ? result : Promise.resolve();
      } catch (error) {
        // 静默失败
        return Promise.resolve();
      }
    });

    if (forceSync) {
      // 强制同步等待（页面卸载时）
      try {
        await Promise.all(promises);
      } catch {
        // 忽略错误
      }
    } else {
      // 异步发送，不阻塞
      Promise.all(promises).catch(() => {
        // 忽略错误
      });
    }
  }

  /**
   * 销毁队列
   */
  destroy(): void {
    this.isDestroyed = true;

    // 清理定时器
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.errorFlushTimer) {
      clearTimeout(this.errorFlushTimer);
      this.errorFlushTimer = null;
    }

    // 最后 flush 一次
    this.flush(true);
  }
}

