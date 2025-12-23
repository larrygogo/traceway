import type { LogEvent, Transport } from '../types';

/**
 * Transport 基类
 */
export abstract class BaseTransport implements Transport {
  /**
   * 发送日志事件
   */
  abstract send(events: LogEvent[]): void | Promise<void>;
}

