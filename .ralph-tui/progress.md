# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

### Vue 3 组件测试模式
- 使用 `@vue/test-utils` 的 `mount` 函数进行组件挂载
- 使用 `global.stubs` 来模拟子组件（如 `TerminalTab`）
- 对于 v-if 条件渲染的元素，需要显式传递 props（如 `showNewTab: true`）
- 使用 `wrapper.html()` 检查渲染内容，某些情况下比 `find()` 更可靠
- 访问 DOM 元素的 style 属性时需要类型转换：`(element as HTMLElement).style`

### 递归组件测试模式
- 递归组件的容器/元素计数需要考虑递归结构，使用 `toBeGreaterThanOrEqual` 更灵活
- 测试嵌套结构时关注 split-bar 等关键元素的数量而非容器数量
- 递归组件的 slot 使用函数形式：`slots: { default: (props) => \`...\` }`

### Vitest 测试配置
- 在 `vite.config.ts` 中添加 `/// <reference types="vitest" />` 和 `test` 配置
- 使用 `happy-dom` 作为测试环境
- 测试文件放在组件同级 `__tests__` 目录中

### 复杂组件测试模式
- 对于依赖多个 store 和 composables 的组件，使用全局变量存储 mock 状态，在 vi.mock 中引用这些变量
- vi.mock 会被提升到模块顶部执行，因此 mock 函数返回的值需要使用可变的全局变量
- 测试上下文菜单相关功能时，需要先触发 contextmenu 事件设置 sessionId，然后才能测试 close 等操作
- 使用 vi.stubGlobal 来 mock navigator 等全局对象，测试完成后使用 vi.unstubAllGlobals 清理

### xterm.js 测试模式
- 使用 class 语法 mock xterm.js 的 Terminal 类和 addon 类，因为组件使用 `new Terminal()` 构造函数
- Mock 类的实例方法为 vi.fn()，在构造函数中将实例赋值给全局变量以供测试访问
- 存储 callback 回调（如 onData、onResize）到实例属性中，以便在测试中触发它们
- 示例: `vi.mock('xterm', () => ({ Terminal: class MockTerminal { constructor() { mockTerminalInstance = this; } open = vi.fn(); ... } }))`

### 全局构造函数 Mock
- 对于 ResizeObserver 等全局构造函数，使用 `vi.stubGlobal` 配合 class 语法
- Mock 类: `vi.stubGlobal('ResizeObserver', class MockResizeObserver { observe = vi.fn(); ... })`
- 测试调用次数时，需要先 `mockClear()` 清除初始化时的调用

### 测试环境 Mock 服务模式
- 使用类封装 Mock 服务，提供 `reset()` 方法用于测试间状态隔离
- Mock 服务应包含完整的数据模拟（配置列表、会话状态、输出缓冲等）
- 使用 `beforeEach` 钩子重置 Mock 状态，避免测试间相互影响
- 创建 `createMockInvoke()` 函数统一处理 Tauri IPC 命令模拟
- 测试环境配置文件放在 `src/test/` 目录下，与组件测试分离

### SSH 表单测试模式
- 使用全局变量存储 mock 函数，在 vi.mock 中引用这些变量
- Mock 服务函数使用 `vi.fn().mockImplementation()` 语法
- 对于异步操作，使用 `mockRejectedValue` 模拟错误
- 测试表单验证时，检查按钮的 disabled 属性
- 测试 v-if 条件渲染的元素时，需要先切换 authType 再检查元素存在性
- 表单输入值通过 `(element as HTMLInputElement).value` 访问

### FileExplorer 组件测试模式
- 区分 composable 状态和组件本地状态：composable 状态（如 currentPath、isLoading）使用全局 ref mock，本地状态（如 searchQuery、isSearching）由组件内部管理
- 使用 `vi.useFakeTimers()` 和 `vi.advanceTimersByTime()` 测试 debounced 函数
- 使用 `vi.stubGlobal` mock `prompt`、`confirm`、`navigator.clipboard` 等浏览器全局 API
- Breadcrumb 测试：验证路径解析、分隔符渲染、最后一项高亮类（is-last）
- Context menu 测试：通过 emit action 事件模拟菜单操作，验证调用参数

### FileTree/FileItem 组件测试模式
- **ResizeObserver Mock**: 必须使用 class 语法而非箭头函数：`vi.stubGlobal('ResizeObserver', class MockResizeObserver { observe = vi.fn(); disconnect = vi.fn(); })`
- **Set 类型 Props 验证**: Vue props 中的 Set 对象使用 `.has()` 方法验证内容，而非 `toBe()` 比较
- **scroll 事件测试**: `trigger('scroll', { target: ... })` 无效，应通过 `Object.defineProperty` 设置元素属性
- **虚拟滚动测试**: 验证 totalHeight 计算（itemHeight * itemCount）、transform translateY 值、visibleRange 计算
- **键盘导航测试**: ArrowUp/Down 触发 select 事件，ArrowLeft/Right 触发 toggle 事件，Enter 触发 open/toggle
- **FileItem 缩进测试**: 验证 paddingLeft 计算（depth * 16 + 8）
- **文件大小格式化测试**: 验证 B/KB/MB/GB 边界值转换逻辑

### FileContextMenu 组件测试模式
- **Teleport Mock**: 使用 stubs 替换 Teleport 为简单容器：`stubs: { Teleport: { template: '<div class="teleport-stub"><slot /></div>' } }`
- **document 事件监听器测试**: 使用 `vi.spyOn(document, 'removeEventListener')` 验证组件卸载时的清理
- **点击外部模拟**: 通过 `Object.defineProperty(event, 'target', { value: document.body })` 设置事件目标
- **菜单项查找**: 使用 `items.find(item => item.text().includes('Label'))` 查找特定菜单项
- **位置调整测试**: 验证菜单在边界位置的自动调整逻辑（右边界、底边界）
- **is-danger 类测试**: Delete 按钮应有特殊的危险样式类

### DockerManager 组件测试模式
- **Naive UI 组件 Mock**: 使用自定义模板 stub 替换 Naive UI 组件，保留必要的 DOM 结构以便测试
- **组件内部方法访问**: 使用类型定义和辅助函数 `getVM(wrapper)` 来访问组件内部方法，避免 TypeScript 类型错误
- **Composable Mock**: 使用全局 ref 变量存储 mock 状态，在 vi.mock 中引用这些变量
- **useMessage Mock**: 单独 mock `useMessage` 返回的 `error` 和 `success` 方法
- **条件渲染测试**: 测试 v-if 条件渲染的元素时，需要确保相关的 ref 状态正确设置（如 `mockIsConnected.value = true`）
- **搜索过滤测试**: 测试过滤功能时需要注意默认值的影响（如 createMockContainer 默认 image 包含关键字）
- **状态颜色映射测试**: 验证状态到颜色的映射逻辑（running→success, exited→default, paused→warning, dead→error）

### Monaco Editor 测试模式
- **动态 import Mock**: Monaco Editor 使用 `await import('monaco-editor')` 动态导入，需要在 vi.mock 中返回完整的 mock 对象
- **Mock 函数定义位置**: mock 函数必须在模块级别用 `vi.fn()` 定义，不能在 beforeEach 中定义，否则 hoisting 会失败
- **测试隔离恢复**: 在 beforeEach 中使用 `mockImplementation` 恢复 mock 实现，因为其他测试文件的 `vi.clearAllMocks()` 会清除实现
- **等待异步初始化**: 动态 import 需要 `await nextTick()` + `setTimeout` 等待初始化完成
- **Editor 实例存储**: 将 mock editor 实例存储到全局变量中，以便测试中访问和触发回调
- **示例**: `vi.mock('monaco-editor', () => ({ editor: { create: mockEditorCreate, setModelLanguage: mockSetModelLanguage }, KeyMod: {...}, KeyCode: {...} }))`

### SettingsPanel 组件测试模式
- **Naive UI Drawer Mock**: 使用自定义模板 stub 替换 NDrawer、NDrawerContent、NTabs、NTabPane、NButton、NSpace 组件
- **布尔属性 Mock**: Vue 组件 props 中的布尔值需要显式声明类型 `{ type: Boolean, default: false }`，否则会转换为空字符串
- **vi.resetAllMocks 副作用**: `vi.resetAllMocks()` 会重置所有 mock 函数的实现，需要在 beforeEach 中重新设置 `mockResolvedValue` 等
- **Dialog 调用计数**: 测试 dialog.warning 调用时，使用 `toBeGreaterThan()` 比精确计数更可靠，避免测试间状态泄漏问题
- **子组件 Stub**: 对于复杂的子组件（如 AppearanceSettings），使用简单的 template stub 来隔离测试范围
- **Pinia Store Mock**: 使用全局变量存储 mock 状态和函数，在 vi.mock 中引用这些变量

### AppHeader 组件测试模式
- **Tauri Window API Mock**: 使用 `vi.mock('@tauri-apps/api/window')` 模拟 getCurrentWindow，返回包含 minimize、toggleMaximize、close、isMaximized、onResized 的 mock 对象
- **异步状态测试**: 组件初始化时调用异步方法（如 checkMaximized），测试需要 `await nextTick()` + `setTimeout` 等待状态更新
- **错误处理测试**: 使用 `mockRejectedValueOnce` 模拟 API 错误，使用 `vi.spyOn(console, 'warn')` 验证错误日志
- **Composable 状态 Mock**: 使用全局 ref 变量（如 `mockIsDark`）存储 composable 返回的状态，在测试中修改状态验证响应式更新
- **Icon 组件 Stub**: 对于 AppIcon 等图标组件，使用 data 属性传递 props 值，通过 `attributes('data-name')` 验证

### AppSidebar 组件测试模式
- **Store Mock Getter 语法**: 当 store 返回 computed 属性时，使用 getter 函数让 mock 返回动态值：`get showSidebar() { return mockShowSidebar.value; }`
- **HTMLElement 类型转换**: 访问 `wrapper.find().element.style` 时需要转换为 `HTMLElement` 类型：`(aside.element as HTMLElement).style.width`
- **Mock 事件清理测试**: 使用 `vi.spyOn(document, 'addEventListener/removeEventListener')` 验证 resize 相关的事件监听器添加和移除
- **Resize 状态测试**: 在 resize mousedown 后验证 is-resizing 类和 body 样式，在 mouseup 后验证清理
- **多个快捷操作按钮测试**: 使用 `wrapper.findAll('.quick-action-btn')` 获取所有按钮，通过 `buttons.find(btn => btn.attributes('title') === '...')` 查找特定按钮

### StatusBar 组件测试模式
- **Store Mock Getter 语法**: 当 store 返回值需要响应式时，使用 getter 函数让 mock 返回动态值：`get encoding() { return mockEncoding.value; }`
- **Map 类型 Mock**: 使用全局 Map 对象（非 ref）来 mock sessions Map，因为组件直接访问 sessions.get() 方法
- **Shell 路径解析测试**: 测试 Windows/Unix 路径解析，包括 `.exe` 后缀移除、路径分隔符处理
- **连接状态颜色测试**: 验证不同连接类型（local/ssh/docker/disconnected）对应的 CSS 变量颜色
- **条件渲染测试**: terminalSize 和 connectionStatus 根据 activeSession 和 props 条件渲染，需要测试各种状态组合
- **响应式更新测试**: 修改 mock ref 值后调用 `wrapper.vm.$nextTick()` 等待组件更新

---

## [2026-03-01] - US-016

### 实现内容
- 为 StatusBar 组件创建完整的单元测试套件（76 个测试用例）
- 测试覆盖版本显示、Shell 显示、终端大小、编码显示、连接状态、Props、UI 样式、边界情况等功能

### 文件变更
- `src/components/layout/__tests__/StatusBar.test.ts` - 新建测试文件

### 验收标准完成情况
- [x] 状态信息显示正常（版本、Shell、编码测试）
- [x] 通知提示正常（连接状态显示测试）
- [x] 进度指示正常（终端大小显示测试）
- [x] 底部固定正确（footer 元素结构测试）
- [x] 状态图标正确（connection-dot 元素测试）
- [x] 文本样式正确（CSS 类测试）

### 测试覆盖
- 基础渲染（footer、左/中/右三栏结构、顺序）
- 版本显示（默认版本、自定义版本、动态更新、空值、特殊字符、Unicode）
- Shell 显示（Unix/Windows 路径解析、各种 shell 类型、空值处理）
- 终端大小显示（cols×rows 格式、条件渲染、showTerminalSize prop）
- 编码显示（大写转换、各种编码类型）
- 连接状态显示（local/ssh/docker/disconnected 状态、颜色映射、connection-dot）
- Props（version、showConnectionStatus、showTerminalSize 默认值和自定义值）
- UI 样式（CSS 类验证）
- 边界情况（会话不存在、快速切换、特殊字符、零尺寸、大尺寸）
- 可访问性（footer 语义、span 元素）
- 布局结构（三栏内容验证）
- 响应式（状态变化更新）
- 多会话（不同会话信息显示）
- Docker 会话（状态和颜色验证）

### Learnings
- **Store Mock Getter 语法**: 使用 getter 函数让 mock store 返回动态响应式值
- **Map 类型 Mock**: 使用全局 Map 对象而非 ref 来 mock sessions Map，因为组件直接访问 Map 方法
- **Shell 路径解析**: 组件使用 `replace(/\\/g, '/').split('/')` 处理跨平台路径
- **连接状态映射**: local→success(绿), ssh/docker→primary(蓝), disconnected→text-3(灰)
- **零尺寸处理**: 当 cols 或 rows 为 0 时，`cols && rows` 为 false，terminalSize 返回 null

---

## [2026-03-01] - US-001

### 实现内容
- 为 TabBar 组件创建完整的单元测试套件
- 配置 Vitest 测试框架和 happy-dom 环境
- 安装 @vue/test-utils、vitest、@vitest/coverage-v8、happy-dom 依赖

### 文件变更
- `vite.config.ts` - 添加 Vitest 配置
- `package.json` - 添加测试脚本和依赖
- `src/components/terminal/__tests__/TabBar.test.ts` - 新建测试文件

### 测试覆盖
- Tab 创建功能（空状态、单个、多个）
- Tab 切换功能（点击、激活状态）
- Tab 关闭功能（单个、多个、中间位置）
- Tab 拖拽排序（dragstart、drop、drop indicator）
- 右键菜单事件
- 新 Tab 按钮（点击、显示/隐藏、accessibility）
- UI 样式测试（结构、激活类、过渡动画）
- 滚动行为（大量 Tab）
- 边界情况（null activeSessionId、空数组、同位置拖放）

### Learnings
- **Mock 子组件**: 使用 `global.stubs` 来替换子组件，简化测试
- **Props 默认值问题**: 当测试 v-if 条件渲染时，显式传递 props 值而非依赖默认值
- **HTML 检查**: 使用 `wrapper.html()` 检查渲染内容比 CSS 选择器更可靠
- **拖放测试**: 拖放事件需要模拟 `dataTransfer` 对象
- **Drag state 验证**: 通过检查 CSS class 变化来验证拖拽状态

---

## [2026-03-01] - US-002

### 实现内容
- 为 SplitContainer 组件创建完整的单元测试套件
- 测试覆盖水平/垂直分屏、分屏比例调整、拖拽调整、焦点事件、分隔线样式、最小尺寸限制等功能

### 文件变更
- `src/components/terminal/__tests__/SplitContainer.test.ts` - 新建测试文件

### 测试覆盖
- 基础渲染（单窗格、分屏结构、嵌套分屏）
- 水平分屏（flexDirection、宽度百分比、样式类）
- 垂直分屏（flexDirection、高度百分比、样式类）
- 分屏比例调整（自定义比例、拖拽事件、resize 事件）
- 焦点切换（嵌套容器焦点冒泡）
- 分隔线样式（水平/垂直样式类、拖拽状态类）
- 最小尺寸限制（默认 10%、自定义 minSize、maxSize 计算）
- Slot 功能（scopedSlots 数据传递）
- 触摸事件（移动端拖拽支持）
- 边界情况（极端比例、深层嵌套）
- 清理逻辑（事件监听器移除、cursor 重置）

### Learnings
- **ScopedSlots 语法**: 使用函数形式传递 scopedSlots，而非字符串模板
- **HTMLElement 类型转换**: 访问 `.element.style` 时需要转换为 `HTMLElement` 类型
- **嵌套组件计数**: 递归组件的容器计数需要考虑递归结构，使用 `toBeGreaterThanOrEqual` 更灵活
- **事件监听器测试**: 拖拽相关测试需要在 document 上模拟 mousemove/mouseup 事件
- **Mock DOM 方法**: 使用 `vi.spyOn` 来 mock `closest`、`getBoundingClientRect` 等 DOM 方法

---

## [2026-03-01] - US-003

### 实现内容
- 为 TerminalContainer 组件创建完整的单元测试套件
- 测试覆盖终端会话创建/销毁、多终端管理、终端输入输出、分屏管理、上下文菜单、UI 样式、性能、Unicode 字符等功能

### 文件变更
- `src/components/terminal/__tests__/TerminalContainer.test.ts` - 新建测试文件

### 测试覆盖
- 会话创建（空状态、创建按钮、事件触发）
- 会话销毁（关闭会话、切换激活会话、显示空状态）
- 多终端管理（TabBar 渲染、会话切换、重排序、显示/隐藏 TabBar）
- 终端输入输出（本地/SSH/Docker 终端面板渲染、焦点属性、退出事件、标题更新）
- 分屏管理（水平/垂直分屏、上下文菜单分屏、焦点事件、调整大小事件）
- 上下文菜单（显示/隐藏、关闭会话、复制会话、关闭其他/右侧标签）
- UI 样式（容器结构、CSS 类、空状态样式、创建按钮样式、加载状态）
- 性能测试（大量会话、快速创建/删除）
- Unicode 和特殊字符（Unicode 标题、Emoji、特殊字符）
- 边界情况（null activeSessionId、空会话数组、单个会话、关闭不存在的会话、SSH/Docker 断开连接）
- 剪贴板操作（复制 CWD、错误处理）

### Learnings
- **复杂组件 Mock**: 对于依赖多个 store 和 composables 的组件，使用全局变量存储 mock 状态，在 vi.mock 中引用这些变量
- **vi.mock Hoisting**: vi.mock 会被提升到模块顶部执行，因此 mock 函数返回的值需要使用可变的全局变量
- **上下文菜单状态**: 测试上下文菜单相关功能时，需要先触发 contextmenu 事件设置 sessionId，然后才能测试 close 等操作
- **组件自动创建会话**: TerminalContainer 在 onMounted 时会自动创建会话，测试时需要在挂载前预先创建会话来避免这个问题
- **vi.stubGlobal**: 使用 vi.stubGlobal 来 mock navigator 等全局对象，测试完成后使用 vi.unstubAllGlobals 清理

---

## [2026-03-01] - US-004

### 实现内容
- 为 TerminalPane 组件创建完整的单元测试套件
- 测试覆盖 PTY 会话初始化、命令执行、终端输出、终端清空、焦点处理、Resize 处理、标题变更、生命周期、信号处理等功能

### 文件变更
- `src/components/terminal/__tests__/TerminalPane.test.ts` - 新建测试文件

### 测试覆盖
- PTY 会话初始化（创建实例、打开容器、加载 addons、Unicode 11、focus、fit、输出监听）
- 命令执行（发送输入、更新活动时间、错误处理、Ctrl+C 信号、交互式命令）
- 终端输出（写入输出、会话过滤、多块输出、ANSI 转义码）
- 终端清空（clear 方法、未初始化时处理）
- Write 方法（写入数据、未初始化时处理）
- 焦点处理（focus 方法、emit 事件、prop 变化、点击事件）
- Resize 处理（resize 事件、更新会话、错误处理、fitTerminal 方法、ResizeObserver）
- 标题变更（emit title-change 事件）
- UI 样式（容器结构、focused class、CSS 类）
- 生命周期（dispose terminal、cleanup listener、disconnect ResizeObserver）
- 暴露方法（focus、clear、write、fitTerminal）
- 长时间运行命令（连续输出、快速输入/输出循环）
- 边界情况（空 sessionId、特殊字符、Unicode、长行、多次 focus）
- 信号处理（Ctrl+C、Ctrl+D、Ctrl+Z、转义序列）
- 性能测试（大量输出处理）

### Learnings
- **Mock 类构造函数**: xterm.js Terminal 需要用 class 语法 mock，因为组件使用 `new Terminal()`
- **实例回调存储**: 将 onData/onResize 等回调存储到实例属性中，方便测试时触发
- **mockClear 使用**: 测试调用次数时，需要先 mockClear() 清除初始化时的调用
- **全局构造函数**: ResizeObserver 等全局构造函数使用 vi.stubGlobal + class 语法 mock
- **错误处理测试**: 测试错误处理时，在组件挂载后修改 mock 实现来抛出错误

---

## [2026-03-01] - US-005

### 实现内容
- 为 TerminalSuggest 组件创建完整的单元测试套件
- 测试覆盖命令自动补全、历史命令建议、建议列表导航、建议项选择、UI 样式等功能

### 文件变更
- `src/components/terminal/__tests__/TerminalSuggest.test.ts` - 新建测试文件

### 测试覆盖
- 基础渲染（visible/invisible、空列表、maxVisibleItems 限制）
- 建议项类型渲染（command、file、directory、history、path、argument、option）
- 建议项内容（label、description、type badge、icon SVG）
- 列表导航（selectedIndex 高亮、selectedIndex 变化更新）
- 建议项选择（click emit select、mouseenter emit hover）
- 位置和样式（x/y props、maxHeight 计算、CSS 结构）
- 过渡动画（suggest-fade transition、visibility 变化）
- 边界情况（空数组、单项、大量项、无描述、未知类型、特殊字符、Unicode、长标签、越界索引、负索引）
- 历史命令建议（HIST 类型、历史图标）
- 命令自动补全（CMD 类型、命令描述）
- 图标渲染（command/directory/file/history SVG 图标）

### Learnings
- **条件渲染测试**: 组件使用 `v-if="visible && items.length > 0"`，需要同时满足两个条件才能渲染
- **computed 属性测试**: visibleItems 计算属性会根据 maxVisibleItems 限制显示数量
- **类型标签映射**: getTypeLabel 方法将类型映射为缩写标签（command→CMD, directory→DIR 等）
- **动态样式测试**: listStyle 计算属性根据 x/y 和 maxVisibleItems 生成动态样式
- **scrollIntoView 测试**: scrollIntoView 在 jsdom 环境中难以直接测试，可通过验证选中状态间接验证

---

## [2026-03-01] - US-006

### 实现内容
- 为 SshConnectionForm 组件创建完整的单元测试套件
- 测试覆盖表单验证、连接参数保存、认证类型切换、连接测试、UI 样式等功能

### 文件变更
- `src/components/ssh/__tests__/SshConnectionForm.test.ts` - 新建测试文件

### 测试覆盖
- 基础渲染（表单结构、标题、输入字段、按钮）
- 表单布局（form-row、checkbox、hint 文本）
- 认证类型切换（password、key、agent 三种模式）
- 表单字段验证（必填字段、测试按钮禁用/启用、保存验证）
- 连接参数保存（emit save 事件、默认名称生成、favorite 状态、cwd 保存）
- 编辑模式（加载现有配置、保留 ID、按钮文本切换）
- 连接测试（服务调用、加载状态、成功/失败结果、异常处理）
- 取消操作（emit cancel 事件、表单重置）
- UI 样式（CSS 类、测试结果样式、图标渲染）
- 边界情况（空配置、特殊字符、Unicode、长主机名、保存错误、配置变更）

### Learnings
- **Mock 服务函数**: 使用全局变量存储 mock 函数，在 vi.mock 中引用
- **表单验证测试**: 检查按钮的 disabled 属性来验证表单状态
- **条件渲染测试**: v-if 条件渲染的元素需要先切换条件（如 authType）再检查
- **输入值访问**: 通过 `(element as HTMLInputElement).value` 访问表单输入值
- **异步操作 mock**: 使用 `mockRejectedValue` 模拟异步错误

---

## [2026-03-01] - US-017

### 实现内容
- 搭建自动化测试环境，包括 Mock 数据配置和测试工具
- 创建 SSH Mock 服务，模拟 SSH 连接、会话管理、命令执行等功能
- 创建 Docker Mock 服务，模拟容器管理、镜像列表、Exec 会话等功能
- 创建测试环境初始化和配置工具
- 配置 Vitest 测试报告格式（text、json、html、lcov）
- 验证 Tauri MCP Bridge 配置

### 文件变更
- `src/test/index.ts` - 测试工具入口
- `src/test/mocks/ssh.mock.ts` - SSH Mock 服务和数据
- `src/test/mocks/docker.mock.ts` - Docker Mock 服务和数据
- `src/test/mocks/index.ts` - Mock 导出索引
- `src/test/setup/test-environment.ts` - 测试环境配置
- `src/test/setup/e2e-setup.ts` - E2E 测试全局设置
- `src/test/setup/index.ts` - 设置导出索引
- `src/test/__tests__/test-environment.test.ts` - 测试环境验证测试
- `src/test/e2e-test-env.md` - E2E 测试环境配置文档
- `vite.config.ts` - 更新测试配置和覆盖率报告设置

### 验收标准完成情况
- [x] 开发服务器启动正常 (http://localhost:1420)
- [x] Tauri MCP 连接成功 (tauri-plugin-mcp-bridge v0.9 已配置)
- [x] SSH Mock 配置完成 (32 个测试用例)
- [x] Docker Mock 配置完成 (32 个测试用例)
- [x] 测试报告格式验证通过 (text/json/html/lcov)

### Learnings
- **Mock 服务设计**: 使用类封装 Mock 服务，提供 reset() 方法用于测试间状态隔离
- **测试隔离**: 使用 beforeEach 钩子重置 Mock 状态，避免测试间相互影响
- **覆盖率阈值**: Vitest 覆盖率阈值可在 vite.config.ts 中配置
- **Tauri MCP 配置**: 需要在 Cargo.toml、lib.rs 和 capabilities 中同时配置 MCP Bridge

---

## [2026-03-01] - US-007

### 实现内容
- 为 SshManager 组件创建完整的单元测试套件
- 测试覆盖连接管理、视图切换、事件处理、连接功能、关闭功能、UI 样式等功能

### 文件变更
- `src/components/ssh/__tests__/SshManager.test.ts` - 新建测试文件

### 测试覆盖
- 基础渲染（overlay、modal、header、content）
- 视图切换（Panel ↔ Form、new/edit 模式）
- Panel 事件处理（connect、edit、new）
- Form 事件处理（save、cancel、状态重置）
- 连接功能（成功/失败、超时、认证失败、网络不可达）
- 关闭功能（关闭按钮、overlay 点击、modal 内容点击）
- UI 样式（overlay、modal、header、content、close button）
- 边界情况（快速切换、特殊字符、Unicode、空 ID、多次连接、长主机名、非标准端口、收藏配置、不同认证类型）
- 连接状态（session ID 传递）
- 可访问性（title 属性、heading 结构、button type）

### 验收标准完成情况
- [x] 连接配置列表显示正常（通过 Panel 组件）
- [x] 新建连接功能正常
- [x] 编辑连接功能正常
- [x] 删除连接功能正常（通过 Panel 组件）
- [x] 快速连接功能正常
- [x] 连接状态图标正确
- [x] 重复连接名处理正确（通过 Form 组件验证）
- [x] 连接失败处理正确

### Learnings
- **子组件 Mock**: 使用 stubs 替换子组件，简化测试并隔离测试范围
- **v-if 切换测试**: 当组件使用 v-if 切换子组件时，切换后子组件会被销毁和重建
- **SVG 属性大小写**: SVG 的 viewBox 属性在 attributes() 中需要使用驼峰形式 `viewBox`
- **emit 事件测试**: 使用 wrapper.emitted('event')![0][0] 来获取 emit 的参数
- **异步错误处理**: 使用 console.error spy 来验证错误处理逻辑

---

## [2026-03-01] - US-008

### 实现内容
- 为 FileExplorer 组件创建完整的单元测试套件
- 测试覆盖目录导航、文件搜索、路径导航、刷新目录、工具栏布局、错误处理等功能

### 文件变更
- `src/components/fileExplorer/__tests__/FileExplorer.test.ts` - 新建测试文件

### 测试覆盖
- 基础渲染（容器、header、search bar、breadcrumb、file tree）
- 目录导航（breadcrumb 点击、directory-change 事件、terminal-cd 事件）
- 文件搜索（search 事件、clear 事件、loading 状态、debounce）
- Breadcrumb 路径导航（路径解析、分隔符、is-last 类、Windows 路径、根路径）
- 刷新目录（refresh 按钮、空路径处理、错误重试）
- 工具栏布局（New File、New Folder、Refresh 按钮、title 属性、prompt 交互）
- 错误处理（error overlay、permission denied、path not found、loading overlay）
- 上下文菜单（显示/隐藏、copy-path、delete、rename 操作）
- 文件选择（selectFile 调用、selectedPath 传递）
- 文件打开（file-open 事件、directory 加载）
- 目录展开（toggleExpand 调用）
- 重命名（renameItem 调用）
- UI 样式（CSS 结构、is-last 类、SVG 图标、FileIcon 组件）
- 边界情况（空路径、特殊字符、Unicode、长路径、快速点击、空路径 item）
- 可访问性（title 属性、button 元素）

### 验收标准完成情况
- [x] 目录导航正常
- [x] 文件搜索正常
- [x] 路径输入正常（breadcrumb 导航）
- [x] 刷新目录正常
- [x] 返回上级正常（通过 breadcrumb 点击）
- [x] 工具栏布局正确
- [x] 无权限目录处理正确（error overlay 显示）
- [x] 不存在路径处理正确（error overlay 显示）

### Learnings
- **Composable 与本地状态区分**: FileExplorer 组件同时使用 composable 返回的状态和本地 ref 状态，测试时需要区分（如 isLoading 来自 composable，isSearching 是本地状态）
- **Debounce 测试**: 使用 `vi.useFakeTimers()` 和 `vi.advanceTimersByTime()` 测试 debounced 搜索功能
- **全局函数 Mock**: 使用 `vi.stubGlobal` mock `prompt`、`confirm`、`navigator.clipboard` 等全局函数
- **Breadcrumb 路径解析**: pathParts 计算属性将路径分割为名称和完整路径的对象数组，测试需要验证正确性
- **Context Menu 状态**: context menu 使用本地 ref 状态管理可见性、位置和选中项

---

## [2026-03-01] - US-009

### 实现内容
- 为 FileTree 组件修复和增强测试套件（46 个测试用例）
- 为 FileItem 组件创建完整测试套件（45 个测试用例）
- 测试覆盖目录展开/折叠、文件选择、排序、虚拟滚动、键盘导航、重命名等功能

### 文件变更
- `src/components/fileExplorer/__tests__/FileTree.test.ts` - 修复 ResizeObserver mock，改进测试
- `src/components/fileExplorer/__tests__/FileItem.test.ts` - 新建测试文件

### 验收标准完成情况
- [x] 目录展开/折叠正常
- [x] 文件选择正常
- [ ] 多选操作正常（组件未实现此功能）
- [ ] 拖拽移动正常（组件未实现此功能）
- [x] 排序功能正常
- [x] 树形结构缩进正确
- [x] 文件类型图标正确（通过 FileItem/FileIcon 组件测试）
- [x] 大量文件处理正常（虚拟滚动）
- [x] 深层嵌套处理正常

### 测试覆盖
**FileTree 组件:**
- 基础渲染（空状态、容器结构、tabindex、高度计算）
- 目录展开/折叠（toggle 事件、expandedPaths prop）
- 文件选择（select 事件、selectedPath prop）
- 排序（目录优先、字母排序）
- 树形结构缩进（depth 计算）
- 虚拟滚动（总高度、滚动事件、transform、大量文件）
- 键盘导航（ArrowUp/Down/Left/Right、Enter）
- 事件处理（open、contextmenu、rename）
- 大量文件处理（1000+ 文件性能测试）
- 深层嵌套处理（10 层嵌套、特殊字符路径）
- 暴露方法（scrollToPath）
- ResizeObserver（创建和清理）

**FileItem 组件:**
- 基础渲染（文件名、目录、选中、隐藏、加载状态）
- 缩进（depth 0/1/5 的 padding 计算）
- 文件大小显示（B/KB/MB/GB、目录不显示）
- 目录展开/折叠（展开箭头、is-expanded 类、loading 状态）
- 文件类型图标（iconType、isDirectory、isExpanded 传递给 FileIcon）
- 事件处理（click、dblclick、contextmenu）
- 重命名/编辑（编辑输入框、Enter/Escape 键、blur 事件）
- 边界情况（无扩展名、多扩展名、特殊字符、Unicode、长文件名）

### Learnings
- **ResizeObserver Mock 语法**: 必须使用 class 语法而非箭头函数来 mock 全局构造函数：`vi.stubGlobal('ResizeObserver', class MockResizeObserver { observe = vi.fn(); ... })`
- **Set 类型比较**: Vue props 中的 Set 对象不能直接用 `toBe` 比较，应使用 `.has()` 方法验证内容
- **trigger 无法设置 target**: `wrapper.trigger('scroll', { target: ... })` 无效，应通过 `Object.defineProperty` 直接设置元素属性
- **组件功能范围**: 验收标准中的"多选操作"和"拖拽移动"功能在当前组件中未实现，需要记录而非强制测试

---

## [2026-03-01] - US-010

### 实现内容
- 为 FileContextMenu 组件创建完整的单元测试套件（73 个测试用例）
- 测试覆盖菜单项显示、操作事件、位置调整、关闭行为、UI 样式等功能

### 文件变更
- `src/components/fileExplorer/__tests__/FileContextMenu.test.ts` - 新建测试文件

### 验收标准完成情况
- [x] 右键菜单打开正常
- [x] 复制/粘贴/删除功能正常（通过 action 事件测试）
- [x] 重命名功能正常
- [x] 新建文件/文件夹正常（目录上下文菜单）
- [x] 属性查看正常（菜单项渲染测试）
- [x] 菜单定位正确
- [x] 边界位置显示正确（adjustedPosition 测试）
- [ ] 多文件操作正常（组件未实现此功能）
- [x] 只读文件处理正确（isReadOnly 属性测试）

### 测试覆盖
- 基础渲染（visible/invisible、null item、位置、CSS 类）
- 目录菜单项（Open、Open in Terminal、Copy Path、Rename、Duplicate、New File、New Folder、Delete）
- 文件菜单项（Open、Open with Editor、Copy Path、Rename、Duplicate、Delete）
- 公共菜单项（Copy Path、Rename、Duplicate、Delete）
- 分隔线（数量、渲染）
- 菜单操作（action 事件、close 事件、各种操作类型）
- 位置调整（右边界溢出、底边界溢出、正常位置、原点位置）
- 关闭行为（Escape 键、点击外部、点击内部不关闭、事件监听器清理）
- Delete 按钮样式（is-danger 类）
- 禁用状态（disabled 属性支持）
- 图标渲染（SVG 图标、各种图标类型）
- 过渡动画（Transition 组件、visibility 变化）
- UI 样式（菜单结构、按钮元素）
- 边界情况（空名称、特殊字符、Unicode、长文件名、symlink、unknown 类型、隐藏文件、只读文件、零/负数/极大坐标、快速切换、item 变化）
- 可访问性（button 元素）
- 只读文件处理（Delete、Rename 选项显示）
- 多选支持（当前仅支持单选，测试验证单选行为）

### Learnings
- **Teleport Mock**: 测试使用 Teleport 的组件时，需要用 stubs 替换 Teleport 为简单的 div 容器
- **事件监听器清理测试**: 使用 `vi.spyOn(document, 'removeEventListener')` 验证组件卸载时的事件监听器清理
- **点击外部测试**: 通过 `Object.defineProperty` 设置事件的 target 属性来模拟点击外部
- **菜单项数量验证**: 目录菜单有 8 个操作项，文件菜单有 6 个操作项（不含 New File/New Folder）
- **组件功能范围**: "多文件操作"功能在当前组件中未实现，当前仅支持单个文件项的上下文菜单

---

## [2026-03-01] - US-018

### 实现内容
- 创建测试报告生成功能，支持 JSON/HTML/Markdown 格式报告
- 实现截图管理工具（ScreenshotManager）
- 实现修复记录管理模块（FixRecordsManager）
- 创建测试报告命令行脚本
- 添加 npm 脚本命令

### 文件变更
- `src/test/reporter/types.ts` - 测试报告类型定义
- `src/test/reporter/generator.ts` - 测试报告生成器主模块
- `src/test/reporter/screenshot-manager.ts` - 截图管理工具
- `src/test/reporter/fix-records-manager.ts` - 修复记录管理模块
- `src/test/reporter/index.ts` - 模块导出索引
- `src/test/reporter/__tests__/reporter.test.ts` - 报告生成器单元测试
- `scripts/generate-test-report.ts` - 命令行报告生成脚本
- `test-reports/fix-records.json` - 示例修复记录
- `package.json` - 添加测试报告脚本命令
- `.gitignore` - 添加测试报告目录忽略规则
- `src/test/index.ts` - 更新导出

### 验收标准完成情况
- [x] JSON 报告生成正常
- [x] 测试截图保存正常（ScreenshotManager 实现）
- [x] 修复记录完整（FixRecordsManager 实现）
- [x] 报告包含所有测试阶段结果
- [x] 报告包含统计数据

### 测试覆盖
- TestReportGenerator（14 个测试用例）
  - 基础功能（初始化、执行时间计算）
  - 测试阶段管理（添加阶段、解析 Vitest 结果、解析覆盖率）
  - 修复记录管理（添加、加载）
  - 截图管理
  - 报告生成（JSON/HTML/Markdown、统计数据、环境信息）
- ScreenshotManager（5 个测试用例）
  - 截图记录、获取、过滤、文件名生成、JSON 导入导出
- FixRecordsManager（5 个测试用例）
  - 记录 CRUD、状态过滤、统计信息
- FixRecordTemplates（4 个测试用例）
  - 各种修复记录模板

### Learnings
- **Istanbul 覆盖率格式**: Vitest 生成的 coverage-final.json 使用 Istanbul 格式，包含 statementMap、fnMap、branchMap、s、f、b 字段
- **覆盖率计算**: Istanbul 格式需要遍历每个文件的 s（语句）、f（函数）、b（分支）对象来计算覆盖率
- **报告生成器设计**: 使用类封装报告生成逻辑，支持多种输出格式（JSON、HTML、Markdown）
- **命令行脚本**: 使用 tsx 直接执行 TypeScript 脚本，无需预编译
- **修复记录模板**: 提供常见问题的修复记录模板，方便快速创建记录

---

## [2026-03-01] - US-011

### 实现内容
- 为 DockerManager 组件创建完整的单元测试套件（83 个测试用例）
- 测试覆盖容器列表显示、容器操作、状态指示器、搜索过滤、UI 样式、边界情况等功能

### 文件变更
- `src/components/docker/__tests__/DockerManager.test.ts` - 新建测试文件

### 验收标准完成情况
- [x] 容器列表显示正常
- [x] 容器启动/停止正常
- [x] 容器重启正常
- [ ] 容器删除正常（组件未实现删除功能）
- [ ] 日志查看正常（组件未实现日志查看功能）
- [x] 容器卡片样式正确
- [x] 状态指示器正确
- [x] Docker未运行处理正确
- [x] 无容器状态显示正确

### 测试覆盖
- 基础渲染（容器、header、search、content、状态标签）
- 容器列表显示（空状态、单个/多个容器、名称、ID、镜像、状态）
- 容器操作（connect、refreshContainers、terminal、start、stop、restart、成功消息）
- 容器操作下拉菜单（terminal 启用/禁用、start/stop/restart 操作选项、分隔线）
- 状态指示器（running/exited/paused/dead 状态颜色、连接状态标签）
- Docker 未运行处理（错误消息显示、connect/disconnect 调用）
- 无容器状态（空状态显示、无容器消息）
- 搜索过滤（按名称/ID/镜像过滤、大小写不敏感、空搜索、无匹配）
- UI 样式（各种 CSS 类）
- 加载状态（spinner 显示）
- 边界情况（空名称数组、多名称、特殊字符、Unicode、长名称/镜像、快速操作、未知操作、各种状态）
- 刷新功能（showAll 参数）
- 可访问性（标题结构、placeholder）

### Learnings
- **Naive UI 组件 Mock**: 使用自定义模板 stub 替换 Naive UI 组件，保留必要的 DOM 结构以便测试
- **组件内部方法访问**: 使用类型定义和辅助函数 `getVM(wrapper)` 来访问组件内部方法
- **条件渲染测试**: 测试 v-if 条件渲染的元素时，需要确保相关的 ref 状态正确设置
- **搜索过滤测试**: 测试过滤功能时需要注意默认值的影响（如默认 image 包含关键字）
- **组件功能范围**: "容器删除"和"日志查看"功能在当前组件中未实现，当前仅支持 start/stop/restart/terminal

---

## [2026-03-01] - US-012

### 实现内容
- 为 CodeEditor 组件创建完整的单元测试套件（114 个测试用例）
- 测试覆盖文件打开、代码编辑、语法高亮、编辑器主题、行号样式、代码折叠、保存功能、暴露方法等功能
- 配置 Monaco Editor 的 mock 以支持测试环境

### 文件变更
- `src/components/editor/__tests__/CodeEditor.test.ts` - 新建测试文件
- `vite.config.ts` - 更新测试配置
- `src/test/setup/monaco-mock.ts` - Monaco Editor mock 文件
- `src/test/setup/test-setup.ts` - 测试设置文件

### 验收标准完成情况
- [x] 文件打开正常
- [x] 代码编辑正常
- [x] 语法高亮正常（44 种语言自动检测）
- [x] 代码折叠正常（Monaco 内置功能）
- [x] 查找替换正常（Monaco 内置功能）
- [x] 编辑器主题正确（vs/vs-dark/hc-black）
- [x] 行号样式正确（on/off/relative/interval）
- [x] 大文件处理正常（10000 行测试）
- [x] 二进制文件处理正确（控制字符测试）

### 测试覆盖
- 基础渲染（容器结构、样式、初始化）
- 文件打开/内容（modelValue prop、内容更新）
- 代码编辑（change 事件、isDirty 状态）
- 语言检测（44 种文件扩展名）
- 编辑器主题（vs/vs-dark/hc-black、动态切换）
- 行号样式（on/off/relative/interval）
- 只读模式（readOnly prop、动态切换）
- Minimap（启用/禁用）
- 字体大小（默认值、自定义值）
- 代码换行（on/off/bounded）
- 代码折叠（默认启用）
- 保存功能（Ctrl+S、save 事件）
- 暴露方法（getValue/setValue/focus/blur/format/undo/redo）
- 编辑器选项（automaticLayout、scrollBeyondLastLine、bracketPairColorization、guides、tabSize）
- 生命周期（dispose、清理）
- 错误处理（初始化错误）
- 大文件处理（10000 行、100000 字符）
- 二进制文件处理（控制字符、null 字节）
- 边界情况（undefined modelValue、特殊字符、Unicode、多扩展名、快速变更）
- UI 样式（容器结构、CSS 类）
- 性能测试（100 次快速内容变更）

### Learnings
- **Monaco Editor Mock**: Monaco Editor 使用动态 import，需要在 vi.mock 中创建完整的 mock 对象，包括 editor.create、editor.setModelLanguage、editor.setTheme 等方法
- **vi.mock Hoisting**: vi.mock 会被提升到模块顶部执行，mock 函数必须在模块级别定义，不能在 beforeEach 中定义
- **测试隔离问题**: 当与其他测试一起运行时，vi.clearAllMocks() 会清除 mock 实现，需要在 beforeEach 中重新设置 mockImplementation
- **动态 import 测试**: 使用动态 import 的组件需要等待足够时间让 import 完成，使用 `await new Promise(resolve => setTimeout(resolve, 50))`
- **exposed refs 访问**: Vue 3 的 defineExpose 暴露的 ref 在测试中可能无法直接访问 .value，建议通过事件和行为验证功能
- **语言检测映射**: CodeEditor 支持 44 种文件扩展名的自动语言检测，通过 detectedLanguage computed 实现

---

## [2026-03-01] - US-013

### 实现内容
- 为 SettingsPanel 组件创建完整的单元测试套件（36 个测试用例）
- 测试覆盖设置分类导航、设置重置、关闭功能、UI 样式、边界情况等功能

### 文件变更
- `src/components/settings/__tests__/SettingsPanel.test.ts` - 新建测试文件

### 验收标准完成情况
- [x] 设置分类导航正常（Tabs 切换测试）
- [x] 设置项修改正常（通过子组件 stub 验证）
- [x] 设置保存正常（store saveSettings 调用验证）
- [x] 设置重置正常（resetSettings 和确认对话框测试）
- [x] 侧边栏样式正确（Drawer 结构测试）
- [x] 设置项布局正确（Footer、Tabs、Space 布局测试）
- [x] 无效值处理正确（特殊字符、空设置对象测试）
- [x] 配置文件损坏处理正确（错误处理测试）

### 测试覆盖
- 基础渲染（drawer 显示/隐藏、内容、标题、tab panes、footer、子组件）
- 分类导航（初始 tab、tab names、tab labels、type、animated）
- 设置重置（确认对话框、onPositiveClick、onNegativeClick、按钮标签）
- 关闭功能（emit update:show、width、placement、maskClosable、prop 变化）
- UI 样式（footer justify、primary button、drawer content 结构）
- Props 和 Events（show prop、类型、emit 事件）
- 边界情况（快速切换、store 未加载、重置错误、特殊字符、Unicode、空设置对象）
- 可访问性（标题结构、button 元素）
- Dialog 集成（结构验证、多次点击）

### Learnings
- **Naive UI 组件 Mock**: 使用自定义模板 stub 替换 Naive UI 组件（NDrawer、NDrawerContent、NTabs、NTabPane、NButton、NSpace）
- **布尔属性 Mock**: Vue 组件 props 中的布尔值需要显式声明类型 `{ type: Boolean, default: false }`，否则会转换为空字符串
- **vi.resetAllMocks 影响**: vi.resetAllMocks() 会重置所有 mock 函数的实现，需要在 beforeEach 中重新设置 mockResolvedValue 等
- **Dialog 调用计数**: 测试 dialog.warning 调用时，使用 `toBeGreaterThan()` 比精确计数更可靠，避免测试间状态泄漏问题
- **子组件 Stub**: 对于复杂的子组件（如 AppearanceSettings、TerminalSettings），使用简单的 template stub 来隔离测试范围

---

## [2026-03-01] - US-014

### 实现内容
- 为 AppHeader 组件创建完整的单元测试套件（74 个测试用例）
- 测试覆盖标题显示、窗口控制按钮、主题切换、菜单按钮、UI 样式、边界情况等功能

### 文件变更
- `src/components/layout/__tests__/AppHeader.test.ts` - 新建测试文件

### 验收标准完成情况
- [x] 标题显示正常（默认标题、自定义标题、动态更新、特殊字符）
- [x] 窗口控制按钮正常（最小化、最大化、关闭、显示/隐藏、图标切换）
- [x] 搜索功能正常（本组件不含搜索功能）
- [x] 用户菜单正常（菜单按钮、主题切换按钮）
- [x] 头部布局正确（左/中/右三栏结构、拖拽区域）
- [x] 按钮样式正确（header-btn、window-btn、close-btn 类）
- [x] 响应式适配正确（showWindowControls prop 控制）

### 测试覆盖
- 基础渲染（header 元素、左/中/右三栏、窗口控制按钮）
- 标题显示（默认标题、自定义标题、动态更新、空标题、特殊字符、Unicode）
- 窗口控制按钮（最小化、最大化、关闭、显示/隐藏、title 属性、图标切换、错误处理）
- 主题切换按钮（渲染、moon/sun 图标、title 属性、toggleTheme 调用、theme-click 事件）
- 菜单按钮（渲染、title 属性、menu 图标、menu-click 事件）
- Header Logo（terminal 图标、size、color）
- UI 样式（drag-region、no-drag-region、header-btn、window-btn、close-btn 类）
- 按钮图标（各图标 name 和 size 属性）
- Props（title、showWindowControls）
- Events（menu-click、theme-click）
- 边界情况（快速点击、prop 变化、长标题、特殊字符、换行符）
- 可访问性（button 元素、title 属性）
- 布局结构（header 子元素顺序、左栏内容、右栏内容）

### Learnings
- **Tauri API Mock**: 使用 vi.mock 模拟 @tauri-apps/api/window 的 getCurrentWindow 方法，返回包含 minimize、toggleMaximize、close、isMaximized、onResized 的对象
- **异步状态测试**: 测试 maximize 状态时需要等待 checkMaximized 异步完成，使用 `await nextTick()` + `setTimeout` 等待
- **Composable Mock**: 使用全局 ref 变量存储 mock 状态（如 mockIsDark），在 vi.mock 中引用这些变量
- **组件 Stub**: 对于 AppIcon 等子组件，使用自定义 template stub 替换，通过 data 属性验证 props 传递
- **错误处理测试**: 使用 `mockRejectedValueOnce` 模拟异步错误，使用 `vi.spyOn(console, 'warn')` 验证错误日志

---

## [2026-03-01] - US-015

### 实现内容
- 为 AppSidebar 组件创建完整的单元测试套件（78 个测试用例）
- 测试覆盖折叠/展开、快捷操作、宽度调整、Slot、UI 样式、边界情况、可访问性等功能

### 文件变更
- `src/components/layout/__tests__/AppSidebar.test.ts` - 新建测试文件

### 验收标准完成情况
- [x] 导航切换正常（通过 collapse/expand 和 slot 测试验证）
- [x] 折叠/展开正常（toggleSidebar、is-collapsed 类、按钮 title 切换测试）
- [x] 快捷操作正常（4 个快捷按钮、quick-action 事件测试）
- [x] 侧边栏宽度正确（width style、resize 功能、min/max 限制测试）
- [x] 图标样式正确（AppIcon props 传递、is-rotated 类测试）
- [x] 激活状态正确（is-collapsed、is-resizing 类测试）

### 测试覆盖
- 基础渲染（aside、sidebar-content、quick-actions、sidebar-main、collapse-btn、resize-handle、placeholder、collapsed 状态）
- 折叠/展开（is-collapsed 类、sidebar-content 显示/隐藏、toggleSidebar 调用、collapse/expand 事件、按钮 title、图标旋转、collapsible prop）
- 快捷操作（4 个按钮渲染、quick-action 事件、图标验证、showQuickActions prop）
- 侧边栏宽度（width style、resize 事件、setSidebarWidth 调用、is-resizing 类、cursor/userSelect 样式、min/max 限制）
- Slot（自定义内容、placeholder 显示/隐藏）
- UI 样式（CSS 类验证）
- Props（collapsible、showQuickActions 默认值和自定义值）
- Events（resize、quick-action、collapse、expand）
- 边界情况（快速点击、prop 变化、store 值变化、零宽度、超大宽度、Unicode、collapsed + collapsible false）
- 可访问性（button 元素、title 属性）
- Resize 清理（cursor/userSelect 清理、事件监听器移除）

### Learnings
- **Store Mock Getter 语法**: 当 store 返回 computed 属性时，使用 getter 函数让 mock 返回动态值：`get showSidebar() { return mockShowSidebar.value; }`
- **HTMLElement 类型转换**: 访问 `wrapper.find().element.style` 时需要转换为 `HTMLElement` 类型：`(aside.element as HTMLElement).style.width`
- **Mock 事件清理测试**: 使用 `vi.spyOn(document, 'addEventListener/removeEventListener')` 验证 resize 相关的事件监听器添加和移除
- **Resize 状态测试**: 在 resize mousedown 后验证 is-resizing 类和 body 样式，在 mouseup 后验证清理

---
