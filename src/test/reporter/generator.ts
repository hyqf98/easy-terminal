/**
 * 测试报告生成器
 *
 * 用于生成综合测试报告，包括测试结果、覆盖率、截图和修复记录
 */

/// <reference types="node" />

import type {
  TestReport,
  TestPhaseResult,
  TestSuiteResult,
  TestCaseResult,
  TestReportStats,
  TestPhase,
  FixRecord,
  ScreenshotRecord,
  CoverageData,
  ReportOptions,
} from './types';

/**
 * 默认报告选项
 */
const DEFAULT_OPTIONS: ReportOptions = {
  outputDir: 'test-reports',
  filename: 'test-report',
  includeScreenshots: true,
  includeFixRecords: true,
  generateHtmlSummary: true,
};

/**
 * 测试报告生成器类
 */
export class TestReportGenerator {
  private options: ReportOptions;
  private phases: Map<TestPhase, TestPhaseResult> = new Map();
  private fixRecords: FixRecord[] = [];
  private screenshots: ScreenshotRecord[] = [];
  private startTime: number = 0;

  constructor(options: Partial<ReportOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 开始测试计时
   */
  startTimer(): void {
    this.startTime = Date.now();
  }

  /**
   * 获取执行时间
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * 添加测试阶段结果
   */
  addPhaseResult(phase: TestPhase, result: TestPhaseResult): void {
    this.phases.set(phase, result);
  }

  /**
   * 从 Vitest JSON 报告解析测试结果
   */
  parseVitestResults(
    phase: TestPhase,
    jsonReport: Record<string, unknown>
  ): TestPhaseResult {
    const testResults = (jsonReport.testResults || []) as Array<{
      name: string;
      assertionResults: Array<{
        fullName: string;
        status: string;
        duration: number;
        failureMessages?: string[];
      }>;
    }>;

    const suites: TestSuiteResult[] = [];
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalDuration = 0;

    for (const fileResult of testResults) {
      const tests: TestCaseResult[] = fileResult.assertionResults.map((test) => {
        const status = this.mapStatus(test.status);
        if (status === 'passed') totalPassed++;
        else if (status === 'failed') totalFailed++;
        else if (status === 'skipped') totalSkipped++;
        totalDuration += test.duration || 0;

        return {
          name: test.fullName,
          file: fileResult.name,
          status,
          duration: test.duration || 0,
          error: test.failureMessages?.[0],
          stack: test.failureMessages?.join('\n'),
        };
      });

      suites.push({
        name: this.extractSuiteName(fileResult.name),
        file: fileResult.name,
        phase,
        tests,
        passed: tests.filter((t) => t.status === 'passed').length,
        failed: tests.filter((t) => t.status === 'failed').length,
        skipped: tests.filter((t) => t.status === 'skipped').length,
        duration: tests.reduce((sum, t) => sum + t.duration, 0),
      });
    }

    return {
      phase,
      displayName: this.getPhaseDisplayName(phase),
      passed: totalFailed === 0,
      suites,
      stats: {
        total: totalPassed + totalFailed + totalSkipped,
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        duration: totalDuration,
      },
    };
  }

  /**
   * 解析覆盖率报告
   */
  parseCoverageReport(coverageJson: Record<string, unknown>): CoverageData | undefined {
    if (!coverageJson) return undefined;

    const coverageMap = coverageJson as Record<string, {
      lines: { pct: number };
      functions: { pct: number };
      branches: { pct: number };
      statements: { pct: number };
    }>;

    // 计算平均值
    const files = Object.values(coverageMap);
    if (files.length === 0) return undefined;

    const avgLines = this.average(files.map((f) => f.lines?.pct || 0));
    const avgFunctions = this.average(files.map((f) => f.functions?.pct || 0));
    const avgBranches = this.average(files.map((f) => f.branches?.pct || 0));
    const avgStatements = this.average(files.map((f) => f.statements?.pct || 0));

    return {
      lines: Math.round(avgLines * 100) / 100,
      functions: Math.round(avgFunctions * 100) / 100,
      branches: Math.round(avgBranches * 100) / 100,
      statements: Math.round(avgStatements * 100) / 100,
      reportPath: 'coverage/index.html',
    };
  }

  /**
   * 添加修复记录
   */
  addFixRecord(record: Omit<FixRecord, 'id' | 'timestamp'>): void {
    this.fixRecords.push({
      ...record,
      id: this.generateId('fix'),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 从 JSON 文件加载修复记录
   */
  loadFixRecords(records: FixRecord[]): void {
    this.fixRecords = records;
  }

  /**
   * 添加截图记录
   */
  addScreenshot(record: Omit<ScreenshotRecord, 'id' | 'timestamp'>): void {
    this.screenshots.push({
      ...record,
      id: this.generateId('screenshot'),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 生成完整测试报告
   */
  generateReport(): TestReport {
    const phases = Array.from(this.phases.values());
    const stats = this.calculateStats(phases);

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      projectName: 'Easy Terminal',
      reportId: this.generateId('report'),
      phases,
      stats,
      fixRecords: this.options.includeFixRecords ? this.fixRecords : [],
      screenshots: this.options.includeScreenshots ? this.screenshots : [],
      environment: {
        node: process.version,
        platform: process.platform,
        vitest: this.getVitestVersion(),
        testRunner: 'vitest',
      },
    };
  }

  /**
   * 生成 JSON 报告字符串
   */
  toJson(report?: TestReport): string {
    const data = report || this.generateReport();
    return JSON.stringify(data, null, 2);
  }

  /**
   * 生成 HTML 摘要报告
   */
  toHtml(report?: TestReport): string {
    const data = report || this.generateReport();
    const statusClass = data.stats.failed === 0 ? 'passed' : 'failed';
    const statusText = data.stats.failed === 0 ? '✅ 通过' : '❌ 失败';

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>测试报告 - ${data.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header .meta { opacity: 0.9; font-size: 14px; }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      margin-top: 15px;
    }
    .status-badge.passed { background: #10b981; }
    .status-badge.failed { background: #ef4444; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .stat-card h3 { font-size: 14px; color: #666; margin-bottom: 10px; }
    .stat-card .value { font-size: 32px; font-weight: bold; color: #333; }
    .stat-card.passed .value { color: #10b981; }
    .stat-card.failed .value { color: #ef4444; }
    .stat-card.skipped .value { color: #f59e0b; }
    .section {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .section h2 {
      font-size: 18px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #eee;
    }
    .phase-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background: #f9fafb;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .phase-item .name { font-weight: 500; }
    .phase-item .stats { color: #666; font-size: 14px; }
    .phase-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .phase-status.passed { background: #d1fae5; color: #065f46; }
    .phase-status.failed { background: #fee2e2; color: #991b1b; }
    .coverage-bar {
      height: 20px;
      background: #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
      margin-top: 10px;
    }
    .coverage-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
      transition: width 0.3s ease;
    }
    .fix-record {
      padding: 15px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      margin-bottom: 10px;
      border-radius: 0 8px 8px 0;
    }
    .fix-record h4 { color: #92400e; margin-bottom: 5px; }
    .fix-record .meta { font-size: 12px; color: #b45309; }
    .screenshot-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }
    .screenshot-item {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    .screenshot-item img { width: 100%; height: auto; }
    .screenshot-item .caption {
      padding: 10px;
      font-size: 12px;
      color: #666;
      background: #f9fafb;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 测试报告</h1>
      <div class="meta">
        <div>项目: ${data.projectName}</div>
        <div>生成时间: ${new Date(data.timestamp).toLocaleString('zh-CN')}</div>
        <div>报告 ID: ${data.reportId}</div>
      </div>
      <div class="status-badge ${statusClass}">${statusText}</div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>总测试数</h3>
        <div class="value">${data.stats.totalTests}</div>
      </div>
      <div class="stat-card passed">
        <h3>通过</h3>
        <div class="value">${data.stats.passed}</div>
      </div>
      <div class="stat-card failed">
        <h3>失败</h3>
        <div class="value">${data.stats.failed}</div>
      </div>
      <div class="stat-card skipped">
        <h3>跳过</h3>
        <div class="value">${data.stats.skipped}</div>
      </div>
    </div>

    ${
      data.stats.coverage
        ? `
    <div class="section">
      <h2>📈 覆盖率</h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
        <div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>行覆盖率</span>
            <span>${data.stats.coverage.lines}%</span>
          </div>
          <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${data.stats.coverage.lines}%"></div>
          </div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>函数覆盖率</span>
            <span>${data.stats.coverage.functions}%</span>
          </div>
          <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${data.stats.coverage.functions}%"></div>
          </div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>分支覆盖率</span>
            <span>${data.stats.coverage.branches}%</span>
          </div>
          <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${data.stats.coverage.branches}%"></div>
          </div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>语句覆盖率</span>
            <span>${data.stats.coverage.statements}%</span>
          </div>
          <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${data.stats.coverage.statements}%"></div>
          </div>
        </div>
      </div>
    </div>
    `
        : ''
    }

    <div class="section">
      <h2>📋 测试阶段</h2>
      ${data.phases
        .map(
          (phase) => `
        <div class="phase-item">
          <div>
            <div class="name">${phase.displayName}</div>
            <div class="stats">
              ${phase.stats.passed} 通过 / ${phase.stats.failed} 失败 / ${phase.stats.skipped} 跳过
              · ${(phase.stats.duration / 1000).toFixed(2)}s
            </div>
          </div>
          <div class="phase-status ${phase.passed ? 'passed' : 'failed'}">
            ${phase.passed ? '✅ 通过' : '❌ 失败'}
          </div>
        </div>
      `
        )
        .join('')}
    </div>

    ${
      data.fixRecords.length > 0
        ? `
    <div class="section">
      <h2>🔧 修复记录</h2>
      ${data.fixRecords
        .map(
          (record) => `
        <div class="fix-record">
          <h4>${record.testName}</h4>
          <p>${record.issue}</p>
          <p><strong>解决方案:</strong> ${record.solution}</p>
          <div class="meta">
            ${new Date(record.timestamp).toLocaleString('zh-CN')} · ${record.status}
          </div>
        </div>
      `
        )
        .join('')}
    </div>
    `
        : ''
    }

    ${
      data.screenshots.length > 0
        ? `
    <div class="section">
      <h2>📸 测试截图</h2>
      <div class="screenshot-grid">
        ${data.screenshots
          .map(
            (s) => `
          <div class="screenshot-item">
            <img src="${s.path}" alt="${s.testName}">
            <div class="caption">${s.testName}${s.description ? ` - ${s.description}` : ''}</div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
    `
        : ''
    }

    <div class="section">
      <h2>🖥️ 环境信息</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Node.js</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.environment.node}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">平台</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.environment.platform}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">测试框架</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.environment.testRunner} ${data.environment.vitest}</td></tr>
      </table>
    </div>

    <div class="footer">
      <p>Easy Terminal 测试报告 · 由 TestReportGenerator 自动生成</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * 生成 Markdown 摘要报告
   */
  toMarkdown(report?: TestReport): string {
    const data = report || this.generateReport();
    const statusEmoji = data.stats.failed === 0 ? '✅' : '❌';

    let md = `# 测试报告 - ${data.projectName}

${statusEmoji} **状态**: ${data.stats.failed === 0 ? '通过' : '失败'}
📅 **时间**: ${new Date(data.timestamp).toLocaleString('zh-CN')}
🆔 **报告 ID**: ${data.reportId}

## 📊 统计概览

| 指标 | 数值 |
|------|------|
| 总测试数 | ${data.stats.totalTests} |
| 通过 | ${data.stats.passed} |
| 失败 | ${data.stats.failed} |
| 跳过 | ${data.stats.skipped} |
| 通过率 | ${data.stats.passRate.toFixed(2)}% |
| 执行时间 | ${(data.stats.duration / 1000).toFixed(2)}s |

`;

    if (data.stats.coverage) {
      md += `## 📈 覆盖率

| 类型 | 覆盖率 |
|------|--------|
| 行覆盖率 | ${data.stats.coverage.lines}% |
| 函数覆盖率 | ${data.stats.coverage.functions}% |
| 分支覆盖率 | ${data.stats.coverage.branches}% |
| 语句覆盖率 | ${data.stats.coverage.statements}% |

`;
    }

    md += `## 📋 测试阶段

| 阶段 | 通过 | 失败 | 跳过 | 时间 | 状态 |
|------|------|------|------|------|------|
${data.phases
  .map(
    (p) =>
      `| ${p.displayName} | ${p.stats.passed} | ${p.stats.failed} | ${p.stats.skipped} | ${(p.stats.duration / 1000).toFixed(2)}s | ${p.passed ? '✅' : '❌'} |`
  )
  .join('\n')}

`;
    if (data.fixRecords.length > 0) {
      md += `## 🔧 修复记录

${data.fixRecords
  .map(
    (r) => `### ${r.testName}
- **问题**: ${r.issue}
- **解决方案**: ${r.solution}
- **状态**: ${r.status}
- **时间**: ${new Date(r.timestamp).toLocaleString('zh-CN')}

`
  )
  .join('')}`;
    }

    if (data.screenshots.length > 0) {
      md += `## 📸 测试截图

${data.screenshots.map((s) => `### ${s.testName}\n![${s.testName}](${s.path})\n`).join('\n')}`;
    }

    md += `## 🖥️ 环境信息

- **Node.js**: ${data.environment.node}
- **平台**: ${data.environment.platform}
- **测试框架**: ${data.environment.testRunner} ${data.environment.vitest}

---
*由 TestReportGenerator 自动生成*
`;

    return md;
  }

  /**
   * 计算统计数据
   */
  private calculateStats(phases: TestPhaseResult[]): TestReportStats {
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let duration = 0;
    let coverage: CoverageData | undefined;

    for (const phase of phases) {
      totalTests += phase.stats.total;
      passed += phase.stats.passed;
      failed += phase.stats.failed;
      skipped += phase.stats.skipped;
      duration += phase.stats.duration;

      if (phase.coverage) {
        coverage = phase.coverage;
      }
    }

    const passRate = totalTests > 0 ? (passed / totalTests) * 100 : 0;

    return {
      totalTests,
      passed,
      failed,
      skipped,
      duration,
      coverage,
      passRate: Math.round(passRate * 100) / 100,
    };
  }

  /**
   * 映射测试状态
   */
  private mapStatus(status: string): 'passed' | 'failed' | 'skipped' | 'pending' {
    switch (status) {
      case 'passed':
        return 'passed';
      case 'failed':
        return 'failed';
      case 'skipped':
      case 'pending':
      case 'todo':
        return 'skipped';
      default:
        return 'pending';
    }
  }

  /**
   * 从文件路径提取套件名称
   */
  private extractSuiteName(filePath: string): string {
    const parts = filePath.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace(/\.(test|spec)\.(ts|js|vue)$/, '');
  }

  /**
   * 获取阶段显示名称
   */
  private getPhaseDisplayName(phase: TestPhase): string {
    const names: Record<TestPhase, string> = {
      unit: '单元测试',
      integration: '集成测试',
      e2e: '端到端测试',
      coverage: '覆盖率测试',
    };
    return names[phase] || phase;
  }

  /**
   * 生成唯一 ID
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 计算平均值
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * 获取 Vitest 版本
   */
  private getVitestVersion(): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pkg = require('vitest/package.json');
      return pkg.version;
    } catch {
      return 'unknown';
    }
  }
}

// 导出单例实例
export const testReportGenerator = new TestReportGenerator();
