import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConsoleTransport } from './console';
import type { LogEvent } from '../types';

describe('ConsoleTransport', () => {
  let transport: ConsoleTransport;
  const originalConsoleMethods = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
    log: console.log,
  };

  beforeEach(() => {
    transport = new ConsoleTransport();
    
    // Mock console methods
    console.debug = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.log = vi.fn();
  });

  afterEach(() => {
    // 恢复原始 console 方法
    console.debug = originalConsoleMethods.debug;
    console.info = originalConsoleMethods.info;
    console.warn = originalConsoleMethods.warn;
    console.error = originalConsoleMethods.error;
    console.log = originalConsoleMethods.log;
  });

  it('应该能够发送 debug 级别的事件', () => {
    const event: LogEvent = {
      ts: Date.now(),
      level: 'debug',
      name: 'test-event',
      msg: 'test message',
      sessionId: 'session-123',
      traceId: 'trace-123',
    };

    transport.send([event]);

    expect(console.debug).toHaveBeenCalled();
    expect(console.debug).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG]'),
      expect.objectContaining({
        timestamp: expect.any(String),
        sessionId: 'session-123',
        traceId: 'trace-123',
      }),
    );
  });

  it('应该能够发送 info 级别的事件', () => {
    const event: LogEvent = {
      ts: Date.now(),
      level: 'info',
      name: 'test-event',
      msg: 'test message',
      sessionId: 'session-123',
      traceId: 'trace-123',
    };

    transport.send([event]);

    expect(console.info).toHaveBeenCalled();
  });

  it('应该能够发送 warn 级别的事件', () => {
    const event: LogEvent = {
      ts: Date.now(),
      level: 'warn',
      name: 'test-event',
      msg: 'test message',
      sessionId: 'session-123',
      traceId: 'trace-123',
    };

    transport.send([event]);

    expect(console.warn).toHaveBeenCalled();
  });

  it('应该能够发送 error 级别的事件', () => {
    const event: LogEvent = {
      ts: Date.now(),
      level: 'error',
      name: 'test-event',
      msg: 'test message',
      sessionId: 'session-123',
      traceId: 'trace-123',
    };

    transport.send([event]);

    expect(console.error).toHaveBeenCalled();
  });

  it('应该包含事件数据', () => {
    const event: LogEvent = {
      ts: Date.now(),
      level: 'info',
      name: 'test-event',
      msg: 'test message',
      data: { key: 'value', number: 123 },
      sessionId: 'session-123',
      traceId: 'trace-123',
    };

    transport.send([event]);

    expect(console.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        key: 'value',
        number: 123,
      }),
    );
  });

  it('应该包含 breadcrumbs', () => {
    const event: LogEvent = {
      ts: Date.now(),
      level: 'info',
      name: 'test-event',
      msg: 'test message',
      sessionId: 'session-123',
      traceId: 'trace-123',
      breadcrumbs: [
        {
          ts: Date.now(),
          type: 'log',
          message: 'breadcrumb message',
        },
      ],
    };

    transport.send([event]);

    expect(console.info).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        breadcrumbs: expect.arrayContaining([
          expect.objectContaining({
            message: 'breadcrumb message',
          }),
        ]),
      }),
    );
  });

  it('应该能够批量发送多个事件', () => {
    const events: LogEvent[] = [
      {
        ts: Date.now(),
        level: 'info',
        name: 'event-1',
        sessionId: 'session-123',
        traceId: 'trace-123',
      },
      {
        ts: Date.now(),
        level: 'warn',
        name: 'event-2',
        sessionId: 'session-123',
        traceId: 'trace-123',
      },
    ];

    transport.send(events);

    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});

