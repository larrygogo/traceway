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

## 自定义扩展（Integrations / Transports）

本库的扩展模型分为两类：

- **Integration（采集/增强）**：在 `setup(logger)` 里注册事件监听，把“外部信号”（UI、路由、HTTP、性能、自定义业务事件…）转成 `logger.addBreadcrumb()` 或 `logger.info/warn/error()`。
- **Transport（投递/落地）**：实现 `send(events)`，把已经处理好的事件批量发送到你的后端/SDK/本地存储等。

事件进入 `Transport` 前已经按以下顺序处理：**采样 → 自动附加（warn/error）breadcrumbs → 脱敏 → beforeSend → 入队/批量 flush**。

### 自定义 Transport

你只需要实现一个 `Transport`：

```typescript
import type { Transport, LogEvent } from '@traceway/logger';

export interface BeaconTransportOptions {
  url: string;
  headers?: Record<string, string>;
}

/**
 * 示例：优先使用 sendBeacon，上报失败再回退 fetch(keepalive)
 * - 适合页面卸载/切后台时尽量把队列发出去
 */
export class BeaconTransport implements Transport {
  constructor(private options: BeaconTransportOptions) {}

  async send(events: LogEvent[]): Promise<void> {
    // 注意：events 已经脱敏/序列化过；Transport 里不要再去修改引用
    const body = JSON.stringify(events);

    // 1) 优先 sendBeacon（更适合卸载场景）
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      try {
        const ok = navigator.sendBeacon(
          this.options.url,
          new Blob([body], { type: 'application/json' }),
        );
        if (ok) return;
      } catch {
        // 忽略，走 fallback
      }
    }

    // 2) fallback：fetch keepalive（注意你的后端需要允许跨域/CORS）
    if (typeof fetch !== 'undefined') {
      try {
        await fetch(this.options.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...this.options.headers },
          body,
          keepalive: true,
        });
      } catch {
        // 静默失败（队列/Transport 设计就是“尽力而为”）
      }
    }
  }
}
```

**Transport 最佳实践**

- **不要 throw**：虽然内部会捕获异常，但最佳实践是 Transport 自己兜底，避免影响其它 transports。
- **尽量无副作用**：不要原地修改 `events`；不要在 `send()` 里再调用 `logger.*`（会产生递归/重复上报）。
- **考虑卸载场景**：页面隐藏/卸载时会触发强制 flush，推荐 `sendBeacon` 或 `fetch(..., { keepalive: true })`。
- **保持可重入**：flush 可能在短时间内多次触发，`send()` 设计上应能被并发调用且不依赖顺序。

### 自定义 Integration

你只需要实现一个 `Integration`：

- `setup(logger)`：注册事件监听/打补丁，采集外部信号并调用 `logger.*`。
- `teardown()`（可选）：在 `logger.destroy()` 时执行，用于移除监听、恢复补丁，防止内存泄漏。

```typescript
import type { Integration, Logger } from '@traceway/logger';

/**
 * 示例：记录“页面可见性变化”为 breadcrumb
 *
 * 注意：logger.addBreadcrumb 只有在你启用了 BreadcrumbIntegration 时才会生效
 * （否则不会报错，但也不会记录）。
 */
export class VisibilityBreadcrumbIntegration implements Integration {
  private onVisibilityChange?: () => void;

  setup(logger: Logger): void {
    if (typeof document === 'undefined') return;

    this.onVisibilityChange = () => {
      logger.addBreadcrumb({
        type: 'custom',
        message: `visibility: ${document.visibilityState}`,
        data: { visibilityState: document.visibilityState },
      });
    };

    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.onVisibilityChange();
  }

  teardown(): void {
    if (typeof document === 'undefined' || !this.onVisibilityChange) return;
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.onVisibilityChange = undefined;
  }
}
```

**Integration 最佳实践**

- **只做采集与增强**：Integration 更适合“从外部事件 → 产生日志/面包屑”；不要在其中做网络发送（交给 Transport）。
- **避免递归**：如果你要 monkey-patch `console.*`、`fetch` 等全局对象，务必加重入保护（否则 ConsoleTransport/HttpIntegration 可能触发递归）。
- **及时清理**：所有 `addEventListener` / `setInterval` / patch 都应在 `teardown()` 中恢复。
- **Breadcrumb 依赖**：`logger.addBreadcrumb()` 依赖 `BreadcrumbIntegration` 作为全局管理器；你的自定义 Integration 若需要 breadcrumbs，请在配置里同时启用它。

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

