# AdForge — AI Facebook Ad Remaker

Find your competitors' best-performing static Facebook ads. Remake them in your brand's style using AI.

## Quick Start

### 1. Add your API keys

```bash
# Edit backend/.env with your keys:
APIFY_TOKEN=apify_api_...    # from apify.com
KIE_API_KEY=...              # from kie.ai
```

### 2. Install dependencies

```bash
# Terminal 1 — Backend
cd backend
npm install

# Terminal 2 — Frontend
cd frontend
npm install
```

### 3. Run

```bash
# Terminal 1 — Backend (hot reload)
cd backend
npx tsx watch src/index.ts

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open **http://localhost:5173**

---

## How it works

1. **Find Ads** — Paste a Meta Ad Library search URL. AdForge scrapes it via Apify, filters for static image ads running 20+ days (configurable), deduplicates per brand, and shows you the winners.

2. **Remake** — Select an ad, click "Remake Selected →". AdForge's AI (GPT-5.5 vision) analyzes the ad's structural formula, then generates a new version using your brand context.

3. **Library** — View your generated ads. Click any to see a side-by-side comparison of the inspiration ad vs. your version. Download, iterate, or delete.

## Architecture

- **No database** — localStorage + in-memory Maps + local disk uploads
- **Backend**: Fastify 5 + TypeScript (port 3001)
- **Frontend**: React 18 + Vite 5 + Tailwind 3 (port 5173)
- **Scraping**: Apify (`curious_coder~facebook-ads-library-scraper`)
- **AI Prompter**: KIE API (GPT-5.5 vision)
- **Image Generation**: KIE nano-banana-pro

## Getting API Keys

- **Apify**: Sign up at [apify.com](https://apify.com) → Settings → Integrations → API token
- **KIE**: Get key at [kie.ai](https://kie.ai)
