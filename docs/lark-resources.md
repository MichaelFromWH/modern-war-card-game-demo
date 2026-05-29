# 飞书项目资源索引

本文件记录现代战争卡牌项目在飞书中的固定资源位置。后续需求、测试、缺陷和上线判断优先从这里找到入口。

## 项目空间

| 资源 | 固定位置 |
| --- | --- |
| 飞书项目文件夹 | https://my.feishu.cn/drive/folder/MAyXfgHkkl7axhdudMscfZb9n2d |
| 项目资源索引文档 | https://my.feishu.cn/docx/BdlhdTj5fo2FgCxaWZrc3neDnMe |
| V0.5.2 上线前测试用例标准 | https://my.feishu.cn/docx/QNordqKeQoN0KuxDDWPcmPFrnsf |
| V0.5.2 第一次上线前全面测试报告 | https://my.feishu.cn/docx/KNMAd6Xqeoy1Hyxd5iyc0YwCn7f |
| BUG-0001 维修满血修复回归报告 | https://my.feishu.cn/docx/IVEcdN4IRoBRJCx4jqXc9iEzn6d |
| Bug 管理多维表格 | https://my.feishu.cn/base/LjzrbtwEsaUS6Vsw0umcD2vRnUg |

## 本地标准文件

| 用途 | 本地固定路径 |
| --- | --- |
| 项目入口与运行说明 | `README.md` |
| Agent 协作规则与文件路径索引 | `AGENTS.md` |
| 长期记忆、决策索引与会话恢复规则 | `MEMORY.md` |
| 游戏核心机制真源 | `GAME_MECHANICS.md` |
| 当前版本卡牌内容快照 | `GAME_CONTENT_V0.5.2.md` |
| 旧版本内容快照 | `GAME_CONTENT_V0.5.1.md` |
| 本地回归测试清单 | `TEST_CASES.md` |
| 真实对局与问题修复记录 | `PLAYTEST_DEBUG_LOG.md` |
| 卡牌设计方法 | `card_design_method.md` |
| 线上 1v1 路线图 | `online_1v1_roadmap.md` |

## 使用约定

- 不确定玩法规则时，先查 `GAME_MECHANICS.md`。
- 不确定当前卡牌数值、标签和卡面效果时，先查 `GAME_CONTENT_V0.5.2.md`，再核对 `src/game-data.js` 的最终运行数据。
- 不确定测试标准或上线结论时，先查飞书测试用例标准和最近一次测试报告。
- 发现缺陷或上线阻塞时，必须写入 Bug 管理多维表格。
