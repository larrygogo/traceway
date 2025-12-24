/**
 * 使用自定义插件的 Logger 配置示例
 */
import {
  createLogger,
  ConsoleTransport,
  BreadcrumbIntegration,
  ErrorsIntegration,
  UIIntegration,
  HttpIntegration,
} from '../../packages/logger/src/index';
import { VisibilityIntegration } from './plugins/visibility-integration';
import { LocalStorageTransport } from './plugins/local-storage-transport';

/**
 * 创建配置了自定义插件的 Logger
 */
export const logger = createLogger({
  app: 'plugin-example',
  env: (import.meta as any).env?.MODE || 'development',
  release: '1.0.0',
  level: 'debug',
  
  // 使用自定义 Transport
  transports: [
    new ConsoleTransport(), // 开发环境：输出到控制台
    new LocalStorageTransport({
      key: 'traceway_logs',
      maxSize: 500, // 最多保存 500 条日志
    }),
    // 生产环境可以添加 HTTP Transport
    // new HttpTransport({
    //   url: 'https://api.example.com/logs',
    // }),
  ],
  
  // 使用自定义 Integration
  integrations: [
    new BreadcrumbIntegration({ maxBreadcrumbs: 50 }), // 必须先启用
    new ErrorsIntegration(),           // 全局错误捕获
    new VisibilityIntegration(),       // 自定义：页面可见性监听
    new UIIntegration(),               // UI 事件监听
    new HttpIntegration(),             // HTTP 请求拦截
  ],
});

// 设置用户信息
logger.setUser({
  id: 'demo-user',
  name: 'Demo User',
  email: 'demo@example.com',
});

// 设置上下文
logger.setContext({
  env: (import.meta as any).env?.MODE || 'development',
  release: '1.0.0',
});

// 应用启动日志
logger.info('app_start', 'Plugin example app started');

