# Cloudflare R2 与 Vercel Blob 使用指南（模型文件托管）

适用场景：当前项目需要托管较大的 `exhibit.glb`（约 371MB），并在前端通过 URL 加载。

## 1. 先说结论

- 想要低成本、长期托管大文件：优先 `Cloudflare R2`
- 想要和 Vercel 一站式集成、快速上手：优先 `Vercel Blob`

两者都不要把模型提交到 GitHub 仓库。

---

## 2. 方案 A：Cloudflare R2（推荐）

## 2.1 创建存储桶

1. 登录 Cloudflare 控制台
2. 进入 `R2 Object Storage`
3. 点击 `Create bucket`
4. 桶名示例：`taiji-models`

建议：桶名使用全小写英文与中划线。

## 2.2 上传模型文件

1. 进入新建的 bucket
2. 点击 `Upload`
3. 上传 `exhibit.glb`
4. 最终对象路径示例：`models/exhibit.glb`

## 2.3 打开公网访问（两种方式）

方式 1（简单）：使用 R2 提供的公开 URL
方式 2（推荐）：绑定自定义域名（如 `assets.yourdomain.com`）

推荐使用自定义域名，后续切换存储或缓存策略更灵活。

## 2.4 在 Vercel 配置环境变量

到 Vercel 项目：`Settings -> Environment Variables`

新增：

- `VITE_MODEL_BASE_URL` = `https://assets.yourdomain.com/models`

如果你使用的是 R2 默认公开地址，也可以填默认 URL 前缀。

## 2.5 前端加载示例

```js
const modelUrl = `${import.meta.env.VITE_MODEL_BASE_URL}/exhibit.glb`
```

## 2.6 CORS 建议

若前端跨域拉取模型，确保 R2 允许你的站点域名访问。

最常见放行项：
- Allowed Origin: 你的 Vercel 域名（和自定义域名）
- Allowed Method: `GET`, `HEAD`
- Allowed Header: `*` 或最小必要集

## 2.7 缓存建议

模型文件通常可长期缓存：
- `Cache-Control: public, max-age=31536000, immutable`

如果你更新模型，建议改文件名（如 `exhibit.v2.glb`）避免缓存旧版本。

---

## 3. 方案 B：Vercel Blob

## 3.1 创建 Blob 存储

1. 登录 Vercel
2. 进入项目
3. `Storage -> Connect Database -> Blob`
4. 创建完成后，Vercel 会自动注入服务端所需变量

注意：Blob 更适合通过服务端上传，再返回可访问 URL。

## 3.2 上传模型文件（推荐服务端上传）

你可以：
- 在 Vercel 控制台或工具中上传
- 或在项目的 API Route / Server Action 使用 `@vercel/blob` 上传

上传后会得到一个公开 URL（或可签名 URL，按你的访问策略决定）。

## 3.3 将模型地址暴露给前端

方式 A：直接把固定 URL 写进环境变量
- `VITE_MODEL_BASE_URL=https://<blob-public-prefix>`

方式 B：前端先请求你的 API，再由 API 返回最新地址（更灵活，便于以后换存储）

## 3.4 前端加载示例

```js
const modelUrl = `${import.meta.env.VITE_MODEL_BASE_URL}/exhibit.glb`
```

或：

```js
const { modelUrl } = await fetch('/api/model-url').then(r => r.json())
```

## 3.5 适用提醒

- 与 Vercel 集成体验很好
- 但长期大流量场景要重点关注存储与流量成本

---

## 4. 方案 C：腾讯云 COS（中国境内可用）

如果你在中国境内，Cloudflare 使用不便，`腾讯云 COS` 完全可以作为等价替代方案。

核心思路与 R2 一样：
- 把大模型文件放到对象存储
- 前端通过公网 URL 拉取
- 用环境变量管理 URL 前缀

## 4.1 创建存储桶

1. 登录腾讯云控制台
2. 进入 `对象存储 COS`
3. 创建存储桶（Bucket），例如：`taiji-models-1250000000`
4. 地域建议优先选择靠近主要用户的中国大陆地域

命名提醒：COS 的 bucket 名通常带 `APPID` 后缀。

## 4.2 上传模型文件

1. 进入 bucket
2. 上传 `exhibit.glb`
3. 对象路径示例：`models/exhibit.glb`

## 4.3 配置访问方式

常见两种方式：
- 方式 A：直接使用 COS 默认访问域名
- 方式 B（推荐）：绑定自定义 CDN/加速域名（如 `assets.yourdomain.com`）

推荐方式 B，后续切换存储或做缓存策略更灵活。

## 4.4 配置 CORS

如果前端站点与 COS 域名不同，需要在 COS 配置跨域。

常见配置：
- AllowedOrigin：你的前端域名（Vercel 域名 + 自定义域名）
- AllowedMethod：`GET`、`HEAD`
- AllowedHeader：`*`（或按最小必要集）
- ExposeHeader：按需（可先留空）
- MaxAgeSeconds：例如 `3600`

## 4.5 在 Vercel 配置环境变量

到 Vercel 项目：`Settings -> Environment Variables`

新增：

- `VITE_MODEL_BASE_URL` = `https://assets.yourdomain.com/models`

如果你暂时不用自定义域名，也可填 COS 默认访问域名前缀。

## 4.6 前端加载示例

```js
const modelUrl = `${import.meta.env.VITE_MODEL_BASE_URL}/exhibit.glb`
```

## 4.7 缓存建议

模型文件通常可长期缓存：
- `Cache-Control: public, max-age=31536000, immutable`

更新模型时建议改文件名（如 `exhibit.v2.glb`）以避免用户命中旧缓存。

---

## 5. 你的项目推荐落地

按优先级建议：

1. 中国境内优先：`腾讯云 COS` 托管 `exhibit.glb`
2. 海外或已深度使用 Cloudflare：首选 `R2`
3. 全栈都在 Vercel 且追求集成效率：`Vercel Blob`
4. 在 Vercel 配置 `VITE_MODEL_BASE_URL`
5. 把前端模型路径统一改成环境变量拼接
6. Redeploy 并在浏览器 Network 确认模型已从外部 URL 拉取

---

## 6. 常见问题

## 6.1 为什么不是把模型继续放在 `public/models`？

因为模型太大，会让仓库和构建包膨胀，导致 GitHub/Vercel 更容易失败或变慢。

## 6.2 环境变量应该填什么？

填“可访问 URL 前缀”，不是本地磁盘路径。

正确示例：
- `https://assets.example.com/models`

错误示例：
- `E:/taijiHall2/code/public/models`

## 6.3 更新模型后用户还是旧版本怎么办？

给新模型改文件名（如 `exhibit.v2.glb`）并更新引用，或清理 CDN 缓存。

---

## 7. 验收清单

1. 线上页面能正常打开
2. 模型请求 URL 指向 R2/Blob，不是站内 `public/models`
3. 模型请求返回 `200`
4. 首次加载后，刷新速度明显提升（命中缓存）
5. GitHub 仓库中不含大模型文件
