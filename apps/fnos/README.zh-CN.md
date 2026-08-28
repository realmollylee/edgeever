# EdgeEver 飞牛 fnOS 应用（FPK）

EdgeEver 的飞牛 fnOS 应用中心安装包源码（位于 `apps/fnos/`）。应用以 Docker
方式运行，镜像：

```
ccr.ccs.tencentyun.com/edgeever/edgeever:v1.45.1
```

镜像 tag 与 GitHub Release tag（vX.Y.Z）保持一致，由 CI 自动同步更新
（`scripts/build-fpk.mjs` 按 tag 覆盖 `manifest` 的 version 与 compose 的镜像 tag，
仓库内基线保持最新发布版本）。

## 目录结构

```
fnos/
├── manifest                 # 应用元数据（version 由 CI 按 tag 更新）
├── ICON.PNG / ICON_256.PNG  # 应用图标 64x64 / 256x256
├── config/
│   ├── privilege            # 运行权限（run-as=package）
│   └── resource             # docker-project + data-share(edgeever/data)
├── app/
│   ├── docker/docker-compose.yaml   # 容器编排（镜像 tag 由 CI 按 tag 更新）
│   └── ui/                  # 桌面入口 config + 图标
├── cmd/                     # 生命周期脚本（main/install/upgrade/uninstall/config）
└── wizard/                  # 安装/升级/卸载向导
```

## 手动构建

```bash
# 1. 按发布 tag 更新版本（manifest version + 镜像 tag）
bun scripts/build-fpk.mjs v1.45.1

# 2. 打包（fnpack 需自行安装，见 https://developer.fnnas.com/docs/cli/fnpack/）
cd apps/fnos && fnpack build
# 产出 apps/fnos/edgeever.fpk，建议按版本重命名：edgeever-v1.45.1.fpk
```

## CI 自动构建

`release: published` 事件触发 `.github/workflows/fpk-build.yml`：

1. 从 Release tag 提取版本号（v1.45.1 → manifest version=1.45.1）
2. 同步 compose 镜像 tag 为同一 tag（ccr.ccs.tencentyun.com/edgeever/edgeever:v1.45.1）
3. 下载 fnpack 并执行 `fnpack build`（apps/fnos 目录）
4. 解包校验 fpk 内 manifest 版本与 Release tag 一致（不一致则构建失败）
5. 重命名为 `edgeever-v1.45.1.fpk` 并上传为对应 Release 的资产

也支持 `workflow_dispatch` 手动触发（需填写 release_tag）。

## 安装与数据

- 应用中心 → 本地安装 `edgeever.fpk`，设置管理员账号后打开即用
- 数据保存在共享目录 `/volx/@appshare/edgeever/data`（网页端文件管理器可直接查看/备份）
- 升级保留数据与账号配置，无需重新设置
- 卸载时可选择保留或删除数据

> 注意：TCR 镜像由独立工作流（docker-tcr-mirror.yml）在 Release 发布后异步同步，
> 发布后立即安装若拉取镜像失败，请稍后重试。
