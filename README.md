# 现代战争三线卡牌 WebDemo

基于 V0.8 核心机制与美俄首发卡组/组卡规则的可玩原型。

当前版本围绕三线战场、隐蔽/暴露、前线接敌、火力引导、防空拦截、导弹打击和 50 点摧毁得分胜利构建。单位牌均为驻场牌，并拆分为攻击、生命和目标价值；巡航导弹、弹道导弹、SEAD 战斗机和轰炸机也拥有生命并可被摧毁得分。

## 本地运行

```bash
npm run dev
```

默认地址：

```text
http://localhost:3000
```

如果端口占用，可以使用：

```bash
PORT=3001 npm run dev
```

## 项目结构

```text
index.html                  页面结构
styles.css                  视觉样式与布局
src/main.js                 游戏主逻辑与交互
src/game-data.js            卡牌、阵营、牌组与数值数据
src/card-design.js          卡牌视觉素材与 UI 元素映射
assets/                     卡牌、战场、UI、音效等素材
scripts/                    素材生成与验证脚本
card_design_method.md       卡牌设计方法论
online_1v1_roadmap.md       线上 1v1 对局推进路线
render.yaml                 Render Web Service 部署配置
AGENTS.md                   AI 协作者项目规约
```

## 设计文档

- [卡牌设计方法](./card_design_method.md)：新增卡牌、平衡调整和技能文本的核心方法。
- [线上 1v1 路线](./online_1v1_roadmap.md)：部署为可邀请朋友对局所需的架构和阶段计划。
- [美军现代单位牌设计元素](./assets/card-design/usa-modern-card-elements.md)：卡牌插画层和 UI 层的视觉设计说明。
- [AI 协作者规约](./AGENTS.md)：给 Jarvis/Codex 等 Agent 的项目协作规则。

## 当前机制要点

- 三线战场以 `前线区` 和 `支援区` 为核心操作区域。
- 隐蔽单位需要通过侦查、接敌或特定技能进入暴露状态。
- 侦查单位负责暴露目标并引导榴弹炮、火箭炮等远火单位。
- 伴随防空和重型防空提供空袭、导弹、SEAD 的反制窗口。
- 单位被摧毁后按目标价值计分，率先达到 50 点的一方获胜。
- 鼠标悬停卡牌时会显示完整卡牌预览、单位属性、攻击/生命/价值和技能说明。

## GitHub Pages

仓库可通过 GitHub Pages 从 `main` 分支根目录直接发布为静态页面。

## 线上 1v1 部署

真正的朋友 1v1 对局需要 Node Web Service 承载 WebSocket 房间服务，不能只依赖 GitHub Pages。

当前仓库已提供 `render.yaml`，可在 Render 中作为 Blueprint 创建 Web Service：

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/MichaelFromWH/modern-war-card-game-demo)

```text
buildCommand: npm install
startCommand: npm start
healthCheckPath: /healthz
```

部署完成后，用 Render 提供的 `onrender.com` 地址打开游戏；可访问 `/healthz` 检查服务健康状态。

## 协作说明

修改卡牌数值、单位属性或技能文本前，优先阅读 [card_design_method.md](./card_design_method.md)。该文件是后续扩展卡牌和维护平衡的设计基准。
