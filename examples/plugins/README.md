# 插件化示例

本示例展示了如何使用 Traceway Logger 的插件化功能，包括创建和使用自定义 Integration 和 Transport 插件。

## 包含的示例插件

### 1. VisibilityIntegration（自定义 Integration）

监听页面可见性变化（`visibilitychange` 事件），自动记录为 Breadcrumb。

**功能：**
- 监听页面从前台切换到后台
- 监听页面从后台恢复前台
- 自动记录状态变化时间

**使用场景：**
- 排查用户切后台后的问题
- 了解页面生命周期
- 分析用户行为模式

### 2. LocalStorageTransport（自定义 Transport）

将日志事件保存到浏览器的 LocalStorage 中。

**功能：**
- 将日志持久化到本地存储
- 支持最大存储条数限制
- 自动清理旧日志

**使用场景：**
- 离线场景下的日志存储
- 调试时的本地日志查看
- 小规模的日志持久化

## 运行示例

### TypeScript 版本

#### 方式 1: 直接打开 HTML 文件

```bash
# 在浏览器中打开
open examples/plugins/index.html
```

#### 方式 2: 使用开发服务器

如果使用 Vite 或其他开发服务器：

```bash
# 在项目根目录运行
npm run dev

# 访问
http://localhost:5173/examples/plugins/index.html
```

### JavaScript 版本（纯 JS，无需 TypeScript）

如果你想使用纯 JavaScript 而不需要 TypeScript，可以使用：

```bash
# 打开 JavaScript 版本
open examples/plugins/example-js.html
```

或者通过开发服务器访问：

```bash
# 访问
http://localhost:5173/examples/plugins/example-js.html
```

**JavaScript 版本特点：**
- ✅ 无需 TypeScript 编译
- ✅ 直接使用 ES6 模块
- ✅ 适合快速原型开发
- ✅ 代码更简洁，无需类型定义

**文件对比：**
- TypeScript: `plugins/*.ts` 文件
- JavaScript: `plugins/*.js` 文件

## 测试插件功能

### 测试 VisibilityIntegration

1. 打开页面
2. 切换到其他浏览器标签页
3. 切换回来
4. 查看浏览器控制台，应该能看到 visibility 变化的 Breadcrumb

### 测试 LocalStorageTransport

1. 点击页面上的按钮触发日志
2. 打开浏览器开发者工具
3. 查看 Application > LocalStorage
4. 找到 `traceway_logs` 键，查看保存的日志

或点击页面上的"查看 LocalStorage 日志"按钮。

## 代码结构

```
examples/plugins/
├── index.html              # 示例页面 (TypeScript 版本)
├── example-js.html         # 示例页面 (JavaScript 版本)
├── logger.ts               # Logger 配置 (TypeScript)
├── logger.js               # Logger 配置 (JavaScript)
├── plugins/                # 自定义插件
│   ├── visibility-integration.ts    # TypeScript 版本
│   ├── visibility-integration.js    # JavaScript 版本
│   ├── local-storage-transport.ts   # TypeScript 版本
│   ├── local-storage-transport.js   # JavaScript 版本
│   ├── index.ts                     # TypeScript 导出
│   └── index.js                     # JavaScript 导出
└── README.md              # 本文件
```

## TypeScript vs JavaScript

本示例同时提供了 TypeScript 和 JavaScript 两种版本：

### TypeScript 版本
- ✅ 完整的类型定义
- ✅ IDE 智能提示
- ✅ 类型安全检查
- ✅ 适合大型项目

### JavaScript 版本
- ✅ 无需编译步骤
- ✅ 代码更简洁
- ✅ 快速原型开发
- ✅ 适合小型项目或学习

两种版本的插件功能完全相同，可以根据项目需求选择使用。

## 自定义插件开发指南

### 创建自定义 Integration

**TypeScript 版本：**
```typescript
import type { Integration, Logger } from '@traceway/logger';

export class MyIntegration implements Integration {
  setup(logger: Logger): void {
    // 注册事件监听、打补丁等
    // 调用 logger.addBreadcrumb() 或 logger.info/warn/error()
  }

  teardown(): void {
    // 清理资源：移除监听器、恢复补丁等
  }
}
```

**JavaScript 版本：**
```javascript
export class MyIntegration {
  constructor() {
    this.isSetup = false;
  }

  setup(logger) {
    // 注册事件监听、打补丁等
    // 调用 logger.addBreadcrumb() 或 logger.info/warn/error()
    this.isSetup = true;
  }

  teardown() {
    // 清理资源：移除监听器、恢复补丁等
    this.isSetup = false;
  }
}
```

### 创建自定义 Transport

**TypeScript 版本：**
```typescript
import type { Transport, LogEvent } from '@traceway/logger';

export class MyTransport implements Transport {
  async send(events: LogEvent[]): Promise<void> {
    // 发送事件到目标（HTTP、本地存储、第三方服务等）
  }
}
```

**JavaScript 版本：**
```javascript
export class MyTransport {
  send(events) {
    // 发送事件到目标（HTTP、本地存储、第三方服务等）
    // 可以返回 Promise 或 void
  }
}
```

详细文档请参考主 README 的[自定义插件开发指南](../../README.md#自定义插件开发指南)章节。

## 插件使用

在创建 Logger 时使用自定义插件：

**TypeScript 版本：**
```typescript
import { createLogger } from '@traceway/logger';
import { VisibilityIntegration, LocalStorageTransport } from './plugins';

const logger = createLogger({
  transports: [
    new ConsoleTransport(),
    new LocalStorageTransport({ key: 'my_logs', maxSize: 500 }),
  ],
  integrations: [
    new BreadcrumbIntegration(),
    new VisibilityIntegration(),
    // ... 其他集成
  ],
});
```

**JavaScript 版本：**
```javascript
import { createLogger } from '@traceway/logger';
import { VisibilityIntegration, LocalStorageTransport } from './plugins/index.js';

const logger = createLogger({
  transports: [
    new ConsoleTransport(),
    new LocalStorageTransport({ key: 'my_logs', maxSize: 500 }),
  ],
  integrations: [
    new BreadcrumbIntegration(),
    new VisibilityIntegration(),
    // ... 其他集成
  ],
});
```

**注意：** JavaScript 版本在导入时需要包含文件扩展名 `.js`。

