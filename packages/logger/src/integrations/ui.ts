import { BaseIntegration } from './base';
import type { Logger } from '../types';
import { getBreadcrumbManager } from './breadcrumbs';

/**
 * UI 事件集成配置
 */
export interface UIIntegrationOptions {
  /**
   * 是否启用点击事件监听
   */
  enableClick?: boolean;

  /**
   * 点击事件节流间隔（毫秒）
   */
  clickThrottleMs?: number;
}

/**
 * UI 事件集成
 * 监听用户交互事件（如点击）
 */
export class UIIntegration extends BaseIntegration {
  private options: Required<UIIntegrationOptions>;
  private clickThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  private lastClickTime = 0;
  private clickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(options: UIIntegrationOptions = {}) {
    super();
    this.options = {
      enableClick: options.enableClick ?? true,
      clickThrottleMs: options.clickThrottleMs || 1000,
    };
  }

  setup(_logger: Logger): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (this.options.enableClick) {
      this.setupClickHandler();
    }
  }

  /**
   * 设置点击事件处理器
   */
  private setupClickHandler(): void {
    this.clickHandler = (e: MouseEvent) => {
      const now = Date.now();
      
      // 节流：限制频率
      if (now - this.lastClickTime < this.options.clickThrottleMs) {
        return;
      }

      this.lastClickTime = now;

      const target = e.target as HTMLElement;
      if (!target) {
        return;
      }

      // 获取元素信息（避免完整 DOM 树）
      const selector = this.getElementSelector(target);
      const text = this.getElementText(target);

      const manager = getBreadcrumbManager();
      if (manager) {
        manager.add('ui', `Click: ${selector}`, {
          selector,
          text: text.substring(0, 100), // 限制文本长度
          tagName: target.tagName,
        });
      }
    };

    document.addEventListener('click', this.clickHandler, true); // 使用捕获阶段
  }

  /**
   * 获取元素选择器（简化版）
   */
  private getElementSelector(element: HTMLElement): string {
    // 优先使用 ID
    if (element.id) {
      return `#${element.id}`;
    }

    // 使用类名
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }

    // 使用标签名
    return element.tagName.toLowerCase();
  }

  /**
   * 获取元素文本（摘要）
   */
  private getElementText(element: HTMLElement): string {
    // 优先使用 aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return ariaLabel;
    }

    // 使用文本内容（限制长度）
    const text = element.textContent || element.innerText || '';
    return text.trim().substring(0, 100);
  }

  teardown(): void {
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, true);
      this.clickHandler = null;
    }

    if (this.clickThrottleTimer) {
      clearTimeout(this.clickThrottleTimer);
      this.clickThrottleTimer = null;
    }
  }
}

