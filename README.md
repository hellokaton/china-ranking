# 中国区 GitHub 开发者排行榜

本项目收集了中国开发者在 GitHub 上关注者数据，并区分开发者和 Markdown 工程师进行排名。

## 🔍 项目说明

- **数据来源**: 从GitHub官方API获取公开数据
- **自动更新**: 每天自动更新数据，保持排行榜的时效性
- **快速加载**: 网站加载速度快，访问体验好
- **手机友好**: 手机、平板、电脑都能正常访问浏览
- **排序维度**: 支持按关注者或总 Star 一键切换查看

## 💻 技术实现

### 前端架构

- **[Astro](https://astro.build/)**: 高性能静态站点生成框架
- **[Tailwind CSS](https://tailwindcss.com/)**: 原子化 CSS 框架
- **TypeScript**: 类型安全的开发体验

### 数据处理

- **[GitHub REST API v3](https://docs.github.com/en/rest)**: 公开数据获取
- **Node.js**: 数据处理服务
- **[GitHub Actions](https://github.com/features/actions)**: 自动化工作流

### 构建工具

- **pnpm**: 高性能包管理器
- **Vite**: 现代前端构建工具

## 🛠️ 本地开发

### 前置条件

- Node.js >= 18.x
- pnpm >= 8.x
- GitHub API Token (用于数据获取)

### 安装步骤

1. 克隆仓库:

```bash
git clone https://github.com/hellokaton/china-ranking.git
cd china-ranking
```

2. 安装依赖:

```bash
pnpm install
```

3. 配置环境变量:

```bash
cp .env.example .env.local
# 编辑 .env.local 添加你的 GitHub Token
```

4. 启动开发服务器:

```bash
pnpm dev
```

5. 构建生产版本:

```bash
pnpm build
```

6. 预览生产构建:

```bash
pnpm preview
```

## 📊 数据处理方法

项目数据处理遵循以下流程:

1. **数据采集**: 通过 GitHub API 获取公开用户信息
2. **地区识别**: 根据公开资料识别中国区用户
3. **账号过滤**: 过滤组织账号，仅保留个人开发者账号
4. **开发者分类**: 基于贡献类型将开发者分为不同类别，包括区分 Markdown 工程师和代码开发者
5. **贡献分析**: 基于仓库类型、提交类型等多维度分析
6. **数据存储**: 生成结构化数据文件
7. **定期更新**: 通过自动化工作流定期更新数据

### 手动触发数据更新

```bash
# 设置 GitHub Token 环境变量
export GITHUB_TOKEN=your_github_token

# 执行数据获取脚本
pnpm fetch-data
```

## 🧩 项目结构

```
├── public/                # 静态资源
├── src/
│   ├── components/        # 通用组件
│   ├── layouts/           # 页面布局模板
│   ├── pages/             # 页面路由
│   ├── utils/             # 工具函数
│   └── types/             # TypeScript 类型定义
├── scripts/               # 数据处理脚本
│   └── fetch-github-users.js  # GitHub 用户数据获取
├── astro.config.mjs       # Astro 配置
└── tailwind.config.cjs    # Tailwind 配置
```

## 🤝 参与贡献

我们欢迎各种形式的贡献，包括但不限于:

- 功能改进与 Bug 修复
- 性能优化
- 文档完善
- 数据处理方法优化
- UI/UX 改进

### 贡献流程

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交变更 (`git commit -m 'feat: add amazing feature'`)
4. 推送到远程分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

请确保遵循我们的代码规范和提交规范。

## 📜 许可证

本项目采用 [MIT 许可证](LICENSE)。

---

**声明**: 这个排行榜只是为了技术交流学习，所有数据都来自GitHub公开API，不是什么官方排名。数据仅供参考，请勿用于商业用途。
