import {
  createLogger,
  ConsoleTransport,
  HttpTransport,
  BreadcrumbIntegration,
  ErrorsIntegration,
  UIIntegration,
  NavigationIntegration,
  HttpIntegration,
  PerformanceIntegration,
  WebVitalsIntegration,
} from '@traceway/logger';

export const logger = createLogger({
  app: 'react-example',
  env: import.meta.env.MODE || 'development',
  release: '1.0.0',
  level: 'debug',
  transports: [
    new ConsoleTransport(),
    // 生产环境启用 HTTP Transport
    // new HttpTransport({
    //   url: 'http://localhost:3000/logs',
    // }),
  ],
  integrations: [
    new BreadcrumbIntegration({ maxBreadcrumbs: 50 }),
    new ErrorsIntegration(),
    new UIIntegration(),
    new NavigationIntegration(),
    new HttpIntegration(),
    new PerformanceIntegration(),
    new WebVitalsIntegration({ inpThreshold: 200 }),
  ],
});

