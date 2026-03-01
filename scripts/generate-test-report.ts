/**
 * 测试报告生成脚本
 *
 * 用法:
 *   npx tsx scripts/generate-test-report.ts
 *   npx tsx scripts/generate-test-report.ts --output-dir custom-dir
 */

import * as fs from 'fs';
import * as path from 'path';
import { TestReportGenerator } from '../src/test/reporter/generator';
import type { TestReport, TestPhaseResult, CoverageData } from '../src/test/reporter/types';

// 命令行参数解析
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: string): string => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};

const outputDir = getArg('output-dir', 'test-reports');
const projectName = 'Easy Terminal';

/**
 * 读取 JSON 文件
 */
function readJsonFile<T>(filePath: string): T | null {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}:`, error);
  }
  return null;
}

/**
 * 解析 Vitest JSON 报告
 */
function parseVitestJsonReport(reportPath: string): TestPhaseResult | null {
  const data = readJsonFile<{ testResults: unknown[] }>(reportPath);
  if (!data) return null;

  const testResults = (data.testResults || []) as Array<{
    name: string;
    assertionResults: Array<{
      fullName: string;
      status: string;
      duration: number;
      failureMessages?: string[];
    }>;
  }>;

  const suites = testResults.map((fileResult) => {
    const tests = fileResult.assertionResults.map((test) => ({
      name: test.fullName,
      file: fileResult.name,
      status: test.status === 'passed' ? 'passed' as const :
              test.status === 'failed' ? 'failed' as const : 'skipped' as const,
      duration: test.duration || 0,
      error: test.failureMessages?.[0],
      stack: test.failureMessages?.join('\n'),
    }));

    return {
      name: path.basename(fileResult.name).replace(/\.(test|spec)\.(ts|js|vue)$/, ''),
      file: fileResult.name,
      phase: 'unit' as const,
      tests,
      passed: tests.filter((t) => t.status === 'passed').length,
      failed: tests.filter((t) => t.status === 'failed').length,
      skipped: tests.filter((t) => t.status === 'skipped').length,
      duration: tests.reduce((sum, t) => sum + t.duration, 0),
    };
  });

  const stats = {
    total: suites.reduce((sum, s) => sum + s.tests.length, 0),
    passed: suites.reduce((sum, s) => sum + s.passed, 0),
    failed: suites.reduce((sum, s) => sum + s.failed, 0),
    skipped: suites.reduce((sum, s) => sum + s.skipped, 0),
    duration: suites.reduce((sum, s) => sum + s.duration, 0),
  };

  return {
    phase: 'unit',
    displayName: '单元测试',
    passed: stats.failed === 0,
    suites,
    stats,
  };
}

/**
 * 解析覆盖率报告
 */
function parseCoverageReport(): CoverageData | undefined {
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-final.json');

  // Istanbul coverage format
  interface IstanbulCoverage {
    [filePath: string]: {
      path: string;
      statementMap: Record<number, { start: { line: number }; end: { line: number } }>;
      fnMap: Record<number, { name: string; decl: { start: { line: number } } }>;
      branchMap: Record<number, { type: string; locs: Array<{ start: { line: number } }> }>;
      s: Record<number, number>;  // statement hits
      f: Record<number, number>;  // function hits
      b: Record<number, number[]>; // branch hits
    };
  }

  const data = readJsonFile<IstanbulCoverage>(coveragePath);

  if (!data) return undefined;

  const files = Object.values(data);
  if (files.length === 0) return undefined;

  // 计算总计
  let totalStatements = 0, coveredStatements = 0;
  let totalFunctions = 0, coveredFunctions = 0;
  let totalBranches = 0, coveredBranches = 0;

  for (const file of files) {
    // Statements
    const statementKeys = Object.keys(file.s || {});
    totalStatements += statementKeys.length;
    coveredStatements += statementKeys.filter(k => (file.s as Record<string, number>)[k] > 0).length;

    // Functions
    const functionKeys = Object.keys(file.f || {});
    totalFunctions += functionKeys.length;
    coveredFunctions += functionKeys.filter(k => (file.f as Record<string, number>)[k] > 0).length;

    // Branches
    const branchKeys = Object.keys(file.b || {});
    for (const k of branchKeys) {
      const branchHits = (file.b as Record<string, number[]>)[k];
      if (branchHits) {
        totalBranches += branchHits.length;
        coveredBranches += branchHits.filter(h => h > 0).length;
      }
    }
  }

  // 使用行覆盖率近似（基于语句覆盖率）
  const linesPercent = totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 10000) / 100 : 0;
  const functionsPercent = totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 10000) / 100 : 0;
  const branchesPercent = totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 10000) / 100 : 0;
  const statementsPercent = totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 10000) / 100 : 0;

  return {
    lines: linesPercent,
    functions: functionsPercent,
    branches: branchesPercent,
    statements: statementsPercent,
    reportPath: 'coverage/index.html',
  };
}

/**
 * 加载修复记录
 */
function loadFixRecords(): Array<{
  id: string;
  timestamp: string;
  testName: string;
  testFile: string;
  issue: string;
  solution: string;
  files: string[];
  status: 'fixed' | 'wontfix' | 'pending';
}> {
  const fixRecordsPath = path.join(process.cwd(), outputDir, 'fix-records.json');
  return readJsonFile(fixRecordsPath) || [];
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('📊 开始生成测试报告...\n');

  // 创建输出目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 创建截图目录
  const screenshotsDir = path.join(outputDir, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const generator = new TestReportGenerator({ outputDir });
  generator.startTimer();

  // 解析单元测试结果
  // 注意: 需要先运行 vitest --reporter=json --outputFile=test-reports/vitest-report.json
  const vitestReportPath = path.join(outputDir, 'vitest-report.json');
  const unitTestResult = parseVitestJsonReport(vitestReportPath);

  if (unitTestResult) {
    generator.addPhaseResult('unit', unitTestResult);
    console.log(`✅ 单元测试: ${unitTestResult.stats.passed}/${unitTestResult.stats.total} 通过`);
  } else {
    console.log('⚠️ 未找到单元测试报告，跳过...');
    // 添加空的单元测试阶段
    generator.addPhaseResult('unit', {
      phase: 'unit',
      displayName: '单元测试',
      passed: true,
      suites: [],
      stats: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
    });
  }

  // 添加覆盖率阶段
  const coverage = parseCoverageReport();
  if (coverage) {
    generator.addPhaseResult('coverage', {
      phase: 'coverage',
      displayName: '覆盖率测试',
      passed: true,
      suites: [],
      coverage,
      stats: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
    });
    console.log(`📈 覆盖率: 行 ${coverage.lines}% | 函数 ${coverage.functions}% | 分支 ${coverage.branches}%`);
  }

  // 加载修复记录
  const fixRecords = loadFixRecords();
  generator.loadFixRecords(fixRecords);
  console.log(`🔧 修复记录: ${fixRecords.length} 条`);

  // 生成报告
  const report = generator.generateReport();
  const duration = generator.getDuration();

  // 保存 JSON 报告
  const jsonPath = path.join(outputDir, 'test-report.json');
  fs.writeFileSync(jsonPath, generator.toJson(report));
  console.log(`\n📄 JSON 报告已保存: ${jsonPath}`);

  // 保存 HTML 报告
  const htmlPath = path.join(outputDir, 'test-report.html');
  fs.writeFileSync(htmlPath, generator.toHtml(report));
  console.log(`🌐 HTML 报告已保存: ${htmlPath}`);

  // 保存 Markdown 摘要
  const mdPath = path.join(outputDir, 'test-report.md');
  fs.writeFileSync(mdPath, generator.toMarkdown(report));
  console.log(`📝 Markdown 报告已保存: ${mdPath}`);

  // 输出摘要
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试报告摘要');
  console.log('='.repeat(50));
  console.log(`项目: ${projectName}`);
  console.log(`总测试数: ${report.stats.totalTests}`);
  console.log(`通过: ${report.stats.passed}`);
  console.log(`失败: ${report.stats.failed}`);
  console.log(`跳过: ${report.stats.skipped}`);
  console.log(`通过率: ${report.stats.passRate.toFixed(2)}%`);
  console.log(`执行时间: ${(duration / 1000).toFixed(2)}s`);

  if (report.stats.coverage) {
    console.log(`\n覆盖率:`);
    console.log(`  行: ${report.stats.coverage.lines}%`);
    console.log(`  函数: ${report.stats.coverage.functions}%`);
    console.log(`  分支: ${report.stats.coverage.branches}%`);
    console.log(`  语句: ${report.stats.coverage.statements}%`);
  }

  console.log('\n' + '='.repeat(50));

  // 返回退出码
  process.exit(report.stats.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ 生成报告失败:', error);
  process.exit(1);
});
