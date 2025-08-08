# 🗄️ MongoDB 可视化工具

<div align="center">

**一个现代化的 MongoDB 数据库可视化和管理工具**

🚀 **高效** • 🎨 **美观** • 🔧 **易用** • 🔒 **安全**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)

</div>

## 🌟 项目概述

提供直观的界面来浏览、查询和管理 MongoDB 数据库，支持实时数据可视化、AI智能查询、代码生成和多连接管理。

## 🏗️ 系统架构

![系统架构图](https://raw.githubusercontent.com/phuhao00/mongodb_viewer/main/docs/images/architecture.svg)

采用现代化的三层架构设计，确保系统的可扩展性和维护性：

- **前端层**: React 18 + TypeScript + Vite
- **服务层**: Node.js + Express + AI服务
- **数据层**: MongoDB + Redis缓存

## ✨ 核心功能

### 🔗 连接管理
- 多数据库连接支持
- 安全认证（用户名/密码、SSL）
- 连接状态实时监控
- 配置安全存储

### 📊 数据浏览
- 树形结构展示数据库和集合
- JSON格式文档预览
- 智能搜索和过滤
- 统计信息展示

### ✏️ 数据编辑
- 可视化文档编辑器
- 实时JSON格式验证
- 批量操作支持
- 自动保存功能

### 🔍 查询功能
- MongoDB原生查询语法支持
- 聚合管道查询
- 查询历史管理
- 结果导出（JSON、CSV）

### 🤖 AI智能功能
- 自然语言转MongoDB查询
- 智能数据分析和统计
- AI对话式数据检索
- 查询优化建议

### 📈 数据可视化
- 多种图表类型（柱状图、饼图、折线图）
- 自定义视图配置
- 实时数据更新
- 视图配置保存

### 💻 代码生成
- Golang结构体自动生成
- 智能标签支持（json、bson）
- 查询代码生成
- 类型智能映射

## 🔄 工作流程

![工作流程图](https://raw.githubusercontent.com/phuhao00/mongodb_viewer/main/docs/images/workflow.svg)

```
🚀 开始 → 🔗 连接配置 → 🗄️ 数据浏览 → 🔍 查询/AI分析 → ✏️ 数据编辑 → 📈 可视化 → 💻 代码生成
```

## 🚀 快速开始

### 📋 环境要求

| 环境 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | 18.0.0 | 20.x |
| npm | 9.0.0 | Latest |
| MongoDB | 5.0.0 | 7.x |

### 🛠️ 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/phuhao00/mongodb_viewer.git
cd mongodb_viewer
```

> **注意**: 图片链接已更新为正确的GitHub仓库地址。

2. **安装依赖**
```bash
npm install
cd api && npm install && cd ..
```

3. **环境配置**
```bash
cp .env.example .env
cp api/.env.example api/.env
```

编辑 `.env` 文件：
```env
# 前端配置
VITE_API_URL=http://localhost:3001

# 后端配置
PORT=3001
MONGODB_URI=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your-openai-api-key
```

4. **启动服务**
```bash
# 启动后端服务
npm run server:dev

# 启动前端服务（新终端）
npm run dev
```

5. **访问应用**
- 前端应用: http://localhost:5173
- 后端API: http://localhost:3001

## 📖 使用指南

### 🔗 连接数据库
1. 点击左侧导航栏的"连接"选项
2. 填写连接信息（主机、端口、认证等）
3. 测试连接并保存

### 🤖 AI智能查询
1. 进入AI页面
2. 使用自然语言描述查询需求
3. AI自动生成MongoDB查询语句
4. 查看分析结果和可视化图表

### 📊 数据可视化
1. 执行查询获取数据
2. 选择合适的图表类型
3. 配置图表参数
4. 保存视图到仪表板

### 💻 代码生成
1. 选择目标集合
2. 点击"生成代码"按钮
3. 选择语言和配置选项
4. 复制生成的代码

## 🔧 技术栈

### 前端技术
- **React 18**: 现代化UI框架
- **TypeScript**: 类型安全
- **Vite**: 快速构建工具
- **Tailwind CSS**: 实用优先的CSS框架
- **Zustand**: 轻量级状态管理

### 后端技术
- **Node.js**: JavaScript运行时
- **Express**: Web应用框架
- **MongoDB Driver**: 原生数据库驱动
- **OpenAI API**: AI智能服务
- **Redis**: 缓存和会话存储

### 开发工具
- **Docker**: 容器化部署
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Vitest**: 单元测试框架

## 🐳 Docker部署

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps
```

## 🧪 测试

```bash
# 前端测试
npm run test

# 后端测试
cd api && npm run test

# 测试覆盖率
npm run test:coverage
```

## 📝 API文档

主要API端点：

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/connections` | GET/POST | 连接管理 |
| `/api/query/:connectionId` | POST | 执行查询 |
| `/api/ai/chat` | POST | AI对话 |
| `/api/ai/generate-query` | POST | 生成查询 |
| `/api/ai/analyze` | POST | 数据分析 |
| `/api/visualize/:connectionId` | POST | 数据可视化 |

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和开源社区。

---

<div align="center">

**如果这个项目对你有帮助，请给它一个 ⭐️**

</div>
