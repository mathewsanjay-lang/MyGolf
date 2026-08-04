// Fairway — golf club distance tracker
// Data lives in localStorage on the phone. No account, no server.
(function () {
  "use strict";

  const CLUBS = window.GOLF_CLUBS;
  const UNIT = window.GOLF_UNIT || "yd";
  const STORE_KEY = "fairway.entries.v1";
  const MAX_DIST = 450; // keep in sync with the max attr on #dist / #findDist

  // Fail loudly rather than blankly if data.js didn't load (e.g. a bad cache).
  if (!Array.isArray(CLUBS) || !CLUBS.length) {
    document.querySelector("main").innerHTML =
      '<div class="empty">Club data failed to load.<br>Reload the page to try again.</div>';
    return;
  }

  const clubById = Object.fromEntries(CLUBS.map((c) => [c.id, c]));

  // Gloss for the cheat-sheet table's short codes that aren't self-evident.
  const SUB_LABEL = {
    driver: "Driver", fairway: "Fairway", hybrid: "Hybrid",
    pw: "Pitching", sw: "Sand",
  };

  // ---- storage ----
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch { return []; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(entries)); }
    catch { toast("Couldn't save — phone storage is full"); }
  }
  // entry: { id, club, dist, date, at }   date = "YYYY-MM-DD", at = created ms
  let entries = load();
  let lastDeleted = null;

  // ---- helpers ----
  const $ = (s) => document.querySelector(s);
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const fmtDate = (d) =>
    new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const shortDate = (d) =>
    new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const createdAt = (e) => (typeof e.at === "number" ? e.at : Number(e.id) || 0);

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now() + "-" + Math.random().toString(36).slice(2);
  }

  function entriesFor(clubId) {
    return entries
      .filter((e) => e.club === clubId)
      .sort((a, b) =>
        a.date.localeCompare(b.date) ||
        createdAt(a) - createdAt(b) ||
        String(a.id).localeCompare(String(b.id)));
  }
  function latestFor(clubId) {
    const list = entriesFor(clubId);
    return list.length ? list[list.length - 1] : null;
  }
  function avgFor(clubId) {
    const list = entriesFor(clubId);
    if (!list.length) return null;
    return Math.round(list.reduce((s, e) => s + e.dist, 0) / list.length);
  }

  let toastTimer;
  function toast(msg, actionLabel, actionFn) {
    const t = $("#toast");
    t.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = msg;
    t.appendChild(span);
    if (actionLabel && actionFn) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = actionLabel;
      b.addEventListener("click", () => {
        actionFn();
        clearTimeout(toastTimer);
        t.classList.remove("show");
      });
      t.appendChild(b);
    }
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), actionLabel ? 4500 : 1700);
  }

  // Re-render everything after any mutation, so no view can show stale data.
  function renderAll() {
    renderCheat();
    renderProHint();
    renderBag();
    renderHistory();
    renderAnalytics();
  }

  // ---- selects ----
  function fillClubSelect(sel, includeAll) {
    sel.innerHTML = includeAll ? '<option value="all">All clubs</option>' : "";
    CLUBS.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.name;
      sel.appendChild(o);
    });
  }

  // ================= CHEAT SHEET =================

  // What we'd trust on the course: your average if you have data, else the
  // standard benchmark for the club.
  function referenceFor(c) {
    const avg = avgFor(c.id);
    return avg !== null
      ? { value: avg, source: "you" }
      : { value: c.standard, source: "standard" };
  }

  function findClubFor(target) {
    const scored = CLUBS.map((c) => {
      const ref = referenceFor(c);
      return { club: c, ref, delta: target - ref.value, absDelta: Math.abs(target - ref.value) };
    }).sort((a, b) => a.absDelta - b.absDelta);
    return scored;
  }

  function renderFinder() {
    const raw = $("#findDist").value;
    const target = Number(raw);
    const box = $("#findResult");

    if (raw === "" || !Number.isFinite(target) || target <= 0) {
      box.innerHTML = '<div class="find-empty">Enter a distance and we\'ll pick the club.</div>';
      highlightClub(null);
      return;
    }
    if (target > MAX_DIST) {
      box.innerHTML = `<div class="find-empty">Enter a distance up to ${MAX_DIST} ${UNIT}.</div>`;
      highlightClub(null);
      return;
    }

    const scored = findClubFor(target);
    const best = scored[0];
    const alts = scored.slice(1, 3);
    const c = best.club;
    const d = best.delta;
    const note =
      d === 0 ? "right on your number"
      : d > 0 ? `${d} ${UNIT} more than your ${c.short}`
      : `${-d} ${UNIT} less than your ${c.short}`;
    const src = best.ref.source === "you"
      ? `your average ${best.ref.value} ${UNIT}`
      : `standard ${best.ref.value} ${UNIT} — no data logged yet`;

    box.innerHTML = `
      <div class="find-hit">
        <div class="badge">${c.short}</div>
        <div>
          <div class="fname">${c.name}</div>
          <div class="fsub">${src} · ${note}</div>
        </div>
      </div>
      <div class="find-alt">
        ${alts.map((a) => `
          <div><b>${a.club.name}</b>${a.ref.value} ${UNIT}${a.ref.source === "standard" ? " (std)" : ""}</div>
        `).join("")}
      </div>`;
    highlightClub(c.id);
  }

  let highlightedClub = null;
  function highlightClub(clubId) {
    highlightedClub = clubId;
    renderBagChart();
    renderCheatTable();
  }

  function renderBagChart() {
    const svg = $("#bagChart");
    const W = 340, rowH = 24, axisH = 16, botPad = 4;
    const plotX0 = 30, plotX1 = W - 38;
    const H = axisH + CLUBS.length * rowH + botPad;

    // x domain covers the longest reference on the chart (pro distances)
    const rawMax = Math.max(...CLUBS.map((c) => Math.max(c.pro, c.standard, avgFor(c.id) || 0)));
    const xMax = Math.ceil(rawMax / 50) * 50 || 50;
    const x = (v) => plotX0 + (Math.max(0, Math.min(v, xMax)) / xMax) * (plotX1 - plotX0);

    let g = "";

    // gridlines + axis labels along the top
    for (let v = 0; v <= xMax; v += 50) {
      g += `<line class="grid" x1="${x(v)}" y1="${axisH - 4}" x2="${x(v)}" y2="${H - botPad}"/>`;
      g += `<text class="axis-label" x="${x(v)}" y="${axisH - 8}" text-anchor="middle">${v}</text>`;
    }

    CLUBS.forEach((c, i) => {
      const yTop = axisH + i * rowH;
      const yc = yTop + rowH / 2;
      const barY = yc - 5;
      const avg = avgFor(c.id);

      if (highlightedClub === c.id) {
        g += `<rect class="hl" x="0" y="${yTop}" width="${W}" height="${rowH}" rx="4"/>`;
      }

      // track
      g += `<rect class="track" x="${plotX0}" y="${barY}" width="${plotX1 - plotX0}" height="10" rx="5"/>`;
      // your bar
      if (avg !== null) {
        g += `<rect class="fill-you" x="${plotX0}" y="${barY}" width="${Math.max(2, x(avg) - plotX0)}" height="10" rx="5"/>`;
      }
      // standard + pro ticks
      g += `<line class="tick-std" x1="${x(c.standard)}" y1="${barY - 3}" x2="${x(c.standard)}" y2="${barY + 13}"/>`;
      g += `<line class="tick-pro" x1="${x(c.pro)}" y1="${barY - 3}" x2="${x(c.pro)}" y2="${barY + 13}"/>`;
      // club label + value
      g += `<text class="club-label" x="24" y="${yc + 3.5}" text-anchor="end">${c.short}</text>`;
      g += avg !== null
        ? `<text class="val" x="${W - 2}" y="${yc + 3.5}" text-anchor="end">${avg}</text>`
        : `<text class="val-none" x="${W - 2}" y="${yc + 3.5}" text-anchor="end">—</text>`;
    });

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = g;
  }

  function renderCheatTable() {
    const body = $("#cheatBody");
    const rows = CLUBS.map((c, i) => {
      const avg = avgFor(c.id);
      // gap to the next shorter club, using the same reference basis
      let gap = "—", gapCls = "dash";
      const next = CLUBS[i + 1];
      if (next) {
        const a = avg, b = avgFor(next.id);
        if (a !== null && b !== null) { gap = (a - b) + ""; gapCls = ""; }
      }
      const vs = avg === null ? null : avg - c.standard;
      const youCell = avg === null
        ? '<td class="you dash">—</td>'
        : `<td class="you">${avg}</td>`;
      const stdCell = `<td class="std">${c.standard}${
        vs === null ? "" : ` <span class="${vs >= 0 ? "pos" : "neg"}">${vs >= 0 ? "+" : ""}${vs}</span>`
      }</td>`;
      // Numbered irons need no gloss ("5i" is unambiguous); the others do.
      const sub = SUB_LABEL[c.id] || "";
      return `<tr class="${highlightedClub === c.id ? "row-hl" : ""}">
        <td>${c.short}${sub ? ` <span style="color:var(--muted);font-size:11px">${sub}</span>` : ""}</td>
        ${youCell}
        ${stdCell}
        <td class="pro">${c.pro}</td>
        <td class="${gapCls}">${gap}</td>
      </tr>`;
    });
    body.innerHTML = rows.join("");
  }

  function renderCheatHistory() {
    const wrap = $("#cheatHistory");
    const list = entries
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || createdAt(b) - createdAt(a));

    if (!list.length) {
      wrap.innerHTML = '<div class="empty" style="padding:20px"><div class="big">🏌️</div>No logs yet — add one from the Log tab.</div>';
      return;
    }
    wrap.innerHTML = list.slice(0, 20).map((e) => {
      const c = clubById[e.club];
      return `<div class="ch-row">
        <span class="ch-date">${shortDate(e.date)}</span>
        <span class="ch-club">${c ? c.name : e.club}</span>
        <span class="ch-val">${e.dist} <span style="color:var(--muted);font-weight:400;font-size:11px">${UNIT}</span></span>
      </div>`;
    }).join("") + (list.length > 20
      ? `<div class="card-sub" style="margin:10px 0 0">Showing 20 of ${list.length} — see the History tab for all.</div>`
      : "");
  }

  function renderCheat() {
    renderBagChart();
    renderCheatTable();
    renderCheatHistory();
  }

  // ================= LOG =================
  function renderProHint() {
    const c = clubById[$("#club").value];
    if (!c) return;
    const last = latestFor(c.id);
    const you = last ? `${last.dist} ${UNIT}` : "—";
    $("#proHint").innerHTML =
      `You <b>${you}</b> · Standard <b>${c.standard}</b> · Pro <b>${c.pro}</b> ${UNIT}`;
  }

  function renderBag() {
    const bag = $("#bag");
    bag.innerHTML = "";
    CLUBS.forEach((c) => {
      const list = entriesFor(c.id);
      const last = list.length ? list[list.length - 1] : null;
      const prev = list.length > 1 ? list[list.length - 2] : null;

      const card = document.createElement("div");
      card.className = "card club-card";

      let trendHtml = "";
      if (last && prev) {
        const diff = last.dist - prev.dist;
        const cls = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
        const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "—";
        trendHtml = `<div class="trend ${cls}">${arrow} ${diff > 0 ? "+" : ""}${diff} vs last</div>`;
      }

      const scale = Math.max(c.pro, last ? last.dist : 0); // bar full width = pro (or a longer PB)
      const pct = last ? Math.min(100, Math.round((last.dist / scale) * 100)) : 0;
      const stdPct = Math.min(100, Math.round((c.standard / scale) * 100));
      const proPct = Math.min(100, Math.round((c.pro / scale) * 100));

      card.innerHTML = `
        <div class="club-badge">${c.short}</div>
        <div class="club-main">
          <div class="name">${c.name}</div>
          <div class="sub">Standard ${c.standard} · Pro ${c.pro} ${UNIT} · ${list.length} entr${list.length === 1 ? "y" : "ies"}</div>
          <div class="bar-wrap">
            <div class="bar-you" style="width:${pct}%"></div>
            <div class="bar-std-mark" style="left:calc(${stdPct}% - 1px)"></div>
            <div class="bar-pro-mark" style="left:calc(${proPct}% - 1px)"></div>
          </div>
        </div>
        <div class="club-dist">
          <div class="big">${last ? last.dist : "—"}</div>
          <div class="unit">${UNIT}</div>
          ${trendHtml}
        </div>`;
      bag.appendChild(card);
    });
  }

  function saveEntry() {
    const club = $("#club").value;
    const raw = $("#dist").value;
    const dist = Number(raw);
    const date = $("#date").value || todayStr();

    if (!club || raw === "" || !Number.isFinite(dist) || !Number.isInteger(dist) || dist <= 0 || dist > MAX_DIST) {
      toast(`Enter a whole distance between 1 and ${MAX_DIST} ${UNIT}`);
      return;
    }
    entries.push({ id: newId(), club, dist, date, at: Date.now() });
    save();
    $("#dist").value = "";
    renderAll();
    toast(`Saved ${clubById[club].name}: ${dist} ${UNIT}`);
  }

  // ================= HISTORY =================
  function renderHistory() {
    const filter = $("#histClub").value;
    const list = entries
      .filter((e) => filter === "all" || e.club === filter)
      .sort((a, b) => b.date.localeCompare(a.date) || createdAt(b) - createdAt(a));

    const wrap = $("#histList");
    if (!list.length) {
      wrap.innerHTML = `<div class="empty"><div class="big">🏌️</div>No entries yet.<br>Log a distance to start your history.</div>`;
      return;
    }

    const groups = {};
    list.forEach((e) => { (groups[e.date] = groups[e.date] || []).push(e); });

    wrap.innerHTML = "";
    Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach((date) => {
      const g = document.createElement("div");
      g.className = "hist-group";
      g.innerHTML = `<h3>${fmtDate(date)}</h3>`;
      const card = document.createElement("div");
      card.className = "card";
      groups[date].forEach((e) => {
        const c = clubById[e.club];
        const row = document.createElement("div");
        row.className = "hist-item";
        row.innerHTML = `
          <div>
            <div>${c ? c.name : e.club}</div>
            <div class="date">Standard ${c ? c.standard : "?"} · Pro ${c ? c.pro : "?"} ${UNIT}</div>
          </div>
          <div style="display:flex;align-items:center;gap:4px">
            <span class="val">${e.dist} ${UNIT}</span>
            <button class="del" type="button" data-id="${e.id}" aria-label="Delete entry">Delete</button>
          </div>`;
        card.appendChild(row);
      });
      g.appendChild(card);
      wrap.appendChild(g);
    });

    wrap.querySelectorAll(".del").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.id;
        const idx = entries.findIndex((e) => String(e.id) === id);
        if (idx === -1) return;
        lastDeleted = entries[idx];
        entries.splice(idx, 1);
        save();
        renderAll();
        toast("Entry deleted", "Undo", () => {
          if (!lastDeleted) return;
          entries.push(lastDeleted);
          lastDeleted = null;
          save();
          renderAll();
          toast("Entry restored");
        });
      })
    );
  }

  // ================= ANALYTICS =================
  function renderAnalytics() {
    const clubId = $("#anClub").value;
    const c = clubById[clubId];
    if (!c) return;
    const list = entriesFor(clubId);
    const svg = $("#chart");
    const grid = $("#statGrid");
    const W = 320, H = 200, pad = 24;

    if (!list.length) {
      svg.innerHTML = `<text class="chart-empty" x="160" y="100" font-size="12" text-anchor="middle">No data for ${c.name} yet</text>`;
      grid.innerHTML = "";
      return;
    }

    const dists = list.map((e) => e.dist);
    const first = dists[0], last = dists[dists.length - 1];
    const best = Math.max(...dists);
    const avg = Math.round(dists.reduce((a, b) => a + b, 0) / dists.length);
    const change = last - first;
    const gap = c.pro - last;
    const gapStd = c.standard - last;

    grid.innerHTML = `
      <div class="stat"><div class="k">Latest</div><div class="v">${last} ${UNIT}</div></div>
      <div class="stat"><div class="k">Personal best</div><div class="v">${best} ${UNIT}</div></div>
      <div class="stat"><div class="k">Average</div><div class="v">${avg} ${UNIT}</div></div>
      <div class="stat"><div class="k">Change over time</div><div class="v" style="color:${change >= 0 ? "var(--accent)" : "var(--danger)"}">${change >= 0 ? "+" : ""}${change} ${UNIT}</div></div>
      <div class="stat"><div class="k">Gap to standard</div><div class="v" style="color:var(--std)">${gapStd > 0 ? gapStd + " " + UNIT : "Reached! ✅"}</div></div>
      <div class="stat"><div class="k">Gap to pro</div><div class="v" style="color:var(--pro)">${gap > 0 ? gap + " " + UNIT : "Reached! 🎉"}</div></div>
      <div class="stat"><div class="k">Entries</div><div class="v">${list.length}</div></div>`;

    // Scale to the data AND both reference lines, so real progress fills the
    // plot instead of being squashed against a zero baseline.
    const lo = Math.min(...dists, c.standard);
    const hi = Math.max(...dists, c.pro);
    const padV = (hi - lo) * 0.15 || 10;
    const minV = Math.max(0, lo - padV);
    const maxV = hi + padV;
    const range = maxV - minV || 1;

    const x = (i) => list.length === 1 ? W / 2 : pad + (i / (list.length - 1)) * (W - pad * 2);
    const y = (v) => H - pad - ((v - minV) / range) * (H - pad * 2);

    const proY = y(c.pro);
    const stdY = y(c.standard);
    const points = list.map((e, i) => `${x(i)},${y(e.dist)}`).join(" ");
    const dots = list.map((e, i) =>
      `<circle class="series-dot" cx="${x(i)}" cy="${y(e.dist)}" r="3.5"/>`).join("");
    const area = `${pad},${H - pad} ${points} ${W - pad},${H - pad}`;

    svg.innerHTML = `
      <defs>
        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <stop class="g-top" offset="0"/>
          <stop class="g-bot" offset="1"/>
        </linearGradient>
      </defs>
      <line class="ref-std" x1="${pad}" y1="${stdY}" x2="${W - pad}" y2="${stdY}" stroke-width="1.5" stroke-dasharray="3 3"/>
      <text class="ref-std" x="${W - pad}" y="${stdY - 5}" font-size="10" text-anchor="end">Standard ${c.standard}</text>
      <line class="ref-pro" x1="${pad}" y1="${proY}" x2="${W - pad}" y2="${proY}" stroke-width="1.5" stroke-dasharray="5 4"/>
      <text class="ref-pro" x="${W - pad}" y="${proY - 5}" font-size="10" text-anchor="end">Pro ${c.pro}</text>
      ${list.length > 1 ? `<polygon points="${area}" fill="url(#fill)"/>` : ""}
      ${list.length > 1 ? `<polyline class="series" points="${points}" fill="none" stroke-width="2.5" stroke-linejoin="round"/>` : ""}
      ${dots}`;
  }

  // ================= NAV =================
  const VIEWS = ["cheat", "log", "history", "analytics"];
  function switchView(view) {
    VIEWS.forEach((v) => $("#view-" + v).classList.toggle("hidden", v !== view));
    document.querySelectorAll("nav button").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === view));
    // Always re-read state on entry so a view can never show stale numbers.
    if (view === "cheat") renderCheat();
    if (view === "log") { renderProHint(); renderBag(); }
    if (view === "history") renderHistory();
    if (view === "analytics") renderAnalytics();
    window.scrollTo(0, 0);
  }

  // ================= INIT =================
  function init() {
    fillClubSelect($("#club"), false);
    fillClubSelect($("#histClub"), true);
    fillClubSelect($("#anClub"), false);
    $("#date").value = todayStr();
    $("#dist").setAttribute("max", String(MAX_DIST));
    $("#findDist").setAttribute("max", String(MAX_DIST));
    if (window.GOLF_SET) {
      $("#setName").textContent = "Set: " + window.GOLF_SET + " · Standard & Pro targets";
    }

    $("#club").addEventListener("change", renderProHint);
    $("#saveBtn").addEventListener("click", saveEntry);
    $("#dist").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); saveEntry(); }
    });
    $("#findDist").addEventListener("input", renderFinder);
    $("#histClub").addEventListener("change", renderHistory);
    $("#anClub").addEventListener("change", renderAnalytics);
    document.querySelectorAll("nav button").forEach((b) =>
      b.addEventListener("click", () => switchView(b.dataset.view)));

    renderFinder();
    renderAll();
  }

  init();
})();
