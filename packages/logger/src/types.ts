/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Breadcrumb 类型
 */
export type BreadcrumbType = 'ui' | 'nav' | 'http' | 'log' | 'custom';

/**
 * Breadcrumb 数据结构
 */
export interface Breadcrumb {
  ts: number;
  type: BreadcrumbType;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * 用户信息
 */
export interface User {
  id?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * 日志事件结构
 */
export interface LogEvent {
  // 基础字段
  ts: number;
  level: LogLevel;
  name: string;
  msg?: string;
  data?: Record<string, unknown>;

  // 上下文字段
  url?: string;
  ref?: string;
  ua?: string;
  lang?: string;
  tz?: string;

  // 应用字段
  app?: string;
  env?: string;
  release?: string;

  // 身份字段
  sessionId?: string;
  user?: User;

  // 追踪字段
  traceId?: string;

  // Breadcrumbs
  breadcrumbs?: Breadcrumb[];
}

/**
 * Transport 接口
 */
export interface Transport {
  /**
   * 发送日志事件
   */
  send(events: LogEvent[]): void | Promise<void>;
}

/**
 * Integration 接口
 */
export interface Integration {
  /**
   * 安装集成
   */
  setup(logger: Logger): void;

  /**
   * 卸载集成
   */
  teardown?(): void;
}

/**
 * Logger 实例接口
 */
export interface Logger {
  debug(name: string, msg?: string, data?: Record<string, unknown>): void;
  info(name: string, msg?: string, data?: Record<string, unknown>): void;
  warn(name: string, msg?: string, data?: Record<string, unknown>): void;
  error(name: string, msg?: string, data?: Record<string, unknown>): void;

  setUser(user: User | null): void;
  setContext(ctx: Partial<Pick<LogEvent, 'app' | 'env' | 'release'>>): void;
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'ts'>): void;

  flush(): void | Promise<void>;
  destroy(): void;
}

/**
 * Logger 配置选项
 */
export interface LoggerOptions {
  /**
   * 最低日志级别，低于此级别的事件将被忽略
   */
  level?: LogLevel;

  /**
   * 采样率（0-1），非 error 事件的采样率
   */
  sampleRate?: number;

  /**
   * Error 事件的采样率（0-1）
   */
  errorSampleRate?: number;

  /**
   * 批量上报间隔（毫秒）
   */
  flushIntervalMs?: number;

  /**
   * 每批最大事件数
   */
  maxBatchSize?: number;

  /**
   * 队列最大容量，超出后丢弃低优先级事件
   */
  maxQueueSize?: number;

  /**
   * 需要脱敏的字段名列表
   */
  redactKeys?: string[];

  /**
   * 需要脱敏的正则模式列表
   */
  redactPatterns?: RegExp[];

  /**
   * 发送前钩子，可以修改或丢弃事件
   */
  beforeSend?: (event: LogEvent) => LogEvent | null;

  /**
   * Transport 列表
   */
  transports?: Transport[];

  /**
   * Integration 列表
   */
  integrations?: Integration[];

  /**
   * 应用名称
   */
  app?: string;

  /**
   * 环境名称
   */
  env?: string;

  /**
   * 版本号
   */
  release?: string;
}

