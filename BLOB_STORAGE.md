# Vercel Blob Storage 配置

本项目使用 Vercel Blob Storage 来存储生成的 PPT 文件。这是 Vercel 官方提供的对象存储服务，完美适配无服务器环境。

## 自动配置

✅ **好消息**：Vercel Blob Storage 在 Vercel 项目中是自动可用的！

- 不需要额外的环境变量配置
- 不需要手动创建存储桶
- 只要安装了 `@vercel/blob` 包就可以直接使用

## 安装依赖

项目已经包含了 `@vercel/blob` 依赖：

```json
"@vercel/blob": "^0.20.0"
```

如果本地开发时需要安装：

```bash
npm install @vercel/blob
```

## 工作原理

1. **保存 PPT** (`/api/save-ppt`)
   - 使用 `put()` 方法将 HTML 上传到 Blob Storage
   - 文件路径：`presentations/{id}.html`
   - 访问权限：`public`（公开访问）

2. **读取 PPT** (`/api/preview/[id]`)
   - 使用 `get()` 方法从 Blob Storage 读取文件
   - 返回 HTML 内容供预览页面使用

3. **预览页面** (`/app/preview/[id]`)
   - 通过 API 路由获取 HTML
   - 在 iframe 中显示预览

## 本地开发

在本地开发时，Vercel Blob Storage 需要配置：

1. **安装 Vercel CLI**（如果还没有）：
   ```bash
   npm i -g vercel
   ```

2. **链接项目到 Vercel**：
   ```bash
   vercel link
   ```

3. **拉取环境变量**：
   ```bash
   vercel env pull .env.local
   ```

或者，你可以使用本地文件系统作为后备方案（仅开发环境）。

## 生产环境（Vercel）

在 Vercel 上部署时：

1. ✅ 自动配置 - 无需额外设置
2. ✅ 自动认证 - Vercel 自动处理认证
3. ✅ 自动清理 - Vercel 管理存储生命周期

## 存储限制

Vercel Blob Storage 的免费计划限制：
- 存储空间：根据你的 Vercel 计划
- 文件大小：单个文件最大 4.5GB
- 带宽：根据你的 Vercel 计划

对于 PPT HTML 文件（通常几 KB 到几 MB），完全足够使用。

## 文件管理

- 文件存储在 Vercel Blob Storage 中
- 文件路径格式：`presentations/{uuid}.html`
- 访问权限：公开（`public`）
- 文件会自动保留，直到手动删除或账户限制

## 故障排除

### 错误：Blob not found
- 检查文件 ID 是否正确
- 确认文件已成功上传

### 错误：Authentication failed
- 确认项目已正确链接到 Vercel
- 检查是否在 Vercel 环境中运行

### 本地开发问题
- 确保已运行 `vercel link`
- 确保已运行 `vercel env pull`

## 优势

相比其他方案，Vercel Blob Storage 的优势：

1. ✅ **原生集成** - Vercel 官方服务，无缝集成
2. ✅ **自动配置** - 无需手动配置环境变量
3. ✅ **高性能** - 全球 CDN 加速
4. ✅ **可靠性** - Vercel 基础设施保障
5. ✅ **简单易用** - API 简洁明了

## 代码示例

### 保存文件
```typescript
import { put } from '@vercel/blob'

const blob = await put('presentations/file.html', htmlContent, {
  access: 'public',
  contentType: 'text/html',
})
```

### 读取文件
```typescript
import { get } from '@vercel/blob'

const blob = await get('presentations/file.html')
const content = await blob.text()
```

## 更多信息

- [Vercel Blob Storage 文档](https://vercel.com/docs/storage/vercel-blob)
- [@vercel/blob 包文档](https://www.npmjs.com/package/@vercel/blob)

