/**
 * 获取当前时间戳（毫秒）
 */
export function getTimestamp(): number {
  return Date.now();
}

/**
 * 获取时区偏移（分钟）
 */
export function getTimezoneOffset(): number {
  if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    try {
      return new Date().getTimezoneOffset();
    } catch {
      return 0;
    }
  }
  return 0;
}

/**
 * 获取时区字符串
 */
export function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/**
 * 获取语言代码
 */
export function getLanguage(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return '';
}

