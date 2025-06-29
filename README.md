# 单词听写系统 - Cloudflare Workers版

这是一个基于Cloudflare Workers的单词听写系统，可以帮助用户学习和记忆词汇。系统具有美观的界面和丰富的功能，支持多集合管理、错误统计和评级系统。

## 功能特点

- 📚 支持创建多个单词集合，方便分类管理
- 🎯 听写测试功能，支持多次尝试和提示
- 📊 错误统计和分析，帮助集中复习易错单词
- 🏆 评级系统，根据测试表现评定等级
- 💾 使用内存存储数据，无需额外数据库
- 🎨 现代化UI设计，响应式布局支持各种设备

## 快速开始

### 本地开发

1. 克隆仓库并安装依赖

```bash
git clone <repository-url>
cd vocabulary-app
npm install
```

2. 本地运行

```bash
npm run start
```

然后在浏览器中访问 http://localhost:8787

### 部署到Cloudflare Workers

1. 登录Cloudflare账户

```bash
npx wrangler login
```

2. 部署应用

```bash
npm run deploy
```

部署完成后，你将获得一个可访问的URL。

## 使用指南

1. **添加集合**：点击"添加集合"按钮，输入集合编号
2. **添加单词**：选择一个集合，点击"添加单词"按钮，输入中文和英文
3. **开始测试**：选择一个或多个集合，点击"开始听写"按钮
4. **查看错误统计**：点击"查看错误次数"按钮，查看错误统计信息

## 技术栈

- Cloudflare Workers - 无服务器运行环境
- 内存存储 - 用于保存数据
- 纯JavaScript/HTML/CSS前端，无需框架

## 自定义

你可以通过修改以下文件来自定义系统：

- `public/styles.css` - 修改界面样式
- `public/index.html` - 修改HTML结构
- `public/script.js` - 修改前端逻辑
- `src/index.js` - 修改后端API处理

## 许可证

MIT

---

欢迎贡献代码和提出建议！ 