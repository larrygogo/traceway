import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLogger } from './logger';
import type { Logger, LogEvent, User } from './types';
import { ConsoleTransport } from './transports/console';

describe('createLogger', () => {
  it('应该创建一个 logger 实例', () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('应该使用自定义配置创建 logger', () => {
    const logger = createLogger({
      level: 'warn',
      app: 'test-app',
      env: 'test',
    });
    expect(logger).toBeDefined();
  });
});

describe('Logger', () => {
  let logger: Logger;
  let mockTransport: {
    send: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockTransport = {
      send: vi.fn(),
    };
    logger = createLogger({
      transports: [mockTransport as any],
      level: 'debug',
      flushIntervalMs: 100,
    });
  });

  afterEach(async () => {
    await logger.destroy();
  });

  describe('日志方法', () => {
    it('应该能够记录 debug 日志', async () => {
      logger.debug('test-event', 'test message', { key: 'value' });
      await logger.flush();
      
      expect(mockTransport.send).toHaveBeenCalled();
      const events = mockTransport.send.mock.calls[0][0] as LogEvent[];
      expect(events).toHaveLength(1);
      expect(events[0].level).toBe('debug');
      expect(events[0].name).toBe('test-event');
      expect(events[0].msg).toBe('test message');
    });

    it('应该能够记录 info 日志', async () => {
      logger.info('test-event', 'test message');
      await logger.flush();
      
      expect(mockTransport.send).toHaveBeenCalled();
      const events = mockTransport.send.mock.calls[0][0] as LogEvent[];
      expect(events[0].level).toBe('info');
    });

    it('应该能够记录 warn 日志', async () => {
      logger.warn('test-event', 'test message');
      await logger.flush();
      
      expect(mockTransport.send).toHaveBeenCalled();
      const events = mockTransport.send.mock.calls[0][0] as LogEvent[];
      expect(events[0].level).toBe('warn');
    });

    it('应该能够记录 error 日志', async () => {
      logger.error('test-event', 'test message');
      await logger.flush();
      
      expect(mockTransport.send).toHaveBeenCalled();
      const events = mockTransport.send.mock.calls[0][0] as LogEvent[];
      expect(events[0].level).toBe('error');
    });

    it('应该包含必要的事件字段', async () => {
      logger.info('test-event', 'test message', { data: 'value' });
      await logger.flush();
      
      const events = mockTransport.send.mock.calls[0][0] as LogEvent[];
      const event = events[0];
      expect(event).toHaveProperty('ts');
      expect(event).toHaveProperty('level');
      expect(event).toHaveProperty('name');
      expect(event).toHaveProperty('sessionId');
      expect(event).toHaveProperty('traceId');
      expect(event.msg).toBe('test message');
      expect(event.data).toEqual({ data: 'value' });
    });
  });

  describe('级别过滤', () => {
    it('应该过滤低于配置级别的日志', async () => {
      const warnLogger = createLogger({
        transports: [mockTransport as any],
        level: 'warn',
        flushIntervalMs: 100,
      });

      warnLogger.debug('debug-event', 'should be filtered');
      warnLogger.info('info-event', 'should be filtered');
      warnLogger.warn('warn-event', 'should pass');
      await warnLogger.flush();

      expect(mockTransport.send).toHaveBeenCalled();
      const events = mockTransport.send.mock.calls[0][0] as LogEvent[];
      expect(events).toHaveLength(1);
      expect(events[0].level).toBe('warn');

      await warnLogger.destroy();
    });
  });

  describe('用户管理', () => {
    it('应该能够设置用户信息', async () => {
      const user: User = {
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
      };
      // 创建不脱敏的 logger 来测试用户信息
      const loggerWithoutRedact = createLogger({
        transports: [mockTransport as any],
        level: 'debug',
        flushIntervalMs: 100,
        redactKeys: [], // 禁用字段名脱敏
        redactPatterns: [], // 禁用正则脱敏
      });
      loggerWithoutRedact.setUser(user);
      loggerWithoutRedact.info('test-event', 'test message');
      await loggerWithoutRedact.flush();

      const events = mockTransport.send.mock.calls[0][0] as LogEvent[];
      expect(events[0].user).toEqual(user);
      await loggerWithoutRedact.destroy();
    });

    it('应该能够清除用户信息', async () => {
      logger.setUser({ id: '123' });
      logger.setUser(null);
      logger.info('test-event', 'test message');
      await logger.flush();

      const events = mockTransport.send.mock.calls[0][0] as LogEvent[];
      expect(events[0].user).toBeUndefined();
    });
  });

  describe('上下文管理', () => {
    it('应该能够设置上下文', async () => {
      logger.setContext({
        app: 'test-app',
        env: 'test',
        release: '1.0.0',
      });
      logger.info('test-event', 'test message');
      await logger.flush();

      const events = mockTransport.send.mock.calls[0][0] as LogEvent[];
      expect(events[0].app).toBe('test-app');
      expect(events[0].env).toBe('test');
      expect(events[0].release).toBe('1.0.0');
    });

    it('应该能够更新部分上下文', async () => {
      logger.setContext({ app: 'test-app' });
      logger.setContext({ env: 'production' });
      logger.info('test-event', 'test message');
      await logger.flush();

      const events = mockTransport.send.mock.calls[0][0] as LogEvent[];
      expect(events[0].app).toBe('test-app');
      expect(events[0].env).toBe('production');
    });
  });

  describe('beforeSend 钩子', () => {
    it('应该能够修改事件', async () => {
      const loggerWithHook = createLogger({
        transports: [mockTransport as any],
        beforeSend: (event) => {
          return {
            ...event,
            msg: 'modified message',
          };
        },
        flushIntervalMs: 100,
      });

      loggerWithHook.info('test-event', 'original message');
      await loggerWithHook.flush();

      const events = mockTransport.send.mock.calls[0][0] as LogEvent[];
      expect(events[0].msg).toBe('modified message');

      await loggerWithHook.destroy();
    });

    it('应该能够丢弃事件', async () => {
      const loggerWithHook = createLogger({
        transports: [mockTransport as any],
        beforeSend: () => null,
        flushIntervalMs: 100,
      });

      loggerWithHook.info('test-event', 'should be dropped');
      await loggerWithHook.flush();

      expect(mockTransport.send).not.toHaveBeenCalled();

      await loggerWithHook.destroy();
    });
  });

  describe('flush', () => {
    it('应该能够手动刷新队列', async () => {
      logger.info('test-event', 'test message');
      await logger.flush();
      
      expect(mockTransport.send).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('应该能够销毁 logger', async () => {
      await expect(logger.destroy()).resolves.not.toThrow();
    });
  });
});

