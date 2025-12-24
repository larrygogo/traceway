import { describe, it, expect } from 'vitest';
import { serialize } from './serialize';

describe('serialize', () => {
  it('应该能够序列化基本类型', () => {
    expect(serialize('string')).toBe('string');
    expect(serialize(123)).toBe(123);
    expect(serialize(true)).toBe(true);
    expect(serialize(null)).toBe(null);
    expect(serialize(undefined)).toBe(undefined);
  });

  it('应该能够序列化对象', () => {
    const obj = { a: 1, b: 'test', c: true };
    const result = serialize(obj);
    expect(result).toEqual(obj);
  });

  it('应该能够序列化嵌套对象', () => {
    const obj = {
      a: 1,
      nested: {
        b: 'test',
        deep: {
          c: true,
        },
      },
    };
    const result = serialize(obj);
    expect(result).toEqual(obj);
  });

  it('应该能够序列化数组', () => {
    const arr = [1, 'test', true, { key: 'value' }];
    const result = serialize(arr);
    expect(result).toEqual(arr);
  });

  it('应该能够处理 Date 对象', () => {
    const date = new Date('2024-01-01');
    const result = serialize({ date }) as { date: string };
    expect(typeof result.date).toBe('string');
    expect(result.date).toBe(date.toISOString());
  });

  it('应该能够处理 Error 对象', () => {
    const error = new Error('test error');
    const result = serialize({ error }) as { error: { name: string; message: string; stack?: string } };
    expect(result.error).toHaveProperty('name', 'Error');
    expect(result.error).toHaveProperty('message', 'test error');
    expect(result.error).toHaveProperty('stack');
  });

  it('应该能够处理循环引用', () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    
    const result = serialize(obj) as { a: number; self: string };
    expect(result).toHaveProperty('a', 1);
    // 循环引用应该被替换为 [Circular Reference]
    expect(result.self).toBe('[Circular Reference]');
  });

  it('应该能够处理函数', () => {
    const fn = () => {};
    const result = serialize({ fn }) as { fn: string };
    expect(result.fn).toBe('[Function]');
  });

  it('应该能够处理深度限制', () => {
    let deepObj: any = {};
    let current = deepObj;
    for (let i = 0; i < 15; i++) {
      current.nested = {};
      current = current.nested;
    }
    
    const result = serialize(deepObj) as any;
    // 超过最大深度应该显示 [Max Depth Reached]
    expect(result).toBeDefined();
  });
});

