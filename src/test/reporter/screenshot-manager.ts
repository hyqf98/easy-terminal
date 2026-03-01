/**
 * 测试截图管理工具
 *
 * 用于管理测试过程中的截图保存和读取
 */

import type { ScreenshotRecord } from './types';

/**
 * 截图管理器
 *
 * 在浏览器环境中，这个类提供截图的记录和管理功能
 * 实际的截图保存由测试运行器或 Playwright 等工具处理
 */
export class ScreenshotManager {
  private screenshots: ScreenshotRecord[] = [];
  private outputDir: string;

  constructor(outputDir: string = 'test-reports/screenshots') {
    this.outputDir = outputDir;
  }

  /**
   * 记录截图
   *
   * @param testName - 测试名称
   * @param filename - 截图文件名
   * @param description - 截图描述
   */
  record(
    testName: string,
    filename: string,
    description?: string
  ): ScreenshotRecord {
    const record: ScreenshotRecord = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      testName,
      filename,
      path: `${this.outputDir}/${filename}`,
      description,
    };

    this.screenshots.push(record);
    return record;
  }

  /**
   * 获取所有截图记录
   */
  getAll(): ScreenshotRecord[] {
    return [...this.screenshots];
  }

  /**
   * 按测试名称获取截图
   */
  getByTestName(testName: string): ScreenshotRecord[] {
    return this.screenshots.filter((s) => s.testName === testName);
  }

  /**
   * 按时间范围获取截图
   */
  getByTimeRange(start: Date, end: Date): ScreenshotRecord[] {
    return this.screenshots.filter((s) => {
      const time = new Date(s.timestamp);
      return time >= start && time <= end;
    });
  }

  /**
   * 清除所有截图记录
   */
  clear(): void {
    this.screenshots = [];
  }

  /**
   * 导出截图记录为 JSON
   */
  toJson(): string {
    return JSON.stringify(this.screenshots, null, 2);
  }

  /**
   * 从 JSON 导入截图记录
   */
  fromJson(json: string): void {
    const records = JSON.parse(json) as ScreenshotRecord[];
    this.screenshots = records;
  }

  /**
   * 生成截图文件名
   *
   * @param testName - 测试名称
   * @param suffix - 文件名后缀
   */
  static generateFilename(testName: string, suffix?: string): string {
    // 清理测试名称中的特殊字符
    const cleaned = testName
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    const timestamp = Date.now();
    const suffixPart = suffix ? `-${suffix}` : '';

    return `${cleaned}-${timestamp}${suffixPart}.png`;
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `screenshot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Playwright 截图助手
 *
 * 用于在 Playwright 测试中自动记录截图
 */
export class PlaywrightScreenshotHelper {
  private manager: ScreenshotManager;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _page: unknown;

  constructor(manager: ScreenshotManager, page: unknown) {
    this.manager = manager;
    this._page = page;
  }

  /**
   * 截取并记录截图
   *
   * @param testName - 测试名称
   * @param description - 描述
   * @param _options - Playwright 截图选项（保留用于未来扩展）
   */
  async takeAndRecord(
    testName: string,
    description?: string,
    _options?: Record<string, unknown>
  ): Promise<ScreenshotRecord | null> {
    try {
      const filename = ScreenshotManager.generateFilename(testName);
      // 实际截图操作需要 page 对象支持
      // 这里只是记录，实际截图由测试代码完成
      return this.manager.record(testName, filename, description);
    } catch (error) {
      console.error('Screenshot failed:', error);
      return null;
    }
  }
}

/**
 * Vitest 截图助手
 *
 * 用于在 Vitest 测试中记录截图信息
 */
export class VitestScreenshotHelper {
  private manager: ScreenshotManager;

  constructor(manager: ScreenshotManager) {
    this.manager = manager;
  }

  /**
   * 记录手动截图
   *
   * 当测试代码手动保存截图后，调用此方法记录
   */
  record(
    testName: string,
    filename: string,
    description?: string
  ): ScreenshotRecord {
    return this.manager.record(testName, filename, description);
  }

  /**
   * 在测试失败时自动记录截图信息
   *
   * @param testName - 测试名称
   * @param error - 错误对象
   */
  recordFailure(testName: string, error: Error): ScreenshotRecord {
    const filename = ScreenshotManager.generateFilename(testName, 'failure');
    return this.manager.record(testName, filename, `失败: ${error.message}`);
  }
}

// 导出默认实例
export const screenshotManager = new ScreenshotManager();
