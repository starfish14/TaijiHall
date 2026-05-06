# GitHub + Vercel 部署方案（大文件/模型文件场景）

本文适用于当前项目（`Vite + Vue`），目标是：
- 代码推送到 GitHub
- 通过 Vercel 获得可快速访问的线上链接
- 避免因大模型或大文件导致 `git push` / Vercel 部署失败

## 1. 背景与限制

在开始前先明确几个关键限制：
- GitHub 单文件硬限制：`100MB`（超过会拒绝推送）
- GitHub 单次 push 上限：`2GiB`
- Vercel（Hobby）静态上传建议：总量控制在较小范围，超大资源不应随前端一起部署
- Vercel 函数也有体积限制，不能把本地大模型直接打进函数包

结论：**大模型文件不要直接进 Git 仓库，也不要直接跟随前端部署到 Vercel。**

---

## 2. 推荐架构（最稳妥）

采用“前后端解耦 + 模型外置”方案：
- Vercel 仅部署前端（本项目）
- 模型文件存储在对象存储（S3/R2/OSS）或 Hugging Face
- 真实推理由独立服务承担（GPU 服务、推理 API）
- 前端通过 HTTP 调用推理接口

这样做的好处：
- GitHub 推送稳定
- Vercel 构建包小、部署快
- 模型可独立升级，不影响前端发布

---

## 3. 项目改造步骤

### 3.1 增加忽略规则（避免大文件进入仓库）

编辑根目录 `.gitignore`，追加：

```gitignore
# AI / model assets
models/
checkpoints/
weights/
*.bin
*.pt
*.pth
*.onnx
*.safetensors
*.gguf
*.ckpt
*.h5

# Large media (按需保留)
*.mp4
*.zip
*.7z
```

如果只想忽略特定目录，优先写目录规则，避免误伤正常文件。

### 3.2 增加 `.vercelignore`（避免无关内容上传）

在项目根目录创建 `.vercelignore`：

```gitignore
node_modules
.git
docs
models
checkpoints
weights
*.log
*.zip
*.7z
```

说明：Vercel 会重新安装依赖并构建，不需要上传 `node_modules`。

### 3.3 使用环境变量保存敏感配置

不要把密钥写入代码。

本地开发：`.env.local`

```bash
VITE_API_BASE_URL=https://your-api.example.com
VITE_MODEL_ENDPOINT=/infer
```

在 Vercel 项目设置中同步添加同名变量（Production / Preview / Development）。

### 3.4 前端改为“远程推理调用”

将原来“本地读取大模型文件”的逻辑替换为：
- 调用后端推理 API
- 返回结果后在前端展示

示例（伪代码）：

```ts
const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_MODEL_ENDPOINT}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
const data = await resp.json()
```

---

## 4. 如果大文件已经提交过：清理 Git 历史

仅删除工作区文件不够，历史中存在超大对象仍会导致推送失败。

### 4.1 找出历史中的大对象（可选）

```bash
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | sort -k3 -n
```

### 4.2 使用 `git filter-repo` 删除模型目录/文件

> 注意：此操作会改写历史，协作仓库需先同步团队。

示例：

```bash
git filter-repo --path models --invert-paths
git filter-repo --path-glob '*.safetensors' --invert-paths
git filter-repo --path-glob '*.bin' --invert-paths
```

### 4.3 强制推送

```bash
git push origin --force --all
git push origin --force --tags
```

---

## 5. 从零发布到 GitHub + Vercel（建议流程）

### 5.1 本地检查

```bash
npm run build
```

构建成功后继续。

### 5.2 初始化并推送 GitHub

```bash
git init
git add .
git commit -m "chore: initial deploy-ready commit"
git branch -M main
git remote add origin https://github.com/<你的账号>/<仓库名>.git
git push -u origin main
```

### 5.3 连接 Vercel

1. 登录 Vercel
2. `Add New -> Project`
3. 导入 GitHub 仓库
4. Framework 选择 `Vite`（通常会自动识别）
5. Build Command：`npm run build`
6. Output Directory：`dist`
7. 配置环境变量后点击 Deploy

部署完成后会得到：
- `*.vercel.app` 线上访问链接
- 每次 push 自动触发更新

---

## 6. 常见问题速查

### 6.1 报错：`File ... is 100.00 MB; this exceeds GitHub's file size limit`

原因：单文件超 100MB。
处理：
- 从当前提交移除该文件
- 清理历史中的该文件（`git filter-repo`）
- 重新强推

### 6.2 报错：`exceeds GitHub's push size limit of 2 GiB`

原因：单次推送对象总量过大。
处理：
- 清理大文件历史
- 减少仓库体积后重推

### 6.3 Vercel 部署失败，提示函数或构建产物过大

原因：把大文件打进构建包/函数包。
处理：
- 检查依赖和静态资源是否包含模型
- 通过 `.vercelignore` 和代码拆分移除
- 推理迁移到外部服务

---

## 7. 当前项目落地建议（直接可执行）

建议按以下顺序实施：
1. 先补齐 `.gitignore` 与 `.vercelignore`
2. 确保项目中不存在 `models/` 等大目录被追踪
3. 如曾提交过模型，执行历史清理
4. 推送 GitHub
5. 连接 Vercel 并配置环境变量
6. 验证线上链接可访问

如果你需要，可以继续在本仓库新增：
- `.vercelignore` 模板
- 一份 `env.example`
- 一个统一的前端 API 客户端（把推理地址读取逻辑集中管理）
