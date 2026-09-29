# 上线部署

三种路线，按省事程度排：

| 路线 | 提交功能 | 成本 | 适合 |
| --- | --- | --- | --- |
| **A. VPS + Docker Compose**（本文主推） | ✅ 直接可用 | ¥25–40/月 | 想今天就上线 |
| B. Vercel / Netlify | ⚠️ 要改造 | 免费 | 能接受「提交后等一次部署」 |
| C. 纯静态导出 | ❌ 没有提交 | 免费 | 只当只读目录 |

**为什么不能直接扔 Vercel**：提交会把新条目写进 `data/plugins.json`，Serverless 的文件系统是只读的。
路线 B 需要把写入改成「调 GitHub API 提交一次 commit，再触发重新部署」，我可以做，但那是要改代码的活。

---

## 路线 A：VPS + Docker Compose（推荐）

### 0. 先决条件

- 一台 VPS。**建议香港/新加坡/日本**：免 ICP 备案，大陆访问也快；
  用大陆机器（阿里云/腾讯云轻量）就必须先备案，一般要 2–3 周。
  最低配 1 核 1G 够跑，构建时吃内存，2G 更稳。
- 一个域名，把 `A` 记录指到 VPS 公网 IP。
- 开放 80 / 443 端口。

### 1. 装 Docker

```bash
curl -fsSL https://get.docker.com | sh
```

### 2. 拉代码

```bash
git clone <你的仓库地址> dsh-harbor && cd dsh-harbor
```

> 也可以直接 `rsync`/`scp` 把本地目录传上去。`data/` 目录一定要带上（里面有 145 条种子数据）。

### 3. 配置环境变量

```bash
cp .env.example .env
vim .env
```

最少要填四个：

```ini
SITE_DOMAIN = dshharbor.com
ACME_EMAIL = you@example.com
NEXT_PUBLIC_SITE_URL = https://dshharbor.com
GITHUB_TOKEN = ghp_xxxxxxxx
```

`GITHUB_TOKEN` 强烈建议填 —— 提交表单每提交一次要读一次 GitHub，匿名只有 60 次/小时。

### 4. 起服务

```bash
docker compose up -d --build
docker compose logs -f dsh-harbor      # 看到 Ready 就成
```

Caddy 会自动申请 Let's Encrypt 证书，几十秒后 https 就通了。

**第一次上线建议先用 staging 证书验证**：把 `Caddyfile` 里那行 `acme_ca` 的注释去掉，
跑通之后再注释掉重启（`docker compose restart caddy`），否则测试次数会消耗正式额度。

### 5. 验证

```bash
curl -I https://dshharbor.com
curl -s https://dshharbor.com/api/plugins | head -c 200
```

然后在浏览器里真提交一条试试 —— 提交成功会立刻出现在 `/plugins`，同时 `data/plugins.json` 变脏：

```bash
git status          # 会看到 data/plugins.json 被修改
```

### 5.5 机器要多大的？（实测数据）

在一台 **2 核 2G** 的等价环境里真跑过构建（`--cpus=2 --memory=X --memory-swap=X`，禁用 swap）：

| 内存限制 | 结果 | cgroup 峰值 |
| --- | --- | --- |
| 1 GB | ❌ 被 OOM kill | — |
| **2 GB** | ✅ 构建成功 | **1.25 GB** |

运行时就轻松多了：

| 状态 | 常驻内存 |
| --- | --- |
| 容器空载 | 108 MB |
| 压测 3000 次请求后 | 305 MB |

**结论：2C2G 够用**，但构建是唯一的紧张点 —— 峰值 1.25G，Linux 系统 + Docker 本身还要吃
200–300MB，所以 2G 的余量只有三成左右。

**所以务必加 2G swap 兜底**（不加的话，构建时稍有波动就会被 OOM kill）：

```bash
# 建一个 2G 的 swap 文件
fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 顺手调低 swappiness，别让运行时也用 swap
echo 'vm.swappiness=10' >> /etc/sysctl.conf && sysctl -p
free -h   # 确认 Swap 那一行有 2.0Gi
```

磁盘也够宽裕：依赖 372MB + 构建产物 146MB + 镜像 916MB + 构建中间层，
预留 **4–5GB** 就舒服了（轻量服务器通常 40–60GB SSD，没问题）。

**如果连加 swap 都不想 / 构建还是挂**：在本地或 CI 上构建镜像再传上去：

```bash
# 本地构建并导出（约 350–450MB 压缩包）
docker build -t dsh-harbor:latest .
docker save dsh-harbor:latest | gzip > dsh-harbor-image.tar.gz

# 传到服务器、导入、起服务（跳过服务器上的构建）
scp dsh-harbor-image.tar.gz root@你的IP:/root/
ssh root@你的IP 'gunzip -c /root/dsh-harbor-image.tar.gz | docker load && cd dsh-harbor && docker compose up -d'
```

服务器上只跑不打构建的话，**1 核 1G 都够**（运行时只要 ~300MB）。

### 6. 定时同步 Star 与更新时间

`data/plugins.json` 里的 Star 是**快照**，不刷就是旧的。加个 cron：

```bash
crontab -e
```

```cron
# 每天 4:17 刷新已有条目的元数据（用宿主机上的 node，走仓库里的脚本）
17 4 * * * cd /root/dsh-harbor && GITHUB_TOKEN=$(grep '^GITHUB_TOKEN' .env | cut -d= -f2 | tr -d ' ') npm run sync >> /var/log/dsh-harbor-sync.log 2>&1
```

跑完不用重启：页面有 30s–10min 的分级 ISR 缓存，会自动过期。

想让同步脚本顺手发现新插件，把 `npm run sync` 换成 `npm run sync:discover`
（注意：新收录的条目**没有中文名和中文简介**，只有自动推断的分类，建议之后再人工补）。

### 7. 备份

要备份的只有两个东西：`data/plugins.json` 和 `.env`。

```bash
# 每天 5 点把目录数据备份一份，保留 30 天
17 5 * * * cd /root/dsh-harbor && cp data/plugins.json /root/backups/plugins-$(date +\%F).json && find /root/backups -name 'plugins-*.json' -mtime +30 -delete
```

更省事的做法是**把 VPS 上的 `data/` 当成 git 仓库的一个工作副本**，定期 commit 推回：
社区的提交就直接变成 git 历史，谁提交的、什么时候提交的全都可查可回滚。

### 8. 升级

```bash
git pull
docker compose up -d --build
```

`data/` 是挂载出来的，重建容器不会丢。

---

## 路线 B：Vercel / Netlify（需要先改造）

现状**不能直接跑**，因为：

- `POST /api/submit` 会 `fs.writeFileSync` 写 `data/plugins.json` → Serverless 环境只读，会报 EROFS。
- `npm run sync` 依赖 `gh` CLI / 本地文件，Vercel 上没有。

可行的改造方向（工作量约半天）：

1. 写入改成 **GitHub Contents API** 提交 commit（需要一个有 `contents: write` 权限的 token，
   `data/plugins.json` 变成真正的 git 管理数据）。
2. 提交成功后调 **Vercel Deploy Hook** 触发重建，新条目在 ~1 分钟后上线
   —— 也就是说「提交即上架」会退化成「提交后等一次部署」。
3. 读取路径不用改：构建时 `data/plugins.json` 就在仓库里。

要这条路线的话说一声，我把 `lib/catalog.ts` 抽一层 storage 适配器，
用 `HARBOR_STORAGE=file|github` 切换，两种部署方式共用一套代码。

---

## 路线 C：纯静态只读

只想当只读目录、不接受在线提交的话：

```bash
# next.config.ts 里加 output: 'export'
npm run build     # 产出 out/
```

把 `out/` 丢到任何静态托管（Cloudflare Pages / OSS / Nginx）即可。
注意 `/api/*`、`/badge/*` 这些动态路由会失效，提交页和徽章都要去掉。

---

## 备案说明（打算用大陆机器才需要）

- 域名要**实名认证**，且后缀在工信部白名单里（`.com` `.cn` `.dev` 这类都行）。
- 服务器在大陆 → 必须 ICP 备案，阿里云/腾讯云都提供代备案，一般 2–3 周。
- 不想等就选**香港/新加坡**节点，免备案，大陆访问延迟 30–80ms，够用。
- 只买域名、服务器在境外 → **不需要备案**。

---

## 常见问题

**提交后页面没变？**
ISR 缓存 30s–10min。提交接口里有 `revalidatePath`，正常是立刻生效；
如果走的是 CDN，再看一眼 CDN 有没有缓存 HTML。

**`docker compose up` 报 `NEXT_PUBLIC_SITE_URL` 未设置？**
`docker-compose.yml` 里用了 `${VAR:?}` 语法强制要求，先在 `.env` 填好。

**证书申请失败？**
80 端口没放开，或者 DNS 还没生效。先用 `dig +short A 你的域名` 确认解析到了这台机器。

**提交接口 429**
同一 IP 每小时默认 8 次（`HARBOR_SUBMIT_PER_HOUR` 可调）。这是为了保护 GitHub API。
注意应用取的是 `X-Forwarded-For` 的**最后一个**地址，所以必须让它前面的反代正常追加，
别把 `X-Forwarded-For` 写死成常量。

**想收紧/放宽收录门槛**
`HARBOR_REQUIRE_LICENSE=false` 可以放行没有许可证的仓库（默认 `true`，和站内「收录规范」一致）。
