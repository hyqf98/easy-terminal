/**
 * 测试报告生成器单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TestReportGenerator,
  ScreenshotManager,
  FixRecordsManager,
  FixRecordTemplates,
} from '../index';
import type { TestPhaseResult, TestReport } from '../types';

describe('TestReportGenerator', () => {
  let generator: TestReportGenerator;

  beforeEach(() => {
    generator = new TestReportGenerator();
    generator.startTimer();
  });

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      expect(generator).toBeDefined();
    });

    it('应该正确计算执行时间', () => {
      const duration = generator.getDuration();
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('测试阶段管理', () => {
    it('应该正确添加测试阶段结果', () => {
      const phaseResult: TestPhaseResult = {
        phase: 'unit',
        displayName: '单元测试',
        passed: true,
        suites: [],
        stats: { total: 10, passed: 10, failed: 0, skipped: 0, duration: 100 },
      };

      generator.addPhaseResult('unit', phaseResult);
      const report = generator.generateReport();

      expect(report.phases).toHaveLength(1);
      expect(report.phases[0].phase).toBe('unit');
    });

    it('应该正确解析 Vitest 结果', () => {
      const vitestReport = {
        testResults: [
          {
            name: 'src/components/Button.test.ts',
            assertionResults: [
              { fullName: 'Button 应该渲染', status: 'passed', duration: 10 },
              { fullName: 'Button 应该响应点击', status: 'passed', duration: 5 },
              { fullName: 'Button 应该禁用', status: 'skipped', duration: 0 },
            ],
          },
        ],
      };

      const result = generator.parseVitestResults('unit', vitestReport);

      expect(result.phase).toBe('unit');
      expect(result.passed).toBe(true);
      expect(result.stats.total).toBe(3);
      expect(result.stats.passed).toBe(2);
      expect(result.stats.skipped).toBe(1);
      expect(result.suites).toHaveLength(1);
    });

    it('应该正确解析覆盖率报告', () => {
      const coverageReport = {
        'src/components/Button.vue': {
          lines: { pct: 80 },
          functions: { pct: 75 },
          branches: { pct: 60 },
          statements: { pct: 80 },
        },
        'src/components/Input.vue': {
          lines: { pct: 90 },
          functions: { pct: 85 },
          branches: { pct: 70 },
          statements: { pct: 90 },
        },
      };

      const result = generator.parseCoverageReport(coverageReport);

      expect(result).toBeDefined();
      expect(result!.lines).toBe(85); // (80 + 90) / 2
      expect(result!.functions).toBe(80); // (75 + 85) / 2
    });
  });

  describe('修复记录管理', () => {
    it('应该正确添加修复记录', () => {
      generator.addFixRecord({
        testName: '测试用例1',
        testFile: 'test.ts',
        issue: '测试失败',
        solution: '修复代码',
        files: ['src/component.vue'],
        status: 'fixed',
      });

      const report = generator.generateReport();
      expect(report.fixRecords).toHaveLength(1);
      expect(report.fixRecords[0].testName).toBe('测试用例1');
    });

    it('应该正确加载修复记录', () => {
      const records = [
        {
          id: 'fix-1',
          timestamp: '2026-03-01T00:00:00.000Z',
          testName: '测试1',
          testFile: 'test.ts',
          issue: '问题',
          solution: '解决方案',
          files: [],
          status: 'fixed' as const,
        },
      ];

      generator.loadFixRecords(records);
      const report = generator.generateReport();

      expect(report.fixRecords).toHaveLength(1);
    });
  });

  describe('截图管理', () => {
    it('应该正确添加截图记录', () => {
      generator.addScreenshot({
        testName: '测试用例1',
        filename: 'screenshot-1.png',
        path: 'screenshots/screenshot-1.png',
        description: '失败截图',
      });

      const report = generator.generateReport();
      expect(report.screenshots).toHaveLength(1);
      expect(report.screenshots[0].testName).toBe('测试用例1');
    });
  });

  describe('报告生成', () => {
    it('应该生成有效的 JSON 报告', () => {
      const json = generator.toJson();
      const parsed = JSON.parse(json) as TestReport;

      expect(parsed.version).toBe('1.0.0');
      expect(parsed.projectName).toBe('Easy Terminal');
      expect(parsed.reportId).toBeDefined();
      expect(parsed.timestamp).toBeDefined();
    });

    it('应该生成有效的 HTML 报告', () => {
      const html = generator.toHtml();

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Easy Terminal');
      expect(html).toContain('测试报告');
    });

    it('应该生成有效的 Markdown 报告', () => {
      const md = generator.toMarkdown();

      expect(md).toContain('# 测试报告');
      expect(md).toContain('Easy Terminal');
      expect(md).toContain('统计概览');
    });

    it('报告应该包含正确的统计数据', () => {
      const phaseResult: TestPhaseResult = {
        phase: 'unit',
        displayName: '单元测试',
        passed: false,
        suites: [],
        stats: { total: 10, passed: 8, failed: 2, skipped: 0, duration: 100 },
      };

      generator.addPhaseResult('unit', phaseResult);
      const report = generator.generateReport();

      expect(report.stats.totalTests).toBe(10);
      expect(report.stats.passed).toBe(8);
      expect(report.stats.failed).toBe(2);
      expect(report.stats.passRate).toBe(80);
    });

    it('报告应该包含环境信息', () => {
      const report = generator.generateReport();

      expect(report.environment).toBeDefined();
      expect(report.environment.platform).toBeDefined();
      expect(report.environment.testRunner).toBe('vitest');
    });
  });
});

describe('ScreenshotManager', () => {
  let manager: ScreenshotManager;

  beforeEach(() => {
    manager = new ScreenshotManager('test-screenshots');
  });

  describe('截图记录', () => {
    it('应该正确记录截图', () => {
      const record = manager.record('测试用例', 'screenshot.png', '描述');

      expect(record.id).toBeDefined();
      expect(record.testName).toBe('测试用例');
      expect(record.filename).toBe('screenshot.png');
      expect(record.path).toBe('test-screenshots/screenshot.png');
    });

    it('应该正确获取所有截图', () => {
      manager.record('测试1', 'screenshot1.png');
      manager.record('测试2', 'screenshot2.png');

      const all = manager.getAll();
      expect(all).toHaveLength(2);
    });

    it('应该按测试名称过滤截图', () => {
      manager.record('测试A', 'a1.png');
      manager.record('测试A', 'a2.png');
      manager.record('测试B', 'b1.png');

      const filtered = manager.getByTestName('测试A');
      expect(filtered).toHaveLength(2);
    });

    it('应该正确生成文件名', () => {
      const filename = ScreenshotManager.generateFilename('My Test Case', 'failure');

      expect(filename).toMatch(/^My-Test-Case-\d+-failure\.png$/);
    });

    it('应该正确导出和导入 JSON', () => {
      manager.record('测试1', 'screenshot1.png');
      manager.record('测试2', 'screenshot2.png');

      const json = manager.toJson();
      manager.clear();
      manager.fromJson(json);

      expect(manager.getAll()).toHaveLength(2);
    });
  });
});

describe('FixRecordsManager', () => {
  let manager: FixRecordsManager;

  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      store: {} as Record<string, string>,
      getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock.store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock.store[key];
      }),
      clear: vi.fn(() => {
        localStorageMock.store = {};
      }),
    };

    vi.stubGlobal('localStorage', localStorageMock);
    manager = new FixRecordsManager();
  });

  describe('修复记录管理', () => {
    it('应该正确添加修复记录', () => {
      const record = manager.add({
        testName: '测试1',
        testFile: 'test.ts',
        issue: '问题',
        solution: '解决方案',
        files: ['file.ts'],
        status: 'pending',
      });

      expect(record.id).toBeDefined();
      expect(record.timestamp).toBeDefined();
      expect(record.testName).toBe('测试1');
    });

    it('应该正确更新修复记录', () => {
      const record = manager.add({
        testName: '测试1',
        testFile: 'test.ts',
        issue: '问题',
        solution: '解决方案',
        files: [],
        status: 'pending',
      });

      const updated = manager.markAsFixed(record.id);

      expect(updated).toBeDefined();
      expect(updated!.status).toBe('fixed');
    });

    it('应该正确删除修复记录', () => {
      const record = manager.add({
        testName: '测试1',
        testFile: 'test.ts',
        issue: '问题',
        solution: '解决方案',
        files: [],
        status: 'pending',
      });

      const deleted = manager.delete(record.id);
      expect(deleted).toBe(true);
      expect(manager.getById(record.id)).toBeUndefined();
    });

    it('应该按状态过滤记录', () => {
      manager.add({
        testName: '测试1',
        testFile: 'test.ts',
        issue: '问题1',
        solution: '方案1',
        files: [],
        status: 'pending',
      });
      manager.add({
        testName: '测试2',
        testFile: 'test.ts',
        issue: '问题2',
        solution: '方案2',
        files: [],
        status: 'fixed',
      });

      const pending = manager.getPending();
      const fixed = manager.getFixed();

      expect(pending).toHaveLength(1);
      expect(fixed).toHaveLength(1);
    });

    it('应该正确计算统计信息', () => {
      manager.add({
        testName: '测试1',
        testFile: 'test.ts',
        issue: '问题1',
        solution: '方案1',
        files: [],
        status: 'pending',
      });
      manager.add({
        testName: '测试2',
        testFile: 'test.ts',
        issue: '问题2',
        solution: '方案2',
        files: [],
        status: 'fixed',
      });
      manager.add({
        testName: '测试3',
        testFile: 'test.ts',
        issue: '问题3',
        solution: '方案3',
        files: [],
        status: 'wontfix',
      });

      const stats = manager.getStats();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.fixed).toBe(1);
      expect(stats.wontfix).toBe(1);
    });
  });
});

describe('FixRecordTemplates', () => {
  it('应该生成组件渲染失败模板', () => {
    const template = FixRecordTemplates.componentRenderFailure(
      'Button',
      '未找到元素',
      '修复选择器'
    );

    expect(template.testName).toBe('Button 渲染测试');
    expect(template.issue).toContain('组件渲染失败');
    expect(template.solution).toBe('修复选择器');
  });

  it('应该生成 Mock 配置错误模板', () => {
    const template = FixRecordTemplates.mockConfigurationError(
      'Terminal',
      '未定义',
      '添加 mock'
    );

    expect(template.testName).toBe('Mock 配置测试');
    expect(template.issue).toContain('Mock Terminal');
  });

  it('应该生成异步超时模板', () => {
    const template = FixRecordTemplates.asyncTimeout(
      '异步测试',
      'test.ts',
      5000
    );

    expect(template.testName).toBe('异步测试');
    expect(template.issue).toContain('5000ms');
  });

  it('应该生成状态断言失败模板', () => {
    const template = FixRecordTemplates.stateAssertionFailure(
      'Input',
      'focused',
      'blurred'
    );

    expect(template.testName).toBe('Input 状态测试');
    expect(template.issue).toContain('期望 focused');
    expect(template.issue).toContain('实际 blurred');
  });
});
