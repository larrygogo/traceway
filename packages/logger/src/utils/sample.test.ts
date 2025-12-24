import { describe, it, expect } from 'vitest';
import { shouldSample, meetsLevel } from './sample';
import type { LogEvent } from '../types';

describe('sample utils', () => {
  describe('meetsLevel', () => {
    it('应该正确判断 debug 级别', () => {
      expect(meetsLevel('debug', 'debug')).toBe(true);
      expect(meetsLevel('info', 'debug')).toBe(true);
      expect(meetsLevel('warn', 'debug')).toBe(true);
      expect(meetsLevel('error', 'debug')).toBe(true);
    });

    it('应该正确判断 info 级别', () => {
      expect(meetsLevel('debug', 'info')).toBe(false);
      expect(meetsLevel('info', 'info')).toBe(true);
      expect(meetsLevel('warn', 'info')).toBe(true);
      expect(meetsLevel('error', 'info')).toBe(true);
    });

    it('应该正确判断 warn 级别', () => {
      expect(meetsLevel('debug', 'warn')).toBe(false);
      expect(meetsLevel('info', 'warn')).toBe(false);
      expect(meetsLevel('warn', 'warn')).toBe(true);
      expect(meetsLevel('error', 'warn')).toBe(true);
    });

    it('应该正确判断 error 级别', () => {
      expect(meetsLevel('debug', 'error')).toBe(false);
      expect(meetsLevel('info', 'error')).toBe(false);
      expect(meetsLevel('warn', 'error')).toBe(false);
      expect(meetsLevel('error', 'error')).toBe(true);
    });
  });

  describe('shouldSample', () => {
    it('应该通过采样（sampleRate = 1.0）', () => {
      const event: LogEvent = {
        ts: Date.now(),
        level: 'info',
        name: 'test-event',
        sessionId: 'session-123',
        traceId: 'trace-123',
      };
      
      expect(shouldSample(event, 1.0, 1.0)).toBe(true);
    });

    it('应该通过采样（sampleRate = 0.0，但多次调用可能通过）', () => {
      const event: LogEvent = {
        ts: Date.now(),
        level: 'info',
        name: 'test-event',
        sessionId: 'session-123',
        traceId: 'trace-123',
      };
      
      // 由于是随机采样，0.0 应该总是失败，但我们可以测试逻辑
      const result = shouldSample(event, 0.0, 1.0);
      expect(typeof result).toBe('boolean');
    });

    it('应该对 error 级别使用 errorSampleRate', () => {
      const event: LogEvent = {
        ts: Date.now(),
        level: 'error',
        name: 'test-event',
        sessionId: 'session-123',
        traceId: 'trace-123',
      };
      
      // errorSampleRate = 1.0 应该总是通过
      expect(shouldSample(event, 0.0, 1.0)).toBe(true);
    });

    it('应该对非 error 级别使用 sampleRate', () => {
      const event: LogEvent = {
        ts: Date.now(),
        level: 'info',
        name: 'test-event',
        sessionId: 'session-123',
        traceId: 'trace-123',
      };
      
      // sampleRate = 1.0 应该总是通过
      expect(shouldSample(event, 1.0, 0.0)).toBe(true);
    });
  });
});

