# Easy Terminal E2E 测试环境配置指南

## 测试环境概述

本项目使用 Tauri MCP Server 进行端到端测试，通过 Mock 数据模拟 SSH 和 Docker 服务。

## 测试环境要求

### 必需软件
- Node.js 18+
- pnpm 8+
- Rust 1.70+
- Tauri CLI 2.x

### 可选软件（用于完整 E2E 测试）
- Docker Desktop (用于 Docker 功能测试)
- SSH 服务器 (用于 SSH 功能测试)

## 环境配置步骤

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动开发服务器

```bash
# 启动前端开发服务器
pnpm dev

# 或启动 Tauri 开发模式
pnpm tauri:dev
```

### 3. 连接 Tauri MCP Server

项目已配置 `tauri-plugin-mcp-bridge`，支持通过 MCP 协议进行测试。

#### MCP 连接配置

在 Claude Code 中使用以下配置连接到 Tauri 应用：

```json
{
  "mcpServers": {
    "tauri-mcp": {
      "command": "node",
      "args": ["path/to/tauri-mcp-server/dist/index.js"],
      "env": {
        "TAURI_MCP_BRIDGE_HOST": "localhost",
        "TAURI_MCP_BRIDGE_PORT": "9223"
      }
    }
  }
}
```

#### 连接步骤

1. 启动 Tauri 开发服务器：
   ```bash
   pnpm tauri:dev
   ```

2. 等待应用启动完成（约 10-30 秒）

3. 使用 MCP 工具连接：
   ```
   mcp___hypothesi_tauri_mcp_server__driver_session
   action: "start"
   port: 9223
   ```

4. 验证连接状态：
   ```
   mcp___hypothesi_tauri_mcp_server__driver_session
   action: "status"
   ```

### 4. 运行测试

```bash
# 运行所有单元测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 运行单次测试（CI 模式）
pnpm test:run
```

## Mock 数据配置

### SSH Mock

SSH Mock 数据位于 `src/test/mocks/ssh.mock.ts`，包含：

- **连接配置** (`mockSshConfigs`): 预配置的 SSH 连接
- **测试结果** (`mockSshTestResults`): 连接测试的模拟响应
- **会话状态** (`mockSshSessionStates`): 模拟会话状态
- **输出缓冲** (`mockSshOutput`): 模拟终端输出

### Docker Mock

Docker Mock 数据位于 `src/test/mocks/docker.mock.ts`，包含：

- **容器列表** (`mockDockerContainers`): 模拟的 Docker 容器
- **镜像列表** (`mockDockerImages`): 模拟的 Docker 镜像
- **Exec 会话** (`mockDockerExecSessions`): 模拟的容器执行会话

## 测试报告

### 配置

Vitest 配置位于 `vite.config.ts`，测试报告输出：

- **控制台输出**: 文本格式
- **JSON 报告**: `coverage/coverage-final.json`
- **HTML 报告**: `coverage/lcov-report/index.html`

### 查看覆盖率报告

```bash
pnpm test:coverage
# 然后打开 coverage/lcov-report/index.html
```

## 故障排除

### Tauri MCP 连接失败

1. 确认 Tauri 应用正在运行
2. 检查端口 9223 是否被占用
3. 查看应用控制台是否有错误信息

### 测试超时

1. 增加 `vite.config.ts` 中的 `test.timeout` 值
2. 检查是否有未完成的异步操作

### Mock 数据不生效

1. 确认已导入 `src/test/setup/e2e-setup.ts`
2. 检查 `vi.mock` 是否正确配置
3. 使用 `beforeEach` 重置 Mock 状态

## 相关文件

- `src/test/index.ts` - 测试工具入口
- `src/test/mocks/` - Mock 数据和服务
- `src/test/setup/` - 测试环境配置
- `test-checklist.md` - 完整测试清单
- `vite.config.ts` - Vitest 配置
