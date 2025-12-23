import { BaseIntegration } from './base';
import type { Logger } from '../types';
import { getBreadcrumbManager } from './breadcrumbs';

/**
 * Web Vitals 配置
 */
export interface WebVitalsIntegrationOptions {
  /**
   * INP 阈值（毫秒），超过此值触发 slow_interaction
   */
  inpThreshold?: number;

  /**
   * 是否监听 LCP
   */
  enableLCP?: boolean;

  /**
   * 是否监听 CLS
   */
  enableCLS?: boolean;

  /**
   * 是否监听 INP
   */
  enableINP?: boolean;
}

/**
 * Web Vitals Integration
 * 监听 Core Web Vitals（INP/LCP/CLS）
 */
export class WebVitalsIntegration extends BaseIntegration {
  private logger: Logger | null = null;
  private options: Required<WebVitalsIntegrationOptions>;
  private isSetup = false;

  constructor(options: WebVitalsIntegrationOptions = {}) {
    super();
    this.options = {
      inpThreshold: options.inpThreshold || 200,
      enableLCP: options.enableLCP ?? true,
      enableCLS: options.enableCLS ?? true,
      enableINP: options.enableINP ?? true,
    };
  }

  setup(logger: Logger): void {
    if (this.isSetup || typeof window === 'undefined') {
      return;
    }

    // 检查 web-vitals 是否可用
    try {
      // 动态导入 web-vitals（peer dependency）
      // 如果不存在，静默失败
      this.logger = logger;
      this.isSetup = true;

      // 使用动态导入，避免强制依赖
      this.setupWebVitals();
    } catch (error) {
      // web-vitals 不可用，静默失败
      this.isSetup = false;
    }
  }

  /**
   * 设置 Web Vitals 监听
   */
  private async setupWebVitals(): Promise<void> {
    try {
      // 动态导入 web-vitals
      const { onINP, onLCP, onCLS } = await import('web-vitals');

      if (this.options.enableINP) {
        onINP((metric) => {
          this.handleINP(metric);
        });
      }

      if (this.options.enableLCP) {
        onLCP((metric) => {
          this.handleLCP(metric);
        });
      }

      if (this.options.enableCLS) {
        onCLS((metric) => {
          this.handleCLS(metric);
        });
      }
    } catch (error) {
      // web-vitals 不可用，静默失败
      this.isSetup = false;
    }
  }

  /**
   * 处理 INP（Interaction to Next Paint）
   */
  private handleINP(metric: any): void {
    if (!this.logger) {
      return;
    }

    const value = typeof metric?.value === 'number' ? metric.value : 0;
    const entriesArray: unknown[] = Array.isArray(metric?.entries)
      ? metric.entries
      : [];
    const entries = entriesArray.map((e) => {
      const entry = e as { [key: string]: unknown };
      return {
        name: typeof entry.name === 'string' ? entry.name : undefined,
        duration: typeof entry.duration === 'number' ? entry.duration : undefined,
        startTime: typeof entry.startTime === 'number' ? entry.startTime : undefined,
      };
    });

    // 超过阈值时触发 slow_interaction
    if (value > this.options.inpThreshold) {
      // 获取最近的交互 breadcrumb
      const manager = getBreadcrumbManager();
      const recentInteraction = manager
        ? manager
            .getBreadcrumbs()
            .filter((bc) => bc.type === 'ui')
            .pop()
        : undefined;

      this.logger.warn('slow_interaction', 'Slow interaction detected', {
        inp: value,
        threshold: this.options.inpThreshold,
        entries: entries.map((e) => ({
          name: e.name,
          duration: e.duration,
          startTime: e.startTime,
        })),
        recentInteraction: recentInteraction
          ? {
              message: recentInteraction.message,
              data: recentInteraction.data,
            }
          : undefined,
      });
    }
  }

  /**
   * 处理 LCP（Largest Contentful Paint）
   */
  private handleLCP(metric: { value: number }): void {
    if (!this.logger) {
      return;
    }

    // LCP 通常只记录一次，可以记录到 info
    this.logger.info('web_vitals_lcp', 'LCP metric', {
      lcp: metric.value,
    });
  }

  /**
   * 处理 CLS（Cumulative Layout Shift）
   */
  private handleCLS(metric: { value: number }): void {
    if (!this.logger) {
      return;
    }

    // CLS 超过 0.1 时记录警告
    if (metric.value > 0.1) {
      this.logger.warn('web_vitals_cls', 'High CLS detected', {
        cls: metric.value,
      });
    }
  }

  teardown(): void {
    this.isSetup = false;
  }
}

