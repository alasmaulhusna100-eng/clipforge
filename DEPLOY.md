# 🚀 ClipForge পাবলিক ডেপ্লয় গাইড (ধাপে ধাপে)

এই অ্যাপ FFmpeg দিয়ে ভিডিও প্রসেস করে এবং `storage/` ফোল্ডারে ফাইল রাখে — এজন্য **একটি সার্ভার/কন্টেইনার হোস্টিং লাগবে** (Vercel-এর serverless ফাংশনে চলবে না — ফাংশন টাইমআউট আর ফাইলসিস্টেম সীমাবদ্ধতার কারণে)।

শুরুর আগের প্রস্তুতি — কোড GitHub-এ পুশ করুন:

```bash
git init
git add -A
git commit -m "ClipForge — AI video studio"
# github.com-এ নতুন repo বানিয়ে remote যোগ করুন, তারপর:
git remote add origin https://github.com/<আপনার-নাম>/clipforge.git
git push -u origin main
```

---

## 🥇 পথ ১: Railway (সবচেয়ে সহজ — রিকমেন্ডেড)

**খরচ:** Hobby প্ল্যান ~$5/মাস (ডাটাবেস + অ্যাপ দুটোই ঢুকে যায়)

### ধাপ ১ — প্রজেক্ট বানান
1. https://railway.app এ লগইন করুন (GitHub দিয়ে)
2. **New Project** ক্লিক করুন
3. **Deploy from GitHub repo** সিলেক্ট করুন
4. আপনার `clipforge` repo বেছে নিন — Railway নিজেই `Dockerfile` চিনে নেবে এবং বিল্ড শুরু করবে

### ধাপ ২ — ডাটাবেস যোগ করুন
1. প্রজেক্ট ক্যানভাসে **+ New** ক্লিক করুন
2. **Database → PostgreSQL** সিলেক্ট করুন
3. ১ মিনিটে ডাটাবেস রেডি হয়ে যাবে (ভলিউমসহ)

### ধাপ ৩ — ডাটাবেস কানেক্ট করুন
1. **clipforge** সার্ভিসে ক্লিক করুন → **Variables** ট্যাবে যান
2. **Add Reference Variable** চাপুন
3. PostgreSQL সার্ভিসের **DATABASE_URL** বেছে নিন
   - এতে তৈরি হয়: `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - রেফারেন্স ব্যবহারের সুবিধা: পাসওয়ার্ড বদলালেও অটো সিংক থাকে
4. সার্ভিসটি রিডেপ্লয় হবে — Dockerfile-এর বুট কমান্ড (`npx drizzle-kit push`) স্কিমা তৈরি করে দেবে

### ধাপ ৪ — পাবলিক ডোমেইন নিন
1. **clipforge** সার্ভিস → **Settings → Networking**
2. **Generate Domain** চাপুন → পাবেন `clipforge-production.up.railway.app`-এর মতো URL
3. চাইলে এখানেই কাস্টম ডোমেইন কানেক্ট করতে পারবেন

### ✅ যাচাই
ব্রাউজারে `https://<আপনার-ডোমেইন>/api/health` খুলুন — `{"ok":true}` দেখলেই সব ঠিক আছে।

---

## 🥈 পথ ২: Render (ফ্রি টিয়ার দিয়ে শুরু)

**খরচ:** ফ্রি (সীমাবদ্ধতা নিচে পড়ুন); সিরিয়াস হলে Postgres ~$6/মাস

Repo-তে `render.yaml` রেডি আছে — শুধু Blueprint চালু করুন:

### ধাপ ১ — Blueprint চালু
1. https://render.com এ সাইন আপ করুন
2. ড্যাশবোর্ডে **New → Blueprint** ক্লিক করুন
3. আপনার GitHub repo কানেক্ট করুন
4. Render `render.yaml` পড়ে নিজে নিজে দুটো রিসোর্স বানাবে:
   - `clipforge` — Docker web service (ডকারফাইল বিল্ড)
   - `clipforge-db` — PostgreSQL (DATABASE_URL অটো কানেক্টেড)
5. **Apply** চাপুন → বিল্ড ৫–১০ মিনিট লাগতে পারে

### ধাপ ২ — লাইভ URL
`https://clipforge.onrender.com`-এর মতো URL পাবেন। `/api/health` দিয়ে যাচাই করুন।

### ⚠️ ফ্রি টিয়ারের ৩টি জরুরি সতর্কতা
1. **ফ্রি Postgres ৩০ দিন পর মেয়াদোত্তীর্ণ হয়ে ডিলিট হয়ে যায়** — এর আগে ডাটাবেস প্ল্যান আপগ্রেড করুন (`0.1c-256mb` ~$6/মাস)
2. **ফ্রি web service ১৫ মিনিট নিষ্ক্রিয় থাকলে ঘুমিয়ে যায়** — পরের রিকোয়েস্টে জাগতে ~১ মিনিট লাগে
3. **ফ্রি প্ল্যানে আপলোড করা ভিডিও স্থায়ী থাকে না** (ephemeral ডিস্ক) — পেইড প্ল্যানে আপগ্রেড করে `render.yaml`-এর `disk:` অংশটি (আগে থেকেই কমেন্ট করা আছে) আনকমেন্ট করুন

---

## 🥉 পথ ৩: নিজের VPS (সবচেয়ে বেশি কন্ট্রোল)

**খরচ:** Hetzner/DigitalOcean-এ ~$4-6/মাস (2GB RAM যথেষ্ট)

### ধাপ ১ — সার্ভার প্রস্তুত (Ubuntu 24.04)
```bash
ssh root@<server-ip>
# Docker ইনস্টল:
curl -fsSL https://get.docker.com | sh
```

### ধাপ ২ — কোড আনুন
```bash
git clone https://github.com/<আপনার-নাম>/clipforge.git
cd clipforge
```

### ধাপ ৩ — PostgreSQL কন্টেইনার
```bash
docker run -d --name clipforge-db --restart always \
  -e POSTGRES_PASSWORD=শক্তিশালী_পাসওয়ার্ড \
  -e POSTGRES_DB=app_db \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16
```

### ধাপ ৪ — অ্যাপ বিল্ড ও রান
```bash
docker build -t clipforge .

docker run -d --name clipforge --restart always \
  --link clipforge-db \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:শক্তিশালী_পাসওয়ার্ড@clipforge-db:5432/app_db" \
  -v clipforge-storage:/app/storage \
  clipforge
```

> `-v clipforge-storage:/app/storage` জরুরি — এতে ভিডিও/ক্লিপ রিস্টার্টেও হারাবে না।

### ধাপ ৫ — ডোমেইন + ফ্রি HTTPS (Caddy)
```bash
apt install -y caddy
```
`/etc/caddy/Caddyfile`-এ লিখুন:
```
clipforge.আপনারডোমেইন.com {
    reverse_proxy localhost:3000
}
```
```bash
systemctl reload caddy
```
DNS-এ A রেকর্ড `clipforge.আপনারডোমেইন.com` → সার্ভার IP দিন। Caddy নিজেই SSL সার্টিফিকেট বানিয়ে নেবে।

---

## 📋 যাচাই চেকলিস্ট (যেকোনো পথেই)

| চেক | কোথায় | সফল মানে |
|---|---|---|
| হেলথ | `/api/health` | `{"ok":true}` |
| PWA ম্যানিফেস্ট | `/manifest.webmanifest` | JSON লোড হয় |
| আপলোড+স্প্লিট | Splitter পেজে ছোট ভিডিও | সিরিয়াল ক্লিপ তৈরি হয় |
| AI জেনারেশন | AI Studio | ভিডিও/ইমেজ রেন্ডার হয় |
| মোবাইল ইনস্টল | ফোনে সাইট খুলে Install App | হোম স্ক্রিনে আইকন |

## 🔧 সমস্যা হলে

| লক্ষণ | কারণ | সমাধান |
|---|---|---|
| `DATABASE_URL is required` | ভেরিয়েবল সেট হয়নি | Railway/Render ভেরিয়েবল ট্যাব চেক করুন |
| অ্যাপ বুটে আটকে আছে | ডাটাবেস কানেকশন | `drizzle-kit push` লগ দেখুন; DB হোস্ট ঠিক আছে কিনা দেখুন |
| টেক্সট ওভারলে আসে না | কন্টেইনারে ফন্ট নেই | আমাদের Dockerfile ব্যবহার করুন (DejaVu অটো ইনস্টল হয়) |
| রিস্টার্টে ভিডিও হারায় | ভলিউম মাউন্ট নেই | `-v clipforge-storage:/app/storage` / Render `disk:` |

## 💡 বিকল্প: আলাদা ম্যানেজড ডাটাবেস

অ্যাপ কোথাও ডেপ্লয় করুন না কেন, `DATABASE_URL` হিসেবে Neon বা Supabase-এর ফ্রি Postgres কানেকশন স্ট্রিংও দিতে পারবেন — এতে ডাটাবেস বিল পুরোপুরি বেঁচে যেতে পারে।
