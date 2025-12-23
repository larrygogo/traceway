/**
 * 序列化选项
 */
interface SerializeOptions {
  maxDepth?: number;
  maxStringLength?: number;
}

const DEFAULT_OPTIONS: Required<SerializeOptions> = {
  maxDepth: 10,
  maxStringLength: 10000,
};

/**
 * 深度序列化对象，防止循环引用，限制深度和字符串长度
 */
export function serialize(
  value: unknown,
  options: SerializeOptions = {},
): unknown {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const visited = new WeakSet();

  function serializeValue(val: unknown, depth: number): unknown {
    // 深度限制
    if (depth > opts.maxDepth) {
      return '[Max Depth Reached]';
    }

    // 基本类型
    if (val === null || val === undefined) {
      return val;
    }

    if (typeof val === 'boolean' || typeof val === 'number') {
      return val;
    }

    if (typeof val === 'string') {
      if (val.length > opts.maxStringLength) {
        return val.substring(0, opts.maxStringLength) + '...[truncated]';
      }
      return val;
    }

    // 函数
    if (typeof val === 'function') {
      return '[Function]';
    }

    // Symbol
    if (typeof val === 'symbol') {
      return val.toString();
    }

    // BigInt
    if (typeof val === 'bigint') {
      return val.toString();
    }

    // 日期
    if (val instanceof Date) {
      return val.toISOString();
    }

    // 错误对象
    if (val instanceof Error) {
      return {
        name: val.name,
        message: val.message,
        stack: val.stack,
        cause: val.cause ? serializeValue(val.cause, depth + 1) : undefined,
      };
    }

    // 数组
    if (Array.isArray(val)) {
      return val.map((item) => serializeValue(item, depth + 1));
    }

    // 对象
    if (typeof val === 'object') {
      // 检查循环引用
      if (visited.has(val as object)) {
        return '[Circular Reference]';
      }

      visited.add(val as object);

      try {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(val)) {
          result[key] = serializeValue(value, depth + 1);
        }
        return result;
      } catch (e) {
        return '[Serialization Error]';
      }
    }

    return String(val);
  }

  try {
    return serializeValue(value, 0);
  } catch (e) {
    return '[Serialization Error]';
  }
}

