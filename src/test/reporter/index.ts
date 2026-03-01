/**
 * 测试报告生成器模块
 *
 * 提供完整的测试报告生成功能，包括：
 * - JSON/HTML/Markdown 格式报告
 * - 测试截图管理
 * - 修复记录跟踪
 * - 覆盖率数据整合
 */

// 类型导出
export type {
  TestStatus,
  TestPhase,
  TestCaseResult,
  TestSuiteResult,
  CoverageData,
  FixRecord,
  ScreenshotRecord,
  TestPhaseResult,
  TestReportStats,
  TestReport,
  ReportOptions,
  VitestTestResult,
} from './types';

// 主生成器
export { TestReportGenerator, testReportGenerator } from './generator';

// 截图管理
export {
  ScreenshotManager,
  PlaywrightScreenshotHelper,
  VitestScreenshotHelper,
  screenshotManager,
} from './screenshot-manager';

// 修复记录管理
export {
  FixRecordsManager,
  FixRecordTemplates,
  fixRecordsManager,
} from './fix-records-manager';
