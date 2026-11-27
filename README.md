# 蚂蚁搬画（AppID: `6b07be2553ca3e00150c332f`）

- **当前版本**：`1.0.2`（审核中；线上已发布 `1.0.1`，类目 `casual_game` 休闲玩法）
- **已申报权限**：`photos`（相册保存海报）、`apiCloudStore`（用户头像昵称授权，用于排行榜）
- **联调来源 / 环境**：`prod` / `--source thirdAgent`

## 目录说明

- `dist/`：纯净离线小工具代码包（入口为 `dist/index.html`），可直接运行 `redapp dev --dir "./dist"` 调试
- `store/`：图标 `icon.jpg`（512×512）、封面 `cover.jpg`（900×1200）、`preview.json`、`submit.json` 与 `session.json`
- `xhs-ant-paint-mover.zip`：可直接上传小红书的离线打包产物（`index.html` 位于根目录）
- `preview-qr.png`：最新手机端扫码预览二维码

## 核心模块一览（`dist/`）

- `index.html`：单页容器骨架与 6 个经典脚本入口（含选关、游戏舞台、地下蚁窝藏馆、手绘拼豆工坊、主题 × 工蚁工坊）
- `assets/img/`：20 张本地化手绘水彩 `.webp` 离线素材（5 套俯视爬行工蚁 `crawl-*`、5 套正立萌态工蚁 `ant-*`、6 大主题角落装饰 `prop-*`、斜俯视沙地小蚁丘 `stage-burrow`、迷你画架 `stage-studio`、藏馆画室场景 `sanctuary-bg` 与海报框 `poster-frame`）
- `assets/css/style.css`：6 大高颜值主题世界 CSS Tokens（Chrome 61 基线 + `.supports-flex-gap` 渐进增强、大触控底部菜单与柔散投影卡片）
- `assets/js/compat.js`：能力检测、默认关闭震动开关与端能力桥接（胶囊避让 `9.49+/9.55+`、`setStorage` `9.46+`、`vibrateShort` `9.50+`、云存储 `v: 5` 与排行榜 `9.51+`、`share` `9.53+`、`postNote`、`saveImageToPhotosAlbum`）
- `assets/js/audio.js`：Web Audio 纯离线 6 套 ASMR 合成音效包（马林巴木琴 / Q弹布丁甜鼓 / 机械青轴麻将 / 啵啵汽水 / 水晶八音盒 / 复古 8-Bit）
- `assets/js/levels.js`：18 主题章节 × 20 关（共 360 关）+ 每日一画 + 无尽挑战 + 照片/手绘 DIY 生成与 4/5 槽闭环可解池算法
- `assets/js/engine.js`：状态机、BFS 外框/走廊绕行寻路、多槽并发出兵、⚡十字电弧/🍯甜蜜花蜜/💣爆破特殊机制与撤回守恒
- `assets/js/renderer.js`：水彩贴图与 Canvas 2D 混合渲染（主关卡俯视六足爬行工蚁转向搬运 + 融沙蚁丘、藏馆正立漫步喂糖、6 款方块材质、拼豆配方海报生成）
- `assets/js/app.js`：UI 控制器、震动开关设置（默认关闭）、手绘/DIY 陈列馆闭环（复玩与回画板编辑）、4 槽首通奖励/徽章与端能力降级联动

## 小红书容器兼容红线（二开必看）

1. **JS 语法限制**：仅使用 **ES2017**，禁止 `?.`、`??`、对象展开 `{...obj}`（用 `Object.assign` 或逐键拷贝），脚本全部采用经典 `<script defer>`（禁止 `type="module"`、`import`/`export`、内联 `<script>` 与 `onclick=`）。
2. **CSS 兼容限制**：遵循 **Chrome 61** 基线，禁止无回退的 `display: grid` / `inset`；flex 间距使用 `margin-left` 回退，仅在 `.supports-flex-gap` 下使用 `column-gap`。
3. **离线与存储规范**：打包产物严禁包含任何 `http(s)://` 外链、禁止使用 `localStorage` / `sessionStorage` / `IndexedDB` / `fetch` / `XMLHttpRequest` / `eval`；云存储与排行榜属内测加白能力，须保留 `9.51+` 版本门禁及 `1005`/`1006`/`10003` 自动隐藏降级逻辑。

## 后续更新与发版速查

- 修改源码请改动 `dist/` 内文件；重新打包时请**进入 `dist/` 目录仅压缩其中的文件**（保证 `index.html` 在 `.zip` 根目录，勿把 `store/`、`README.md` 或预览图打进 `.zip`）。
- 仅改名称、简介（≤ 14 字）、图标或封面时可走 `redapp edit`；改代码需重新走完「**打包上传 → 生成预览码并真机确认 → 送审新版本**」：

```bash
# 1. 本地模拟器调试
redapp dev --dir "./dist"

# 2. 查询当前线上审核状态
redapp status --source thirdAgent --app-id "6b07be2553ca3e00150c332f" --agent

# 3. 打包后更新提审（在 store/submit.json 中保留 appId: "6b07be2553ca3e00150c332f" 并递增版本号如 1.0.3）
redapp upload --file "./xhs-ant-paint-mover.zip" --type pkg --agent --dry-run
redapp preview --source thirdAgent --file "./store/preview.json" --agent --dry-run
redapp submit --source thirdAgent --file "./store/submit.json" --agent --dry-run
```
