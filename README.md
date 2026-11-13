# CreatorForge — Universal AI Content Creator Website Platform

A full-stack Node.js, Express, SQLite, React, and TypeScript website builder and live portal for any YouTube content creator.

## Features

- **4-Input Universal Creator Generator (`/setup`)**: Configure any creator using just Channel Name, YouTube Channel URL, Discord Invite URL, and Desired Website Port.
- **Automatic YouTube Integration & Background Worker**:
  - Uses official **YouTube Data API v3** (`channels.list`, `playlistItems.list`, `videos.list`, `search.list`) when `YOUTUBE_API_KEY` is configured.
  - Automatically falls back to public YouTube channel metadata and official RSS feeds (`feeds/videos.xml`) when no API key is configured.
  - **Verified Shorts Detection**: Checks candidate videos (`<= 60s`) against YouTube `/shorts/<id>` before classifying them as Shorts.
  - **Automatic Livestream Detection**: Detects active livestreams, viewer counts, and upcoming broadcasts without fabricating live status.
  - **Real-Time Browser Updates**: Server-Sent Events (`/api/events`) push refreshed stats, uploads, and live status to visitors without page reloads.
- **AI Niche & Brand Identity Engine**: Uses Gemini (`@google/genai` server-side) with deterministic fallback to match typography, palette, theme mode, and copy to the creator's actual content niche.
- **Complete Website Pages**: Home (with animated Live Subscriber Counter), About, Videos (search, sort, filters, pagination, modal player), Shorts (desktop gallery + mobile snap feed), Live Stream, Community, Contact, Creator Builder (`/setup`), and Admin Dashboard (`/admin`).
- **Secure Admin Dashboard (`/admin`)**: Bcrypt-hashed authentication, HttpOnly sessions, CSRF tokens, featured video manager, text/theme editor, contact inbox, and deployment config generator.

---

## Quick Start (Local Development)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

---

## Production Build & Port Configuration

Set your desired port in `.env` (for example `25595`):

```env
PORT=25595
HOST=0.0.0.0
CHANNEL_NAME="HkR PlayZ"
YOUTUBE_CHANNEL_URL="https://www.youtube.com/@hkrplayz"
DISCORD_INVITE_URL="https://discord.gg/WP5g3uehWd"
YOUTUBE_API_KEY=""
GEMINI_API_KEY=""
```

Build and start the Node.js server:

```bash
npm run build
npm start
```

The server validates `PORT`, binds to `0.0.0.0`, detects `EADDRINUSE` port conflicts clearly without silently switching ports, and prints:

```text
================================
CREATOR WEBSITE STARTED
================================
Website: http://localhost:25595
Status: RUNNING
Port: 25595
================================
```

---

## Ubuntu VPS & PM2 Deployment

1. Install Node.js 20+ and PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Clone/upload the project, install dependencies, and build:
   ```bash
   npm install
   npm run build
   ```

3. Allow your chosen port through UFW firewall (if active):
   ```bash
   sudo ufw allow 25595/tcp
   ```

4. Start persistently with PM2 (or export `ecosystem.config.cjs` from `/setup` or `/admin`):
   ```bash
   PORT=25595 HOST=0.0.0.0 pm2 start server.js --name creator-website
   pm2 save
   pm2 startup
   ```
