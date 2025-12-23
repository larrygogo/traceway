import { BaseIntegration } from './base';
import type { Breadcrumb, BreadcrumbType, Logger } from '../types';
import { getTimestamp } from '../utils/time';

/**
 * Breadcrumb 管理配置
 */
export interface BreadcrumbOptions {
  /**
   * 最大 breadcrumb 数量（环形队列）
   */
  maxBreadcrumbs?: number;
}

/**
 * Breadcrumb 管理 Integration
 * 维护一个环形队列，自动附加到 error/关键事件
 */
export class BreadcrumbIntegration extends BaseIntegration {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs: number;

  constructor(options: BreadcrumbOptions = {}) {
    super();
    this.maxBreadcrumbs = options.maxBreadcrumbs || 50;
  }

  setup(_logger: Logger): void {
    // 当前集成无需直接使用 logger，仅满足接口要求
  }

  /**
   * 添加 breadcrumb
   */
  add(type: BreadcrumbType, message: string, data?: Record<string, unknown>): void {
    const breadcrumb: Breadcrumb = {
      ts: getTimestamp(),
      type,
      message,
      data,
    };

    // 环形队列：超出最大数量时移除最旧的
    if (this.breadcrumbs.length >= this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    this.breadcrumbs.push(breadcrumb);
  }

  /**
   * 获取当前所有 breadcrumbs
   */
  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * 清空 breadcrumbs
   */
  clear(): void {
    this.breadcrumbs = [];
  }
}

/**
 * 全局 breadcrumb 管理器实例
 * 用于在 integrations 之间共享
 */
let globalBreadcrumbManager: BreadcrumbIntegration | null = null;

/**
 * 获取全局 breadcrumb 管理器
 */
export function getBreadcrumbManager(): BreadcrumbIntegration | null {
  return globalBreadcrumbManager;
}

/**
 * 设置全局 breadcrumb 管理器
 */
export function setBreadcrumbManager(manager: BreadcrumbIntegration): void {
  globalBreadcrumbManager = manager;
}

