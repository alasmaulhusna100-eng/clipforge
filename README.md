# ClipForge — AI Video Studio

CapCut-class ওয়েব অ্যাপ: টাইমলাইন এডিটর, AI ভিডিও/ইমেইজ জেনারেটর, লম্বা ভিডিও → সিরিয়াল শর্ট স্প্লিটার, SD 480p → UHD 4K এক্সপোর্ট, মোবাইলে ইনস্টলযোগ্য PWA।

## Features (ফিচারসমূহ)

- **🎬 Timeline Editor** — ট্রিম, স্প্লিট, রিঅর্ডার, ফিল্টার, টেক্সট ওভারলে, ভলিউম, ফেড
- **✂️ Smart Splitter** — ৩০–৫০ মিনিটের ভিডিও → 10s / 25s / 45s / 60s সিরিয়াল ক্লিপ (১, ২, ৩…)
- **✨ AI Studio** — প্রম্পট → ভিডিও (সাউন্ডস্কেপসহ) ও ইমেইজ
- **📦 Export** — SD 480p, HD 720p, FHD 1080p, QHD 1440p, UHD 4K
- **📱 PWA** — হোম স্ক্রিনে ইনস্টল, অ্যাপ শর্টকাট, অফলাইন শেল

## Tech

Next.js 16 (App Router) · PostgreSQL + Drizzle ORM · FFmpeg (ffmpeg-static) · Tailwind CSS v4 · Framer Motion

> ⚠️ এই অ্যাপ ভিডিও প্রসেসিংয়ে FFmpeg চালায় এবং `storage/`-এ ফাইল রাখে — তাই **serverless প্ল্যাটফর্মে (যেমন Vercel Serverless) চলবে না**। Docker/সার্ভার হোস্টিং লাগবে।

---

## ইন্টারনেটে পাবলিক করার উপায়

### অপশন ১: Railway (সবচেয়ে সহজ, রিকমেন্ডেড)

1. কোডটি GitHub-এ পুশ করুন
2. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
3. Railway অটোমেটিক `Dockerfile` দেখে বিল্ড করবে
4. **Add → Database → PostgreSQL** ক্লিক করুন
5. Web service → **Variables** → নতুন ভেরিয়েবল:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Railway-এর রেফারেন্স ব্যবহার করুন)
6. **Settings → Networking → Generate Domain** → পাবলিক URL পাবেন

Cost: প্রায় $5/mo (Hobby plan)।

### অপশন ২: Render (render.yaml দিয়ে one-click)

1. কোড GitHub-এ পুশ করুন
2. [render.com](https://render.com) → **New → Blueprint** → আপনার repo সিলেক্ট করুন
3. `render.yaml` অটো ডিটেক্ট হবে — web service + PostgreSQL দুটোই তৈরি হবে, `DATABASE_URL` অটো কানেক্ট হবে
4. Deploy → `https://clipforge.onrender.com`-এ লাইভ

### অপশন ৩: নিজের VPS (DigitalOcean / Hetzner / AWS EC2)

```bash
# সার্ভারে Docker ইনস্টল থাকলে:
git clone <your-repo> && cd clipforge

# PostgreSQL চালু (docker):
docker run -d --name db -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=app_db -p 5432:5432 postgres:16

# অ্যাপ বিল্ড + রান:
docker build -t clipforge .
docker run -d --name clipforge -p 3000:3000 \
  -e DATABASE_URL=postgresql://postgres:secret@<db-host>:5432/app_db \
  -v clipforge-data:/app/storage \
  clipforge
```

তারপর Nginx/Caddy দিয়ে ডোমেইন পয়েন্ট করুন + `/api/health` হেলথচেক ব্যবহার করুন।

`storage` ভলিউম মাউন্ট করা জরুরি — নাহলে আপলোড/ক্লিপ কন্টেইনার রিস্টার্টে হারাবে।

### অপশন ৪: এই প্রিভিউ লিংক শেয়ার করা

বর্তমান sandbox প্রিভিউ URL-টি চলমান থাকা অবস্থায় পাবলিক — ডেমো/শেয়ারিংয়ের জন্য এখনই ব্যবহার করা যাবে, তবে স্থায়ী নয়।

---

## Local development

```bash
npm install
# .env-এ DATABASE_URL সেট করুন (PostgreSQL)
npx drizzle-kit push
npm run dev
```

ভিডিও প্রসেসিংয়ের জন্য আর কিছু লাগে না — FFmpeg বাইনারি npm প্যাকেজেই আসে। শুধু ASS টেক্সট বার্নিংয়ের জন্য সিস্টেমে DejaVu ফন্ট থাকতে হবে (ডকারে অটো ইনস্টল হয়)।

## Environment variables

| Key | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |

## Scripts

- `npm run dev` — ডেভেলপমেন্ট সার্ভার
- `npm run build` — প্রোডাকশন বিল্ড
- `npm run start` — প্রোডাকশন সার্ভার (port 3000)
- `npx drizzle-kit push` — ডাটাবেস স্কিমা সিংক

## Roadmap ideas

- রিয়েল AI ভিডিও মডেল API (Replicate/Runway) প্লাগ করা — `src/lib/ai-engine.ts`-এ জেনারেটর অংশ বদলালেই হবে
- ক্লাউড স্টোরেজ (S3/R2) — বর্তমানে লোকাল `storage/`
- মাল্টি-ইউজার অথেনটিকেশন
