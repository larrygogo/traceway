import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getOrCreateSessionId, generateTraceId } from './id';

describe('ID Utils', () => {
  beforeEach(() => {
    // 清除 localStorage 中的 sessionId
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('__traceway_session_id__');
    }
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('__traceway_session_id__');
    }
  });

  describe('getOrCreateSessionId', () => {
    it('应该生成一个 session ID', () => {
      const sessionId = getOrCreateSessionId();
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('应该返回相同的 session ID（如果已存在）', () => {
      const sessionId1 = getOrCreateSessionId();
      const sessionId2 = getOrCreateSessionId();
      expect(sessionId1).toBe(sessionId2);
    });

    it('应该从 localStorage 恢复 session ID', () => {
      if (typeof localStorage !== 'undefined') {
        const originalId = 'test-session-id';
        localStorage.setItem('__traceway_session_id__', originalId);
        const sessionId = getOrCreateSessionId();
        expect(sessionId).toBe(originalId);
      }
    });
  });

  describe('generateTraceId', () => {
    it('应该生成一个 trace ID', () => {
      const traceId = generateTraceId();
      expect(traceId).toBeDefined();
      expect(typeof traceId).toBe('string');
      expect(traceId.length).toBeGreaterThan(0);
    });

    it('应该生成唯一的 trace ID', () => {
      const traceId1 = generateTraceId();
      const traceId2 = generateTraceId();
      expect(traceId1).not.toBe(traceId2);
    });
  });
});

