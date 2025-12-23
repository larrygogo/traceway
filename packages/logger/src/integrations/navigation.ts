import { BaseIntegration } from './base';
import type { Logger } from '../types';
import { getBreadcrumbManager } from './breadcrumbs';

/**
 * 导航集成
 * 监听路由变化（history API）
 */
export class NavigationIntegration extends BaseIntegration {
  private originalPushState: typeof history.pushState | null = null;
  private originalReplaceState: typeof history.replaceState | null = null;
  private popstateHandler: (() => void) | null = null;
  private isSetup = false;

  setup(_logger: Logger): void {
    if (this.isSetup || typeof window === 'undefined') {
      return;
    }
    this.isSetup = true;

    // 拦截 pushState
    this.originalPushState = history.pushState;
    history.pushState = (...args) => {
      this.originalPushState!.apply(history, args);
      this.handleNavigation('pushState', args[2] as string);
    };

    // 拦截 replaceState
    this.originalReplaceState = history.replaceState;
    history.replaceState = (...args) => {
      this.originalReplaceState!.apply(history, args);
      this.handleNavigation('replaceState', args[2] as string);
    };

    // 监听 popstate
    this.popstateHandler = () => {
      this.handleNavigation('popstate', window.location.href);
    };
    window.addEventListener('popstate', this.popstateHandler);
  }

  /**
   * 处理导航事件
   */
  private handleNavigation(type: string, url: string): void {
    const manager = getBreadcrumbManager();
    if (manager) {
      manager.add('nav', `Navigation: ${type}`, {
        type,
        url,
        from: document.referrer,
        to: url,
      });
    }
  }

  teardown(): void {
    if (!this.isSetup || typeof window === 'undefined') {
      return;
    }

    // 恢复原始方法
    if (this.originalPushState) {
      history.pushState = this.originalPushState;
    }

    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
    }

    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
      this.popstateHandler = null;
    }

    this.isSetup = false;
  }
}

