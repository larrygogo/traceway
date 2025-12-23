import type { LogEvent, LogLevel } from '../types';

/**
 * 采样函数
 * 返回 true 表示通过采样，false 表示被过滤
 */
export function shouldSample(
  event: LogEvent,
  sampleRate: number,
  errorSampleRate: number,
): boolean {
  // Error 事件使用 errorSampleRate
  if (event.level === 'error') {
    return Math.random() < errorSampleRate;
  }

  // 其他事件使用 sampleRate
  return Math.random() < sampleRate;
}

/**
 * 获取日志级别的数值，用于比较
 */
export function getLevelValue(level: LogLevel): number {
  const levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };
  return levels[level];
}

/**
 * 检查事件级别是否满足最低级别要求
 */
export function meetsLevel(eventLevel: LogLevel, minLevel: LogLevel): boolean {
  return getLevelValue(eventLevel) >= getLevelValue(minLevel);
}

