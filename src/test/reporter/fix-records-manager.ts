/**
 * 修复记录管理模块
 *
 * 用于管理测试失败的修复记录，跟踪修复进度
 */

import type { FixRecord } from './types';

/**
 * 修复记录存储键
 */
const STORAGE_KEY = 'test-fix-records';

/**
 * 修复记录管理器
 */
export class FixRecordsManager {
  private records: FixRecord[] = [];
  private storageAvailable: boolean = false;

  constructor() {
    // 检查 localStorage 是否可用（仅在浏览器环境）
    this.storageAvailable = this.checkStorage();
    this.loadFromStorage();
  }

  /**
   * 添加修复记录
   */
  add(record: Omit<FixRecord, 'id' | 'timestamp'>): FixRecord {
    const newRecord: FixRecord = {
      ...record,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    this.records.push(newRecord);
    this.saveToStorage();

    return newRecord;
  }

  /**
   * 更新修复记录
   */
  update(id: string, updates: Partial<FixRecord>): FixRecord | undefined {
    const index = this.records.findIndex((r) => r.id === id);
    if (index === -1) return undefined;

    this.records[index] = {
      ...this.records[index],
      ...updates,
      // 不允许修改 id 和 timestamp
      id: this.records[index].id,
      timestamp: this.records[index].timestamp,
    };

    this.saveToStorage();
    return this.records[index];
  }

  /**
   * 删除修复记录
   */
  delete(id: string): boolean {
    const index = this.records.findIndex((r) => r.id === id);
    if (index === -1) return false;

    this.records.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  /**
   * 获取所有记录
   */
  getAll(): FixRecord[] {
    return [...this.records];
  }

  /**
   * 按 ID 获取记录
   */
  getById(id: string): FixRecord | undefined {
    return this.records.find((r) => r.id === id);
  }

  /**
   * 按测试名称获取记录
   */
  getByTestName(testName: string): FixRecord[] {
    return this.records.filter((r) =>
      r.testName.toLowerCase().includes(testName.toLowerCase())
    );
  }

  /**
   * 按状态获取记录
   */
  getByStatus(status: FixRecord['status']): FixRecord[] {
    return this.records.filter((r) => r.status === status);
  }

  /**
   * 获取待处理的修复记录
   */
  getPending(): FixRecord[] {
    return this.getByStatus('pending');
  }

  /**
   * 获取已修复的记录
   */
  getFixed(): FixRecord[] {
    return this.getByStatus('fixed');
  }

  /**
   * 标记为已修复
   */
  markAsFixed(id: string): FixRecord | undefined {
    return this.update(id, { status: 'fixed' });
  }

  /**
   * 标记为不修复
   */
  markAsWontFix(id: string): FixRecord | undefined {
    return this.update(id, { status: 'wontfix' });
  }

  /**
   * 清除所有记录
   */
  clear(): void {
    this.records = [];
    this.saveToStorage();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    fixed: number;
    pending: number;
    wontfix: number;
  } {
    return {
      total: this.records.length,
      fixed: this.getByStatus('fixed').length,
      pending: this.getByStatus('pending').length,
      wontfix: this.getByStatus('wontfix').length,
    };
  }

  /**
   * 导出为 JSON
   */
  toJson(): string {
    return JSON.stringify(this.records, null, 2);
  }

  /**
   * 从 JSON 导入
   */
  fromJson(json: string): void {
    try {
      const records = JSON.parse(json) as FixRecord[];
      this.records = records;
      this.saveToStorage();
    } catch (error) {
      console.error('Failed to parse fix records:', error);
    }
  }

  /**
   * 加载存储的记录
   */
  private loadFromStorage(): void {
    if (!this.storageAvailable) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.records = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load fix records from storage:', error);
      this.records = [];
    }
  }

  /**
   * 保存到存储
   */
  private saveToStorage(): void {
    if (!this.storageAvailable) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
    } catch (error) {
      console.error('Failed to save fix records to storage:', error);
    }
  }

  /**
   * 检查存储是否可用
   */
  private checkStorage(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `fix-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * 修复记录模板
 *
 * 用于快速创建常见的修复记录
 */
export const FixRecordTemplates = {
  /**
   * 组件渲染失败
   */
  componentRenderFailure: (
    componentName: string,
    error: string,
    solution: string
  ): Omit<FixRecord, 'id' | 'timestamp'> => ({
    testName: `${componentName} 渲染测试`,
    testFile: `src/components/${componentName}.test.ts`,
    issue: `组件渲染失败: ${error}`,
    solution,
    files: [`src/components/${componentName}.vue`],
    status: 'pending',
  }),

  /**
   * Mock 配置错误
   */
  mockConfigurationError: (
    mockName: string,
    error: string,
    solution: string
  ): Omit<FixRecord, 'id' | 'timestamp'> => ({
    testName: 'Mock 配置测试',
    testFile: 'src/test/mocks/test.ts',
    issue: `Mock ${mockName} 配置错误: ${error}`,
    solution,
    files: [`src/test/mocks/${mockName}.mock.ts`],
    status: 'pending',
  }),

  /**
   * 异步操作超时
   */
  asyncTimeout: (
    testName: string,
    testFile: string,
    timeout: number
  ): Omit<FixRecord, 'id' | 'timestamp'> => ({
    testName,
    testFile,
    issue: `异步操作超时 (${timeout}ms)`,
    solution: '检查异步操作是否正确等待，或增加超时时间',
    files: [testFile],
    status: 'pending',
  }),

  /**
   * 状态断言失败
   */
  stateAssertionFailure: (
    componentName: string,
    expected: string,
    actual: string
  ): Omit<FixRecord, 'id' | 'timestamp'> => ({
    testName: `${componentName} 状态测试`,
    testFile: `src/components/${componentName}.test.ts`,
    issue: `状态断言失败: 期望 ${expected}, 实际 ${actual}`,
    solution: '检查组件状态更新逻辑或修正断言条件',
    files: [`src/components/${componentName}.vue`],
    status: 'pending',
  }),
};

// 导出默认实例
export const fixRecordsManager = new FixRecordsManager();
