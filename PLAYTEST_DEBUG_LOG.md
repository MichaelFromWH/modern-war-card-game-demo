# 对局排查日志

## 2026-06-12 V0.5.3 线上反击、抽牌、暴露演出与取消目标热修

来源：Michael 与朋友线上 1v1 实战反馈：已暴露前线步兵被打击没有反击；线上抽牌发生在结束回合后而不是各自回合开始；己方部署前线单位强制暴露敌方单位时，敌方卡牌未展示插画与动画就直接结算；战术牌目标选择框关闭后，该战术牌无法再次使用且无法点击结束回合。

根因：

- 线上前线接敌打击走 `resolveFrontlineContactFire()` 的直接伤害路径，只调用 `dealDamage()`，绕过了 V0.5.3 前线反击裁决。
- 线上 `applyPassTurn()` 在结束方移交指挥权前抽牌，导致抽牌时机表现为“回合结束后抽卡”；调度完成进入第一行动方时也没有统一按回合开始补抽。
- 线上暴露演出 staging 只物化了效果来源，目标仍可能保留上一帧的遮罩 `cardId` 与 `masked` 状态，因此出现黑卡、0/0 或无插画的短暂错误画面。
- 客户端关闭目标选择只清了本地 `state.pending`，服务器 `battle.pending` 仍然存在，继续把当前玩家标记为 pending 方，导致结束回合和再次使用卡牌都被服务器拒绝。

修复：

- `src/online-battle-engine.js` 将线上前线接敌的正面打击改为走 `dealDirectDamageWithCounterattack()`；若本次已经触发隐蔽反击，则记录对应目标并跳过普通前线反击，保持“隐蔽反击优先，不与前线反击同时生效”的口径。
- 线上调度完成后为第一行动方执行回合开始抽 1 张；之后 `pass_turn` 改为切换到下一行动方、重置行动额度后，由下一行动方抽 1 张。
- `src/online-animation-state.js` 与 `src/main.js` 在 `expose` effect 中按服务器下发的 `targetCardId` 物化被暴露目标，先展示真实卡牌插画与翻开状态，再应用最终快照结算。
- 新增服务器权威动作 `cancel_pending`；客户端关闭目标选择时向服务器取消 pending，并清理本地选择态，不再锁死结束回合。
- `scripts/v053-regression-tests.mjs` 增加 4 个专项用例：线上前线接敌反击、回合开始抽牌、暴露 staging 真实卡牌、取消目标释放服务器 pending。

验证结果：

- `node --check src/main.js`
- `node --check src/online-battle-engine.js`
- `node --check src/online-animation-state.js`
- `node --check scripts/v053-regression-tests.mjs`
- `node scripts/v053-regression-tests.mjs`：13/13 通过。
- `node scripts/v052-regression-tests.mjs`：31/31 通过。
- 本地 `/healthz` 返回 `{"ok":true,"rooms":0,"sockets":0}`。
- 本地 WebSocket 双端 smoke：host/guest 建房、ready、跳过调度、回合移交、guest 部署、host 使用并取消电子压制目标选择、取消后结束回合均通过；host 先手回合开始手牌 8，guest 回合开始手牌 8，host 第二回合开始手牌 9，取消后 `spentTacticPoints = 0`。
- 浏览器 smoke（Chrome channel）：AI 对局跳过调度后手牌 8，资源显示 `通用 2 / 行动 0 / 战术 1`，“回合结束”按钮可点击，控制台无 error。
- 线上部署：ECS `/opt/war-card-game` 已更新，PM2 进程 `war-card-game` 重启后为 `online`，`.deployed-version = v0.5.3-20260612-online-turn-cancel-20260612-221119`，覆盖前备份位于 `/tmp/war-card-game-backup-online-turn-cancel-20260612-221119.tgz`。
- 公网验证：`http://121.41.9.156/healthz` 返回 `{"ok":true,"rooms":0,"sockets":0}`；公网源码已包含 `cancel_pending`、`drawCards(battle, nextSide, 1)`、`drawCards(battle, enteringSide, 1)`、`materializeEffectTarget`；公网 WebSocket 双端 smoke 通过，host 先手回合开始手牌 8，guest 回合开始手牌 8，host 第二回合开始手牌 9，取消目标后 `spentTacticPoints = 0` 且可结束回合。

## 2026-06-12 V0.5.3 回合资源、禁火标记与反击机制上线

来源：Michael 提供 V0.5.3 机制文档与补充口径：回合行动拆为行动点、战术点、通用点；计分牌需要展示三类资源；己方回合疲惫后单位右上角显示禁火；新增前线反击和高空反击，且反击不造成疲惫、被压制单位不能反击、必须满足目标合法性。

修复：

- `src/main.js` 与 `src/online-battle-engine.js` 同步回合资源模型：空场开局 2 通用 / 0 行动 / 1 战术，非空场 1 通用 / 1 行动 / 1 战术；战术和场上行动可用通用点补足，部署消耗通用点。
- `src/main.js` 与 `styles.css` 在左侧计分牌展示当前行动方三类资源，并在己方当前回合已部署或已主动行动的单位右上角显示“禁火”状态。
- `src/main.js` 与 `src/online-battle-engine.js` 增加前线反击和高空反击：直接单目标攻击满足区域与合法目标条件时，先计算双方伤害，再统一结算摧毁与得分；反击不疲惫、不消耗点数。
- `src/game-data.js` 同步 V0.5.3 可见文本：侦察可选隐蔽与支援区、防空拦截仅敌方回合、高空单位强制暴露、海马斯/Tornado-S 多目标文字、电子压制文字与俄方渗透单位类型展示。
- `scripts/v053-regression-tests.mjs` 增加 0.5.3 专项回归，覆盖通用点补足、前线合法反击、非法反击跳过、高空战斗机反击、压制禁反击。

验证结果：

- `node --check src/main.js`
- `node --check src/online-battle-engine.js`
- `node --check src/game-data.js`
- `node scripts/v053-regression-tests.mjs`：5/5 通过。
- `node scripts/v052-regression-tests.mjs`：31/31 通过。
- `http://127.0.0.1:3000/healthz` 返回 `{"ok":true,"rooms":0,"sockets":0}`。
- 浏览器 smoke：AI 对局首回合计分牌显示 `通用 2 / 行动 0 / 战术 1`；部署单位后通用点变为 1，单位右上角出现“禁火”标记。
- WebSocket smoke：本地 1v1 建房、加入、双方 ready、跳过调度后，房主资源为 `2/0/1`；部署 `us_f35a_sead` 后通用点为 1，场上单位数为 1。
- 线上部署：已通过 SSH key 上传到 ECS `/opt/war-card-game`，PM2 进程 `war-card-game` 重启后为 `online`，`.deployed-version = v0.5.3-20260612-90ca033+local`，覆盖前备份位于 `/tmp/war-card-game-backup-v053-20260612-0218.tgz`。
- 公网验证：`http://121.41.9.156/healthz` 返回 `{"ok":true,"rooms":0,"sockets":0}`；公网 WebSocket 1v1 建房、加入、ready、调度、部署 smoke 通过，房主首回合资源 `2/0/1`，部署后通用点为 1；公网浏览器 AI 对局部署后禁火角标可见。

## 2026-06-12 V0.5.3 双部署后回合结束按钮不可点击

来源：Michael 截图反馈：开局回合部署两个单位后，资源显示为 `通用 0 / 行动 0 / 战术 1`，但右下角“回合结束”按钮无法交互。

根因：

- 本地 AI 对局中，部署后的卡牌飞行、暴露、接敌与日志结算会短暂设置 `battle.actionAnimation`。
- V0.5.3 双部署开局时，第二张单位已经视觉上进入战场、资源也已经扣到 `0/0/1`，但部署结算演出锁仍未释放；`canPlayerEndTurn()` 因 `battle.actionAnimation` 返回 false。
- 按钮 disabled 状态和视觉高亮不一致，玩家看到的是“按钮像可点，但点不动”，体验上等同卡死。

修复：

- `src/main.js` 新增 `handleEndTurnAction()`、`queueEndTurnAfterCurrentAction()` 和 `consumeQueuedEndTurn()`。
- 当本地玩家回合没有 pending、指挥权转交或 AI 思考，但当前动作仍在 `actionAnimation` 结算中时，“回合结束”按钮保持可点击；点击后显示“结束中”，写入日志“已收到结束回合指令...”，当前部署结算完成后自动执行结束回合。
- 排队消费复用原有 `passTurn(side)` 路径，保证日志、抽牌、清压制和指挥权移交与正常点击完全一致。
- 队列状态在新对局、重置、投降/退出、进入或应用线上权威快照时清空；线上权威模式暂不使用本地排队，避免和服务器快照播放交错。
- `scripts/v053-regression-tests.mjs` 增加 `V053-ENDTURN-001`，防止本地回合结束排队路径被移除。

验证结果：

- 红灯复现：`V053-ENDTURN-001` 初始失败，提示本地 UI 缺少 queue-aware end-turn handler。
- `node --check src/main.js`、`node --check src/online-battle-engine.js`、`node --check scripts/v053-regression-tests.mjs` 通过。
- `node scripts/v053-regression-tests.mjs`：9/9 通过。
- `node scripts/v052-regression-tests.mjs`：31/31 通过。
- 浏览器复测：部署结算锁期间点击“回合结束”后，日志出现“已收到结束回合指令”，正常结束回合日志随后出现，资源进入下一己方回合；控制台无 error。
- 线上部署：ECS `/opt/war-card-game` 已更新，PM2 进程 `war-card-game` 为 `online`，`.deployed-version = v0.5.3-20260612-endturn-queue-203312`，覆盖前备份位于 `/tmp/war-card-game-backup-v053-endturn-20260612-203312.tgz`。
- 公网验证：`http://121.41.9.156/healthz` 返回 `{"ok":true,"rooms":0,"sockets":0}`；公网 `src/main.js` 已包含 `handleEndTurnAction()`、`queuedEndTurnSide` 和 `passTurn(side);` 排队消费路径。

## 2026-06-12 V0.5.3 P0/P1/P2 复测修复

来源：Michael 要求优先修复 P0，并同步处理 P1/P2 后部署上线：隐蔽反击与前线反击必须按规则同时结算；高空接敌默认只互相暴露，不自动打击或反击；高空反击被防空拦截遵循“拦截仅能在敌方回合触发”；图鉴/组卡页移除内部字段；行动额度 hover 展示三类点数解释与示例。

修复：
- `src/online-battle-engine.js` 调整隐蔽前线接敌清算顺序：伏击伤害先写入，进场单位仍可在同一接敌序列内打出合法反击，最后统一清理摧毁与得分。
- `src/main.js` 移除本地高空接敌自动交战路径，改为 `enforceHighAirExposure()` 只暴露双方高空单位；玩家之后手动攻击高空单位时才触发高空反击。
- `src/main.js` 与 `src/online-battle-engine.js` 的防空拦截增加当前行动方判断：只有被攻击方处在敌方回合时才可触发拦截，避免己方回合的高空反击被己方防空错误拦截。
- `src/main.js` 与 `styles.css` 给左侧行动额度三类资源增加 hover/focus 说明，解释通用点、行动点、战术点的用途和示例。
- 图鉴卡片移除 `card.id` 可见展示，组卡页移除 `specialization` 可见展示；同步更新旧行动额度提示、README、机制文档和 `TEST_CASES.md` 重复编号。

验证结果：
- `node scripts/v053-regression-tests.mjs`：8/8 通过，覆盖新增隐蔽前线同时反击、高空接敌不自动交战、防空仅敌方回合拦截。
- `node scripts/v052-regression-tests.mjs`：31/31 通过。
- `node --check src/main.js`、`node --check src/online-battle-engine.js`、`node --check scripts/v053-regression-tests.mjs` 通过。
- 浏览器 smoke：AI 对局首回合资源栏显示通用/行动/战术；资源 chip focus 后 tooltip opacity=1；图鉴 23 张卡无 `us_`/`ru_` 可见 ID；组卡页 23 张卡无 `specialization` 文案；两个测试标签页均无 console error。

## 2026-06-09 线上 PVP 与 AI 对战交互/裁决一致性修复

来源：Michael 线上 PVP 实测反馈：复制邀请链接未进入剪贴板且不展示地址；渗透单位前线接敌时仍无法完整执行隐蔽部署与强制暴露；复仇者打击无人机时先入弃牌堆再播放打击；轰炸机/远火多目标只打默认前排或一个单位；补给选择卡面仍保留旧 UI；F-35A/HIMARS 对烟幕目标伤害少 1；重型防空卡面出现文档中不存在的轰炸机文字；前线突破无法显式执行。

修复：

- `src/online-battle-engine.js` 增加显式 `frontline_breakthrough` 服务端动作，海马斯/Tornado-S/B-2/Tu-160 支持按玩家选择顺序结算多目标，烟幕护盾只清除状态不再减伤。
- `src/main.js` 对齐 AI/PVP 前端流程：多目标需确认且第一个选择为主目标；联机快照先在旧战场播放暴露/打击/摧毁动画，再应用服务器结算后战场；渗透部署前线会迫使敌方非渗透隐蔽单位暴露但自身保持隐蔽；前线突破改为点击突破窗口后依次选突破单位和支援区目标。
- `src/game-data.js`、`GAME_MECHANICS.md`、`GAME_CONTENT_V0.5.2.md` 同步 V0.5.2 docx 文本：重型防空不再在卡面提“轰炸机”，海马斯/Tornado-S 使用文档目标描述。
- `styles.css` 修正补给选择卡面为 hover 同款视觉预览、显示线上邀请链接、补充多目标选中序号和前线突破按钮样式。

验证结果：

- `node --check server.js`
- `node --check src/main.js`
- `node --check src/card-design.js`
- `node --check src/online-battle-engine.js`
- `node --check scripts/v052-regression-tests.mjs`
- `node scripts/v052-regression-tests.mjs`：27/27 通过。
- `http://127.0.0.1:3000/healthz` 返回 `{"ok":true,"rooms":0,"sockets":0}`。
- 浏览器 smoke：AI 对战进入开局调度，战地维修在无受损单位时打开补给选择，候选卡为 `war-card--visual-preview war-card--detailed war-card--preview`，补给候选阵营角标隐藏。
- 浏览器 smoke：线上 1v1 创建房间后邀请链接输入框可见，点击“复制邀请链接”后剪贴板读取到完整邀请 URL。

## 2026-06-08 渗透隐蔽、侦察调火视频顺序与接敌演出修复

来源：Michael 实测反馈：渗透单位无法在前线接敌状态下隐蔽部署；侦察暴露后需要先翻牌再播放榴弹炮/火箭炮视频并结算；俄方 hover 卡面技能文本覆盖数值；前线接敌应先播放所有被迫暴露单位的视频。

修复：

- `src/main.js` 与 `src/online-battle-engine.js` 将 `contactException` 单位作为前线接敌隐蔽部署例外；普通步兵、装甲、直升机仍按 V0.5.2 口径被迫正面部署。
- `src/main.js` 为侦察/渗透调火增加本地视频等待链：侦察视频 -> 目标翻牌 -> 被调用榴弹炮/火箭炮视频 -> 伤害结算。
- `src/main.js` 将前线接敌表现从只播放第一个伏击者视频，改为本次被迫暴露单位的视频一起播放完再结算。
- `styles.css` 将 hover / 补给候选卡的技能文本限制在卡牌底部区域，避免覆盖数值 HUD。
- `scripts/v052-regression-tests.mjs` 增加 `TC-V052-015A`，验证渗透单位可在敌方前线存在时隐蔽部署，普通前线单位仍正面部署。

验证结果：

- `node --check src/main.js`
- `node --check src/online-battle-engine.js`
- `node --check scripts/v052-regression-tests.mjs`
- `node scripts/v052-regression-tests.mjs`：21/21 通过。
- `http://127.0.0.1:3000/healthz` 返回 `{"ok":true,"rooms":0,"sockets":0}`。
- 浏览器 smoke：开始 AI 对局并保留手牌，无 console/page error；敌方前线已有单位时，游骑兵渗透小组手牌“隐蔽”按钮为 enabled，截图见 `artifacts/ranger-hidden-button-20260608.png`。
- 浏览器 hover 检查：战斗手牌 hover 卡面中，数值 HUD 底部与技能文本顶部间距约 24px，截图见 `artifacts/hand-hover-ui-20260608.png`。

## 2026-06-03 V0.5.2 上线前正式测试与飞书报告

来源：Michael 要求按 2026-06-02 已确认口径正式跑完整上线前测试，并提交 Bug 报告到飞书。

执行结果：

- 确认口径版 Excel 共 360 条用例：344 条通过，16 条平衡数据采集观察项，失败/阻塞 0。
- P0 263/263 通过，P1 62/62 通过，P2 19 条通过、16 条观察。
- 本轮未发现新增代码缺陷；Bug 管理表不新增阻塞缺陷记录，平衡样本不足作为观察项写入测试报告。

验证证据：

- `node --check src/game-data.js; node --check src/main.js; node --check src/online-battle-engine.js; node --check server.js; node --check scripts/v052-regression-tests.mjs`：通过。
- `node scripts/v052-regression-tests.mjs --output=artifacts\prelaunch-v052-regression-20260603.json`：18/18 通过。
- 数据/卡组静态审计：45 张现役卡、默认卡组、复制上限、旧 SEAD/战力文案扫描，共 531/531 通过，见 `artifacts/prelaunch-v052-data-audit-20260603.json`。
- 浏览器实操：`http://localhost:3000/` 首页 -> AI 对局 -> 保留手牌 -> 正面部署，支援区计数 0 -> 1，日志写入部署事件。
- 线上 1v1 smoke：浏览器创建房间显示 6 位房间码；WebSocket 双端创建/加入/双方准备后收到 `match_start` 和 `battle_snapshot`，见 `artifacts/prelaunch-v052-online-smoke-20260603.json`。
- 正式结果工作簿：`artifacts/prelaunch-v052-results-20260603.xlsx`。
- 飞书正式测试报告：https://my.feishu.cn/docx/OfMmdgTggodUomxL4UrcIkKEnof

## 2026-06-02 V0.5.2 上线前测试口径确认：防空、压制与低空目标

来源：Michael 根据上线前完整测试用例截图确认 6 条规则口径：只有 1 个合法防空时自动拦截，多个合法防空时进入选择窗口且不存在放弃拦截；电子压制禁主动和行动型被动；行动次数按行动序列；Tornado-S 可打低空；巡航/弹道导弹可打暴露地面、直升机和无人机；高空单位使用隐蔽类战术牌后仍暴露。

修复：

- `GAME_MECHANICS.md` 明确行动序列口径、防空拦截 0/1/多合法者裁决、电子压制禁行动型被动。
- `src/online-battle-engine.js` 新增 `interceptChoice`：多个合法拦截者时给防守方选择窗口，选择后继续伤害、摧毁、得分和终局结算；被压制或已在当前行动序列行动的单位不再参与拦截、前线接敌或侦察校射。
- `src/main.js` 同步本地练习压制口径，并让线上等待对手防空选择时禁用发起方继续操作；拦截窗口文案改为“选择拦截单位”，不提供取消/放弃入口。
- `src/game-data.js` 和 `GAME_CONTENT_V0.5.2.md` 修正 Tornado-S 可见文本为“地面或低空目标”。
- `styles.css` 修复战斗手牌部署按钮 `pointer-events` 被父层禁用的问题，确保“正面/隐蔽”按钮可真实点击。
- `TEST_CASES.md` 和 `scripts/v052-regression-tests.mjs` 增加多个防空选择、压制防空不可拦截、压制远火不可被侦察调用、行动序列拦截边界和手牌部署按钮可点性等回归断言。

验证结果：

- `node --check src/online-battle-engine.js`
- `node --check src/main.js`
- `node scripts/v052-regression-tests.mjs`：18/18 通过；新增断言覆盖 `interceptChoice`、电子压制禁行动型被动、Tornado-S/导弹低空目标口径。
- `http://localhost:3000/healthz` 返回 `{"ok":true,"rooms":0,"sockets":0}`。
- 浏览器 smoke：打开首页、开始 AI 对战、确认调度、真实点击手牌“正面”部署按钮；手牌 7 -> 6，场上 0 -> 1，无 `NaN` / `undefined`。
- 线上权威引擎专项 smoke：巡航导弹遇到 Pantsir + Buk 时下发 `interceptChoice`，防守方选择 Buk 后目标伤害为 0，未选 Pantsir 不消耗拦截。

## 2026-05-28 V0.5.2 维修满血口径确认与修复

来源：Michael 确认新规则下战地维修、战场维修应修复目标全部生命，同时要求项目重要标准文件固定存放并在 `AGENTS.md` 记录路径。

根因：

- V0.5.2 可见卡面文案已经写成“修复己方一个单位全部生命”，但最终运行数据仍保留 `ability.amount: 2`。
- 客户端 `src/main.js` 已有 `ability.full` 分支，线上权威引擎 `src/online-battle-engine.js` 仍只按固定数值维修。
- 项目缺少明确的飞书资源本地索引和 V0.5.2 内容快照，容易继续引用旧版 `GAME_CONTENT_V0.5.1.md`。

修复：

- `GAME_MECHANICS.md` 新增“维修与生命恢复”规则，明确战地维修、战场维修恢复至满生命，无受损单位时抽 2 留 1。
- `src/game-data.js` 在 V0.5.2 最终规则覆盖层为美俄维修战术牌设置 `ability.full: true`。
- `src/online-battle-engine.js` 支持 `ability.full`，按目标当前伤害值清零。
- `scripts/v052-regression-tests.mjs` 更新维修回归断言，要求战地维修把 3 点伤害修复为 0。
- 新增 `GAME_CONTENT_V0.5.2.md` 与 `docs/lark-resources.md`，并在 `AGENTS.md`、`README.md` 中记录固定查询路径。

验证计划：

- 执行 V0.5.2 规则回归脚本，确认维修用例通过。
- 抽查最终卡牌数据，确认两张维修战术牌均带 `ability.full: true`。
- 后续若继续修复其它 P1，回归测试报告需继续补充。

验证结果：

- `node --check src/game-data.js`
- `node --check src/online-battle-engine.js`
- `node --check scripts/v052-regression-tests.mjs`
- `node scripts/v052-regression-tests.mjs`：18/18 通过，`TC-V052-034/035/036` 通过。
- 抽查最终数据：`us_battlefield_repair.ability.full === true`，`ru_battlefield_repair.ability.full === true`。
- `curl http://localhost:3000/healthz` 返回 `{"ok":true,"rooms":0,"sockets":0}`。
- 飞书 Bug 表：BUG-0001 已更新为“已关闭 / 回归通过”。
- 飞书 Bug 表：BUG-0004 已更新为“已关闭 / 回归通过”，对应 V0.5.2 内容快照和固定资源索引。
- 飞书回归报告：https://my.feishu.cn/docx/IVEcdN4IRoBRJCx4jqXc9iEzn6d

## 2026-05-28 线上创建房间 UI 可见性修复

来源：Michael 线上验证反馈，“创建房间”功能从用户视角不可用，且该路径应纳入最基本测试用例。

根因：

- WebSocket 服务端创建房间链路实际正常，直连脚本可收到 `room_created`、`match_ready`、`battle_snapshot`。
- 首页拟物化最终覆盖层为了贴合背景平板，使用 `.briefing .online-card + .online-card { display: none; }` 以及 `.briefing .online-room-code/.online-slots/.online-callout { display: none !important; }` 隐藏了房间状态区。
- 因此用户点击“创建房间”后已经进入房间，但房间码、玩家槽位、复制邀请链接和提示都不可见，表现为“创建房间无法使用”。

修复：

- `src/main.js` 给 `#online-panel` 同步 `is-in-room` / `is-match-ready` 状态类。
- `styles.css` 新增首页 PVP 平板的入房状态覆盖：创建成功后隐藏初始输入区，显示当前房间码、复制邀请链接、玩家槽位、准备/进入战场/离开按钮和提示信息。
- `TEST_CASES.md` 新增 `UI-03A` 和 `NET-01A`，明确要求真实浏览器点击创建房间后房间码必须在 PVP 平板内可见，不能只测 WebSocket 直连。

验证计划：

- Playwright 线上/本地真实点击“创建房间”，检查 `.online-panel.is-in-room`、可见 6 位房间码、可见复制邀请链接和玩家槽位。
- 保留 WebSocket 双端房间 smoke，用于验证服务端房间协议未回退。

验证结果：

- 本地 1512x900 浏览器真实点击：创建房间后 6 位房间码、复制邀请链接、双方槽位、离开/断开按钮均在 PVP 平板内可见。
- 本地双标签真实 UI 流程：玩家 A 创建房间，玩家 B 输入房间码加入，双方准备后“进入战场”和“离开/断开”按钮均保持在面板范围内。
- `node scripts/v052-regression-tests.mjs --output=output/test-reports/v052-regression-results-online-room-fix.json`：18/18 通过。
- ECS 公网 `http://121.41.9.156/` 真实点击“创建房间”：房间码、复制邀请链接、玩家槽位、离开/断开按钮均可见且无页面溢出；公网 WebSocket 双端创建/加入/准备/战斗快照 smoke 通过。

本文件记录真实对局、线上联机、机制变更和疑难问题排查。它用于复现问题、判断根因、沉淀修复经验。

## 2026-05-27 战斗字体与 HUD 对齐细化

来源：Michael 反馈战场日志内容仍偏左、投降/退出文字需要改为“投降”并在红色按钮区居中、手牌与敌方手牌露出比例需要再收敛，同时 hover 后技能描述与右侧注释字号偏小。
修复记录：
- 下载阿里巴巴普惠体 3.0 官方 WOFF2 子集到 `assets/fonts/alibaba-puhuiti-3/`，并移除 Google Fonts 远程引用，统一项目字体到本地 `Alibaba PuHuiTi`。
- 投降按钮文案改为“投降”，重新收窄并微调按钮命中框，使文字对齐背景红色按钮中心。
- 战场日志面板加宽并让 `.battle-log` 在面板内居中；日志正文字号保持可读性增强。
- 敌方手牌继续上移到约 42% 可见比例，仅露出一小半；我方手牌 hover/选中时去除金色边框与金色伪元素高亮。
- hover 卡牌技能描述与右侧注释正文/列表字号上调一档。
验证记录：
- `node --check src/main.js`
- `node --check server.js`
- `curl http://localhost:3000/healthz`
- Playwright 打开战斗界面并跳过开局调度，确认字体 `document.fonts.status` 为 `loaded`、本地 `Alibaba PuHuiTi` 检查通过、字体资源无失败请求、控制台错误为 0；投降文案为“投降”；敌方手牌可见比例约 0.42；日志容器与面板中心偏差为 0；手牌边框颜色为透明。

## 2026-05-27 战斗目标选择与 hover 卡面视觉修正

来源：Michael 反馈战斗中需要选择目标时，弹框里的目标卡无法交互；同时要求优化 hover 卡牌预览，移除金色外框、右上阵营图标、战力/生命/技能描述的黑色模糊底与边框，并在缩小浏览器时让场上卡牌和数值同步缩放。

根因记录：
- 目标选择弹框位于固定 16:9 `.battle-stage` 内；`.battle-stage` 为了让背景和 HUD 叠层不吞事件设置了 `pointer-events: none`，但目标弹框没有恢复 `pointer-events: auto`，导致鼠标点击穿透到下层。
- 目标按钮此前复用 `data-board-card` 走场上单位点击路径，语义上可用但对后续 DOM 调整不够稳。

修复记录：
- 为 `.battle-stage .intent-overlay` 和目标按钮恢复 `pointer-events: auto`。
- 目标按钮增加明确的 `choose-target:side:uid` action，由 `handleAction` 直接转入 `handleBoardTarget`。
- hover 卡牌预览移除外框、右上阵营图标，以及战力/生命/技能描述区域的背景、边框、阴影和 blur；文字直接叠加在插画上并保留圆角。
- 全局字体族切换到阿里巴巴普惠体优先，本机未安装时回退到 `Noto Sans SC` / 微软雅黑。
- 增加 `1320px`、`1100px` 两档桌面窄宽度下的战场单位卡牌、手牌和角标缩放规则。

验证记录：
- `node --check src/main.js`
- `node --check server.js`
- `curl http://localhost:3000/healthz`
- Playwright 打开战斗界面，确认 `.battle-stage .intent-overlay` 的 `pointer-events` 为 `auto`，hover 卡牌预览中阵营图标可见数量为 0，战力/生命 HUD 和技能描述容器背景为 `none`、边框为 `0px`、`backdrop-filter` 为 `none`，浏览器控制台错误为 0。

## 2026-05-26 战场 hover 注释与上线素材性能检查项

来源：Michael 要求战场上卡牌 hover 时，卡牌侧边也展示当前单位注释信息；同时同步最新版本到 GitHub 和 ECS，并把线上素材性能、玩家对线流畅度沉淀为项目上线核心检查项。

修复记录：
- `src/main.js` 的战场 hover spotlight 会识别来源是否为场上单位；场上单位展示完整卡牌预览时，同时在侧边展示单位注释、攻/命/值和规则要点。
- 保持隐蔽信息保护：敌方隐蔽单位不会因为 hover 侧栏泄露真实卡牌信息；己方已知单位仍可查看。
- `styles.css` 为战场 spotlight 增加并排布局约束，确保 320px 卡牌预览和 224px 侧边注释栏不挤压、不覆盖；窄屏下隐藏侧栏以保护移动端布局。
- `online_1v1_roadmap.md` 将“线上素材性能可控”和“公网对线体验流畅”补入最小可行上线标准。

验证记录：
- `node --check src/main.js`
- `node --check src/game-data.js`
- `node --check server.js`
- `curl http://localhost:3000/healthz`
- Playwright 打开 `http://localhost:3000/`，进入战场后部署一张单位，hover 场上卡牌确认 `#card-spotlight` 带 `has-rule-aside`，侧边注释栏展示单位注释、攻/命/值和规则要点；控制台错误为 0。

## 2026-05-26 部署打击视频与 20260523 机制复核

来源：Michael 本地测试反馈，部署打击在多目标场景下会先播放单位视频再选目标；无目标时仍可能播放视频；火箭类多段命中特效会显示与真实伤害不一致的数字；同时要求按 `现代战争三线卡牌 V0.5.1 机制与全卡牌内容-20260523.docx` 复核最终规则。

修复记录：
- 客户端部署流程改为先完成合法目标判定；多个合法目标进入目标选择，选定目标后再播放单位行动视频并结算。
- 无合法打击目标时不播放单位行动视频；单位视频只在已有明确目标且即将结算时播放。
- 火箭齐射的分段爆点不再各自显示伤害数字，只保留最终真实伤害数字，避免攻击 3 显示多个 2 的误导。
- `src/game-data.js` 增加 20260523 最终覆盖层：Stryker 低空伤害修正为 2；F-35A 与 Su-57 调整为对地打击战斗机；F-22/Su-35/F-35A/Su-57/B-2/Tu-160 的高空拦截链收敛为重型防空；HIMARS、Tornado-S、B-2、Tu-160 多目标打击不再限制同战线。

验证记录：
- `node --check src/main.js`
- `node --check src/game-data.js`
- 运行态抽查 `us_stryker`、`us_himars`、`us_b2`、`us_f35`、`us_f35a_sead`、`ru_tornado_s`、`ru_su34`、`ru_su35`、`ru_su57_sead` 生效后的数值、技能、拦截标签。
- `curl http://localhost:3000/healthz`
- Playwright 打开 `http://localhost:3000/`，控制台错误为 0。

## 2026-05-21 线上 1v1 实战反馈

来源：Michael 与朋友完成一局线上 1v1 后反馈，截图显示己方回合中伴随防空/高空单位交互后进入无法继续操作状态。

问题清单：

1. 两个玩家可以正常对局，但后手玩家开局无法调度手牌。
2. 我方出牌或击杀时，双方都应该看到击杀/打击特效；当前联机只保留了本地表现或没有同步演出。
3. 双方回合需要特殊展示，并按本地视角显示相反文案。
4. 对局中应显示双方输入的玩家名称：自己左下角，对方右上角。
5. 紧急补给应随机展示 3 张并让玩家选 1 张，当前线上版本直接抽入手牌。
6. 前线接敌应默认双方互相打击结算，并写入通用规则。
7. 对方回合时无法 hover 查看卡牌详情；类似信息查看锁定需要一并修复。
8. 打击目标有多个单位时必须让玩家选择；布拉德利战车曾默认打击其中一个前线单位。
9. 我方回合、对方有高空单位且无前线单位时，己方伴随防空无法翻牌打击。
10. 第 9 点之后出现卡死：无法结束回合、无法场上行动、无法继续出牌。
11. 本次反馈编号跳过 11，保留原始编号。
12. 机制变更：战术牌不占用手牌部署额度；玩家每回合可额外打出 1 张战术牌，同时仍可部署 1 张单位牌并执行 1 次场上单位行动。
13. 联机一次退出后，再次连接会一直停留在“连接中，正在连接线上房间服务”。

初步根因记录：

- 服务端 `turnActions.handPlayed` 同时限制单位牌和战术牌，导致战术牌消耗部署额度。
- 服务端 `resolveFrontlineContact` 在多个敌方前线目标中使用第一个存活目标，缺少目标选择流程。
- 服务端补给 `resolveNoTargetAbility` 直接抽牌并处理 overflow，未建立候选牌选择。
- 服务端快照没有下发双方玩家名称，也没有下发战斗演出事件。
- 客户端 `renderSpotlight` 将卡牌详情限制在 `canPlayerAct()` 或调度阶段，导致对方回合无法查看。
- 客户端连接复用 `CONNECTING` socket 时没有超时，旧连接可能让 UI 长期停留在连接中。

已完成修复：

- 新增 `GAME_MECHANICS.md`，作为后续机制和卡牌变化的长期真源；本文件继续记录真实对局排障。
- 拆分服务端回合行动额度：单位部署、战术牌、场上单位行动分别计数。战术牌不再消耗单位部署额度。
- 服务端补给改为候选选择：紧急补给/弹药补给展示 3 张，玩家选 1 张，其余回牌库底；联机快照只向行动玩家展示真实候选。
- 服务端前线接敌多目标改为 pending 目标选择，不再默认选择第一个目标。
- 服务端防空目标判定补强：伴随/重型防空可处理低空和高空单位；敌方无前线时不应丢失支援区高空目标窗口。
- 服务端快照增加双方玩家名称与战斗效果事件；客户端按本地视角显示自己和对手名称。
- 客户端增加线上回合移交提示，本地视角显示“我方/敌方”行动。
- 客户端卡牌详情查看不再依赖 `canPlayerAct()`；CSS 也不再在对方回合或 pending 状态禁用手牌 pointer events。
- WebSocket 连接增加 8 秒超时；退出线上对局时清理 socket、房间状态和旧战斗快照。

验证记录：

- `node --check src/online-battle-engine.js`
- `node --check src/main.js`
- `node --check server.js`
- 服务端裁决脚本通过：后手调度、战术牌额外行动、补给选牌、前线接敌多目标选择、防空攻击高空目标、玩家名视角映射。
- WebSocket 房间脚本通过：创建/加入/准备/双方调度/离开/重新创建房间。
- Playwright 单页 smoke 通过：本地进入战斗、开局调度、悬停详情。
- Playwright 双页联机通过：双方进入 `online-authoritative`，双方都有调度，A 调度后 B 仍可调度，玩家名按本地视角显示。
- Playwright 对方回合 hover 复测通过：后手在对方回合仍能悬停手牌查看详情。

部署记录：

- 本次修复已推送到 GitHub `main`，提交 `923bf7b Fix online playtest rule and UX issues`。
- ECS 服务器无法稳定从 GitHub 拉取代码，报 `OpenSSL SSL_connect: SSL_ERROR_SYSCALL`；改用本地打包 7 个变更文件并通过 Workbench 终端覆盖部署。
- 线上运行目录 `/opt/war-card-game` 已写入 `.deployed-version = 923bf7b`；PM2 进程 `war-card-game` 重启后为 `online`。
- 服务器内部验证通过：`node --check src/online-battle-engine.js`、`node --check src/main.js`、`node --check server.js`，以及 `http://127.0.0.1/healthz`。
- 阿里云安全组 `sg-bp160ny2tx67pnbamog8` 已确认放行入方向 `TCP:80/80`，来源 `0.0.0.0/0`；系统 `firewalld` 未运行，进程监听 `0.0.0.0:80`。
- Chrome 能重新加载 `http://121.41.9.156/` 页面；但本机命令行和 Chrome 在开启本地代理 `127.0.0.1:7897` 时可能出现 `HTTP 502` 或 WebSocket 握手超时。遇到该现象优先将 `121.41.9.156` 加入代理直连/绕过规则，或临时关闭代理后再测试。

## 2026-05-22 自动平衡测试：高空反制密度

来源：Michael 反馈实战中“可打击高空的单位太少，高空单位打完后难以反制”。本次使用服务器权威战斗引擎跑自动对局，并额外做内存中的虚拟卡组改版测试；未改动线上代码。

当前卡组结构观察：

- 双方 30 张预设卡组中，高空单位各 3 张。
- 可直接打击高空的单位各 4 张：SEAD 战斗机、伴随防空、重型防空、制空战斗机。
- 真正能强处理高空的硬反制各 2 张：重型防空、制空战斗机。
- 可拦截高空/导弹打击的重型防空各 1 张。

抽牌概率观察：

- 起手 7 张看到任一直接反高空牌概率约 67.7%，看到硬反制概率约 41.8%，看到重型拦截约 23.3%。
- 到看过 10 张时，任一直接反高空约 82.3%，硬反制约 56.3%，重型拦截约 33.3%。
- 结论：很多对局会进入“知道对方高空有威胁，但暂时没有可用硬解”的体验区间。

自动对局结果（每组 120 局，机器人策略偏进攻，非人类最优打法）：

| 方案 | 高空打击次数/局 | 高空伤害/局 | 被高空打击时无直接反制 | 被高空打击时无硬反制 | 高空被摧毁/局 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 当前卡组 | 12.12 | 51.33 | 51.9% | 59.1% | 2.95 |
| 各加 1 张伴随防空 | 11.19 | 47.51 | 44.0% | 59.4% | 3.08 |
| 各加 1 张重型防空 | 10.29 | 43.67 | 47.2% | 54.7% | 3.44 |
| 各加 1 张制空战斗机 | 12.50 | 55.94 | 47.1% | 52.9% | 3.86 |
| 只把伴随防空对高空基础伤害从 2 调到 3 | 11.90 | 51.04 | 49.7% | 56.3% | 3.32 |
| 加 1 张伴随防空且伴随防空对高空伤害 3 | 11.28 | 48.13 | 44.5% | 58.6% | 3.20 |

测试结论：

- Michael 的实战体感成立：当前不是单纯操作问题，而是反高空密度和反制时机偏紧。高空打击发生时，防守方约一半情况下没有直接反高空手段，约六成情况下没有硬反制。
- 只增加制空战斗机会让高空对局更激烈，高空伤害反而提高，不适合作为第一版修复。
- 只增加重型防空能明显压低高空伤害，但容易把空战变成“抽到硬解就断档、没抽到就挨打”的二元体验。
- 更适合的第一版方向是增加软反制密度：让伴随防空更常出现，并让它对高空有可感知但不致命的反击能力。

建议平衡方向：

- 预设卡组先各加入 1 张伴随防空：美国加 `us_avenger`，俄罗斯加 `ru_pantsir`；优先替换重复的烟幕/伪装类战术牌。
- 伴随防空对高空目标从“2 点基础伤害”调整为“3 点基础伤害”或“2 点伤害并使高空目标暴露/标记 1 回合”。推荐优先测试“2 点 + 标记”，因为它增加后续反制窗口，不会直接把重型防空的定位抢掉。
- 毒刺/Igla 这类前线便携防空可以增加弱高空回应：例如敌方高空单位打击己方前线后，若该高空单位已暴露，本单位可造成 1 点警戒伤害，一回合一次。它不能成为硬解，但能减少完全无事可做的挫败感。
- 卡组构筑/预设卡组建议加入反高空提示：30 张卡组至少 5 张直接反高空牌，其中至少 2 张硬反制，或 1 张硬反制 + 3 张软回应。

建议下一步：

- 先做一个小平衡补丁：预设卡组各加 1 张伴随防空，并在 UI/卡牌标签上增加“反高空/硬防空/软防空”识别。
- 第二步再做伴随防空“2 点 + 暴露/标记”版本，实测它是否比直接改 3 点更好玩。
- 补丁落地后继续跑 200 局自动对局，并安排一次真人 1v1 验证体感。

## 2026-05-22 线上 1v1 第二轮实战反馈修复

来源：Michael 与朋友再次线上 1v1 后反馈。

问题清单：

1. 直升机卡面写有前线支援：敌方前线有单位时也能隐蔽部署；当前机制没有特殊处理，隐蔽直升机会被前线接敌立刻翻开。
2. 榴弹炮和火箭炮应可打击低空单位，例如直升机；当前最终规则覆盖中仍写作地面目标。
3. 隐蔽或暴露部署的重型防空应一回合触发一次导弹拦截，包含 SEAD 反辐射导弹；当前 SEAD 配置仍无视防空拦截。
4. 空优机基础攻击力调整：美军 F-22、俄军 Su-35S 基础攻击 2，对高空单位伤害 +2，目标价值从 5 调为 4。
5. 选择打击目标时，需要更清楚地区分目标属于前线还是支援区。
6. 回合切换提示停留太短，改为约 2 秒。
7. 联机中补充抽牌、弃牌、摧毁入弃牌堆、拦截等动效。
8. 所有重型防空目标价值统一为 4；爱国者从 5 调为 4。
9. 双方伴随防空目标价值统一为 3；复仇者从 2 调为 3，Pantsir-S1 从 4 调为 3。

已完成修复：

- `src/game-data.js` 更新卡牌数据：榴弹炮/火箭炮目标范围改为地面和低空；F-22/Su-35S 基础攻击与技能文本改为 2 + 高空加成；重型防空与伴随防空目标价值统一；SEAD 不再无视重型防空拦截。
- `src/online-battle-engine.js` 更新服务器裁决：隐藏直升机在敌方前线存在时保持隐蔽，不触发前线接敌翻开；重型防空拦截 SEAD/导弹时下发 `intercept` 事件；抽牌和弃牌下发 `draw`/`discard` 事件。
- `src/main.js` 更新客户端：本地练习模式同步直升机隐蔽例外；线上回合提示停留时间改为 2 秒；线上效果事件播放抽牌、弃牌、摧毁入弃牌堆和拦截动效；目标选择按钮和可选目标卡片显示前线/支援区标识。
- `styles.css` 增加目标战线标识样式。

验证记录：

- `node --check src/game-data.js`
- `node --check src/online-battle-engine.js`
- `node --check src/main.js`
- 服务器权威规则 smoke 通过：隐藏直升机保持隐蔽、M109 可打卡-52、隐藏 Buk 拦截 SEAD 后暴露且不受伤、重防/伴随防空/空优机目标价值与攻击值符合新规则。

## 2026-05-23 V0.5.1 机制与卡牌同步

来源：Michael 提供 `现代战争三线卡牌 V0.5.1 机制与全卡牌内容-20260523.docx`，确认按差异清单更新；当时 F-35A 和 Su-57 暂按 SEAD 专职定位处理，后续已在 2026-05-26 复核中按文档卡表改为对地打击战斗机。

本次改动点：

- 回合行动经济调整为：每回合 1 次战术牌窗口 + 2 个非战术行动额度。常规最多部署 1 张单位；若回合开始时己方场上无单位，可部署 2 张单位；也可让两个不同场上单位各行动一次。
- 前线突破改为卡牌白名单机制：只有明确拥有【前线突破】的前线装甲单位和直升机可以突破，步兵、侦察兵、防空单位不再默认突破。
- 巡航/弹道导弹目标范围收紧为地面单位、地面支援单位和直升机，不能攻击无人机、高空单位或对方导弹；战斧、ATACMS、口径、伊斯坎德尔统一为攻击前线目标 +1。
- 游骑兵渗透小组、Spetsnaz 渗透小组调整为攻击 1、生命 3、目标价值 2；死神无人机目标价值调整为 2；侦察校射只对地面或低空目标触发，否则抽 1 张牌。
- 标枪、短号、布莱德利、M1A2、BMP-3、T-90M 回归地面打击定位；斯特赖克和 BMPT 保留弱低空高射。
- F-22 生命调整为 5；F-22 与 Su-35S 对低空或高空目标伤害 +2；Tu-160 第二目标伤害调整为 3。

待验证重点：

- 服务端两行动额度是否能覆盖“两个场上单位行动”“空场部署两张”“部署一张再行动一次”三种流程。
- 该版 SEAD 机攻击防空单位时，按战斗机/重防拦截链处理，不再依赖 `SEAD导弹`；2026-05-26 起最终运行态改为对地打击战斗机。
- 侦察暴露高空或导弹目标时不应错误触发远火校射。

验证记录：

- `node --check src/game-data.js`
- `node --check src/online-battle-engine.js`
- `node --check src/main.js`
- `node --check server.js`
- 服务端权威规则 smoke 通过：空场双部署、两个不同场上单位行动、前线突破白名单、巡航导弹不能攻击无人机/对方导弹但能攻击直升机、最终运行时无 `SEAD导弹` 标签、侦察暴露高空目标时不触发远火校射并改为抽牌。
- Playwright smoke 通过：本地进入战斗与调度界面正常，无 console error 文件，截图已复核。

部署记录：

- 2026-05-23 22:03 已同步到阿里云 ECS `/opt/war-card-game`，PM2 进程 `war-card-game` 已重启。
- 首次服务器侧 `git fetch origin main` 卡在 GitHub pack 压缩阶段；随后改用本地生成的 `9a5fc93 -> 714eb90` 差异补丁通过 Workbench 应用，服务器端 `git apply --check`、`node --check` 和 `/healthz` 均通过。
- 公网验证通过：`http://121.41.9.156/healthz` 返回正常，`.deployed-version` 确认为 V0.5.1 部署版本。

## 2026-05-27 首页与二级页桌面响应式修复

来源：Michael 反馈首页、查看阵营卡牌、自由组卡和玩法介绍页面在不同浏览器尺寸下出现信息错乱、互相覆盖，重点关注 14 寸 Mac、1080P、2K 浏览器尺寸。

修复记录：

- 在 `styles.css` 追加桌面 cockpit 响应式覆盖层：所有首页和二级页叠加内容统一按 16:9 舞台尺寸收缩，避免脱离背景面板位置。
- 首页 AI 对战面板压缩难度按钮、开始按钮和标题字号，消除“开始对战”覆盖难度行的问题。
- PVP 在线面板压缩标题、说明、输入框和按钮高度，确保创建房间、房间码和加入房间都留在背景面板内。
- 首页阵营卡牌、自由组卡预览、玩法规则入口改为更紧凑的标题/预览布局；规则入口使用固定 4 行网格，避免低高度浏览器裁切底部条目。
- 查看阵营卡牌页保留三列卡牌详情网格，但收紧卡片最小高度、标题、标签和说明字号，避免头部与卡片内容重叠。
- 自由组卡页改回两列军械库列表，提升小桌面浏览器的可读性，避免右侧加减按钮贴边。
- 二级页打开时隐藏全局大卡 hover 预览，避免鼠标停留在卡牌上时大卡覆盖组卡列表或详情页内容。

验证记录：

- `node --check src/main.js`
- `node --check server.js`
- `curl http://localhost:3000/`
- `curl http://localhost:3000/healthz`
- Playwright 覆盖 `1366x768`、`1440x900`、`1920x1080`、`2560x1440`：首页、查看阵营卡牌、自由组卡、玩法介绍均无控制重叠、横向溢出和 console error；截图输出到 `C:\Users\Administrator\AppData\Local\Temp\warzone-responsive-check`。

## 2026-05-27 HUD 屏幕范围与真实插画预览修复

来源：Michael 继续反馈首页和二级页模块内容需要严格展示在战术面板 HUD 的“屏幕范围”内，玩家信息需要贴近屏幕左侧并在二级页与首页保持一致；查看阵营卡牌、自由组卡预览和游戏规则预览不要再使用切图按钮，应改为真实卡牌插画和蓝图插画。

修复记录：

- 首页指挥官信息重新收进左上战术面板屏幕区域，头像固定在信息屏幕左侧，姓名、军衔和状态间距与二级页复用同一套尺寸。
- 查看阵营卡牌入口改用 `us_m1a2` 和 `ru_t90m` 的真实卡牌插画作为美国/俄罗斯主战坦克预览，圆角展示且不加边框。
- 自由组卡预览移除卡背切图，改用当前卡池真实卡牌插画横向平铺展示。
- 游戏规则入口移除四条切图按钮，改为在标题说明下方展示坦克蓝图插画。
- 查看阵营卡牌、自由组卡、玩法介绍三个二级页新增左上玩家信息模块，并将主内容面板整体收进大屏幕内侧，避免标题、筛选器和关闭按钮压在金属边框上。
- 相关模块字号在上一轮响应式基础上略微放大，同时保留 `1366x768`、`1440x900`、`1920x1080`、`2560x1440` 的自适应压缩。

验证记录：

- `node --check src/main.js`
- `node --check server.js`
- `curl http://localhost:3000/healthz`
- Playwright 覆盖 `1366x768`、`1440x900`、`1920x1080`、`2560x1440`：首页、查看阵营卡牌、自由组卡、玩法介绍均无模块内容越界、横向溢出、UI 资源加载失败或 console error；截图输出到 `C:\Users\Administrator\AppData\Local\Temp\warzone-hud-containment-check`。
- 1080P/2K 检查中仍观察到少量既有音效资源请求失败，路径位于 `/assets/audio/`，与本次 HUD/插画资源无关，后续可单独清理音效引用。

## 2026-05-27 首页卡图比例与自由组卡布局复修
来源：Michael 继续反馈首页预览图仍需保持卡牌真实 `2:3` 比例，自由组卡二级界面的交互与布局需要参考军械库式双列列表，并在 14 寸 Mac、1080P、2K 等浏览器尺寸下保持可读、可点、不错位。

修复记录：
- 在 `styles.css` 末尾追加最终响应式覆盖层，锁定首页阵营预览、自由组卡预览的所有插画为 `2:3` 纵向卡牌比例，避免再次被旧规则拉成横向切图。
- 首页小高度视口下隐藏次级说明文案，把更多高度留给真实卡牌插画；`1366x768` 下预览卡比例从横向/过小状态修正为约 `0.666` 宽高比。
- 自由组卡页重排为左侧卡组校验栏 + 右侧双列军械库卡池；收紧标题、阵营切换、关闭按钮、规则区、卡牌行和加减按钮的响应式尺寸。
- 修正组卡列表卡图在 `1366x768` 下被行高纵向拉伸的问题，卡图改为按自身 `2:3` 居中显示，不再填满整行高度。

验证记录：
- `node --check src/main.js`
- `node --check server.js`
- `curl http://localhost:3000/healthz`
- Playwright 覆盖 `1366x768`、`1512x982`（14 寸 Mac 近似）、`1920x1080`、`2560x1440`：首页预览卡与组卡页卡图比例均通过 `2:3` 检查，主页无横向/纵向页面滚动溢出，二级页主面板均在视口内。
- Playwright 交互验证通过：自由组卡页可点击减牌，计数从 `1/3` 变为 `0/3`；随后点击加牌恢复为 `1/3`。
- 截图输出到 `output/playwright/responsive-pass-20260527/`。

## 2026-05-27 首页三块战术平板贴图热区化
来源：Michael 反馈首页下方“查看阵营卡牌 / 自由组卡 / 游戏规则”三个入口不再需要前端拼装预览，要求直接把三张贴图覆盖到对应战术平板的屏幕区域内，只保留点击跳转。

修复记录：
- `index.html` 清空三个入口按钮内部内容，仅保留透明热区、`data-action` 和 `aria-label`，避免旧文字、图标和卡牌预览再次参与布局。
- `styles.css` 末尾追加最终覆盖层，三个入口分别使用 `assets/ui/阵营卡牌.png`、`assets/ui/自由组卡.png`、`assets/ui/玩法介绍.png` 作为背景贴图。
- 重新校准三块热区在 `homepage v3` 背景上的位置和尺寸，使贴图覆盖左下阵营卡牌屏、中下自由组卡屏、右下游戏规则屏，而不是只占据屏幕上方一小段。
- 隐藏旧子元素和伪元素，保留轻微 hover 亮度反馈；点击逻辑仍沿用原有 `open-codex`、`open-deck-builder`、`open-guide`。

验证记录：
- `node --check src/main.js`
- `node --check server.js`
- `curl http://localhost:3000/healthz`
- Playwright 覆盖 `1366x768`、`1512x982`（14 寸 Mac 近似）、`1920x1080`、`2560x1440`：三块入口 `childCount = 0`、`textLength = 0`，背景图加载正确，`background-size: cover`，均在视口内且页面无横向/纵向溢出。
- Playwright 点击验证通过：点击三块热区分别打开 `.codex-panel`、`.deck-builder-panel`、`.guide-panel`。
- 截图输出到 `output/playwright/home-shortcut-texture-fullscreen-pass-20260527/`。

## 2026-05-29 Unity 迁移：联机权威补给耗尽最终结算补齐

来源：Unity 迁移过程中核对浏览器本地战斗、Unity 本地裁决和 `src/online-battle-engine.js` 的行为差异。Unity 已能映射 `supplyExhausted`、`finalActions` 和 `finalTriggeredAtAction`，但线上权威引擎只标记补给耗尽，没有真正发放和消耗双方最终行动。

修复记录：

- `src/online-battle-engine.js` 增加 `finalTriggeredAtAction`，补给耗尽时设置 `finalActions = { player: 1, enemy: 1 }`。
- 线上 pass turn / 行动结算在最终行动阶段会消耗当前方最终行动并移交给仍有最终行动的一方。
- 双方最终行动耗尽后，服务器翻开全部隐藏单位，并按得分优先、得分相同则按场上剩余生命结算胜负。
- `createBattleSnapshot` 现在下发真实 `finalTriggeredAtAction`，供 Unity 在线快照恢复使用。

验证记录：

- `node --check src/online-battle-engine.js`
- 内存中服务器权威对局 smoke 通过：玩家牌库为空触发补给耗尽，双方各获得 1 次最终行动；敌方最终 pass 后轮到玩家；玩家最终 pass 后按场上生命结算为玩家胜利；快照包含 `supplyExhausted`、`finalActions` 和 `finalTriggeredAtAction`。

## 2026-05-29 Unity 迁移：线上非伤害演出 effect 补齐

来源：Unity 在线战斗已能播放 3D 部署、暴露、烟幕/护盾、维修和压制演出，但服务器权威 `battle_snapshot.effects` 仍主要覆盖伤害、摧毁、拦截、抽牌和弃牌，导致 Unity 在线模式刷新状态但缺少对应 3D 演出触发。

修复记录：

- `src/online-battle-engine.js` 线上权威引擎新增 `deploy`、`expose`、`shield`、`repair`、`suppress` effect 输出。
- `createBattleSnapshot` 的 effect 视角归一化增加隐藏单位卡牌 ID 遮罩：对手视角中仍隐蔽的 source / target 不泄露真实 `cardId`。
- `src/main.js` 线上 effect 播放补齐部署、暴露、烟幕/护盾、维修、压制和 supply 展示反馈，复用现有卡牌飞行与战场浮字演出。
- Unity 迁移验证的 synthetic online snapshot 增加上述非伤害 effect 类型，确保 Unity mapper 能保留 source/target 元数据并交给 VFX 层播放。

验证记录：

- `node --check src/online-battle-engine.js`
- `node --check src/main.js`
- `node --check server.js`
- 内存中服务器权威对局 smoke 通过：部署单位产生 `deploy`；烟幕产生 `shield` / `repair`；电子压制产生 `suppress`；玩家视角查看敌方仍隐蔽目标的 suppress effect 时，`targetCardId` 保持遮罩。
- 本地 Web smoke 通过：`http://localhost:3000/healthz` 返回 200；Playwright 打开 `http://localhost:3000/`，页面标题为“现代战争三线卡牌 V0.5 线上测试版”，首页主界面可渲染。
- Unity Runtime / Editor 直接编译通过；Unity SourceGenerator 仅输出既有 Roslyn 版本警告，无项目代码错误。
- Unity 批量验证通过：`D:\Unity\BattleVfxSandbox\Temp\ModernWarCardsValidate_online_effect_stream.log`，总验收包含 `online snapshot/effect state mapping`、`VFX launch mirroring` 和 online resume helpers。

## 2026-05-29 Unity 可玩闭环：战斗返回大厅与 HUD 可读性

来源：以 Unity 版本“能被玩家打开并完整试玩一局”为阶段目标复查时发现，当前 Unity 主菜单已经能进入本地/线上战斗，但战斗内没有明确返回大厅入口；玩家误进战斗或一局结束后只能停止 Unity Play Mode，试玩闭环不完整。

修复记录：

- `MwBattleRuntime` 增加“返回大厅”按钮，桌面端放入右上操作区，窄屏端与隐蔽部署、投降、结束回合组成四等分操作行。
- `MwGameRuntime` 启动本地战斗和线上战斗时注册返回回调，返回后恢复主菜单 Canvas、开场音乐、线上房间偏好和当前界面状态。
- `MwBattleRuntime` 退出时清理运行时战斗 Canvas；对于战斗运行时创建的 VFX Director，也随战斗退出清理，避免返回大厅后残留旧战斗 UI / 3D 标记。
- 音乐停止改为重新获取当前 `AudioSource`，避免缓存组件在 Unity Editor / batch 验证中变成 missing reference；非 PlayMode 下跳过实际音乐播放，但资源仍由独立音频资源验证覆盖。
- 运行时 UI 字体赋值限定到 PlayMode，避免 Editor batch 中内置字体 native 对象不可用导致验证失败。
- 战斗 HUD 状态栏改为中文展示：回合、行动方、得分、行动额度、战术牌状态；补给耗尽后直接展示双方剩余最终行动。
- 手牌、场上单位、隐蔽单位和详情面板的开发态英文标签改为中文：`攻 / 命 / 值`、`战术`、`隐蔽单位`、`突破目标`。
- Unity 迁移验证增加 `battle exit flow` 和 `playable shell round-trip`：前者确认 battle exit handler 会被触发；后者确认有效牌组的主菜单状态能启动本地 battle runtime、隐藏大厅，并能恢复大厅。

验证记录：

- Unity Runtime / Editor 直接编译通过；仅有既有 Unity SourceGenerator / Roslyn 版本警告，无项目代码错误。
- Unity 批量验证通过：`D:\Unity\BattleVfxSandbox\Temp\ModernWarCardsValidate_playable_roundtrip_handoff.log`，总验收包含 `battle exit flow` 和 `playable shell round-trip`。
- Web 侧基础检查通过：`node --check src/online-battle-engine.js`、`node --check src/main.js`、`node --check server.js`。
- V0.5.2 回归脚本通过：`node scripts/v052-regression-tests.mjs`，18/18 通过。

## 2026-05-30 Unity 联机闭环：真实房间 smoke 验证

来源：Unity 在线模式此前已有 WebSocket 客户端、resume helper 和 synthetic snapshot mapper 验证，但还缺一条真实打到本地 Node `/ws` 房间服务的 Unity 端自动验证。为了判断“Unity 版是否接近可玩”，需要验证两端 Unity 客户端能完整走通创建/加入/准备/权威快照/映射链路。

推进记录：

- `MwSceneBootstrapper` 新增 `ValidateOnlineRoomSmokeFromBatch` 和菜单入口 `Modern War Cards/Validate Online Room Smoke`。
- smoke 使用两个 `MwOnlineClient` 连接同一个 Node 房间服务：Host 创建房间，Guest 加入，双方分别使用美/俄 starter deck 发送 ready，等待 `match_ready` 与 `battle_snapshot`。
- 收到双方权威快照后，使用 `MwOnlineSnapshotMapper.TryMap` 映射回 Unity `MwBattleState`，并检查玩家手牌、回合和 action serial 等基础战斗状态；随后双方各发送一次空调度 `mulligan` 动作，等待服务端进入正式 battle 状态。
- 修正 Editor batch 中同步等待 async smoke 可能造成的主线程死锁：线上 smoke 放到后台任务执行，并在等待点使用 `ConfigureAwait(false)`。
- 线上 smoke 与普通 `ValidateMigrationFromBatch` 分离；普通离线迁移验证仍不依赖 Node 服务。

验证记录：

- Unity Editor 直接编译通过；仅有既有 Unity SourceGenerator / Roslyn 版本警告，无项目代码错误。
- 本地 Node 服务临时运行在 `PORT=3101`，健康检查 `http://127.0.0.1:3101/healthz` 返回 200。
- Unity 真实线上房间 smoke 通过：`D:\Unity\BattleVfxSandbox\Temp\ModernWarCardsOnlineSmoke.log`，结果为两个 Unity 客户端创建/加入/准备/收到服务端权威快照/映射快照/发送双方空调度并进入正式战斗状态全部成功。
- Unity 完整迁移验证通过：`D:\Unity\BattleVfxSandbox\Temp\ModernWarCardsValidate_after_online_action_smoke.log`。
- Web 侧基础检查通过：`node --check server.js`、`node --check src/main.js`、`node --check src/online-battle-engine.js`。
- V0.5.2 回归脚本通过：`node scripts/v052-regression-tests.mjs`，18/18 通过。

## 2026-05-30 Unity 主菜单启动失败：Text/Image 冲突与音乐降级

来源：Michael 在 Unity Editor 中点击 Play 后，Game 视图只显示黑/灰背景，无法开始游戏；Console 显示 `MissingComponentException: There is no 'AudioSource' attached`、`Can't add 'Text' ... because a 'Image' is already added` 和 `NullReferenceException`。

根因：

- Unity 6 的 UGUI 限制同一个 GameObject 不能同时挂两个 `Graphic` 组件；当前 `CreateText()` 同时创建 `Image` 和 `Text`，导致 `Text` 添加失败，后续访问 `text.fontSize` 触发空引用。
- 启动错误兜底界面复用了同一个有缺陷的 `CreateText()`，所以主菜单失败后错误界面也失败，玩家只能看到黑屏。
- BGM 播放路径不应成为主菜单启动的硬依赖；`AudioSource` 获取/添加异常时应静音降级，而不是阻塞 UI。

修复记录：

- `MwGameRuntime.CreateText()` 和 `MwBattleRuntime.CreateText()` 改为只创建 `RectTransform + Text`，面板/按钮继续由独立 `Image` 承担背景。
- 修复 `MwBattleRuntime` 中对纯文本对象继续 `GetComponent<Image>()` 的残留访问；敌方手牌占位改为 `Panel + Text` 组合，避免刷新手牌时再次空引用。
- `MwBattleRuntime` 增加 IMGUI 快速操作面板：显示调度/结束回合、隐蔽开关、投降、手牌/补给候选和场上单位/目标，保证 UGUI 层异常时仍可继续与 AI 对战。
- `MwRuntimeAudio.PlayMusic()` 增加 `TryGetComponent` / `AddComponent` 异常保护；音频不可用时记录 warning 并返回 null，主菜单继续启动。
- `MwGameRuntime` 增加场景加载后的运行时兜底：若 `ModernWarGame` 场景中没有可用 `MwGameRuntime`，自动创建入口；启动失败时显示可见错误界面。
- Unity 迁移验证新增 `playable game shell startup`，用于覆盖主菜单 UI 能被创建这一条此前漏掉的 Play Mode 风险。

验证记录：

- Unity Runtime / Editor 直接编译通过；仅有既有 Unity SourceGenerator / Roslyn 版本警告，无项目代码错误。
- Michael 复测进入战斗场景后 3D 棋盘可见但操作 UI 仍不可见；根据新截图继续修复手牌刷新残留空引用，并增加 IMGUI 快速操作兜底。修复后 Unity Runtime / Editor 再次直接编译通过。
- 由于 Michael 当前 Unity Editor 正在打开并处于调试 Play 流程，本轮未强行启动第二个 batch Unity 进程跑完整迁移验证；待退出 Play Mode 后可重跑 `ValidateMigrationFromBatch`。

## 2026-05-30 Unity 战斗可操作性：快速面板空引用与点击反馈修复

来源：Michael 复测进入 Unity 战斗后只能看到 3D 棋盘，看不到卡牌信息；点击手牌或按钮没有明显反馈，Console 中曾出现 `MwBattleRuntime.OnGUI()` 空引用。

根因：
- IMGUI 快速操作层直接读取 `state.scores`、`resolver.GetValidPendingTargets()`、`state.board[side][line]` 等对象，任何初始化链路里有一个对象暂时缺失，整个兜底操作面板就会在 `OnGUI()` 中断。
- 点击手牌 / 场上单位时主要依赖 UGUI 详情面板和日志更新；当 UGUI 层不可见或刷新失败时，玩家看不到“点到了什么、当前能做什么”。
- 战斗摄像机缺少 `AudioListener`，VFX Director 的 `AudioSource` 也没有完整降级保护，导致无关音频警告持续刷屏，掩盖真正的交互错误。

修复记录：
- `MwBattleRuntime` 的 IMGUI 面板拆为 `DrawQuickPanel()`，外层 `OnGUI()` 增加单次异常捕获与可见 fallback，不再因为单处空引用整体消失。
- 快速面板新增“反馈”和“详情”两行：点击手牌、补给候选、场上单位、确认调度、结束回合、隐蔽部署和投降时都会立即显示当前点击结果。
- 手牌列表、场上单位列表、比分、目标列表全部改为安全读取；规则引擎或 VFX 层暂时为空时，操作面板仍能显示可读状态。
- `ApplyResultThenMaybeAi()`、线上事件播放和 AI 回合播放在 VFX Director 缺失时跳过动画但继续推进战斗裁决，避免“动画层坏了导致游戏不能玩”。
- `MwBattleVfxDirector` 为战斗摄像机自动补 `AudioListener`，并给 VFX 音效 `AudioSource` 增加 try/catch 降级。

验证记录：
- Unity Runtime / Editor 直接编译通过；仅有 Unity SourceGenerator / Roslyn 版本警告，无项目代码错误。
- Unity 批量迁移验证通过：`D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_quick_panel.log`，总验收包含 card data、starter decks、local battle flow、enemy AI smoke test、Unity audio resources、battle exit flow、playable shell startup、playable shell round-trip、online resume helpers 等。

## 2026-05-30 Unity 正式战斗 HUD：向浏览器版可玩体验推进

来源：Michael 明确要求继续推进到“真正类似浏览器版本的可玩阶段”。此前 IMGUI 快速面板能兜底操作，但体验仍偏调试工具；正式 Unity 战斗画面需要像浏览器版一样清楚显示战斗状态、手牌、卡牌详情、行动反馈和战斗日志。

推进记录：
- `MwBattleRuntime` 将战斗 Canvas 提升为高优先级 `ScreenSpaceOverlay`，并为顶部状态、左侧详情、右侧日志和中部反馈条增加深色半透明底板。
- 重新整理桌面端布局：底部手牌区收窄并与左右详情/日志错开，玩家前线/支援区上移，避免手牌、日志和详情互相遮挡。
- 手牌按钮改为更接近卡牌的竖向尺寸，并给按钮文字增加 best-fit 与阴影，降低卡名、战线、攻/命/值在卡图上不可读的概率。
- 点击手牌、补给候选或场上单位时，正式 HUD 的“反馈”和“详情”同步刷新；不是只更新 IMGUI 兜底面板。
- IMGUI 快速面板改为仅在正式 HUD 未创建时显示，避免正常试玩时看到调试工具覆盖浏览器式 HUD。
- 普通背景面板的 `Image.raycastTarget` 关闭，降低透明/半透明面板挡住按钮点击的风险。
- `MwBattleVfxDirector` 改用 `TryGetComponent` 获取音效组件，音频不可用时静默降级，不再在 Console 里刷无关 `AudioSource` warning。
- `MwSceneBootstrapper` 增加 `ValidatePlayableBattleHud`：自动创建战斗 runtime，检查 HUD Canvas、反馈/详情/日志/手牌/战线面板存在，确认玩家手牌按钮可交互，并验证点击手牌会更新可见反馈与卡牌详情。

验证记录：
- Unity Runtime 直接编译通过；Unity SourceGenerator 仅输出既有 Roslyn 版本警告，无项目代码错误。
- Unity Editor 验证程序集直接编译通过；新增 `UnityEngine.UI` 引用后 `Text/Button` 验证代码无编译错误。
- Unity 批量迁移验证通过：`D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_playable_hud_final.log`，总验收包含 `playable battle HUD`，并继续覆盖本地战斗流、AI smoke、战斗退出、主菜单启动、playable shell round-trip、线上快照映射和 online resume helpers。

追加推进：
- 手牌按钮和场上单位按钮改为按当前数量动态缩放：开局手牌、补给候选和满编战线不再依赖默认大按钮硬挤，降低溢出到详情/日志区的风险。
- 主操作按钮补齐成功反馈：确认调度、确认补给、结束回合、投降、隐蔽部署开关都会写入正式 HUD 反馈条。
- `ValidatePlayableBattleHud` 继续增强：自动计算手牌按钮总宽度，若超过手牌面板宽度会失败；并模拟点击主操作按钮，验证反馈条会出现调度反馈。

追加验证：
- Unity Runtime 直接编译通过；仅有既有 Unity SourceGenerator / Roslyn 版本警告。
- Unity Editor 验证程序集直接编译通过。
- Unity 批量迁移验证通过：`D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_playable_layout.log`，`playable battle HUD` 覆盖手牌布局不溢出和主操作按钮反馈。

继续推进：
- 正式 HUD 反馈条升级为上下文引导：开局调度提示“最多换 2 张”、补给阶段提示候选数和保留数、目标阶段提示点击黄色/红色高亮单位、敌方回合提示等待 AI、己方回合提示可部署/打战术/点己方单位/结束回合。
- 结算动画期间保留刚刚成功的操作反馈，例如“已确认调度：1 张。正在播放结算动画”，避免成功动作被单纯的 busy 文案覆盖。
- `ValidatePlayableBattleHud` 继续增强：点击主操作按钮后，不只看反馈文本，还通过 runtime state / resolver 补齐双方调度，验证 HUD 能从开局调度推进到正式 `battle` 状态，并显示“你的回合”或“敌方 AI”引导。

继续验证：
- Unity Runtime 直接编译通过；仅有既有 Unity SourceGenerator / Roslyn 版本警告。
- Unity Editor 验证程序集直接编译通过。
- Unity 批量迁移验证通过：`D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_battle_guidance.log`，`playable battle HUD` 覆盖初始调度引导、点手牌后的调度进度、主按钮反馈、手牌布局不溢出，以及调度后进入正式 battle 引导。

继续推进：
- Battle 阶段点击手牌后的反馈从“已点击卡牌”升级为操作语义：单位显示“已部署 X 到前线/支援区”，战术牌显示“已打出 X”。
- 目标选择和场上单位行动补充成功/失败反馈：选择目标后显示已选择目标，命令己方单位行动后显示已命令单位行动。
- `ValidatePlayableBattleHud` 继续增强：进入 battle 状态后确定性选择一张单位手牌并触发 UI 按钮，验证该单位从手牌进入场上，同时验证 HUD 反馈出现部署/结算语义。

继续验证：
- Unity Runtime 直接编译通过；仅有既有 Unity SourceGenerator / Roslyn 版本警告。
- Unity Editor 验证程序集直接编译通过。
- Unity 批量迁移验证通过：`D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_battle_card_play.log`，`playable battle HUD` 覆盖 battle 阶段单位手牌点击、手牌减少、场上增加和反馈更新。

## 2026-06-01 Unity Editor 可玩性：目标选择、点击反馈与保底操作面板

来源：Michael 复测反馈 Unity 版进场后仍然“基本无法正常游戏”，看不到完整卡牌信息，点击后也缺少明确反馈；目标是让 Unity Editor 里至少能稳定完成一局本地 AI 对战，而不是只看到 3D 棋盘。

根因：
- 战斗动作如果打开 `state.pending` 目标选择，运行时仍会先进入 `busy` 动画/AI 等待状态，导致 HUD 反馈停留在“正在播放结算动画”，目标按钮也因为 `busy` 被禁用，玩家感觉“点了没反应”。
- 正式 UGUI HUD 在 Editor Game 视图里仍可能因为布局/缩放/刷新时机让玩家只注意到 3D 棋盘；此前 IMGUI 快速面板只在正式 HUD 缺失时出现，不能作为稳定的人工试玩入口。
- VFX Director 在 Editor 验证路径里使用 `Destroy()` 清理对象，会产生 `Destroy may not be called from edit mode` 警告，污染 Console，容易掩盖真正的交互错误。

修复记录：
- `MwBattleRuntime.ApplyResultThenMaybeAi()` 在动作产生 `state.pending` 时立即刷新并退出结算协程，不再把目标选择阶段锁进 busy 状态。
- `MwBattleRuntime.BuildContextGuidance()` 将补给/目标选择提示置于 busy 提示之前，确保打开 pending 后反馈栏立即告诉玩家“请选择目标”。
- `MwBattleRuntime.ShouldDrawQuickPanel()` 在 Unity Editor 中始终显示 IMGUI 快速操作面板，作为正式 HUD 之外的保底入口；面板内可查看反馈、卡牌详情、手牌/补给候选、场上单位/目标，并可执行确认调度、结束回合、隐蔽部署和投降。
- `MwBattleVfxDirector` 增加 `DestroyRuntimeObject()`，运行态用 `Destroy()`，Editor 验证态用 `DestroyImmediate()`，清理 edit mode 销毁警告。
- `ValidatePlayableBattleHud` 已覆盖：初始 HUD 可读、手牌按钮可点、调度反馈、进入 battle 后点击单位手牌会从手牌部署到场上、打开多目标 pending、目标按钮可交互、点击目标会清空 pending 并造成伤害或摧毁目标。

验证记录：
- Unity Runtime / Editor 直接编译通过；仅有 Unity SourceGenerator / Roslyn 版本警告，无项目 C# 编译错误。
- Unity 批量迁移验证通过：`D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_target_selection_final.log`，覆盖 `playable battle HUD` 的目标选择与伤害结算链路。
- Unity 批量迁移验证通过：`D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_clean_console.log`，确认 VFX edit mode `Destroy` 警告已移除。
- Unity 批量迁移验证通过：`D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_editor_quick_panel.log`，在启用 Editor 保底快速面板后完整迁移验证仍通过。
- 追加自动化断言通过：`D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_editor_fallback_assert.log`，`ValidatePlayableBattleHud` 现在会通过反射检查 `ShouldDrawQuickPanel()`，确保 Unity Editor 人工试玩时保底快速操作面板可用。

## 2026-06-01 Unity 下一步可玩性补丁：按钮级动作标签

推进记录：
- 当前环境切换为不可请求 D 盘写入授权，无法直接修改 `D:\Unity\BattleVfxSandbox`；因此先在工作区新增 `scripts/apply-unity-action-labels.ps1`，把下一步 Unity HUD 改动固化为可复用补丁脚本。
- 补丁目标是让 Unity 正式 HUD 的手牌/场上按钮自身显示动作标签：开局显示“点击调度/已选调度”，补给显示“点击保留/已选补给”，正式战斗手牌显示“点击部署到前线区/点击打出战术”，场上单位显示“点击发动行动”，pending 目标显示“点击选择目标/点击突破目标”。
- 补丁同时会增强 `ValidatePlayableBattleHud`，检查第一个可交互手牌按钮必须带有动作标签，避免 Unity 回退到“看得到卡牌但不知道点了会怎样”的状态。

验证记录：
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\apply-unity-action-labels.ps1 -DryRun` 已通过，说明脚本能命中当前 Unity Runtime / Editor 验证源码结构；尚未实际写入 D 盘。

## 2026-06-01 Unity 正式 HUD：按钮级动作标签落地

来源：继续向“真正类似浏览器版本的可玩阶段”推进。此前 Unity 已能显示详情和操作提示，但手牌/场上按钮本身仍偏静态卡片；玩家需要先读说明才能判断点击会做什么。浏览器版手牌区的优势是卡牌本身就是可操作入口，因此 Unity HUD 也需要把动作语义直接放到按钮上。

修复记录：
- 已将 `scripts/apply-unity-action-labels.ps1` 实际应用到 `D:\Unity\BattleVfxSandbox`，并改成幂等脚本；重复 dry-run 会报告 `runtime already patched; editor validation already patched`。
- `MwBattleRuntime` 的手牌按钮现在会按状态显示动作标签：开局调度显示“点击调度/已选调度”，补给候选显示“点击保留/已选补给”，正式战斗手牌显示“点击部署到对应战线”或“点击打出战术”。
- `MwBattleRuntime` 的场上单位按钮现在会按状态显示动作标签：己方可行动单位显示“点击发动行动”，pending 目标显示“点击选择目标/点击突破目标”，敌方单位标明“敌方单位”。
- `MwSceneBootstrapper.ValidatePlayableBattleHud` 新增断言：第一个可交互手牌按钮必须包含动作标签，防止回退到“看到卡牌但不知道怎么点”的状态。
- `scripts/validate-unity-playable-stage.ps1` 修复了验证脚本工作目录问题，并增加 Unity 日志落盘/文件释放等待，后续可一条命令完成 Runtime 编译、Editor 编译和 playable HUD 迁移验证。

验证记录：
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\validate-unity-playable-stage.ps1 -LogPath 'D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_action_labels_clean2.log'` 通过。
- 验证覆盖 Unity Runtime 编译、Unity Editor 编译、`ValidateMigrationFromBatch`，日志包含 `playable battle HUD`，结果为 `Modern War Cards migration validation passed`。

## 2026-06-01 Unity 正式 HUD：动作标签断言补强

来源：Michael 已授权直接推进 `D:\Unity\BattleVfxSandbox`。上一轮补齐了手牌/场上按钮动作标签，但自动验证只覆盖了开局第一个手牌按钮；为了让 Unity 版更接近“玩家一进来就知道怎么和 AI 打”的状态，需要把正式 battle 阶段和 pending 目标选择阶段也纳入验收。

推进记录：
- `MwSceneBootstrapper.ValidatePlayableBattleHud` 继续增强：进入正式 battle 后，选中的单位手牌按钮必须显示“点击 + 部署”动作语义。
- pending 目标选择打开后，目标单位按钮必须显示“点击 + 目标”动作语义，避免回退到“目标亮了但不知道是否能点”的状态。
- 验证断言使用 C# Unicode 转义字符串，避免 Windows/Unity 编辑器日志编码差异影响中文动作提示检查。

验证记录：
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\validate-unity-playable-stage.ps1 -LogPath 'D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_action_label_asserts.log'` 通过。
- 验证覆盖 Unity Runtime 编译、Unity Editor 编译、`ValidateMigrationFromBatch`、`playable battle HUD`、battle 手牌部署动作标签、pending 目标选择动作标签；结果为 `Modern War Cards migration validation passed`。

## 2026-06-01 Unity 正式 HUD：玩家结束回合到 AI 回合闭环

来源：继续向“真正类似浏览器版本的可玩阶段”推进。按钮动作标签已经解决“我该点哪里”，下一层关键体验是玩家点“结束回合”后必须清楚知道控制权交给 AI，并在 AI 行动结束后知道已经轮回自己，而不是只能盯着棋盘和日志猜状态。

推进记录：
- `MwBattleRuntime.RunEnemyTurn()` 结束时新增明确反馈：战斗未结束且回到玩家时显示“敌方 AI 已完成行动，轮到你了”，并提示继续看日志、部署、行动或结束回合。
- AI 行动异常停在敌方回合时会显示“敌方 AI 行动暂停”，避免玩家误以为点击无效。
- `ValidatePlayableBattleHud` 增加 UI 驱动闭环：通过 HUD “结束回合”按钮把控制权交给敌方 AI，再运行 AI 行动，最后验证控制权回到玩家或正常结算胜负。
- 验证会检查结束回合反馈包含 AI/结束回合语义，AI 回合结束后反馈包含“AI”和“轮到你”，把“能和 AI 来回打一轮”纳入自动验收。

验证记录：
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\validate-unity-playable-stage.ps1 -LogPath 'D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_ui_ai_roundtrip.log'` 通过。
- 验证覆盖 Unity Runtime 编译、Unity Editor 编译、`ValidateMigrationFromBatch`、`playable battle HUD`、玩家结束回合、敌方 AI 行动、回到玩家的 UI 闭环；结果为 `Modern War Cards migration validation passed`。

追加验证：
- `ValidatePlayableBattleHud` 继续检查 AI 回合结束后玩家仍有可继续操作入口：主按钮必须恢复为可交互的“结束回合”，手牌或己方场上可交互按钮若存在，必须仍带有“点击”动作标签。
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\validate-unity-playable-stage.ps1 -LogPath 'D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_post_ai_controls.log'` 通过。

## 2026-06-01 Unity 正式 HUD：补给选择闭环验收

来源：继续向“真正类似浏览器版本的可玩阶段”推进。此前验证已覆盖开局调度、手牌部署、目标选择、结束回合到 AI 回合闭环；但补给选择是浏览器版中常见的中途交互，如果 Unity 版只显示候选牌却没有选中状态和确认闭环，玩家仍会感觉游戏卡住。

推进记录：
- `ValidatePlayableBattleHud` 新增补给选择场景：构造 3 张补给候选、保留 2 张，验证手牌区切换成 `Supply` 候选按钮。
- 候选按钮必须显示“点击保留”，点击后必须刷新为“已选补给”，反馈栏必须显示补给选择进度 `1/2`。
- 主按钮在补给阶段必须切换为可交互的“确认补给”；点击后必须清空 pending，并把选中的候选牌放回玩家手牌。
- 初次验证失败暴露出 Unity UI 刷新会销毁并重建按钮，验证不能继续访问旧 `Button` 引用；已改为点击后重新查找 `Supply {uid}`，贴合真实 HUD 刷新方式。

验证记录：
- 失败定位：`D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_supply_choice_flow.log` 报告旧按钮引用被销毁后的 `MissingReferenceException`。
- 修复后通过：`powershell -NoProfile -ExecutionPolicy Bypass -File scripts\validate-unity-playable-stage.ps1 -LogPath 'D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_supply_choice_flow_retry.log'`。
- 验证覆盖 Unity Runtime 编译、Unity Editor 编译、`ValidateMigrationFromBatch`、`playable battle HUD`、补给候选渲染、选中反馈、确认补给、回到玩家回合；结果为 `Modern War Cards migration validation passed`。

追加修正：
- `MwBattleRuntime.BuildContextGuidance()` 在玩家回合会保留最近一次“已...”成功回执，再接上当前回合引导，避免补给确认、部署、战术等成功反馈被刷新立刻冲掉。
- 补给闭环验收同步增强：确认补给后反馈必须同时包含“已选择补给”和“你的回合”。
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\validate-unity-playable-stage.ps1 -LogPath 'D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_supply_success_feedback.log'` 通过。

## 2026-06-01 Unity 正式 HUD：单位行动结果反馈

来源：继续向“真正类似浏览器版本的可玩阶段”推进。补给、目标选择和 AI 回合闭环已覆盖后，下一块真实对局体验缺口是场上单位行动：玩家点击己方单位后，不能只看到“已命令某单位行动”，还需要立刻知道这次行动造成了伤害、摧毁、修复、掩护、压制或暴露等什么结果。

推进记录：
- 先按 TDD 增加红灯验收：`ValidatePlayableBattleHud` 构造己方 `us_marine_rifle` 与敌方 `ru_motostrelki` 的确定性场景，点击己方场上单位后，要求敌方目标受到伤害或被摧毁，并要求 HUD 反馈包含“造成/伤害”等结果语义。
- 红灯验证通过预期失败：`D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_unit_action_feedback_red.log` 显示反馈仍停在“已命令 海军陆战队 行动。正在播放结算动画”，没有说明战斗结果。
- `MwBattleRuntime` 新增 `BuildActionResultFeedback()`，将 `damage`、`destroyed`、`repair`、`shield`、`suppress`、`expose` 以及 pending 目标/补给转换为一行玩家可读的行动结果摘要。
- 场上单位行动现在会显示类似“已命令 X 行动：造成 N 点伤害 / 摧毁目标获得分数 / 等待选择目标”，并继续被玩家回合引导保留。

验证记录：
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\validate-unity-playable-stage.ps1 -LogPath 'D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_unit_action_feedback_green.log'` 通过。
- 验证覆盖 Unity Runtime 编译、Unity Editor 编译、`ValidateMigrationFromBatch`、`playable battle HUD`、确定性场上单位行动、伤害/摧毁结果和 HUD 行动结果反馈；结果为 `Modern War Cards migration validation passed`。

## 2026-06-01 Unity 正式 HUD：战斗结束与再开一局闭环

来源：继续向“真正类似浏览器版本的可玩阶段”推进。Unity HUD 已能走通开局、手牌、补给、单位行动、AI 回合往返后，还需要解决一局结束后的体验闭环：玩家必须明确看到谁赢了，并且能从结束态继续玩，而不是只能停在一个禁用的“结束回合”按钮上。

推进记录：
- 先按 TDD 增加红灯验收：将 battle state 设置为 `match-over`，要求反馈显示“战斗结束/获胜”，并要求本地 AI 对局的主按钮变为可交互的“再开一局”。
- 红灯验证通过预期失败：`D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_match_restart_red.log` 显示结束态主按钮仍是禁用的“结束回合”。
- `MwBattleRuntime` 新增本地重开逻辑：结束态下主按钮显示“再开一局”；点击后清空调度/补给选择、重置隐蔽部署、重新创建本地 battle state、恢复战斗 BGM，并显示“已重新开局。开局调度...”。
- IMGUI 兜底面板也复用同一个主按钮标签与逻辑，Unity Editor 人工试玩时结束态同样能重开。
- 验证中修正了点击“再开一局”后仍读取旧 `battleState` 引用的问题，改为从 runtime 重新读取新 state。

验证记录：
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\validate-unity-playable-stage.ps1 -LogPath 'D:\Unity\BattleVfxSandbox\Logs\ModernWarCardsValidate_match_restart_green2.log'` 通过。
- 验证覆盖 Unity Runtime 编译、Unity Editor 编译、`ValidateMigrationFromBatch`、`playable battle HUD`、结束态胜负反馈、本地“再开一局”按钮、点击后回到新的 mulligan 开局；结果为 `Modern War Cards migration validation passed`。
## 2026-06-09 Web 联机对战：部署后立即开火视频跳过

来源：Michael 反馈线上 PVP 在线对战里，卡牌部署后经常还没播放单位开火视频就完成了打击结算。
根因：服务端权威快照会把“部署成功”和“立即打击后的伤害结果”一次性发给客户端；客户端为了等待动画播放会暂存最终快照，但渲染仍使用旧战场状态，导致刚部署的开火单位还不在 DOM 里，`playCardFireVideo()` 找不到棋盘卡牌视频节点后直接跳过。
修复记录：
- 新增 `src/online-animation-state.js`，在播放联机效果前构造只用于动画的中间战场状态：把下一快照中已经公开的开火来源先放到场上，但不提前应用伤害、摧毁、得分等最终结算。
- `src/main.js` 的 `applyOnlineBattleSnapshot()` 在排队播放新效果前先渲染该动画中间态，视频播放结束后再应用最终权威快照。
- 为避免泄露信息，隐藏部署效果如果没有可见卡牌 ID，不会在动画中间态提前物化或翻开；只有需要播放开火视频且来源已公开的效果才会强制露出来源节点。
验证记录：
- `node scripts/v052-regression-tests.mjs` 通过，29/29。
- `node --check src/main.js`、`node --check src/online-animation-state.js`、`node --check scripts/v052-regression-tests.mjs` 通过。

## 2026-06-09 前线突破：地面支援平台只暴露不受伤

来源：Michael 反馈前线突破时，突破单位明明具备地面打击能力，但对方地面支援单位只被暴露，日志显示无法进行打击。
根因：突破裁决复用了普通主技能的 `requiresAnyTag`。坦克/装甲主技能主要面向前线目标，常写为可打 `步兵 / 装甲`；支援区的榴弹炮、火箭炮、伴随防空、重型防空和车载弹道导弹虽然属于地面平台，但标签不是 `步兵 / 装甲`，因此被误判为不可打击。
修复记录：
- `src/online-battle-engine.js` 和 `src/main.js` 的前线突破派生打击能力增加地面平台标签扩展，仅作用于突破裁决，不改变普通开火目标规则。
- 纳入突破地面平台：`步兵`、`装甲`、`榴弹炮`、`火箭炮`、`伴随防空`、`重型防空`、`弹道导弹`。
- `巡航导弹` 不纳入地面平台，仍按非地面目标处理。
验证记录：
- 新增 `TC-V052-023B`：M1A2 前线突破可伤害姆斯塔榴弹炮、Tornado-S、Pantsir-S1、Buk-M3、伊斯坎德尔。
- 新增 `TC-V052-023C`：M1A2 前线突破口径巡航导弹只暴露不伤害。
- `node scripts/v052-regression-tests.mjs` 通过，31/31。
- `node --check src/main.js`、`node --check src/online-battle-engine.js`、`node --check scripts/v052-regression-tests.mjs` 通过。
