// Fairway — golf club distance tracker
// Data lives in localStorage on the phone. No account, no server.
(function () {
  "use strict";

  const CLUBS = window.GOLF_CLUBS;
  const UNIT = window.GOLF_UNIT || "yd";
  const STORE_KEY = "fairway.entries.v1";
  const clubById = Object.fromEntries(CLUBS.map((c) => [c.id, c]));

  // ---- storage ----
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch { return []; }
  }
  function save(entries) {
    localStorage.setItem(STORE_KEY, JSON.stringify(entries));
  }
  // entry: { id, club, dist, date }  (date = "YYYY-MM-DD")
  let entries = load();

  // ---- helpers ----
  const $ = (s) => document.querySelector(s);
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const fmtDate = (d) =>
    new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  function entriesFor(clubId) {
    return entries
      .filter((e) => e.club === clubId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  }
  function latestFor(clubId) {
    const list = entriesFor(clubId);
    return list.length ? list[list.length - 1] : null;
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 1600);
  }

  // ---- populate selects ----
  function fillClubSelect(sel, includeAll) {
    sel.innerHTML = includeAll ? '<option value="all">All clubs</option>' : "";
    CLUBS.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.name;
      sel.appendChild(o);
    });
  }

  // ---- LOG view ----
  function renderProHint() {
    const c = clubById[$("#club").value];
    if (!c) return;
    const last = latestFor(c.id);
    const you = last ? `${last.dist} ${UNIT}` : "—";
    $("#proHint").innerHTML =
      `<span>You <b>${you}</b> · Standard <b>${c.standard}</b> · Pro <b>${c.pro}</b> ${UNIT}</span>`;
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

      const scale = c.pro; // bar full width = pro distance
      const pct = last ? Math.min(100, Math.round((last.dist / scale) * 100)) : 0;
      const stdPct = Math.min(100, Math.round((c.standard / scale) * 100));

      card.innerHTML = `
        <div class="club-badge">${c.short}</div>
        <div class="club-main">
          <div class="name">${c.name}</div>
          <div class="sub">Standard ${c.standard} · Pro ${c.pro} ${UNIT} · ${list.length} entr${list.length === 1 ? "y" : "ies"}</div>
          <div class="bar-wrap">
            <div class="bar-you" style="width:${pct}%"></div>
            <div class="bar-std-mark" style="left:calc(${stdPct}% - 1px)" title="Standard"></div>
            <div class="bar-pro-mark" style="left:calc(100% - 1px)" title="Pro"></div>
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
    const dist = parseInt($("#dist").value, 10);
    const date = $("#date").value || todayStr();
    if (!club || !Number.isFinite(dist) || dist <= 0) {
      toast("Enter a valid distance");
      return;
    }
    entries.push({ id: Date.now(), club, dist, date });
    save(entries);
    $("#dist").value = "";
    renderBag();
    renderProHint();
    renderHistory();
    renderAnalytics();
    toast(`Saved ${clubById[club].name}: ${dist} ${UNIT}`);
  }

  // ---- HISTORY view ----
  function renderHistory() {
    const filter = $("#histClub").value;
    const list = entries
      .filter((e) => filter === "all" || e.club === filter)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

    const wrap = $("#histList");
    if (!list.length) {
      wrap.innerHTML = `<div class="empty"><div class="big">🏌️</div>No entries yet.<br>Log a distance to start your history.</div>`;
      return;
    }

    // group by date
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
            <div class="date">Pro ${c ? c.pro : "?"} ${UNIT}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="val">${e.dist} ${UNIT}</span>
            <button class="del" data-id="${e.id}">Delete</button>
          </div>`;
        card.appendChild(row);
      });
      g.appendChild(card);
      wrap.appendChild(g);
    });

    wrap.querySelectorAll(".del").forEach((b) =>
      b.addEventListener("click", () => {
        const id = Number(b.dataset.id);
        entries = entries.filter((e) => e.id !== id);
        save(entries);
        renderHistory();
        renderBag();
        renderAnalytics();
        toast("Entry deleted");
      })
    );
  }

  // ---- ANALYTICS view ----
  function renderAnalytics() {
    const clubId = $("#anClub").value;
    const c = clubById[clubId];
    if (!c) return;
    const list = entriesFor(clubId);
    const svg = $("#chart");
    const W = 320, H = 200, pad = 24;

    // build stat grid
    const grid = $("#statGrid");
    if (!list.length) {
      svg.innerHTML = `<text x="160" y="100" fill="#9fc0b1" font-size="12" text-anchor="middle">No data for ${c.name} yet</text>`;
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
      <div class="stat"><div class="k">Gap to pro</div><div class="v" style="color:var(--pro)">${gap > 0 ? gap + " " + UNIT : "Reached! 🎉"}</div></div>`;

    // chart scaling — include pro line in range
    const maxV = Math.max(best, c.pro) * 1.05;
    const minV = Math.min(...dists, 0) * 0.9;
    const range = maxV - minV || 1;
    const x = (i) => list.length === 1 ? W / 2 : pad + (i / (list.length - 1)) * (W - pad * 2);
    const y = (v) => H - pad - ((v - minV) / range) * (H - pad * 2);

    const proY = y(c.pro);
    const stdY = y(c.standard);
    const points = list.map((e, i) => `${x(i)},${y(e.dist)}`).join(" ");
    const dots = list.map((e, i) =>
      `<circle cx="${x(i)}" cy="${y(e.dist)}" r="3.5" fill="#35d07f"/>`).join("");
    const area = `${pad},${H - pad} ${points} ${W - pad},${H - pad}`;

    svg.innerHTML = `
      <defs>
        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#35d07f" stop-opacity="0.28"/>
          <stop offset="1" stop-color="#35d07f" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <line x1="${pad}" y1="${stdY}" x2="${W - pad}" y2="${stdY}" stroke="#6ab7ff" stroke-width="1.5" stroke-dasharray="3 3"/>
      <text x="${W - pad}" y="${stdY - 5}" fill="#6ab7ff" font-size="10" text-anchor="end">Standard ${c.standard}</text>
      <line x1="${pad}" y1="${proY}" x2="${W - pad}" y2="${proY}" stroke="#f2c14e" stroke-width="1.5" stroke-dasharray="5 4"/>
      <text x="${W - pad}" y="${proY - 5}" fill="#f2c14e" font-size="10" text-anchor="end">Pro ${c.pro}</text>
      ${list.length > 1 ? `<polygon points="${area}" fill="url(#fill)"/>` : ""}
      ${list.length > 1 ? `<polyline points="${points}" fill="none" stroke="#35d07f" stroke-width="2.5" stroke-linejoin="round"/>` : ""}
      ${dots}`;
  }

  // ---- navigation ----
  function switchView(view) {
    ["log", "history", "analytics"].forEach((v) => {
      $("#view-" + v).classList.toggle("hidden", v !== view);
    });
    document.querySelectorAll("nav button").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === view));
    if (view === "history") renderHistory();
    if (view === "analytics") renderAnalytics();
  }

  // ---- init ----
  function init() {
    fillClubSelect($("#club"), false);
    fillClubSelect($("#histClub"), true);
    fillClubSelect($("#anClub"), false);
    $("#date").value = todayStr();
    if (window.GOLF_SET) $("#setName").textContent = "Set: " + window.GOLF_SET + " · Standard & Pro targets";

    $("#club").addEventListener("change", renderProHint);
    $("#saveBtn").addEventListener("click", saveEntry);
    $("#histClub").addEventListener("change", renderHistory);
    $("#anClub").addEventListener("change", renderAnalytics);
    document.querySelectorAll("nav button").forEach((b) =>
      b.addEventListener("click", () => switchView(b.dataset.view)));

    renderProHint();
    renderBag();
  }

  init();
})();
