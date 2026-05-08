# 现代战争双层战场卡牌 WebDemo

基于 V4.3 轻量测试版核心机制与美俄首发卡组/组卡规则的可玩原型：双层战场、通用隐蔽部署、前线接敌/伏击、50 点摧毁得分胜利、补给耗尽最终行动、24 张驻场单位 + 6 张功能战术牌。导弹、战斗机和轰炸机为驻场单位，拥有战力并可被摧毁得分。

## 本地运行

```bash
npm run dev
```

默认地址为 `http://localhost:3000`。如果端口占用，可以使用：

```bash
PORT=3001 npm run dev
```

## GitHub Pages

仓库包含 `.github/workflows/pages.yml`，推送到 `main` 后可通过 GitHub Actions 部署为静态页面。
