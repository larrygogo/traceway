# npm 发布配置指南

## 方案选择

### 方案 1：Trusted Publishing（推荐，如果可用）

npm 推荐使用 **Trusted Publishing**，这是更安全的 CI/CD 发布方式。

**注意**：Trusted Publishing 可能尚未对所有用户开放。如果找不到设置页面，请使用方案 2。

#### 设置 Trusted Publishing

1. 尝试访问 npm 设置页面：
   - https://www.npmjs.com/settings/[你的用户名]/publishing
   - 或者从 https://www.npmjs.com/settings/[你的用户名] 导航到 "Publishing" 部分
2. 如果页面存在，找到 **"Trusted Publishing"** 部分
3. 点击 **"Add GitHub"** 或 **"Configure"**
4. 选择要授权的 GitHub 仓库（例如：`larrygogo/traceway`）
5. 选择要发布的包（例如：`@traceway/logger`）
6. 确认授权

#### 配置完成后

- ✅ 无需创建或管理 token
- ✅ 无需启用 Bypass 2FA
- ✅ 使用 OpenID Connect (OIDC) 自动验证
- ✅ 更安全，token 自动过期

#### Workflow 配置

如果使用 Trusted Publishing，workflow 已经配置好了 `id-token: write` 权限，无需额外配置。

---

### 方案 2：Granular Access Token with Bypass 2FA（当前可用方案）

如果 Trusted Publishing 不可用，使用带有 Bypass 2FA 的 Granular Access Token。

如果无法使用 Trusted Publishing，可以使用带有 Bypass 2FA 的 token。

#### 1. 创建 Granular Access Token

1. 访问 npm 设置页面：https://www.npmjs.com/settings/[你的用户名]/tokens
2. 点击 **"Generate New Token"** → 选择 **"Granular Access Token"**

#### 2. 配置 Token

**重要配置项：**

- **Token name**: 例如 `github-actions-publish`
- **Token type**: 必须选择 **"Automation"**（不是 "Publish" 或其他类型）
- **Expiration**: 根据需要设置（建议 1 年）
- **Package access**: 
  - 选择 **"Restricted"**
  - 在 "Add packages" 中输入 `@traceway` scope
- **Permissions**: 必须勾选
  - ✅ **Read packages**
  - ✅ **Write packages**
- **⚠️ 关键：Bypass 2FA**: 
  - npm 会提示："There are security risks with this option. For automation or CI/CD uses, please use Trusted Publishing instead."
  - **但这是当前必需的选项**，请勾选此选项
  - 这是发布包所必需的，即使账户没有启用 2FA

#### 3. 验证 Token 类型

创建成功后，token 应该以 `npm_` 开头（Granular Access Token），而不是其他格式。

#### 4. 更新 GitHub Secret

1. 复制生成的 token（以 `npm_` 开头）
2. 在 GitHub 仓库中：
   - 进入 **Settings** → **Secrets and variables** → **Actions**
   - 找到或创建 `NPM_TOKEN` secret
   - 更新为新 token

---

## 常见问题

**Q: 为什么找不到 Trusted Publishing 设置页面？**
A: Trusted Publishing 可能尚未对所有用户开放，或者功能还在逐步推出中。如果找不到设置页面，请使用 Granular Access Token with Bypass 2FA 方案。

**Q: Trusted Publishing 和 Bypass 2FA 有什么区别？**
A: 
- **Trusted Publishing**：使用 OIDC 验证，无需 token，更安全，推荐使用（如果可用）
- **Bypass 2FA**：需要长期 token，有安全风险，但当前是可行的方案

**Q: 为什么 npm 提示 Bypass 2FA 有安全风险？**
A: npm 推荐使用 Trusted Publishing，因为它使用短期自动过期的 token，更安全。Bypass 2FA 需要长期 token，如果泄露会有安全风险。但如果 Trusted Publishing 不可用，这是必需的选项。

**Q: 如何选择使用哪种方案？**
A: 
- ✅ **优先尝试 Trusted Publishing**（如果设置页面可用）
- ⚠️ **如果不可用，使用 Bypass 2FA token**（当前推荐方案）

**Q: 我的账户没有启用 2FA，还需要 Bypass 2FA 吗？**
A: 如果使用 token 方式，即使账户没有启用 2FA，npm 仍然要求使用带有 Bypass 2FA 权限的 token 来发布包。但使用 Trusted Publishing 则不需要。

**Q: 如何验证 token 是否正确？**
A: 可以在本地测试：
```bash
export NPM_TOKEN="你的token"
npm config set //registry.npmjs.org/:_authToken $NPM_TOKEN
npm whoami
# 应该显示你的 npm 用户名
```

## 参考链接

- [npm Trusted Publishing 文档](https://docs.npmjs.com/about-trusted-publishing)
- [npm Granular Access Tokens 文档](https://docs.npmjs.com/about-access-tokens#granular-access-tokens)
- [npm 2FA 要求说明](https://docs.npmjs.com/about-two-factor-authentication)

