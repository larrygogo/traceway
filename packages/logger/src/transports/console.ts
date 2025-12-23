import { BaseTransport } from './base';
import type { LogEvent } from '../types';

/**
 * Console Transport
 * 开发环境输出到 console
 */
export class ConsoleTransport extends BaseTransport {
  send(events: LogEvent[]): void {
    if (typeof console === 'undefined') {
      return;
    }

    for (const event of events) {
      const { level, name, msg, data, breadcrumbs } = event;
      const message = `[${level.toUpperCase()}] ${name}${msg ? `: ${msg}` : ''}`;

      const logData: Record<string, unknown> = {
        ...data,
        timestamp: new Date(event.ts).toISOString(),
        url: event.url,
        user: event.user,
        sessionId: event.sessionId,
        traceId: event.traceId,
      };

      if (breadcrumbs && breadcrumbs.length > 0) {
        logData.breadcrumbs = breadcrumbs;
      }

      // 根据级别选择不同的 console 方法
      switch (level) {
        case 'debug':
          console.debug(message, logData);
          break;
        case 'info':
          console.info(message, logData);
          break;
        case 'warn':
          console.warn(message, logData);
          break;
        case 'error':
          console.error(message, logData);
          break;
        default:
          console.log(message, logData);
      }
    }
  }
}

