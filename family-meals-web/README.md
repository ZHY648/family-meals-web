# 家庭三餐 · 网站版

家人共用的菜谱网站：**免费托管 + 免费数据库**，无需微信云开发月费。

功能与小程序一致：上传菜谱、挑选菜谱、按 **早餐 / 午餐 / 晚餐** 加入菜单、查看详情。

---

## 费用

| 项目 | 费用 |
|------|------|
| Supabase 数据库（Free 计划） | **免费**（约 500MB，够家庭用） |
| 图片存储 | **免费**（Free 计划约 1GB） |
| 网页托管（Vercel / Netlify） | **免费** |
| 域名（可选） | 约 50～100 元/年 |

---

## 一、本地预览（先在自己电脑试）

1. 用浏览器直接打开 `index.html`，或：
2. 在本目录运行简易服务器（任选一种）：

```bash
# Python
python -m http.server 8080

# Node（若已安装 npx）
npx serve .
```

3. 浏览器访问 http://localhost:8080

> 首次打开会进入「设置」页，需先配置 Supabase。

---

## 二、配置 Supabase（家人同步的关键，约 15 分钟）

### 1. 注册 Supabase

1. 打开 https://supabase.com → **Start your project**（免费）
2. 用 GitHub 或邮箱注册
3. **New project** → 名称随意 → 数据库密码自己记好 → 区域选离中国近的（如 Singapore）→ **Free** 计划

### 2. 建表

1. 左侧 **SQL Editor** → **New query**
2. 打开本项目 `supabase/schema.sql`，全选复制，粘贴到编辑器
3. 点 **Run**

### 3. 创建图片存储桶

1. 左侧 **Storage** → **New bucket**
2. Name 填：`dish-images`
3. 勾选 **Public bucket** → Create

### 4. 存储权限（允许上传图片）

在 **Storage** → 点 `dish-images` → **Policies** → **New policy**：

选 **For full customization**，粘贴下面策略（允许公开读写，适合家庭内部；链接不要公开到全网）：

```sql
create policy "Public read dish images"
on storage.objects for select
using ( bucket_id = 'dish-images' );

create policy "Public upload dish images"
on storage.objects for insert
with check ( bucket_id = 'dish-images' );
```

或在 Policy 向导里选 **Allow public read** + **Allow authenticated uploads**；若上传失败，改用上面 SQL。

### 5. 复制连接信息

**Project Settings**（齿轮）→ **API**：

- **Project URL** → 形如 `https://xxxxx.supabase.co`
- **anon public** key → 长字符串

### 6. 在网站里填写

打开网站 → 底部 **「设置」** → 粘贴 URL 和 Key → **测试连接** → **保存并启用**。

把 **同一网站链接** 发给家人，他们也要在各自浏览器里填 **相同的 URL 和 Key**（或你部署后写在 `js/config.js` 里，家人就不用填）。

---

## 三、免费发布到网上（家人用手机打开）

### 方式 A：Vercel（推荐）

1. 注册 https://vercel.com（免费）
2. **Add New → Project** → 导入 GitHub 仓库，或上传 `family-meals-web` 文件夹
3. 部署完成后得到链接，如 `https://xxx.vercel.app`
4. 把链接发到家庭微信群即可

### 方式 B：Netlify

1. https://app.netlify.com → **Add new site** → 拖入 `family-meals-web` 文件夹
2. 得到 `https://xxx.netlify.app` 链接

### 预填配置（家人免手动填 Key）

部署前编辑 `js/config.js`：

```js
window.APP_CONFIG = {
  supabaseUrl: 'https://你的项目.supabase.co',
  supabaseAnonKey: '你的anon key'
}
```

重新部署后，家人打开链接即可直接用。

---

## 四、家人怎么用

1. 你发网站链接（或「添加到主屏幕」当 App 用）
2. 若未预填配置：家人在「设置」里填 **同一套** Supabase URL 和 Key
3. 各自在「上传菜谱」改昵称
4. 上传、选餐次、看菜单 — 数据实时同步

---

## 五、项目结构

```
family-meals-web/
├── index.html          # 主页面
├── css/style.css
├── js/
│   ├── config.js       # 可预填 Supabase
│   ├── user.js         # 昵称 / 配置存储
│   ├── meals.js        # 餐次
│   ├── api.js          # Supabase 读写
│   └── app.js          # 界面逻辑
└── supabase/schema.sql # 建表脚本
```

---

## 六、安全说明

- `anon key` 会出现在网页里，这是 Supabase 常规用法；家庭小项目可接受。
- 请勿把链接发到公开论坛；仅分享给家人。
- 若需更强安全，可后续改为登录后再读写（会复杂一些）。

---

## 与小程序版对比

| | 小程序 + 云开发 | 网站版 + Supabase |
|--|----------------|-------------------|
| 月费 | 上线后可能 ~19.9 元 | **免费** |
| 打开方式 | 微信 | 任意浏览器 |
| 家人同步 | ✅ | ✅ |

小程序版仍在 `family-meals/` 目录，可继续本机体验；家人同步建议用本网站版。
