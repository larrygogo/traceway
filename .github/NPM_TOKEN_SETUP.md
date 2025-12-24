# npm Token 配置指南

## 问题说明

如果遇到以下错误：
```
npm error 403 403 Forbidden - Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages.
```

说明当前的 npm token 没有正确的权限。需要创建一个带有 **Bypass 2FA** 权限的 Granular Access Token。

## 解决步骤

### 1. 创建 Granular Access Token

1. 访问 npm 设置页面：https://www.npmjs.com/settings/[你的用户名]/tokens
2. 点击 **"Generate New Token"** → 选择 **"Granular Access Token"**

### 2. 配置 Token

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
- **⚠️ 关键：Bypass 2FA**: 必须勾选此选项

### 3. 验证 Token 类型

创建成功后，token 应该以 `npm_` 开头（Granular Access Token），而不是其他格式。

### 4. 更新 GitHub Secret

1. 复制生成的 token
2. 在 GitHub 仓库中：
   - 进入 **Settings** → **Secrets and variables** → **Actions**
   - 找到或创建 `NPM_TOKEN` secret
   - 更新为新 token

### 5. 检查账户 2FA 状态

如果您的 npm 账户启用了 2FA（双因素认证），则：
- ✅ 必须使用带有 **"Bypass 2FA"** 权限的 Automation token
- ❌ 普通 token 无法发布包

### 6. 常见问题

**Q: 为什么需要 Bypass 2FA？**
A: npm 要求发布包时必须通过 2FA 验证。在 CI/CD 环境中无法进行交互式 2FA 验证，因此需要使用带有 Bypass 2FA 权限的 Automation token。

**Q: 我的账户没有启用 2FA，还需要 Bypass 2FA 吗？**
A: 即使账户没有启用 2FA，npm 仍然要求使用带有 Bypass 2FA 权限的 token 来发布包。这是 npm 的安全策略。

**Q: 如何验证 token 是否正确？**
A: 可以在本地测试：
```bash
export NPM_TOKEN="你的token"
npm config set //registry.npmjs.org/:_authToken $NPM_TOKEN
npm whoami
# 应该显示你的 npm 用户名
```

## 参考链接

- [npm Granular Access Tokens 文档](https://docs.npmjs.com/about-access-tokens#granular-access-tokens)
- [npm 2FA 要求说明](https://docs.npmjs.com/about-two-factor-authentication)

