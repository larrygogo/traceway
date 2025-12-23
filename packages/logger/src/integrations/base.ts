import type { Integration, Logger } from '../types';

/**
 * Integration 基类
 */
export abstract class BaseIntegration implements Integration {
  abstract setup(logger: Logger): void;
  teardown?(): void;
}

