# Vercel 环境变量配置指南

本指南将详细说明如何在 Vercel 中配置 OpenAI API Key 和 Gemini API Key。

## 方法一：在项目部署时配置（推荐）

### 步骤 1: 导入项目到 Vercel

1. 访问 [vercel.com](https://vercel.com) 并登录
2. 点击右上角的 **"Add New Project"** 或 **"New Project"**
3. 选择你的 GitHub 仓库（如果没有连接 GitHub，先连接）
4. 点击 **"Import"** 导入项目

### 步骤 2: 配置环境变量

在项目配置页面，你会看到 **"Environment Variables"** 部分：

1. **找到 Environment Variables 区域**
   - 在项目设置页面，向下滚动找到 "Environment Variables" 部分
   - 或者点击 "Configure Project" 按钮

2. **添加第一个环境变量 - Gemini API Key**
   - 点击 **"Add"** 或 **"Add Environment Variable"** 按钮
   - 在 **Key** 输入框输入：`GOOGLE_GENERATIVE_AI_API_KEY`
   - 在 **Value** 输入框输入：你的 Gemini API Key（从 Google AI Studio 获取）
   - 在 **Environment** 选择框，勾选所有选项：
     - ✅ Production（生产环境）
     - ✅ Preview（预览环境）
     - ✅ Development（开发环境）
   - 点击 **"Save"** 保存

3. **添加第二个环境变量 - OpenAI API Key**
   - 再次点击 **"Add"** 或 **"Add Environment Variable"** 按钮
   - 在 **Key** 输入框输入：`OPENAI_API_KEY`
   - 在 **Value** 输入框输入：你的 OpenAI API Key（从 OpenAI Platform 获取）
   - 在 **Environment** 选择框，勾选所有选项：
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   - 点击 **"Save"** 保存

4. **确认配置**
   - 你应该看到两个环境变量都已添加：
     ```
     GOOGLE_GENERATIVE_AI_API_KEY  [Production, Preview, Development]
     OPENAI_API_KEY                [Production, Preview, Development]
     ```

### 步骤 3: 部署项目

1. 配置完环境变量后，点击 **"Deploy"** 按钮
2. 等待构建完成（通常需要 1-3 分钟）
3. 部署成功后，你会看到部署 URL，例如：`https://your-project.vercel.app`

## 方法二：在已部署的项目中配置

如果你的项目已经部署，可以按以下步骤添加或修改环境变量：

### 步骤 1: 进入项目设置

1. 在 Vercel Dashboard 中，点击你的项目
2. 点击顶部导航栏的 **"Settings"**（设置）
3. 在左侧菜单中，点击 **"Environment Variables"**（环境变量）

### 步骤 2: 添加环境变量

1. **添加 Gemini API Key**
   - 点击 **"Add New"** 按钮
   - Key: `GOOGLE_GENERATIVE_AI_API_KEY`
   - Value: 你的 Gemini API Key
   - Environment: 选择所有环境（Production, Preview, Development）
   - 点击 **"Save"**

2. **添加 OpenAI API Key**
   - 再次点击 **"Add New"** 按钮
   - Key: `OPENAI_API_KEY`
   - Value: 你的 OpenAI API Key
   - Environment: 选择所有环境
   - 点击 **"Save"**

### 步骤 3: 重新部署

⚠️ **重要**：添加或修改环境变量后，需要重新部署才能生效！

1. 点击顶部导航栏的 **"Deployments"**（部署）
2. 找到最新的部署记录
3. 点击右侧的 **"..."** 菜单
4. 选择 **"Redeploy"**（重新部署）
5. 或者直接推送新的代码到 GitHub，Vercel 会自动重新部署

## 获取 API Keys

### 获取 Gemini API Key

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 使用你的 Google 账号登录
3. 点击 **"Create API Key"** 或 **"Get API Key"**
4. 选择或创建一个 Google Cloud 项目
5. 复制生成的 API Key
6. 格式类似：`AIzaSy...`（以 `AIza` 开头）

### 获取 OpenAI API Key

1. 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
2. 使用你的 OpenAI 账号登录
3. 点击 **"Create new secret key"**
4. 给密钥起个名字（可选）
5. 复制生成的 API Key（⚠️ 只显示一次，请立即保存）
6. 格式类似：`sk-...`（以 `sk-` 开头）

## 验证配置

部署完成后，验证环境变量是否正确配置：

1. **测试应用功能**
   - 访问你的 Vercel 部署 URL
   - 尝试生成一个 PPT
   - 如果成功生成，说明环境变量配置正确

2. **查看构建日志**
   - 在 Vercel Dashboard 中，点击 **"Deployments"**
   - 点击最新的部署记录
   - 查看 **"Build Logs"**（构建日志）
   - 如果看到环境变量相关的错误，检查配置是否正确

3. **检查环境变量（仅限开发环境）**
   - 在项目设置 → Environment Variables
   - 确认两个变量都已添加
   - 确认所有环境都已勾选

## 常见问题

### Q: 环境变量添加后不生效？
A: 需要重新部署项目。在 Deployments 页面点击 "Redeploy"。

### Q: 如何更新 API Key？
A: 在 Settings → Environment Variables 中，点击变量右侧的编辑按钮，更新 Value，然后重新部署。

### Q: 如何删除环境变量？
A: 在 Settings → Environment Variables 中，点击变量右侧的删除按钮。

### Q: 环境变量会显示在构建日志中吗？
A: 不会。Vercel 会自动隐藏环境变量的值，只显示变量名。

### Q: 不同环境可以使用不同的 API Key 吗？
A: 可以。在添加环境变量时，只选择特定的环境（如只选择 Production）。

## 安全提示

- ✅ 环境变量在 Vercel 中是加密存储的
- ✅ 环境变量的值不会显示在构建日志中
- ✅ 只有项目成员才能查看和编辑环境变量
- ❌ 不要将 API Key 提交到 Git 仓库
- ❌ 不要在代码中硬编码 API Key
- ❌ 不要将 API Key 分享给不信任的人

## 截图说明位置

在 Vercel Dashboard 中，环境变量配置的位置：

```
Vercel Dashboard
└── Your Project
    └── Settings (顶部导航栏)
        └── Environment Variables (左侧菜单)
            └── Add New (添加新变量按钮)
```

或者在项目导入时：

```
Import Project
└── Configure Project
    └── Environment Variables (配置区域)
        └── Add (添加变量按钮)
```

## 完成！

配置完成后，你的应用就可以在 Vercel 上正常运行了。每次代码推送到 GitHub，Vercel 会自动重新部署，并使用你配置的环境变量。

