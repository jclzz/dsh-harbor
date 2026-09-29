# DSH 插件站「存储 + 提交」架构调研

调研对象（2026-09-28 实测）：

| 站点 | 定位 | 收录量 | 技术栈 | 存储范式 | 提交范式 |
|---|---|---|---|---|---|
| [dshhub.org](https://dshhub.org) | 目录站 | 20,464 插件 | Vite SPA + 预渲染 + Cloudflare 静态资产 | **GitHub Release 快照 → 静态分片 JSON** | GitHub Issue 表单 + topic 自动发现 |
| [dsh-plugin.org](https://dsh-plugin.org) | 目录站 + 内置插件市场 | 11,516 插件 | Next.js App Router + Cloudflare | **按分类内容哈希分片 JSON + 公开 API** | topic 自动发现 + 人工 JSON 沉淀 |
| [dsh-hub.org](https://dsh-hub.org) | 精挑目录站 | 317 插件 + 8 客户端 | TanStack Start + Cloudflare | **运行时数据库**（无静态快照） | **登录后 Web 表单 API** + 人工审核 |
| [dshhub.dev](https://dshhub.dev) | 目录站 | 717 插件 | Next.js ISR + Cloudflare | **仓库内数据文件 → 打进 bundle / 预烘焙** | 模板 Issue/PR + topic 扫描 |

三种范式互斥：**静态快照**（便宜、可回滚、有延迟）、**运行时 DB**（即时生效、要账号和后端）、**仓库内数据文件**（最简单、适合中小规模）。

---

## 1. dshhub.org — 静态快照 + Cloudflare 纯静态资产

源码：`github.com/coderPerseus/dsh-hub`（TypeScript，pnpm monorepo，3 star）。
权威文档：`docs/static-operations.md`（旧架构见 `docs/catalog-pipeline.md`）。

### 1.1 数据来源（无人工收录表）

直接爬 GitHub topic，三个搜索词：

- `dsh-plugin`
- `deepseek-harness-plugin`
- `deepseek-harness-plugins`

对每个非 archived / 非 fork 仓库读默认分支 tree，检查 `package.json`、`packages/*/package.json`、`plugins/*/package.json`；声明 `name` 且含 `main` / `exports` / `dsh` 之一才算可安装插件。记录**默认分支精确 commit**，校验 bundle 路径，读 Harness / Cordis peer 范围，从最近 README 抽「安装」「用法」段，按 topic + keywords + 名称 + 描述自动推断分类。

### 1.2 流水线

```
GitHub topic search
  → repo tree + raw files（读 package.json / README）
  → 可安装性校验 → 分类推断
  → .catalog/catalog.snapshot.json.gz
     → data/catalog-enrichment.json（中文文案 + AI 分析，按 plugin id + source hash 键控，8.7MB 提交进 git）
     → scripts/build-static.mts → apps/web/dist + 各语言 .static-build
     → deploy：1 个共享 root Worker + 5 个语言 Worker（纯 assets，无运行时绑定）
     → gh release create catalog-<RUN_ID>-<ATTEMPT> + gh release upload catalog-current --clobber
```

`.github/workflows/publish-catalog.yml`：

- `schedule: cron '17 3 * * *'`（每日 03:17 UTC 发现 + 每天最多 refresh 300 个已有仓库）
- `push` 到 main 且命中 `apps/web/** | packages/** | scripts/** | data/catalog-enrichment.json` → 只发布站点，不爬
- `workflow_dispatch` 五种模式：`publish` / `discover` / `refresh` / `backfill` / `recover`
- 单次 run 超时 90 分钟，`concurrency: publish-plugin-catalog` 不取消进行中

### 1.3 存储（三处）

| 位置 | 内容 | 说明 |
|---|---|---|
| GitHub Release `catalog-current` | `catalog.snapshot.json.gz`（~33MB） | 唯一权威 checkpoint / 断点续爬游标；每次成功 run 另存一份不可变 `catalog-RUN_ID-ATTEMPT`，实测已有 30 个 release |
| `data/catalog-enrichment.json` | 中文描述 + AI 分析副车 | 提交进 git，按 `plugin id + source hash` 键控，源变了自动失效重生成 |
| `apps/web/dist` + 每语言目录 | 预渲染 HTML + 分片 JSON | 部署为由静态资产组成的 Cloudflare Workers |

**客户端实际读的文件**（全部静态、可由 CDN 缓存）：

```
/catalog/manifest.json                    cache-control: max-age=300
  { snapshotId, generatedAt, pluginCount,
    index: "/catalog/<hash>/index.json",          ← 22MB 全量列表
    details: [ ...256 个 ... ],                   ← 每个 ~500KB 完整记录
    browserIndexes: { zh: ".../browser-zh.json", en: ".../browser-en.json" } }  ← 12MB 列式行
/catalog/<8位hash>/details-N.json         N∈0..255
/catalog/<8位hash>/browser-zh.json        rows 为「数组的数组」（列式，省体积）
```

目录名内嵌内容 hash（`df9e8e5c64b42967`）→ 快照一换 URL 就换，天然缓存击穿。`manifest.json` 只有 5 分钟缓存，所以**新快照 5 分钟内可见**。

单条记录（`details-*.json`）：

```json
{
  "id": "github:4t145/dsh-lark-connector",
  "slug": "4t145/dsh-lark-connector",
  "name": "@4t145/lark-connector",
  "repository": { "owner", "name", "url", "defaultBranch", "commit", "stars", "license", "topics", "pushedAt" },
  "package": { "name", "version", "hasBundle", "bundlePatch", "hasPrepareScript", "peerDependencies" },
  "categories": ["integration"],
  "compatibility": { "status": "unknown", "level": "declared", "harnessRange", "cordisRange",
                     "checks": [{ "id": "package-entry", "status": "pass", "summary": "..." }] },
  "installation": { "kind": "github", "spec": "github:owner/repo#<commit>",
                    "command": "npx -p @deepseek-ai/dsh dsh plugin --profile web add github:owner/repo",
                    "markdown": "...", "notes": [] },
  "usage": { "summary", "markdown", "readmeUrl" },
  "aiAnalysis": { "zh-CN": "≤100 字中文分析" },
  "i18n": { "zh-CN": { "description": "..." } }
}
```

Zod schema 在 `packages/catalog/src/schema.ts`（含 `catalogSnapshotSchema.pendingRepositories` / `refreshCursor` 用于断点）。

### 1.4 提交

唯一入口是 GitHub Issue 表单 `.github/ISSUE_TEMPLATE/submit-plugin.yml`：

```yaml
name: Submit a plugin / 提交插件
title: "[Plugin] "
body:
  - type: input    # id: repository，必填
  - type: textarea # id: description，必填（用途与安装方式）
```

实测 issue：`#32 [Plugin] dsh-jev-prune`、`#28 Add dsh-tacit to the DSH Hub catalog`。
维护者验证仓库后，手动跑 `workflow_dispatch mode=discover repository=owner/repo` → 下一轮快照收录。文档原话：*"Submitters open the GitHub Issue form; a maintainer validates the repository and runs the manual workflow."*

### 1.5 已废弃的旧架构（重要教训）

旧版是 Cloudflare **D1(SQLite) + R2 + Queues**：

```
POST /internal/catalog-imports → R2 不可变批次 → Queue dshhub-catalog-imports
  → D1 repository-scoped 增量导入（staging run → 校验 → 切 current）
  → Web oRPC 查询
```

`apps/api/migrations/0004_plugin_submissions.sql` 定义了表单提交表（`plugin_submissions`：repository_key 唯一、status ∈ pending/processing/published/rejected、submit_count）。

2026-09-12 迁移到纯静态后：**Worker 被删除、consumer 移除、D1 与 R2 只留作离线恢复资源**（D1 ~485MB / R2 ~605MB），迁移时保留了 13,617 个插件和 **46 条提交记录**（SQL 备份私存，明确禁止上传公开 Release）。放弃理由写在 `docs/static-operations.md` 的 *Cost boundary*：*"Static Assets requests and asset storage have no usage fees… Do not add a Worker `main`… as a convenience."*

---

## 2. dsh-plugin.org — 内容哈希分片 + 公开 JSON API

Next.js App Router（Turbopack）+ Cloudflare（页面 `cf-cache-status: HIT`，`cache-control: public, max-age=0, must-revalidate`）。11,516 插件，全部标记 `verified`。

### 2.1 存储（三层）

**① 站点自有分片（客户端按需拉）**

```
/directory/<locale>/<category>-<n>-<contenthash>.json     cache-control: public, max-age=31536000, immutable
```

实测 `/directory/zh/interface-1-c45f3076.json` = 621KB / 617 条；分类分片数：tools 9 个、interface/model/session/dev 各 2 个、其余 1 个。首页的 RSC payload 里带 `shardManifest`：

```json
"shardManifest": {
  "tools":  ["/directory/zh/tools-1-309be85e.json", ... 9 个],
  "interface": ["/directory/zh/interface-1-c45f3076.json", "/directory/zh/interface-2-61473b28.json"],
  ...
}
```

插件市场列表页**是客户端渲染的**（`?page=2` / `?q=` / `?category=` 返回的 HTML 完全一致，只预渲染首屏 30 条 + manifest）。分片字段：

```json
{ "slug", "ownerSlug", "name", "displayName", "category", "topics",
  "description", "features": ["运行时注入与热重载", ...], "h1",
  "source": { "repo", "npmPackage" }, "compatibility": { "status": "verified" },
  "selfOwned": false, "dates": { "repoCreatedAt", "repoUpdatedAt", "addedAt", "pageUpdatedAt" },
  "stats": { "stargazers_count", "forks_count" },
  "metadata": { "language", "license", "dshTopic" } }
```

**② 公开 API（给内置插件市场用）**

```
https://api.dsh-plugin.org/plugins.zh.json    8.20MB   cache-control: public, max-age=43200, must-revalidate
https://api.dsh-plugin.org/plugins.en.json    8.41MB
https://api.dsh-plugin.org/stats.json         {"total":11516,"verified":11516}
https://api.dsh-plugin.org/images/...         Access-Control-Allow-Origin: *
```

`plugins.<lang>.json` 是**单文件全量**，键名做了压缩（11516 条 × ~710B）：

`s` slug · `o` owner · `n` name · `vr` version · `c` category · `t` topics · `f` features · `d` description · `r` repo · `ic`/`igc` install command · `v` verified|unconfirmed · `u` updatedAt · `a` addedAt · `sg` stars · `fk` forks

**③ 内置插件市场（dshplugin/dsh-plugin-hub）的取数方式**

`src/client/data/catalog.ts` 里浏览器**不直连** api.dsh-plugin.org，而是走宿主服务端代理：

```
GET /dsh-plugin-hub/catalog?lang=zh|en        → https://api.dsh-plugin.org/plugins.<lang>.json
GET /dsh-plugin-hub/catalog?stats=1           → https://api.dsh-plugin.org/stats.json
```

`src/server/http/routes.ts` 的实现要点：代理优先级 = 设置里的代理 → 系统代理 → 环境变量 → 直连；用 **curl 子进程**发请求（与 npm/git 安装通道同一代理口径）；**磁盘缓存 1 小时**（跨宿主重启存活）；实时拉取失败时回退「任意年龄的旧缓存」而不是报错。

### 2.2 提交

提交页只有三步说明 + 徽章模板，**没有任何表单**：

1. 发布公开 GitHub 仓库；
2. 仓库加 topic `dsh-plugin`；
3. README 写清安装命令（`dsh plugin --profile web add <包名>`）、许可证、截图、权限、兼容性。

收录要求：仓库公开 + topic `dsh-plugin` + README 含安装命令 + 导出 `apply(ctx)`，不收录冒充官方的项目。
关于页说明了存储口径：*"机器扫描的元数据（Star、更新时间等）定期刷新，人工补充的分类、描述沉淀在 JSON 里，随发布流程一起更新。"*
状态机：新收录为 `unconfirmed`，人工核实后转 `verified`。

SEO 侧：`/sitemap.xml` → `pages.xml` / `plugins.xml`（11.3MB，23,174 条 loc）/ `tutorials.xml`（370 条）；每页带 `SoftwareApplication` / `FAQPage` / `CollectionPage` / `DefinedTermSet` 结构化数据；`/badges/listed.svg` 提供 README 徽章。

---

## 3. dsh-hub.org — 运行时数据库 + 登录提交

TanStack Start（HTML 里有 `$tsr` 标记、`/_serverFn/<sha256>` 服务函数）+ Cloudflare。**没有静态目录快照**：317 插件 + 8 客户端全部 SSR 进首页（2.5MB HTML）。

### 3.1 账号与提交 API

- 认证：`better-auth`（bundle 里含 Drizzle / D1 / Turso / PostgreSQL / SQLite adapter 痕迹），`/api/auth/*`；`/api/config/public` 泄露配置：`{"email_auth_enabled":"false","google_auth_enabled":"true","google_one_tap_enabled":"true","google_client_id":"862131523409-...","password_reset_enabled":"false"}` —— 即 **Google 一键登录**。
- 提交页 `/zh/submit`（客户端 chunk `submit-B4k6pe9J.js`）：
  - `GET /api/catalog-submissions?page=1&pageSize=20` 列自己的投稿（未登录 `401 {"code":-1,"message":"Unauthorized"}`）
  - `POST /api/catalog-submissions` body：`{ repositoryUrl, kind: 'plugin'|'client', category, ..., note }`
  - 返回里带 `github.repository` → 服务端当场校验 GitHub 仓库
- 流程文案：*"每次投稿都必须提供公开 GitHub 仓库，并经过自动核验与人工审核"*；审核顺序 = ①核验仓库/README/元数据/DSH 关联证据 → ②审相关性、分类、中英文简介、安装信息 → ③**通过后无需重新发布网站，条目直接进入公开目录**。

### 3.2 图片/媒体存储

```
/media/catalog/catalog-screenshots/<slug>/<sha256>.{png,jpg}    cache-control: public, max-age=31536000, immutable
```

内容寻址（文件名 = sha256）、同源托管、首页 `<link rel="preload" as="image">` 预加载前几张。没有运行时图片代理（`/api/*` 只有 auth / config / catalog-submissions）。

### 3.3 取舍

优点：审核通过即刻上线、可收自定义分类/中英双语简介、有账号体系可做投稿追踪（317 条经过人工核验，质量最高）。
代价：需要数据库 + OAuth + 审核后台，`/admin` 路由存在（5.4KB，应该是登录墙）。

---

## 4. dshhub.dev — 仓库内数据文件 + ISR

Next.js（`x-powered-by: Next.js`）on Cloudflare，**ISR**：`cache-control: public, max-age=0, s-maxage=600, stale-while-revalidate=86400`。717 插件，9 个分类（Vision / Web UI / Terminal / Memory / Browser / Workflow / Skills / Desktop / Play）。

### 4.1 存储：数据直接进 bundle

- 客户端搜索索引是一个 499KB 的 chunk，里面就是全量目录：

```js
es.default.plugins  // [{ slug, name, repo, author, description, summary,
                    //    category, kind, tags, install, installNote,
                    //    stars, starsDelta7d, createdAt, updatedAt, license, cover }]
```

- 详情页 `/plugins/<slug>`（91KB HTML）把 README 摘录**预烘焙**进 HTML（清洗掉 badge/图片），无 `raw.githubusercontent` / `api.github.com` 运行时调用。
- 星标是快照：页面写明 *"Star counts are a GitHub snapshot from 2026-09-28"*，`/feed.xml` 的 `lastBuildDate` = 当天 04:31 GMT → **每天一次同步 build**。
- `starsDelta7d` 支撑 "Rising this week"（7 天涨星榜）。
- 分页 `?page=2` 服务端渲染（30/页），SSR 内容随页码变化。

### 4.2 附加机制

- **动态徽章**：`/badge/<slug>.svg`，`cache-control: public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400` —— *"The star count updates with every catalog sync."* README 里放 `[![DSH Hub](https://dshhub.dev/badge/modlens.svg)](https://dshhub.dev/plugins/modlens)`。
- RSS：`/feed.xml`。
- 详情页含精确安装命令 + 安装后注意事项（如「装完在模型选择器里挑 modlens vision 变体」）。

### 4.3 提交

`/submit` 页给一段可复制模板：

```
Plugin name:
GitHub: https://github.com/owner/repo
Install command: npx @deepseek-ai/dsh plugin --profile web add github:owner/repo
Category: Vision / Web UI / Terminal / Memory / Browser / Workflow / Skills / Desktop / Play
One-liner:
License:
```

文案：*"Copy the template below into an Issue or PR on this repo. The site also scans the public dsh-plugin topic for installable bundles."*
`/docs/publish` 给作者侧 checklist：Cordis 形状（`export apply(ctx)` 或 Service）、`package.json` 声明 `dsh.bundle`（需要客户端再加 `dsh.client`）、README 里写 `dsh plugin --profile web add ...`、加 `dsh-plugin` topic、不要复用官方核心 row id（tools/session/llm/web/permission）。

---

## 5. 对比与选择

### 5.1 存储

| 维度 | 静态快照（dshhub.org） | 哈希分片 + API（dsh-plugin.org） | 运行时 DB（dsh-hub.org） | 仓库数据文件（dshhub.dev） |
|---|---|---|---|---|
| 上线延迟 | 5 分钟（manifest TTL） | 一次刷新周期 | 审核通过即刻 | 每天一次 build |
| 后端成本 | 0（纯 assets） | 0（静态 + 一小段 JSON 主机） | DB + OAuth + 审核台 | 0 |
| 大目录扩容 | 256 分片 + 22MB index | 按分类分片（tools 9 片） | 服务端分页 | 全量进 bundle（717 条 ~500KB，上万条会爆） |
| 回滚 | release 资产可回滚 | 重建分片 | 需 DB 备份 | git revert |
| 适合规模 | 10k–25k | 5k–15k | <5k 精挑 | <2k |

### 5.2 提交

| 方式 | 例子 | 成本 | 适合 |
|---|---|---|---|
| topic 自动发现 | 四个站都用 | 一个爬虫 | 生态主体，零人力 |
| GitHub Issue 表单 | dshhub.org `submit-plugin.yml` | 无后端 | 低流量、有维护者 |
| 模板 Issue/PR + topic 扫描 | dshhub.dev | 无后端 | 同上，且给作者明确 checklist |
| 登录 + Web 表单 API | dsh-hub.org `POST /api/catalog-submissions` | OAuth + DB + 审核后台上线即可见 | 要账号体系/即时生效 |
| 人工 JSON 沉淀 | dsh-plugin.org `data/*.json` | 体力活，质量最高 | 分类、描述、双语简介 |

### 5.3 四个站点共同的「惯例」

1. **提交永远退化为「加 `dsh-plugin` topic + README 写安装命令」**——官网 README 把 topic 定为唯一发现路径，所以四家都是 topic 爬虫为主、表单为辅。
2. **安装命令统一长这样**：`npx -p @deepseek-ai/dsh dsh plugin --profile web add <npm包名 | github:owner/repo | github:owner/repo#<commit>&path:<dir>>`，并把 commit SHA 钉进 spec。
3. **元数据都带 commit / pushedAt / stars / license**，兼容性用 `status ∈ compatible|incompatible|unknown` × `level ∈ unverified|declared|validated|tested` 两轴表达。
4. **非官方声明 + 风险提示写进页脚**（"与 DeepSeek AI 无隶属关系"、"安装前请自行审阅源码"）。
5. **README 徽章**是低成本回流手段（`dshhub.dev/badge/<slug>.svg`、`dsh-plugin.org/badges/listed.svg`）。

---

## 6. 对本项目（DSHub 群友收录站）的建议

按 design-brief 的定位（群友插件收录、几百条量级、单页落地），**最匹配的是 dshhub.dev / dsh-plugin.org 混合式**：

- **数据存储**：仓库内一份 `data/plugins.json`（或 `.ts`）作为唯一真源 + 一份人工整理字段（分类、一句话、feature 列表、中英简介）。体积小、git diff 可读、可直接 review 群友 PR。
- **同步**：一个 Node 脚本按 `dsh-plugin` topic 拉 GitHub（GraphQL/REST），把 stars / pushedAt / license / 最新 commit 写回数据文件，字段按 `sourceHash` 判断是否需要重写，产出 diff 后开 PR 或直接 commit。**不要**一开始就上 D1/Queue/R2（dshhub.org 已经把这些删干净了）。
- **发布**：静态导出 / ISR 页面即可；条目多了再按 dsh-plugin.org 的方式按分类切「内容哈希分片 + `shardManifest`」，或按 dshhub.org 的 `manifest.json → index/details-N` 做客户端搜索。分片目录名带 hash，即可 `max-age=31536000, immutable`。
- **提交**：群友量小、信任度高 → 首选「主页一键跳 GitHub 加 topic + 表单/Issue 模板」；若要自服务投稿体验，抄 dshhub.dev 的六行模板（Plugin name / GitHub / Install command / Category / One-liner / License）比抄 dsh-hub.org 的 OAuth + DB 划算得多。
- **建议顺手做的两件小事**：`/badge/<slug>.svg` 动态徽章（徽章里的星数每次同步刷新，是最便宜的引流回路）、`/feed.xml`（新收录自动出 RSS）。
- **兼容性字段**照抄 dshhub.org 的两轴模型（`status` × `level`），避免以后改 schema。
