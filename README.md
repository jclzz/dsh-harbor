# 插件港 DSH Harbor · DeepSeek Harness 社区插件收录站

社区维护的 [DeepSeek Harness](https://deepseek.com/harness)（DSH）插件目录：浏览、搜索、按分类筛选、
一键复制安装命令。视觉对齐官网（纯黑底、238px 大网格、唯一强调色 `#4D6BFE`）。

- **不人工审核**：提交页粘贴仓库地址 → 实时读 GitHub 元数据 → 立即上架。
- **来源可查**：每条都链回 GitHub 公开仓库，展示 Star / 许可证 / 语言 / 最近提交。
- **数据在仓库里**：唯一真源是 `data/plugins.json`，git diff 可读可回滚，不依赖数据库。

## 快速开始

```bash
npm install
npm run dev            # http://localhost:3000
```

生产：

```bash
npm run build && npm start
```

## 页面与接口

| 路径 | 说明 |
| --- | --- |
| `/` | 落地页：Hero + 安装卡、分类 chips、本周精选、最新上架、提交指引、贡献者墙 |
| `/plugins` | 插件库。`?q=` 搜索、`?category=` 分类、`?sort=stars\|updated\|added\|name` 排序、`?view=list` 列表视图、`?page=` 分页（全部走 URL，可分享可被收录） |
| `/plugins/<owner>/<repo>` | 插件详情：安装命令、README 渲染、仓库信息、同分类推荐 |
| `/submit` | 提交表单，粘贴仓库地址即时回显 |
| `/about` | 收录规范、数据来源、免责声明 |
| `/api/plugins` | 公开只读 JSON，支持 `?category=` `?q=` `?limit=`（CORS 开放） |
| `/api/repo?full=owner/repo` | 提交页的仓库预检 |
| `POST /api/submit` | 提交入库 |
| `/badge/<owner>/<repo>.svg` | README 徽章，Star 数随目录同步刷新 |
| `/rss.xml` · `/sitemap.xml` · `/robots.txt` | 订阅与 SEO |

## 目录数据

`data/plugins.json` 是唯一真源。字段分两类：

- **机器字段**（`stars` / `forks` / `license` / `language` / `pushedAt` / `openIssues` / `version`）
  由 `npm run sync` 覆盖写入。
- **编辑字段**（`name` / `nameZh` / `description` / `category` / `tags` / `featured` / `author` /
  `addedAt` / `submittedBy`）只由人或提交表单提供，**sync 永不覆盖**。

所以同步脚本可以放心反复运行。

### 同步命令

```bash
npm run sync:dry        # 只打印，不写盘
npm run sync            # 刷新已有条目 + 按 scripts/curated.ts 补全
npm run sync:discover   # 额外扫 GitHub `dsh-plugin` 话题，自动收录新仓库
npm run sync:prune      # 顺带移除已归档 / 不存在的仓库
```

鉴权：优先用 `GITHUB_TOKEN` 环境变量；没设的话回落到本机 `gh auth`（GraphQL，
每小时 5000 点，145 个仓库约 4 个请求）。**不要**在无鉴权的情况下跑 `--discover`，
搜索接口未认证只有 10 次/分钟。

### 精选清单

`scripts/curated.ts` 是人工整理的收录清单：仓库地址 + 中文短名 + 中文描述 + 分类 + 精选排序。
新增一批插件时改这个文件，再跑 `npm run sync`。

## 提交是怎么落库的

1. 前端把仓库地址发到 `POST /api/submit`。
2. 服务端用 `lib/repo-input.ts` 把各种形态的输入（`owner/repo`、完整 URL、`github:owner/repo`、
   `git@github.com:owner/repo.git`）归一成 `owner/repo`。
3. `lib/github.ts#checkRepo` 实时读 GitHub：仓库是否存在、是否归档、Star、许可证、语言、topics。
4. 校验通过后由 `lib/catalog.ts#mutateCatalog` **原子写入**（临时文件 + rename，串行队列防并发覆盖）。
5. `revalidatePath()` 让首页 / 插件库 / 详情页立刻刷新。

防滥用：同 IP 每小时 5 次提交、表单蜜罐字段、描述长度上限。
重复提交同一个仓库会返回 409 并给出已有条目链接。

## 部署

### 需要可写文件系统

提交会把新条目写进 `data/plugins.json`，所以要么给容器挂一个卷，要么改用「提交开 PR」的变体。
`HARBOR_DATA_DIR` 可以指定数据目录（默认 `./data`）。

```bash
docker build -t dsh-harbor .
docker run -d --name dsh-harbor -p 3000:3000 \
  -v "$PWD/data:/app/data" \
  -e NEXT_PUBLIC_SITE_URL=https://your-domain \
  -e GITHUB_TOKEN=ghp_xxx \
  dsh-harbor
```

### 环境变量

| 变量 | 默认 | 作用 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | 站点绝对地址，用于 canonical / OG / sitemap / 徽章 Markdown |
| `GITHUB_TOKEN` | — | 提交预检与同步脚本用，避免匿名限流 |
| `HARBOR_DATA_DIR` | `./data` | 目录数据目录 |
| `HARBOR_SUBMIT_PER_HOUR` | `8` | 同一 IP 每小时最多提交几次 |
| `HARBOR_REQUIRE_LICENSE` | `true` | 是否强制要求仓库声明开源许可证 |

上线步骤见 **[DEPLOY.md](./DEPLOY.md)**（`docker compose up -d --build` 一把梭，Caddy 自动签证书）。

### 定时同步

用 cron 每天刷一次 Star 与更新时间：

```cron
17 4 * * * cd /srv/dsh-harbor && GITHUB_TOKEN=xxx npm run sync >> /var/log/dsh-harbor-sync.log 2>&1
```

同步后重启或等待 ISR 过期即可；页面有 30s–10min 的分级 revalidate。

## 项目结构

```
app/
  layout.tsx              全局壳：字体、导航、页脚、网格背景
  page.tsx                落地页
  plugins/page.tsx        插件库（搜索 / 分类 / 排序 / 分页 / 视图切换）
  plugins/[owner]/[repo]/ 插件详情（README 渲染 + JSON-LD）
  submit/                 提交页
  about/                  收录规范
  api/{plugins,repo,submit}/
  badge/[[...slug]]/      README 徽章 SVG
  rss.xml/ sitemap.ts robots.ts not-found.tsx
components/               导航、页脚、卡片、行、复制按钮、表单、分页…
lib/
  types.ts                数据模型
  categories.ts           10 个分类 + 关键词推断
  catalog.ts              目录读写、查询、统计、贡献者（node:fs，仅服务端）
  format.ts               纯展示辅助（客户端可引用）
  sort.ts                 排序常量
  github.ts               GitHub 只读访问（checkRepo / fetchReadme）
  markdown.ts             README → 安全 HTML
  repo-input.ts           仓库地址解析
  site.ts                 站点常量
scripts/
  curated.ts              人工精选清单
  sync.ts                 同步脚本
data/plugins.json         目录真源
design/                   设计稿与原型（不属于构建产物）
research/                 同类站点架构调研
```

## README 渲染的安全策略

README 是第三方内容，`lib/markdown.ts` 的流程是：`marked` 解析 → `sanitize-html` 白名单过滤
（脚本 / 样式 / 事件属性 / iframe / 表单全部丢弃，链接协议限 http(s)/mailto）→ 把仓库内相对路径
改写成 GitHub 或 raw.githubusercontent 的绝对地址。因此不需要额外跑浏览器沙箱。

## 免责声明

非官方社区项目，与 DeepSeek 官方无隶属关系。插件著作权归各作者；本站在本机运行第三方代码这件事上
不做安全背书，安装前请自行审阅源码。
