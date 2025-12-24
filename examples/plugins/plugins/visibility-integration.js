/**
 * 自定义 Integration: 页面可见性监听
 * 
 * 监听页面可见性变化（visibilitychange），记录为 Breadcrumb
 * 帮助在排查问题时了解页面在什么时候切换到后台
 */

export class VisibilityIntegration {
  constructor() {
    this.onVisibilityChange = undefined;
    this.isSetup = false;
  }

  setup(logger) {
    if (this.isSetup || typeof document === 'undefined') {
      return;
    }

    this.isSetup = true;

    this.onVisibilityChange = () => {
      const state = document.visibilityState;
      
      logger.addBreadcrumb({
        type: 'custom',
        message: `visibility: ${state}`,
        data: { 
          visibilityState: state,
          timestamp: Date.now(),
        },
      });
    };

    document.addEventListener('visibilitychange', this.onVisibilityChange);
    
    // 立即记录当前状态
    this.onVisibilityChange();
  }

  teardown() {
    if (!this.isSetup || typeof document === 'undefined' || !this.onVisibilityChange) {
      return;
    }

    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.onVisibilityChange = undefined;
    this.isSetup = false;
  }
}

