# 职业资格考试考务智能调度桌面系统

大型职业资格考试报名与考务智能调度桌面应用系统，基于 Electron + React + TypeScript 构建。

## 功能模块

### 1. 系统总览 (Dashboard)
- 考生总数、编排方案、考务任务、待审批事项实时统计
- 考生状态分布饼图、各科目报考人数柱状图
- 最新审批事项、考务任务状态列表

### 2. 考生管理 (Candidate Management)
- 考生信息录入：姓名、身份证号、照片上传、报考科目、生源地、所在学校
- 特殊需求标记：残疾、听力障碍、视力障碍、其他
- 多条件搜索、筛选
- Excel 导出功能

### 3. 考场编排 (Room Arrangement)
- 智能编排算法，支持以下约束：
  - 考点容量限制
  - 座位间距规则（0-2格间隔）
  - 同校考生避让
  - 科目时间冲突检测
  - 特殊考生无障碍考场优先
- 编排结果预览与应用
- 座位布局可视化展示
- 提交教育考试主管审批

### 4. 审批中心 (Approval Center)
- 待审批/已处理分类查看
- 考场编排审批
- 考点调整申请审批
- 监考调班申请审批
- 成绩复核审批
- 审批意见记录

### 5. 考务监控 (Exam Task Monitoring)
- 试卷押运/考试/送返全流程状态追踪
  - 待开始 → 押运中 → 已到达 → 考试中 → 已收卷 → 已送返
- GPS 轨迹异常实时检测：
  - 超速报警
  - 异常停留报警
  - 轨迹偏离报警
- 严重异常分级标记

### 6. 监考排班 (Invigilator Schedule)
- 监考人员库管理（资质科目、工时、轮换评分）
- 智能排班算法：
  - 学科资质匹配
  - 历史监考记录公平轮换
  - 日/周工时上限控制
  - 监考工时平衡
- 在线调班申请，考务组长审批流程

### 7. 成绩管理 (Score Management)
- 老师在线录入成绩
- 双评交叉验证（分差 ≤ 3 分通过）
- 异常分数自动标记（偏离均值3σ、极端分数、分差过大）
- 人工复核流程
- Excel 导出

### 8. 统计分析 (Statistics Center)
- 按地区、科目多维度统计：
  - 参考人数、实考人数、缺考率、违纪率
  - 平均分、最高分、最低分、及格率
  - 分数段分布
- 多种可视化图表：
  - 柱状图、饼图、折线图
- 可视化热力地图：
  - 各考点考场占用热力分布
  - 监考人员密度热力分布
- 支持导出 Excel 和 PDF 质量分析报告

## 技术栈

| 类别 | 技术 |
|------|------|
| 桌面框架 | Electron |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| UI 组件库 | Ant Design 5 |
| 状态管理 | Zustand |
| 图表库 | ECharts |
| 数据导出 | SheetJS (Excel) + jsPDF (PDF) |
| 地图 | SVG 自定义热力图 |

## 项目结构

```
src/
├── algorithms/          # 核心算法模块
│   ├── roomArrangement.ts    # 考场智能编排
│   ├── invigilatorSchedule.ts # 监考智能排班
│   └── anomalyDetection.ts   # GPS/成绩异常检测
├── components/          # 可复用组件
├── data/
│   └── mockData.ts      # 模拟数据生成
├── pages/               # 页面模块
│   ├── Dashboard.tsx
│   ├── CandidateManagement.tsx
│   ├── RoomArrangement.tsx
│   ├── ApprovalCenter.tsx
│   ├── ExamTaskMonitoring.tsx
│   ├── InvigilatorSchedule.tsx
│   ├── ScoreManagement.tsx
│   └── StatisticsCenter.tsx
├── store/
│   └── useAppStore.ts   # 全局状态管理
├── types/
│   └── index.ts         # TypeScript 类型定义
├── utils/
│   └── exporters.ts     # Excel/PDF 导出工具
├── App.tsx
├── main.tsx
└── index.css
electron/                # Electron 主进程
├── main.ts
└── preload.ts
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建打包

```bash
npm run build
```

构建产物将输出到 `release/` 目录。
