# CPA 备考学习站（PWA）

2027 考期：会计 + 财务成本管理 + 战略。当前已上线财管第 1-3 章精读 + 全书公式卡 + 题库，其余章节按学习计划陆续制作。

## 本地运行

```bash
npm run dev          # 默认 127.0.0.1:7100
npm run dev -- --port 8080
```

## 部署到云端（GitHub Pages）

方式 A（推荐，全自动）：安装并登录 gh 后交还给 Agent：
```bash
brew install gh && gh auth login
```

方式 B（手动）：在 github.com 新建空仓库（如 `cpa-study`），然后在项目目录：
```bash
git remote add origin git@github.com:<你的用户名>/cpa-study.git  # 或 https 地址
git push -u origin main
```
再到仓库 Settings → Pages → Source 选 `main` 分支根目录，保存。几分钟后可通过
`https://<用户名>.github.io/cpa-study/` 访问。手机浏览器打开后"添加到主屏幕"即拥有 App 体验。

## 内容热更新

所有学习内容是 `data/` 下的 JSON 文件，修改后推送到仓库，用户端打开 App 自动拉取最新内容，
无需重新发布应用、不丢任何进度（进度存 localStorage + 云端）。

## 云同步（Supabase，免费额度足够）

1. supabase.com 注册 → New Project（免费）
2. SQL Editor 执行：
```sql
create table cpa_state (
  id uuid primary key references auth.users,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table cpa_state enable row level security;
create policy "own only" on cpa_state
  for all using (auth.uid() = id) with check (auth.uid() = id);
```
3. App 内「我的」页填入 Project URL 和 anon public key，注册邮箱登录即可。
   断网或云端故障时自动降级为本地模式 + 手动同步码，进度不会丢。

## 目录结构

```
index.html / sw.js / manifest.webmanifest   应用外壳（PWA）
css/app.css                                  样式
js/core.js                                   状态存储 + 间隔重复 + 云同步
js/data.js                                   内容加载
js/views.js                                  页面视图
js/app.js                                    路由
data/index.json                              科目索引
data/fm/chapters.json                        财管章节目录（含章节状态）
data/fm/ch01..ch20.json                      章节精读内容（blocks 结构）
data/fm/formulas.json                        公式卡
data/fm/quiz.json                            题库
data/plan.json                               46 周学习计划
```
