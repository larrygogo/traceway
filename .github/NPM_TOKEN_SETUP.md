# npm 发布配置指南

根据 [npm 官方文档](https://docs.npmjs.com/about-access-tokens)，从 2025年11月起，npm 只支持 **Granular Access Tokens**，Legacy tokens 已被移除。

## 配置 Granular Access Token

要发布包到 npm，需要创建一个带有 **Bypass 2FA** 权限的 Granular Access Token。

如果无法使用 Trusted Publishing，可以使用带有 Bypass 2FA 的 token。

### 1. 创建 Granular Access Token

1. 访问 npm tokens 设置页面：https://www.npmjs.com/settings/[你的用户名]/tokens
2. 点击 **"Generate New Token"** → 选择 **"Granular Access Token"**

### 2. 配置 Token

根据 [npm 官方文档](https://docs.npmjs.com/about-access-tokens)，Granular Access Tokens 支持以下配置：

**必需配置项：**

- **Token name**: 例如 `github-actions-publish`（用于识别用途）
- **Token type**: 选择 **"Automation"**（用于 CI/CD 环境）
- **Expiration**: 设置过期时间（建议 1 年，至少 1 天）
- **Package access**: 
  - 选择 **"Restricted"**
  - 在 "Add packages" 或 "Add scopes" 中输入 `@traceway` scope
- **Permissions**: 必须勾选
  - ✅ **Read packages**（读取包）
  - ✅ **Write packages**（发布包）
- **⚠️ 关键：Bypass 2FA**: 
  - 必须勾选此选项
  - 这是发布包所必需的，即使账户没有启用 2FA
  - 根据文档："When the Bypass 2FA option is set to true, this setting takes precedence over account-level and package-level 2FA settings"

### 3. 验证 Token 类型

创建成功后，token 应该以 `npm_` 开头（Granular Access Token）。Legacy tokens 已被移除，不再支持。

### 4. 更新 GitHub Secret

1. 复制生成的 token（以 `npm_` 开头）
2. 在 GitHub 仓库中：
   - 进入 **Settings** → **Secrets and variables** → **Actions**
   - 找到或创建 `NPM_TOKEN` secret
   - 粘贴 token 并保存

### 5. Token 限制说明

根据 npm 文档，Granular Access Tokens 有以下限制：
- 每个账户最多创建 1000 个 token
- 每个 token 可以访问最多 50 个组织
- 每个 token 可以访问最多 50 个包、50 个 scope，或两者的组合（总计 50）
- Token 的权限不能超过用户本身的权限

---

## 常见问题

**Q: 为什么必须使用 Granular Access Token？**
A: 根据 [npm 官方文档](https://docs.npmjs.com/about-access-tokens)，从 2025年11月起，Legacy access tokens 已被移除，只支持 Granular Access Tokens。

**Q: 为什么需要 Bypass 2FA？**
A: 根据 npm 文档，Bypass 2FA 功能适用于具有写入权限的 token。当设置为 true 时，此设置会优先于账户级别和包级别的 2FA 设置。在 CI/CD 环境中无法进行交互式 2FA 验证，因此必须启用此选项才能发布包。

**Q: 我的账户没有启用 2FA，还需要 Bypass 2FA 吗？**
A: 是的，即使账户没有启用 2FA，发布包时仍然需要使用带有 Bypass 2FA 权限的 token。这是 npm 的安全策略要求。

**Q: Token 过期了怎么办？**
A: 可以在 npm tokens 页面查看 token 的过期时间，在过期前创建新 token 并更新 GitHub Secret。建议设置较长的过期时间（如 1 年）以减少维护工作。

**Q: 如何验证 token 是否正确配置？**
A: 可以在本地测试：
```bash
export NPM_TOKEN="你的token"
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc
npm whoami
# 应该显示你的 npm 用户名
```

**Q: 如何验证 token 是否正确？**
A: 可以在本地测试：
```bash
export NPM_TOKEN="你的token"
npm config set //registry.npmjs.org/:_authToken $NPM_TOKEN
npm whoami
# 应该显示你的 npm 用户名
```

## 参考链接

- [npm Access Tokens 官方文档](https://docs.npmjs.com/about-access-tokens)
- [创建和查看 Access Tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens)
- [npm 2FA 要求说明](https://docs.npmjs.com/about-two-factor-authentication)

