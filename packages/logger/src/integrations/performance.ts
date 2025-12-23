import { BaseIntegration } from './base';
import type { Logger } from '../types';

/**
 * Long Task 监控配置
 */
export interface PerformanceIntegrationOptions {
  /**
   * 聚合窗口大小（毫秒）
   */
  aggregationWindowMs?: number;

  /**
   * 最大 Long Task 时长阈值（毫秒）
   */
  maxLongTaskThresholdMs?: number;

  /**
   * 总 Long Task 时长阈值（毫秒）
   */
  totalLongTaskThresholdMs?: number;
}

/**
 * Long Task 聚合数据
 */
interface LongTaskAggregation {
  longTaskCount: number;
  totalLongTaskMs: number;
  maxLongTaskMs: number;
  startTime: number;
}

/**
 * 性能监控 Integration
 * 监听 Long Task，检测 UI 卡顿/假死
 */
export class PerformanceIntegration extends BaseIntegration {
  private logger: Logger | null = null;
  private options: Required<PerformanceIntegrationOptions>;
  private observer: PerformanceObserver | null = null;
  private aggregation: LongTaskAggregation | null = null;
  private aggregationTimer: ReturnType<typeof setInterval> | null = null;
  private isSetup = false;

  constructor(options: PerformanceIntegrationOptions = {}) {
    super();
    this.options = {
      aggregationWindowMs: options.aggregationWindowMs || 10000, // 10秒
      maxLongTaskThresholdMs: options.maxLongTaskThresholdMs || 200,
      totalLongTaskThresholdMs: options.totalLongTaskThresholdMs || 1000,
    };
  }

  setup(logger: Logger): void {
    if (this.isSetup || typeof window === 'undefined') {
      return;
    }

    // 检查 PerformanceObserver 支持
    if (typeof PerformanceObserver === 'undefined') {
      return; // 不支持，静默失败
    }

    this.logger = logger;
    this.isSetup = true;

    try {
      // 创建 PerformanceObserver
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            this.handleLongTask(entry as PerformanceEntry & { duration: number });
          }
        }
      });

      // 开始观察 longtask
      this.observer.observe({ entryTypes: ['longtask'] });

      // 启动聚合窗口定时器
      this.startAggregationWindow();
    } catch (error) {
      // 某些浏览器可能不支持 longtask，静默失败
      this.isSetup = false;
    }
  }

  /**
   * 处理 Long Task
   */
  private handleLongTask(entry: PerformanceEntry & { duration: number }): void {
    const duration = entry.duration;

    // 初始化聚合数据
    if (!this.aggregation) {
      this.aggregation = {
        longTaskCount: 0,
        totalLongTaskMs: 0,
        maxLongTaskMs: 0,
        startTime: Date.now(),
      };
    }

    // 更新聚合数据
    this.aggregation.longTaskCount++;
    this.aggregation.totalLongTaskMs += duration;
    this.aggregation.maxLongTaskMs = Math.max(this.aggregation.maxLongTaskMs, duration);
  }

  /**
   * 启动聚合窗口定时器
   */
  private startAggregationWindow(): void {
    this.aggregationTimer = setInterval(() => {
      this.checkAndReportFreeze();
    }, this.options.aggregationWindowMs);
  }

  /**
   * 检查并上报 UI 卡顿
   */
  private checkAndReportFreeze(): void {
    if (!this.aggregation || !this.logger) {
      return;
    }

    const {
      longTaskCount,
      totalLongTaskMs,
      maxLongTaskMs,
      startTime,
    } = this.aggregation;

    // 检查是否超过阈值
    const exceedsThreshold =
      maxLongTaskMs > this.options.maxLongTaskThresholdMs &&
      totalLongTaskMs > this.options.totalLongTaskThresholdMs;

    if (exceedsThreshold && longTaskCount > 0) {
      // 触发 ui_freeze 事件
      this.logger.warn('ui_freeze', 'UI freeze detected', {
        longTaskCount,
        totalLongTaskMs,
        maxLongTaskMs,
        windowMs: this.options.aggregationWindowMs,
        startTime,
        endTime: Date.now(),
      });
    }

    // 重置聚合数据
    this.aggregation = null;
  }

  teardown(): void {
    if (!this.isSetup) {
      return;
    }

    // 停止观察
    if (this.observer) {
      try {
        this.observer.disconnect();
      } catch {
        // 忽略错误
      }
      this.observer = null;
    }

    // 清理定时器
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }

    // 最后检查一次
    this.checkAndReportFreeze();

    this.isSetup = false;
  }
}

