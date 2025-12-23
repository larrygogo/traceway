import { BaseTransport } from './base';
import type { LogEvent } from '../types';

/**
 * HTTP Transport 配置
 */
export interface HttpTransportOptions {
  /**
   * 上报端点 URL
   */
  url: string;

  /**
   * 请求头
   */
  headers?: Record<string, string>;

  /**
   * 是否启用重试（仅对 error 事件）
   */
  enableRetry?: boolean;
}

/**
 * HTTP Transport
 * 优先使用 navigator.sendBeacon，fallback 到 fetch
 */
export class HttpTransport extends BaseTransport {
  private options: HttpTransportOptions;
  private retryMap = new Map<string, number>(); // event id -> retry count

  constructor(options: HttpTransportOptions) {
    super();
    this.options = {
      enableRetry: true,
      ...options,
    };
  }

  async send(events: LogEvent[]): Promise<void> {
    if (!events || events.length === 0) {
      return;
    }

    try {
      const payload = JSON.stringify(events);
      const success = await this.sendPayload(payload);

      if (!success && this.options.enableRetry) {
        // 只对 error 事件重试
        const errorEvents = events.filter((e) => e.level === 'error');
        if (errorEvents.length > 0) {
          await this.retrySend(errorEvents);
        }
      }
    } catch (error) {
      // 静默失败，避免影响业务
      if (typeof console !== 'undefined' && console.error) {
        console.error('[Traceway] Failed to send events:', error);
      }
    }
  }

  /**
   * 发送 payload
   */
  private async sendPayload(payload: string): Promise<boolean> {
    // 优先使用 sendBeacon
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        const success = navigator.sendBeacon(this.options.url, blob);
        return success;
      } catch (e) {
        // sendBeacon 失败，fallback 到 fetch
      }
    }

    // Fallback 到 fetch
    try {
      const response = await fetch(this.options.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers,
        },
        body: payload,
        keepalive: true, // 页面卸载时也能发送
      });

      return response.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * 重试发送（仅 error 事件）
   */
  private async retrySend(events: LogEvent[]): Promise<void> {
    // 生成事件 ID（使用 traceId 或时间戳）
    const eventId = events[0]?.traceId || String(events[0]?.ts || Date.now());
    const retryCount = this.retryMap.get(eventId) || 0;

    // 最多重试 1 次
    if (retryCount >= 1) {
      this.retryMap.delete(eventId);
      return;
    }

    this.retryMap.set(eventId, retryCount + 1);

    // 延迟重试（200ms）
    await new Promise((resolve) => setTimeout(resolve, 200));

    const payload = JSON.stringify(events);
    await this.sendPayload(payload);

    // 清理重试记录
    setTimeout(() => {
      this.retryMap.delete(eventId);
    }, 5000);
  }
}

