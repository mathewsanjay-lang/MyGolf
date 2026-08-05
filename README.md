# ⛳ Fairway — Golf Club Distance Tracker

**Live:** https://fairway-golf-indol.vercel.app

An installable phone app to record how far you hit each club, watch your
distances improve, and compare yourself to standard and pro benchmarks.

Everything runs in your browser — your data is stored **on your phone** in
`localStorage`. No account, no server, works offline on the course.

Benchmarks assume a **Callaway Paradym Ai Smoke** driver and iron set.

## The four tabs

### ⛳ Cheat (the on-course one-pager)
- **What club for this distance?** — type a yardage, it names the club, using
  your own average when you have data and the standard benchmark when you
  don't. Shows the next two closest clubs as alternatives.
- **Full bag chart** — every club on one horizontal scale with a yardage axis.
  Read across to your number and take that club. Blue tick = standard,
  gold tick = pro.
- **Cheat sheet table** — Club / You / Standard (±) / Pro / **Gap**, where Gap
  is the yards between that club and the next shorter one. Big gaps show
  where your bag has a hole.
- **Recent logs** — your latest 20 entries, so the whole picture is one page.

### 🚩 Log
Pick a club, type the distance, pick a date. Shows your last distance plus the
standard and pro targets as you select. Below, **Your bag**: latest distance
per club, a bar with standard/pro tick marks, and a ▲/▼ trend vs last time.

### 🕐 History
Every entry grouped by date, filterable by club, deletable — with **Undo**.

### 📊 Analytics
Per-club distance over time, with dashed standard and pro reference lines,
plus latest / personal best / average / change over time / gap to standard /
gap to pro / entry count.

## Clubs and benchmarks (yards)

| Club | Standard | Pro |
|---|--:|--:|
| Driver | 230 | 282 |
| Fairway Wood | 205 | 250 |
| Hybrid | 190 | 231 |
| 5 Iron | 160 | 194 |
| 6 Iron | 150 | 183 |
| 7 Iron | 140 | 172 |
| 8 Iron | 130 | 160 |
| 9 Iron | 120 | 148 |
| Pitching Wedge | 110 | 136 |
| Sand Wedge | 80 | 110 |

`standard` is a solid-amateur benchmark; `pro` is an approximate PGA Tour
average carry. Edit any of them in `data.js`.

## Run it locally

```bash
cd golf
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy to Vercel

Import the repo at [vercel.com/new](https://vercel.com/new), and in the
**Configure Project** step:

| Setting | Value |
|---|---|
| **Root Directory** | `golf` |
| Framework Preset | Other |
| Build / Install Command | leave blank |
| Output Directory | leave blank |

Root Directory = `golf` matters: the repository root contains a `public/`
folder, and Vercel's zero-config would otherwise serve *that* as the site.
Pointing at `golf/` also means no `package.json` is found, so Vercel skips
install and build entirely and just uploads the static files.

`golf/vercel.json` is then the live config — it sets `cleanUrls` and sends
`Cache-Control: no-cache` for `sw.js` so service-worker updates are picked up.

Once linked, every push to this branch redeploys automatically.

### Install on your phone

Open the deployed URL, then:

- **iPhone (Safari):** Share → *Add to Home Screen*
- **Android (Chrome):** menu → *Install app*

It launches full-screen like a native app and works offline.

## Maintaining it

The service worker is **network-first for the app shell**, so a deploy reaches
existing installs on the next load. Still, bump `CACHE` in `sw.js` whenever
`index.html`, `app.js` or `data.js` changes — changing that file's bytes is
what makes the browser re-run `install` and evict the old cache.
