import { BaseIntegration } from './base';
import type { Logger } from '../types';
import { getBreadcrumbManager } from './breadcrumbs';
import { serialize } from '../utils/serialize';
import { redactEvent } from '../utils/redact';

/**
 * HTTP 集成配置
 */
export interface HttpIntegrationOptions {
  /**
   * 是否启用 fetch 拦截
   */
  enableFetch?: boolean;

  /**
   * 是否启用 XHR 拦截
   */
  enableXHR?: boolean;

  /**
   * 需要脱敏的字段
   */
  redactKeys?: string[];
}

/**
 * HTTP 集成
 * 拦截 fetch 和 XMLHttpRequest，记录请求信息
 */
export class HttpIntegration extends BaseIntegration {
  private options: Required<HttpIntegrationOptions>;
  private originalFetch: typeof fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;
  private isSetup = false;

  constructor(options: HttpIntegrationOptions = {}) {
    super();
    this.options = {
      enableFetch: options.enableFetch ?? true,
      enableXHR: options.enableXHR ?? true,
      redactKeys: options.redactKeys || [],
    };
  }

  setup(_logger: Logger): void {
    if (this.isSetup || typeof window === 'undefined') {
      return;
    }

    this.isSetup = true;

    if (this.options.enableFetch) {
      this.setupFetchInterceptor();
    }

    if (this.options.enableXHR) {
      this.setupXHRInterceptor();
    }
  }

  /**
   * 设置 fetch 拦截器
   */
  private setupFetchInterceptor(): void {
    this.originalFetch = window.fetch;
    const self = this;

    window.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || 'GET';
      const startTime = Date.now();

      try {
        const response = await self.originalFetch!.call(window, input, init);
        const duration = Date.now() - startTime;

        self.handleHttpRequest({
          method,
          url,
          status: response.status,
          statusText: response.statusText,
          duration,
          requestBody: init?.body ? self.summarizeBody(init.body) : undefined,
        });

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        self.handleHttpRequest({
          method,
          url,
          status: 0,
          statusText: 'Network Error',
          duration,
          error: String(error),
        });
        throw error;
      }
    };
  }

  /**
   * 设置 XHR 拦截器
   */
  private setupXHRInterceptor(): void {
    const self = this;
    const XHR = window.XMLHttpRequest;

    this.originalXHROpen = XHR.prototype.open;
    this.originalXHRSend = XHR.prototype.send;

    XHR.prototype.open = function (
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ) {
      (this as unknown as { __traceway_method: string; __traceway_url: string }).__traceway_method = method;
      (this as unknown as { __traceway_url: string }).__traceway_url = typeof url === 'string' ? url : url.href;
      return self.originalXHROpen!.apply(this, [method, url, ...rest] as Parameters<typeof XHR.prototype.open>);
    };

    XHR.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      const xhr = this as unknown as XMLHttpRequest & {
        __traceway_method: string;
        __traceway_url: string;
        __traceway_startTime: number;
      };

      const method = xhr.__traceway_method || 'GET';
      const url = xhr.__traceway_url || '';
      xhr.__traceway_startTime = Date.now();

      // 监听状态变化
      xhr.addEventListener('loadend', () => {
        const duration = Date.now() - xhr.__traceway_startTime;
        self.handleHttpRequest({
          method,
          url,
          status: xhr.status,
          statusText: xhr.statusText,
          duration,
          requestBody: body ? self.summarizeBody(body) : undefined,
        });
      });

      return self.originalXHRSend!.apply(this, [body]);
    };
  }

  /**
   * 处理 HTTP 请求
   */
  private handleHttpRequest(info: {
    method: string;
    url: string;
    status: number;
    statusText: string;
    duration: number;
    requestBody?: unknown;
    error?: string;
  }): void {
    const manager = getBreadcrumbManager();
    if (!manager) {
      return;
    }

    const { method, url, status, statusText, duration, requestBody, error } = info;

    // 构建数据（脱敏）
    const data: Record<string, unknown> = {
      method,
      url: this.sanitizeUrl(url),
      status,
      statusText,
      duration,
    };

    if (requestBody) {
      data.requestBody = requestBody;
    }

    if (error) {
      data.error = error;
    }

    // 脱敏处理
    const redacted = redactEvent(
      { data } as any,
      this.options.redactKeys,
      [],
    );

    manager.add('http', `${method} ${this.sanitizeUrl(url)} ${status}`, redacted.data);
  }

  /**
   * 摘要请求体（避免记录完整内容）
   */
  private summarizeBody(body: unknown): unknown {
    if (typeof body === 'string') {
      // 限制长度
      return body.length > 200 ? body.substring(0, 200) + '...[truncated]' : body;
    }

    if (body instanceof FormData) {
      return '[FormData]';
    }

    if (body instanceof Blob) {
      return `[Blob: ${body.type}, ${body.size} bytes]`;
    }

    if (body instanceof ArrayBuffer) {
      return `[ArrayBuffer: ${body.byteLength} bytes]`;
    }

    // 尝试序列化
    try {
      const serialized = serialize(body);
      if (typeof serialized === 'string' && serialized.length > 200) {
        return serialized.substring(0, 200) + '...[truncated]';
      }
      return serialized;
    } catch {
      return '[Unable to serialize]';
    }
  }

  /**
   * 清理 URL（移除敏感信息）
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, window.location.origin);
      // 移除可能的 token 参数
      const sensitiveParams = ['token', 'auth', 'key', 'password', 'secret'];
      sensitiveParams.forEach((param) => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      });
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  teardown(): void {
    if (!this.isSetup || typeof window === 'undefined') {
      return;
    }

    // 恢复原始方法
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }

    if (this.originalXHROpen) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
    }

    if (this.originalXHRSend) {
      XMLHttpRequest.prototype.send = this.originalXHRSend;
    }

    this.isSetup = false;
  }
}

