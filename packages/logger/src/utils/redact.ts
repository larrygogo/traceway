import type { LogEvent } from '../types';

/**
 * 默认需要脱敏的字段名
 */
const DEFAULT_REDACT_KEYS = [
  'token',
  'authorization',
  'auth',
  'password',
  'pwd',
  'passwd',
  'secret',
  'apiKey',
  'apikey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'phone',
  'mobile',
  'tel',
  'email',
  'idCard',
  'idcard',
  'id_card',
  'creditCard',
  'credit_card',
  'cardNo',
  'card_no',
];

/**
 * 默认脱敏正则模式
 */
const DEFAULT_REDACT_PATTERNS = [
  // Bearer token
  /Bearer\s+[\w-]+/gi,
  // 手机号（11位数字）
  /\b1[3-9]\d{9}\b/g,
  // 邮箱（简单匹配）
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
];

/**
 * 脱敏字符串
 */
const REDACTED_VALUE = '[REDACTED]';

/**
 * 检查字段名是否需要脱敏
 */
function shouldRedactKey(key: string, redactKeys: string[]): boolean {
  const lowerKey = key.toLowerCase();
  return redactKeys.some((pattern) => lowerKey.includes(pattern.toLowerCase()));
}

/**
 * 检查值是否匹配脱敏正则
 */
function shouldRedactValue(value: unknown, patterns: RegExp[]): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return patterns.some((pattern) => pattern.test(value));
}

/**
 * 递归脱敏对象
 */
function redactObject(
  obj: Record<string, unknown>,
  redactKeys: string[],
  patterns: RegExp[],
  visited = new WeakSet(),
): Record<string, unknown> {
  if (visited.has(obj)) {
    return obj;
  }
  visited.add(obj);

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // 检查字段名
    if (shouldRedactKey(key, redactKeys)) {
      result[key] = REDACTED_VALUE;
      continue;
    }

    // 检查值是否匹配正则
    if (shouldRedactValue(value, patterns)) {
      result[key] = REDACTED_VALUE;
      continue;
    }

    // 递归处理对象和数组
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        result[key] = value.map((item) => {
          if (item && typeof item === 'object') {
            return redactObject(item as Record<string, unknown>, redactKeys, patterns, visited);
          }
          if (shouldRedactValue(item, patterns)) {
            return REDACTED_VALUE;
          }
          return item;
        });
      } else {
        result[key] = redactObject(value as Record<string, unknown>, redactKeys, patterns, visited);
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 脱敏日志事件
 */
export function redactEvent(
  event: LogEvent,
  redactKeys?: string[],
  redactPatterns?: RegExp[],
): LogEvent {
  const keys = redactKeys || DEFAULT_REDACT_KEYS;
  const patterns = redactPatterns || DEFAULT_REDACT_PATTERNS;

  const redacted: LogEvent = { ...event };

  // 脱敏 data 字段
  if (redacted.data) {
    redacted.data = redactObject(redacted.data, keys, patterns);
  }

  // 脱敏 user 字段
  if (redacted.user) {
    redacted.user = redactObject(redacted.user as Record<string, unknown>, keys, patterns) as typeof event.user;
  }

  // 脱敏 breadcrumbs 中的 data
  if (redacted.breadcrumbs) {
    redacted.breadcrumbs = redacted.breadcrumbs.map((bc) => {
      if (bc.data) {
        return {
          ...bc,
          data: redactObject(bc.data, keys, patterns),
        };
      }
      return bc;
    });
  }

  return redacted;
}

