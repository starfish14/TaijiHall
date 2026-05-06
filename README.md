# 太极云境·非遗康护

基于 Three.js + Vue 3 开发的双层展馆 3D 导览系统，支持外部自由环绕观察、内部第一人称浏览、多类型展品交互、路线导航和答题游戏（通过 pageLink 链接外部页面）等功能。

## 功能特性

- **3D 模型展示**: 支持 GLB/GLTF 格式的展馆模型加载（含 Draco 压缩），带进度条提示
- **多视角模式**: 外部自由环绕（Orbit）、固定视角预设、内部第一人称三种视角
- **双层楼层**: 支持一层/二层独立相机入口配置，自由切换
- **路线导航**: 支持预设路点导览，展品导航和点击移动可沿路线行进（`paths.js` 配置）
- **点击移动**: 第一人称模式下点击地面进行移动，带移动提示 Tooltip
- **碰撞检测**: 基于包围盒的防穿墙检测，支持墙/地板/天花板类型
- **多类型展品交互**:
  - `exhibit` — 展品详情弹窗（图片 / 视频 / 音频，支持标签页切换）
  - `pageLink` — 内嵌 iframe 页面弹窗（可链接外部答题游戏等）
  - `richText` — 富文本 HTML 内容弹窗
- **独立 3D 模型展品**: 支持在场景中额外加载 GLB 格式的单独展品模型
- **答题游戏**: 通过 `pageLink` 类型链接外部答题页面（如 TaijiQuiz）
- **调试面板**: 集成 lil-gui，可实时调整相机、场景、光照、碰撞体、展品包围盒、路线路点等参数
- **帮助提示**: 内置操作说明 Tooltip（HelpTooltip）
- **移动端适配**: 完整的触摸交互支持，自适应按钮缩放和帧率限制
- **性能监控**: 可选的控制台性能数据输出（帧率、帧耗时等）

## 技术栈

| 依赖 | 版本 |
|------|------|
| Vue 3 | ^3.4.21 |
| Three.js | ^0.161.0 |
| Vite | ^5.1.6 |
| Vue Router | ^4.3.0 |
| @tweenjs/tween.js | ^23.1.0 |
| lil-gui | ^0.19.0 |
| Element Plus | ^2.4.4 |
| @element-plus/icons-vue | ^2.3.2 |

## 项目结构

```
code/
├── public/
│   ├── models/
│   │   └── exhibit.glb          # 主展馆 3D 模型文件（需自行提供）
│   ├── draco/                   # Draco 解码器（支持压缩 GLB 模型）
│   │   └── gltf/                # draco_decoder.js, draco_wasm_wrapper.js 等
│   └── images/                  # 展品图片资源（.gitkeep 占位）
├── src/
│   ├── components/
│   │   ├── Scene3D.vue          # 主 3D 场景组件（核心，含加载/渲染/交互）
│   │   ├── Controls.vue         # 右侧控制面板（视角切换、楼层切换、展品导航）
│   │   ├── ExhibitModal.vue     # 展品详情弹窗（图片/视频/音频混合展示）
│   │   ├── PageModal.vue        # iframe 页面弹窗（pageLink 类型）
│   │   ├── RichTextModal.vue    # 富文本内容弹窗（richText 类型）
│   │   ├── VideoPlayer.vue      # 视频播放器组件
│   │   ├── AudioPlayer.vue      # 音频播放器组件
│   │   └── HelpTooltip.vue      # 操作说明帮助图标及 Tooltip
│   ├── views/
│   │   └── Home.vue             # 主页面（组合所有组件）
│   ├── config/
│   │   ├── config.js            # 系统主配置（相机、场景、移动端、调试等）
│   │   ├── exhibits.js          # 展品配置（交互区域、媒体资源）
│   │   ├── modelExhibits.js     # 独立 3D 模型展品配置
│   │   ├── floors.js            # 楼层配置（高度、相机初始位置）
│   │   ├── collisions.js        # 碰撞体配置（墙/地板/天花板包围盒）
│   │   └── paths.js             # 路线导航配置（路点、父节点、捷径）
│   ├── utils/
│   │   ├── configLoader.js      # 配置统一加载器（含展品展开、楼层/碰撞/路线查询）
│   │   └── threejs/
│   │       ├── scene.js         # Three.js 场景初始化（Scene3D 类）
│   │       ├── controls.js      # 控制器管理（ControlsManager）
│   │       ├── collision.js     # 碰撞检测系统（CollisionSystem）
│   │       ├── interaction.js   # 交互处理系统（InteractionSystem）
│   │       ├── mobile.js        # 移动端适配（MobileAdapter）
│   │       ├── pathNavigator.js # 路线导航管理器（PathNavigator）
│   │       ├── performanceMonitor.js  # 性能监控（PerformanceMonitor）
│   │       └── debugGUI.js      # lil-gui 调试面板（DebugGUI）
│   ├── router/
│   │   └── index.js             # 路由（/ → Home）
│   ├── App.vue
│   └── main.js
├── package.json
└── vite.config.js
```

## 安装和运行

### 安装依赖

```bash
npm install
```

### 开发模式（局域网可访问）

```bash
npm run dev
```

默认端口 3000，启动后自动打开浏览器。

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 配置说明

所有配置均位于 `src/config/` 目录下，修改后无需重启（热更新生效）。

---

### `config.js` — 系统主配置

| 配置项 | 说明 |
|--------|------|
| `movementSpeed` | 第一人称移动速度（单位/秒），默认 `2.0` |
| `maxStepDistance` | 单次点击最大步长（米），默认 `0.7` |
| `cameraHeight` | 第一人称相机高度（米），默认 `1.6` |
| `interactionDistance` | 展品交互距离（米），默认 `3.0` |
| `directionThreshold` | 方向检测阈值（0~1），默认 `0.5` |
| `internalMode.initialPositionOffset` | 内部模式初始位置相对模型中心的偏移 |
| `internalMode.initialLookAtOffset` | 内部模式初始朝向目标点偏移 |
| `defaultViewMode` | 默认视角：`orbit`（自由环绕）/ `fixed`（固定视角） |
| `fixedViews` | 固定视角预设数组（`name`, `position`, `target`） |
| `camera.externalPosition` | 外部视角相机初始坐标 `[x, y, z]` |
| `camera.externalTarget` | 外部视角目标点 `[x, y, z]` |
| `camera.externalRotation` | 外部视角相机旋转角度（欧拉角，度） |
| `camera.externalDistance` | 外部视角初始距目标距离（米） |
| `camera.externalZoom` | 外部视角缩放级别 |
| `scene.backgroundColor` | 背景色（十六进制） |
| `scene.fog` | 雾效配置（enabled, color, near, far） |
| `scene.ground` | 地面颜色、粗糙度、金属度、大小、offset 等 |
| `scene.lighting` | 半球光、方向光、环境光配置 |
| `mobile.enabled` | 是否启用移动端优化 |
| `mobile.targetFPS` | 移动端目标帧率，默认 `30` |
| `mobile.touchSensitivity` | 触摸灵敏度，默认 `1.0` |
| `mobile.enableVirtualJoystick` | 是否启用虚拟摇杆 |
| `mobile.buttonScale` | 按钮大小倍数 |
| `mobile.performanceMode` | 是否启用性能模式（降低画质） |
| `mobile.interactionDistance` | 移动端交互距离（米），默认 `5.5` |
| `mobile.enableGestureNavigation` | 是否启用手势导航 |
| `collision.boundaryTypes` | 碰撞体角色类型定义 |
| `collision.ignoreTypesForPointCollision` | 点碰撞时忽略的类型 |
| `performanceMonitor.enabled` | 是否开启性能监控（控制台输出） |
| `performanceMonitor.logInterval` | 性能数据输出间隔（毫秒） |
| `debug.showGUI` | 是否显示 lil-gui 调试面板 |
| `debug.showCollisions` | 是否可视化碰撞体 |
| `debug.showGrid` | 是否显示辅助网格 |
| `debug.showAxes` | 是否显示坐标轴 |

> 调试开关由文件顶部 `const isDebug = false` 控制，改为 `true` 可启用调试面板。

---

### `floors.js` — 楼层配置

每个楼层定义：
- `level`: 楼层编号（1 / 2）
- `name`: 楼层名称（如「一层」「二层」）
- `height`: 楼层 Y 轴基准高度（米）
- `internalCamera.position`: 进入该楼层时相机的初始世界坐标 `[x, y, z]`
- `internalCamera.lookAt`: 相机初始朝向目标点 `[x, y, z]`

---

### `paths.js` — 路线导航配置

控制展品导航和点击移动是否沿预设路线行进。

| 配置项 | 说明 |
|--------|------|
| `enabled` | 展品导航时是否沿路线行进 |
| `clickFollow` | 点击移动是否按路线节点方向移动（每次一个节点） |
| `floors[n].waypoints` | 路点数组，格式 `[x, z]`（Y 由楼层高度决定） |
| `floors[n].parents` | 树状父节点数组，`null` 为根节点，数字为父路点索引 |
| `floors[n].connections` | 附加捷径，格式 `[[fromIdx, toIdx], ...]` |
| `floors[n].loop` | 是否首尾相连形成环形路线 |

---

### `exhibits.js` — 展品配置

支持三种交互区域定义方式：

| 方式 | 字段 | 适用场景 |
|------|------|---------|
| 点状交互 | `position + interactionRadius` | 雕塑、展台等点状展品 |
| 包围盒 | `bounds: { min, max }` | 展板、展墙等平面展品 |
| 包围盒（中心+尺寸） | `bounds: { center, size }` | 同上，另一种写法 |
| 多位置 | `positions: [{ position, id? }, ...]` | 同一展品多个触发点 |

**通用字段：**

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 展品名称 |
| `floor` | 所在楼层（1 / 2） |
| `type` | 交互类型，见下表 |
| `cameraPosition` | 导航时相机位置 `[x, y, z]` |
| `cameraLookAt` | 相机朝向目标点 `[x, y, z]` |
| `cameraRotation` | 相机旋转（欧拉角，优先于 `cameraLookAt`） |
| `hidden` | 是否在导航列表中隐藏 |

**`type` 交互类型：**

| 类型 | 行为 | 额外字段 |
|------|------|---------|
| `exhibit`（默认） | 展品弹窗（图片/视频/音频） | `images`, `videos`, `audio` |
| `pageLink` | 打开 iframe 页面弹窗（可链接外部答题等） | `url` 或 `pageUrl`, `title` |
| `richText` | 打开富文本 HTML 弹窗 | `text`（HTML 字符串）, `title` |

**多媒体字段（`exhibit` 类型）：**
- `images`: 图片路径数组，如 `["/images/xxx.jpg"]`
- `videos`: 视频数组，支持字符串或 `{ url, title }` 对象
- `audio`: 音频数组，支持字符串或 `{ url, title }` 对象
- 当同时包含视频/音频时，弹窗以「图片 | 视频 | 音频」标签页形式展示

---

### `modelExhibits.js` — 独立 3D 模型展品

在场景中额外加载的独立 GLB 展品，与主场景模型分离管理。

| 字段 | 说明 |
|------|------|
| `id` | 唯一标识 |
| `name` | 展品名称 |
| `floor` | 所在楼层 |
| `modelPath` | GLB 模型路径，如 `"/models/exhibits/xxx.glb"` |
| `position` | 场景中的位置 `[x, y, z]` |
| `rotation` | 欧拉角旋转（弧度）`[x, y, z]` |
| `scale` | 缩放（数字表示等比缩放，数组表示分轴缩放） |
| `bounds` | 交互包围盒（与 `exhibits.js` 格式一致） |
| `type` | `modelExhibit`（默认）/ `exhibit` / `pageLink` / `richText` |
| `castShadow` / `receiveShadow` | 阴影投射/接收 |

> 当前 `modelExhibits` 数组为空（全部注释），可按需取消注释或新增。

---

### `collisions.js` — 碰撞体配置

每个碰撞体包含：
- `collisionType`: 类型（`wall` / `floor` / `ceiling`）
- `boundaryRole`: 边界角色（与 `collisionType` 对应）
- `floor`: 所在楼层
- `bounds`: 包围盒（支持 `min+max` 或 `center+size` 格式）
- `rotation`: 可选旋转 `[x, y, z]`（弧度）

## 使用步骤

1. **准备 3D 模型**: 将展馆 GLB 模型放至 `public/models/exhibit.glb`（支持 Draco 压缩，需配置 `public/draco/` 解码器）
2. **准备媒体资源**: 图片放至 `public/images/`，视频放至 `public/videos/`，音频放至 `public/audio/`
3. **配置展品**: 编辑 `src/config/exhibits.js`，按格式填写展品信息
4. **配置碰撞**: 编辑 `src/config/collisions.js`，根据实际模型调整碰撞包围盒
5. **配置楼层**: 编辑 `src/config/floors.js`，调整各楼层高度和相机入口位置
6. **配置路线**（可选）: 编辑 `src/config/paths.js`，设置路点与父子关系
7. **调整相机**: 编辑 `src/config/config.js` 中 `camera.externalPosition` 等参数
8. **运行调试**: 将 `config.js` 顶部 `isDebug` 改为 `true`，通过 lil-gui 面板实时调整坐标、包围盒、路点等
9. **关闭调试**: 上线前将 `isDebug` 改回 `false`

## 调试技巧

- 开启 `isDebug = true` 后，页面左侧会出现 **lil-gui 调试面板**
- 面板支持实时拖拽调整相机位置、碰撞体包围盒、展品包围盒、路线路点、光照参数等
- 路线导航面板可追加路点、设置父路点，并导出配置到控制台后粘贴回 `paths.js`
- 调整完成后，将面板中的数值复制回对应配置文件

