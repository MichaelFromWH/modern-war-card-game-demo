# 线上 1v1 对局推进路线

本文档记录从当前本地 WebDemo 推进到可线上邀请朋友 1v1 对局所需的工作。

## 目标

最终目标：

```text
玩家 A 打开线上地址 -> 创建房间 -> 分享房间码
玩家 B 打开线上地址 -> 输入房间码 -> 双方准备
服务器创建对局 -> 双方轮流行动 -> 同步战场状态 -> 结算胜负
```

## 当前状态

当前项目已经具备：

- 可本地运行的 Node 静态服务器。
- 完整的单机/AI 对战流程。
- 卡牌、牌组、数值、技能、战场、日志和 UI。
- 调试接口 `window.render_game_to_text`。
- 新增的 WebSocket 房间基础层：`/ws`。
- 新增的健康检查接口：`/healthz`。

当前项目还不具备：

- 真人 1v1 UI。
- 服务端权威战斗引擎。
- 双方玩家视角隔离。
- 断线重连。
- 线上部署配置。

## 为什么 GitHub Pages 不够

GitHub Pages 适合发布静态网页，但 1v1 实时对局需要服务器维持房间、连接、回合状态和战斗状态。

因此线上 1v1 需要一个 Node Web Service，而不是纯静态托管。

## 推荐架构

```text
Browser A
  |
  | HTTPS + WebSocket
  v
Node Web Service
  |-- static files: index.html, styles.css, src/, assets/
  |-- /healthz
  |-- /ws room server
  |-- authoritative battle engine
  v
Browser B
```

原则：

- 服务器负责真实战斗状态。
- 客户端只发送玩家意图，例如部署、发动技能、结束回合。
- 服务器校验动作是否合法。
- 服务器分别下发双方视角，避免泄露手牌和隐蔽信息。

## 当前 WebSocket 协议草案

连接地址：

```text
ws://localhost:3000/ws
```

线上部署后：

```text
wss://你的域名/ws
```

### create_room

创建房间。

```json
{
  "type": "create_room",
  "name": "Michael"
}
```

服务器返回：

```json
{
  "type": "room_created",
  "roomCode": "ABC123",
  "side": "player"
}
```

### join_room

加入房间。

```json
{
  "type": "join_room",
  "roomCode": "ABC123",
  "name": "Friend"
}
```

服务器返回：

```json
{
  "type": "room_joined",
  "roomCode": "ABC123",
  "side": "enemy"
}
```

### ready

设置准备状态。

```json
{
  "type": "ready",
  "ready": true
}
```

双方都 ready 后，服务器广播：

```json
{
  "type": "match_ready",
  "roomCode": "ABC123"
}
```

### game_action

未来用于发送游戏动作。

```json
{
  "type": "game_action",
  "action": {
    "kind": "end_turn"
  }
}
```

当前阶段只是转发，后续要改为服务端校验和结算。

## 分阶段工作

### Phase 1: 线上可部署基础

目标：当前单机版本能作为 Node Web Service 在线打开，并具备房间 WebSocket 基础能力。

已完成：

- `server.js` 增加 `/healthz`。
- `server.js` 增加 `/ws` WebSocket endpoint。
- `server.js` 增加房间创建、加入、离开、准备、聊天和动作转发基础。
- `package.json` 增加 `ws` 依赖。
- `render.yaml` 增加 Render Web Service 部署配置。

验收：

- `npm start` 能启动。
- `curl -I http://localhost:3000/` 返回 200。
- `curl http://localhost:3000/healthz` 返回 JSON。
- 两个 WebSocket 客户端能创建/加入同一房间。

### Phase 2: 真人房间 UI

目标：玩家可以在首页创建房间或加入房间。

已完成：

- 首页增加 `线上对战` 入口。
- 增加创建房间按钮。
- 增加入房间码输入框。
- 显示连接状态、房间码、双方准备状态。
- 保留现有 AI 对战入口。

需要继续做：

- 增加更完整的失败重试提示。
- 增加邀请链接，例如 `?room=ABC123` 自动填入房间码。
- 在进入真人对局前锁定双方阵营和卡组。

验收：

- 玩家 A 创建房间后看到房间码。
- 玩家 B 输入房间码后双方都看到对方在线。
- 双方点击准备后进入待开局状态。

### Phase 3: 抽离战斗引擎

目标：把 `src/main.js` 中的战斗规则抽离成纯逻辑模块。

需要做：

- 新建 `src/game-engine.js`。
- 移入战斗状态创建、抽牌、部署、目标校验、技能结算、得分和胜负判断。
- 保留 `src/main.js` 负责 UI、动画、输入和渲染。
- 使用 seed 洗牌，保证可复现。

验收：

- 单机 AI 模式行为不退化。
- 引擎函数可以在 Node 服务端运行。
- 同一 seed 创建出的双方牌库顺序一致。

### Phase 4: 服务端权威 1v1

目标：服务器接收动作、校验动作、结算状态并广播。

需要做：

- 房间状态包含 battle。
- 双方 ready 后由服务器创建 battle。
- 客户端发送动作意图。
- 服务器调用 game engine 校验并结算。
- 服务器广播双方各自视角的 snapshot。

验收：

- 非当前行动方不能操作。
- 玩家不能看到对方手牌。
- 玩家不能指定非法目标。
- 两个浏览器看到一致的公开战场。

### Phase 5: 断线与重连

目标：朋友对局不会因为刷新页面立即报废。

需要做：

- 玩家获得 reconnect token。
- 房间保留一段时间。
- 刷新后可凭 token 回到原 side。
- 对手断线时显示等待状态。

验收：

- 玩家刷新浏览器后能回到同一房间。
- 断线玩家回来后战场状态一致。

### Phase 6: 线上部署

目标：通过一个公网 URL 邀请朋友游玩。

推荐先使用支持 Node + WebSocket 的 Web Service 平台。

候选：

- Render Web Service：配置简单，支持公网 WebSocket。
- Fly.io：适合低延迟 Node 服务，后续扩展空间好。
- 自有 VPS：控制力最高，但运维成本更高。

不推荐只用 GitHub Pages 做 1v1，因为缺少实时服务端。

验收：

- 线上地址可访问。
- `/healthz` 正常。
- `wss://线上域名/ws` 能连接。
- 两台不同网络设备能进入同一房间。

## 最小可行上线标准

第一版朋友 1v1 不必一开始支持全部高级功能，但必须满足：

- 创建房间。
- 加入房间。
- 双方准备。
- 服务端发牌。
- 当前回合方行动。
- 非当前方只读等待。
- 手牌不泄露。
- 隐蔽信息不泄露。
- 胜负结算一致。

## 设计红线

- 不要让客户端各自独立结算战斗，否则容易不同步。
- 不要把完整 battle 直接广播给双方，否则会泄露手牌和隐蔽单位。
- 不要只做动作转发就声称完成 1v1，动作转发只是基础设施。
- 不要让线上对局依赖 AI 逻辑。
- 不要为了赶进度破坏现有单机模式。

## 下一步

推荐下一步实现 Phase 2：

```text
首页增加线上对战面板 -> 接入 /ws -> 创建/加入房间 -> 显示双方 ready
```

这一步完成后，项目就会从“后台具备联机基础”进入“玩家能看到并使用联机入口”的状态。
