import type {
  Breadcrumb,
  Integration,
  LogEvent,
  LogLevel,
  Logger,
  LoggerOptions,
  Transport,
  User,
} from './types';
import { EventQueue } from './queue';
import { ConsoleTransport } from './transports/console';
import { getOrCreateSessionId, generateTraceId } from './utils/id';
import {
  getTimestamp,
  getLanguage,
  getTimezone,
} from './utils/time';
import { serialize } from './utils/serialize';
import { redactEvent } from './utils/redact';
import { shouldSample, meetsLevel } from './utils/sample';
import type { BaseIntegration } from './integrations/base';
import { getBreadcrumbManager, setBreadcrumbManager, BreadcrumbIntegration } from './integrations/breadcrumbs';

/**
 * Logger 实现类
 */
type InternalOptions = {
  level: LogLevel;
  sampleRate: number;
  errorSampleRate: number;
  flushIntervalMs: number;
  maxBatchSize: number;
  maxQueueSize: number;
  transports?: Transport[];
  integrations?: Integration[];
  beforeSend?: LoggerOptions['beforeSend'];
  redactKeys?: string[];
  redactPatterns?: RegExp[];
  app?: string;
  env?: string;
  release?: string;
};

export class LoggerImpl implements Logger {
  private options: InternalOptions;
  private queue: EventQueue;
  private sessionId: string;
  private user: User | null = null;
  private context: Partial<Pick<LogEvent, 'app' | 'env' | 'release'>> = {};
  private integrations: BaseIntegration[] = [];

  constructor(options: LoggerOptions = {}) {
    // 合并默认配置
    this.options = {
      level: options.level || 'info',
      sampleRate: options.sampleRate ?? 1.0,
      errorSampleRate: options.errorSampleRate ?? 1.0,
      flushIntervalMs: options.flushIntervalMs || 5000,
      maxBatchSize: options.maxBatchSize || 30,
      maxQueueSize: options.maxQueueSize || 500,
      transports: options.transports || [new ConsoleTransport()],
      integrations: options.integrations || [],
      beforeSend: options.beforeSend,
      redactKeys: options.redactKeys,
      redactPatterns: options.redactPatterns,
      app: options.app,
      env: options.env,
      release: options.release,
    };

    // 初始化 sessionId
    this.sessionId = getOrCreateSessionId();

    // 初始化队列
    this.queue = new EventQueue(
      {
        flushIntervalMs: this.options.flushIntervalMs,
        maxBatchSize: this.options.maxBatchSize,
        maxQueueSize: this.options.maxQueueSize,
      },
      this.options.transports || [],
    );

    // 设置上下文
    if (this.options.app) {
      this.context.app = this.options.app;
    }
    if (this.options.env) {
      this.context.env = this.options.env;
    }
    if (this.options.release) {
      this.context.release = this.options.release;
    }

    // 安装 integrations
    this.setupIntegrations();
  }

  /**
   * 安装 integrations
   */
  private setupIntegrations(): void {
    for (const integration of this.options.integrations || []) {
      if (integration.setup) {
        integration.setup(this);
        
        // 如果是 BreadcrumbIntegration，设置为全局管理器
        if (integration instanceof BreadcrumbIntegration) {
          setBreadcrumbManager(integration);
        }
        
        if ('teardown' in integration) {
          this.integrations.push(integration as BaseIntegration);
        }
      }
    }
  }

  /**
   * 创建日志事件
   */
  private createEvent(
    level: LogLevel,
    name: string,
    msg?: string,
    data?: Record<string, unknown>,
  ): LogEvent {
    const event: LogEvent = {
      ts: getTimestamp(),
      level,
      name,
      msg,
      data: data ? serialize(data) as Record<string, unknown> : undefined,
      sessionId: this.sessionId,
      traceId: generateTraceId(),
      user: this.user || undefined,
      ...this.context,
    };

    // 添加浏览器上下文
    if (typeof window !== 'undefined') {
      event.url = window.location.href;
      event.ref = document.referrer || undefined;
      event.ua = navigator.userAgent || undefined;
      event.lang = getLanguage();
      event.tz = getTimezone();
    }

    return event;
  }

  /**
   * 处理事件：采样 → 脱敏 → beforeSend → 入队
   */
  private processEvent(event: LogEvent, breadcrumbs?: Breadcrumb[]): void {
    // 检查级别
    if (!meetsLevel(event.level, this.options.level)) {
      return;
    }

    // 采样
    if (
      !shouldSample(
        event,
        this.options.sampleRate,
        this.options.errorSampleRate,
      )
    ) {
      return;
    }

    // 添加 breadcrumbs（优先使用传入的，否则从管理器获取）
    if (breadcrumbs && breadcrumbs.length > 0) {
      event.breadcrumbs = breadcrumbs;
    } else {
      // error 和关键事件自动附加 breadcrumbs
      if (event.level === 'error' || event.level === 'warn') {
        const manager = getBreadcrumbManager();
        if (manager) {
          const bc = manager.getBreadcrumbs();
          if (bc.length > 0) {
            event.breadcrumbs = bc;
          }
        }
      }
    }

    // 脱敏
    const redacted = redactEvent(
      event,
      this.options.redactKeys,
      this.options.redactPatterns,
    );

    // beforeSend 钩子
    let finalEvent = redacted;
    if (this.options.beforeSend) {
      const result = this.options.beforeSend(finalEvent);
      if (result === null) {
        return; // 被丢弃
      }
      finalEvent = result;
    }

    // 入队
    this.queue.add(finalEvent);
  }

  debug(name: string, msg?: string, data?: Record<string, unknown>): void {
    const event = this.createEvent('debug', name, msg, data);
    this.processEvent(event);
  }

  info(name: string, msg?: string, data?: Record<string, unknown>): void {
    const event = this.createEvent('info', name, msg, data);
    this.processEvent(event);
  }

  warn(name: string, msg?: string, data?: Record<string, unknown>): void {
    const event = this.createEvent('warn', name, msg, data);
    this.processEvent(event);
  }

  error(name: string, msg?: string, data?: Record<string, unknown>): void {
    const event = this.createEvent('error', name, msg, data);
    this.processEvent(event);
  }

  setUser(user: User | null): void {
    this.user = user;
  }

  setContext(ctx: Partial<Pick<LogEvent, 'app' | 'env' | 'release'>>): void {
    this.context = { ...this.context, ...ctx };
  }

  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'ts'>): void {
    const manager = getBreadcrumbManager();
    if (manager) {
      manager.add(breadcrumb.type, breadcrumb.message, breadcrumb.data);
    }
  }

  async flush(): Promise<void> {
    await this.queue.flush();
  }

  async destroy(): Promise<void> {
    // 卸载 integrations
    for (const integration of this.integrations) {
      if (integration.teardown) {
        integration.teardown();
      }
    }

    // 销毁队列
    await this.queue.destroy();
  }
}

/**
 * 创建 Logger 实例
 */
export function createLogger(options?: LoggerOptions): Logger {
  return new LoggerImpl(options);
}

