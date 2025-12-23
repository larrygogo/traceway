/**
 * 生成 UUID v4
 */
export function generateTraceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 获取或创建 Session ID
 * Session ID 存储在 localStorage 中，用于标识用户会话
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return generateTraceId();
  }

  const STORAGE_KEY = '__traceway_session_id__';
  let sessionId = localStorage.getItem(STORAGE_KEY);

  if (!sessionId) {
    sessionId = generateTraceId();
    try {
      localStorage.setItem(STORAGE_KEY, sessionId);
    } catch (e) {
      // localStorage 可能被禁用，忽略错误
    }
  }

  return sessionId;
}

