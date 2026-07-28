# ⛳ Fairway — Golf Club Distance Tracker

A simple, installable phone app to record how far you hit each club, watch your
distances improve over time, and compare yourself to the pros.

Everything runs in your browser — your data is stored **on your phone** in
`localStorage`. No account, no server, works offline.

## Features

- **Log distances** for every club with a date.
- **Your bag** — at-a-glance latest distance per club, a bar showing how close
  you are to the pro target, and a ▲/▼ trend vs your previous entry.
- **History** — every entry, grouped by date, filterable by club, deletable.
- **Analytics** — a line chart of each club's distance over time against the
  pro target line, plus stats: latest, personal best, average, change over
  time, and gap to pro.
- **Pro targets** — typical PGA Tour carry distances to aspire to, shown
  everywhere.

## Clubs tracked

Driver · Fairway Wood · Hybrid · 5–9 Iron · Pitching Wedge · Sand Wedge

## Run it

It's a static site — just open `index.html`, or serve the folder:

```bash
cd golf
python3 -m http.server 8080
# then open http://localhost:8080
```

### Install on your phone

1. Deploy the `golf/` folder to any static host (Vercel config included) or
   serve it over HTTPS.
2. Open the URL in your phone browser.
3. **iPhone (Safari):** Share → *Add to Home Screen*.
   **Android (Chrome):** menu → *Install app* / *Add to Home screen*.

It then launches full-screen like a native app and works offline.

## Pro reference distances

Pro targets in `data.js` are approximate PGA Tour average carry distances.
Adjust any value there if you want a different benchmark.
