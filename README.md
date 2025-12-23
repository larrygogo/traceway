# Traceway Logger

前端日志库 - 错误追踪、用户操作链路、性能监控

## 特性

- ✅ **错误自动捕获** - 全局错误监听，自动规范化错误信息
- ✅ **用户操作链路** - Breadcrumb 追踪，记录用户操作路径
- ✅ **性能监控** - Long Task 检测，Web Vitals 集成
- ✅ **默认脱敏** - 自动脱敏敏感信息（token、密码、手机号等）
- ✅ **采样控制** - 支持采样率配置，减少上报量
- ✅ **批量上报** - 缓冲队列，批量上报，页面卸载时强制 flush
- ✅ **可插拔** - Transport 和 Integration 可插拔设计
- ✅ **SSR 兼容** - 服务端渲染环境安全降级

## 快速开始

### 安装

```bash
npm install @traceway/logger
```

### 基础使用

```typescript
import { createLogger, ConsoleTransport, HttpTransport } from '@traceway/logger';

const logger = createLogger({
  app: 'my-app',
  env: 'production',
  release: '1.0.0',
  transports: [
    new ConsoleTransport(), // 开发环境
    new HttpTransport({
      url: 'https://api.example.com/logs',
    }),
  ],
});

// 记录日志
logger.info('user_login', 'User logged in', { userId: '123' });
logger.error('api_error', 'API request failed', { endpoint: '/api/users' });
```

### 启用集成

```typescript
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

const logger = createLogger({
  app: 'my-app',
  env: 'production',
  release: '1.0.0',
  transports: [
    new HttpTransport({
      url: 'https://api.example.com/logs',
    }),
  ],
  integrations: [
    new BreadcrumbIntegration({ maxBreadcrumbs: 50 }),
    new ErrorsIntegration(), // 全局错误捕获
    new UIIntegration(), // 点击事件
    new NavigationIntegration(), // 路由变化
    new HttpIntegration(), // HTTP 请求
    new PerformanceIntegration(), // Long Task 监控
    new WebVitalsIntegration({ inpThreshold: 200 }), // Web Vitals
  ],
});
```

## 配置选项

### LoggerOptions

```typescript
interface LoggerOptions {
  // 最低日志级别
  level?: 'debug' | 'info' | 'warn' | 'error';

  // 采样率（0-1）
  sampleRate?: number; // 默认 1.0
  errorSampleRate?: number; // 默认 1.0

  // 队列配置
  flushIntervalMs?: number; // 默认 5000ms
  maxBatchSize?: number; // 默认 30
  maxQueueSize?: number; // 默认 500

  // 脱敏配置
  redactKeys?: string[]; // 需要脱敏的字段名
  redactPatterns?: RegExp[]; // 需要脱敏的正则模式

  // 发送前钩子
  beforeSend?: (event: LogEvent) => LogEvent | null;

  // Transport 列表
  transports?: Transport[];

  // Integration 列表
  integrations?: Integration[];

  // 应用信息
  app?: string;
  env?: string;
  release?: string;
}
```

## API

### Logger 方法

```typescript
// 记录日志
logger.debug(name: string, msg?: string, data?: Record<string, unknown>);
logger.info(name: string, msg?: string, data?: Record<string, unknown>);
logger.warn(name: string, msg?: string, data?: Record<string, unknown>);
logger.error(name: string, msg?: string, data?: Record<string, unknown>);

// 设置用户信息
logger.setUser({ id: '123', name: 'John', email: 'john@example.com' });

// 设置上下文
logger.setContext({ env: 'production', release: '1.0.0' });

// 添加 Breadcrumb
logger.addBreadcrumb({
  type: 'custom',
  message: 'Custom event',
  data: { key: 'value' },
});

// 立即上报
await logger.flush();

// 销毁 Logger
logger.destroy();
```

## 脱敏说明

默认脱敏以下字段：

- **字段名**：token, authorization, password, phone, email, idCard, creditCard 等
- **正则模式**：Bearer token、手机号、邮箱

### 自定义脱敏

```typescript
const logger = createLogger({
  redactKeys: ['customKey', 'secret'],
  redactPatterns: [
    /Bearer\s+[\w-]+/gi,
    /\b1[3-9]\d{9}\b/g, // 手机号
  ],
});
```

## 事件字段说明

错误事件常见字段（例：`uncaught_error`）：
- `name`：错误名称（如 `Error`）
- `message`：错误信息
- `stack`：堆栈
- `source`：脚本来源 URL（通常为当前页面）
- `lineno` / `colno`：出错行列
- `breadcrumbs`：错误前的关键操作轨迹
  - `ts`：时间戳（ms）
  - `type`：`ui` / `http` / `nav` / `log` / `custom`
  - `message`：摘要（如 `GET ... 200`、`Click: #btn-error`）
  - `data`：补充信息（HTTP 的 method/url/status/duration，UI 的 selector/text/tagName 等）
- `timestamp`：事件 ISO 时间
- `url`：当前页面 URL
- `sessionId`：会话 ID
- `traceId`：事件追踪 ID
- `user`：用户信息（已按配置脱敏，示例中 email 被脱敏）

普通日志数据示例（`logger.info`）：
- 自定义 `data` 字段（如按钮 ID、业务字段）
- `timestamp` / `url` / `sessionId` / `traceId` / `user`（同上）

示例中的行为（Vanilla Demo）：
- 点击“触发错误”会输出一条业务错误（`manual_error`），随后抛出异常被全局捕获为 `uncaught_error`，并自动带上之前的 HTTP/点击 breadcrumbs。

## 采样配置

```typescript
const logger = createLogger({
  sampleRate: 0.1, // 10% 的非 error 事件
  errorSampleRate: 1.0, // 100% 的 error 事件
});
```

## 框架集成

### React

```typescript
import { useEffect } from 'react';
import { createLogger } from '@traceway/logger';

const logger = createLogger({
  app: 'react-app',
  // ... 配置
});

// 在组件中使用
function App() {
  useEffect(() => {
    logger.setUser({ id: '123', name: 'John' });
  }, []);

  const handleClick = () => {
    logger.info('button_click', 'Button clicked');
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### Vue

```typescript
import { createApp } from 'vue';
import { createLogger } from '@traceway/logger';

const logger = createLogger({
  app: 'vue-app',
  // ... 配置
});

const app = createApp(App);
app.config.globalProperties.$logger = logger;
```

## 服务端上报示例

### Express

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/logs', (req, res) => {
  const events = req.body;
  // 处理日志事件
  console.log('Received events:', events);
  res.status(200).json({ success: true });
});

app.listen(3000);
```

### Nginx

```nginx
location /logs {
    proxy_pass http://backend;
    proxy_set_header Content-Type application/json;
}
```

## 浏览器兼容性

- Chrome 58+
- Firefox 55+
- Safari 11+
- Edge 79+

不支持的环境会自动降级到 Console Transport。

## License

MIT

