import { BaseIntegration } from './base';
import type { Logger } from '../types';
import { getBreadcrumbManager } from './breadcrumbs';

/**
 * 规范化错误对象
 */
export interface NormalizedError {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
}

/**
 * 规范化错误
 */
function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause;
    return {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      stack: error.stack,
      cause,
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
    };
  }

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const cause = (err.cause as unknown) ?? undefined;
    return {
      name: (err.name as string) || 'Error',
      message: String(err.message || err.msg || error),
      stack: err.stack as string | undefined,
      cause,
    };
  }

  return {
    name: 'Error',
    message: String(error || 'Unknown error'),
  };
}

/**
 * 全局错误捕获 Integration
 */
export class ErrorsIntegration extends BaseIntegration {
  private logger: Logger | null = null;
  private originalOnError: typeof window.onerror | null = null;
  private originalOnUnhandledRejection: typeof window.onunhandledrejection | null = null;
  private isSetup = false;

  setup(logger: Logger): void {
    if (this.isSetup || typeof window === 'undefined') {
      return;
    }

    this.logger = logger;
    this.isSetup = true;

    // 保存原始处理器
    this.originalOnError = window.onerror;
    this.originalOnUnhandledRejection = window.onunhandledrejection;

    // 设置全局错误处理器
    window.onerror = (
      message: string | Event,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error,
    ) => {
      this.handleError(error || message, {
        source,
        lineno,
        colno,
      });

      // 调用原始处理器（如果存在）
      if (this.originalOnError) {
        return this.originalOnError.call(window, message, source, lineno, colno, error);
      }

      return false;
    };

    // 设置未处理的 Promise 拒绝处理器
    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      this.handleError(event.reason, {
        type: 'unhandledrejection',
      });

      // 调用原始处理器（如果存在）
      if (this.originalOnUnhandledRejection) {
        return this.originalOnUnhandledRejection.call(window, event);
      }
    };
  }

  /**
   * 处理错误
   */
  private handleError(
    error: unknown,
    context?: {
      source?: string;
      lineno?: number;
      colno?: number;
      type?: string;
    },
  ): void {
    if (!this.logger) {
      return;
    }

    const normalized = normalizeError(error);
    const manager = getBreadcrumbManager();
    const breadcrumbs = manager ? manager.getBreadcrumbs() : undefined;

    // 构建错误数据
    const errorData: Record<string, unknown> = {
      name: normalized.name,
      message: normalized.message,
    };

    if (normalized.stack) {
      errorData.stack = normalized.stack;
    }

    if (normalized.cause) {
      errorData.cause = normalized.cause;
    }

    if (context) {
      if (context.source) {
        errorData.source = context.source;
      }
      if (context.lineno !== undefined) {
        errorData.lineno = context.lineno;
      }
      if (context.colno !== undefined) {
        errorData.colno = context.colno;
      }
      if (context.type) {
        errorData.errorType = context.type;
      }
    }

    if (breadcrumbs && breadcrumbs.length > 0) {
      errorData.breadcrumbs = breadcrumbs;
    }

    // 记录错误事件
    this.logger.error('uncaught_error', normalized.message, errorData);
  }

  teardown(): void {
    if (!this.isSetup || typeof window === 'undefined') {
      return;
    }

    // 恢复原始处理器
    if (this.originalOnError !== null) {
      window.onerror = this.originalOnError;
    }

    if (this.originalOnUnhandledRejection !== null) {
      window.onunhandledrejection = this.originalOnUnhandledRejection;
    }

    this.isSetup = false;
  }
}

