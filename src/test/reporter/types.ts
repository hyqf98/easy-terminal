/**
 * 测试报告生成器类型定义
 */

/**
 * 测试状态
 */
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'pending';

/**
 * 测试阶段
 */
export type TestPhase =
  | 'unit'        // 单元测试
  | 'integration' // 集成测试
  | 'e2e'         // 端到端测试
  | 'coverage';   // 覆盖率测试

/**
 * 单个测试用例结果
 */
export interface TestCaseResult {
  /** 测试名称 */
  name: string;
  /** 测试文件路径 */
  file: string;
  /** 测试状态 */
  status: TestStatus;
  /** 执行时间（毫秒） */
  duration: number;
  /** 错误信息（如果失败） */
  error?: string;
  /** 错误堆栈（如果失败） */
  stack?: string;
  /** 截图路径（如果有） */
  screenshot?: string;
}

/**
 * 测试套件结果
 */
export interface TestSuiteResult {
  /** 套件名称 */
  name: string;
  /** 测试文件路径 */
  file: string;
  /** 测试阶段 */
  phase: TestPhase;
  /** 测试用例列表 */
  tests: TestCaseResult[];
  /** 通过数量 */
  passed: number;
  /** 失败数量 */
  failed: number;
  /** 跳过数量 */
  skipped: number;
  /** 总执行时间（毫秒） */
  duration: number;
}

/**
 * 覆盖率数据
 */
export interface CoverageData {
  /** 行覆盖率百分比 */
  lines: number;
  /** 函数覆盖率百分比 */
  functions: number;
  /** 分支覆盖率百分比 */
  branches: number;
  /** 语句覆盖率百分比 */
  statements: number;
  /** 覆盖详情文件路径 */
  reportPath?: string;
}

/**
 * 修复记录
 */
export interface FixRecord {
  /** 记录 ID */
  id: string;
  /** 修复时间 */
  timestamp: string;
  /** 关联的测试用例 */
  testName: string;
  /** 测试文件 */
  testFile: string;
  /** 问题描述 */
  issue: string;
  /** 修复方案 */
  solution: string;
  /** 修改的文件 */
  files: string[];
  /** 修复状态 */
  status: 'fixed' | 'wontfix' | 'pending';
}

/**
 * 截图记录
 */
export interface ScreenshotRecord {
  /** 截图 ID */
  id: string;
  /** 截图时间 */
  timestamp: string;
  /** 关联的测试用例 */
  testName: string;
  /** 截图文件名 */
  filename: string;
  /** 截图路径 */
  path: string;
  /** 描述 */
  description?: string;
}

/**
 * 测试阶段结果
 */
export interface TestPhaseResult {
  /** 阶段名称 */
  phase: TestPhase;
  /** 阶段显示名称 */
  displayName: string;
  /** 是否通过 */
  passed: boolean;
  /** 测试套件列表 */
  suites: TestSuiteResult[];
  /** 覆盖率数据（仅 coverage 阶段） */
  coverage?: CoverageData;
  /** 统计数据 */
  stats: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

/**
 * 测试报告统计
 */
export interface TestReportStats {
  /** 总测试数 */
  totalTests: number;
  /** 通过数 */
  passed: number;
  /** 失败数 */
  failed: number;
  /** 跳过数 */
  skipped: number;
  /** 总执行时间（毫秒） */
  duration: number;
  /** 覆盖率数据 */
  coverage?: CoverageData;
  /** 通过率 */
  passRate: number;
}

/**
 * 完整测试报告
 */
export interface TestReport {
  /** 报告版本 */
  version: string;
  /** 报告生成时间 */
  timestamp: string;
  /** 项目名称 */
  projectName: string;
  /** 报告 ID */
  reportId: string;
  /** 各阶段结果 */
  phases: TestPhaseResult[];
  /** 统计数据 */
  stats: TestReportStats;
  /** 修复记录 */
  fixRecords: FixRecord[];
  /** 截图记录 */
  screenshots: ScreenshotRecord[];
  /** 环境信息 */
  environment: {
    node: string;
    platform: string;
    vitest: string;
    testRunner: string;
  };
}

/**
 * 报告生成选项
 */
export interface ReportOptions {
  /** 输出目录 */
  outputDir: string;
  /** 报告文件名 */
  filename: string;
  /** 是否包含截图 */
  includeScreenshots: boolean;
  /** 是否包含修复记录 */
  includeFixRecords: boolean;
  /** 是否生成 HTML 摘要 */
  generateHtmlSummary: boolean;
}

/**
 * Vitest 测试结果（从 vitest 输出解析）
 */
export interface VitestTestResult {
  /** 测试结果 */
  testResults: Array<{
    name: string;
    status: string;
    duration: number;
    failureMessages?: string[];
    ancestorTitles?: string[];
  }>;
  /** 覆盖率数据 */
  coverage?: {
    coverageMap: Record<string, {
      lines: { total: number; covered: number; percentage: number };
      functions: { total: number; covered: number; percentage: number };
      branches: { total: number; covered: number; percentage: number };
      statements: { total: number; covered: number; percentage: number };
    }>;
  };
}
