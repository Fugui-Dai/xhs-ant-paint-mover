# 蚂蚁搬画（AppID: `6b07be2553ca3e00150c332f`）

## 目录说明

- `dist/`：纯净离线小工具代码包（入口为 `dist/index.html`），可直接运行 `redapp dev --dir "./dist"` 调试
- `store/`：图标 `icon.jpg`（512×512）、封面 `cover.jpg`（900×1200）、历史预览二维码、`preview.json`、`submit.json` 与 `session.json`
- `xhs-ant-paint-mover.zip`：可直接上传小红书的离线打包产物（`index.html` 位于根目录）

## 后续更新注意

- 修改源码请改动 `dist/` 内文件；重新打包时请**进入 `dist/` 目录仅压缩其中的文件**（勿把 `store/` 或外层目录一起打进 `.zip`）。
- 送审新版本时请在配置中保留 `appId: "6b07be2553ca3e00150c332f"` 并递增三段式版本号（如 `1.0.1`）。
