import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // 在 CI 环境中自动使用 run 模式（检测 CI 环境变量）
    watch: process.env.CI ? false : undefined,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});

