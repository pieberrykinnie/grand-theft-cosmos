// The Scanner: live TV coverage of a heist that only hears loud acts. Canvas 2D map + DOM chrome, no Three.js.
import { renderSVG } from "uqr";
import { PROTOCOL_VERSION } from "../shared/protocol";
import { COLORS, GLYPHS, type End, type Pub } from "../shared/sim";
import { SECTORS, T } from "../shared/tuning";
import { connect, crawl, downBanner, el, ranks, resultCopy, rulesCard } from "./net";
import themeUrl from "../../assets/audio/main_theme.mp3?url"; // MP3, not WAV: Cloudflare caps each asset at 25 MiB

const FONT = `"Barlow Condensed", "Arial Narrow", sans-serif`;
const X_SVG = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" stroke-width="2.5"/></svg>`;
const PIN = new Path2D("M0 0C-4-8-14-12-14-24a14 14 0 1 1 28 0C14-12 4-8 0 0z");
const CROWN = new Path2D("M-13 7h26l3-17-9 7-7-11-7 11-9-7z");
/** Headline per ping kind. The owner of hit/death pings is the victim. */
const ACT: Record<string, string> = {
  fire: "Shots fired", hit: "Ship under fire", death: "Ship down", boost: "Dash spotted",
  bank: "Loot banked", build: "Station going up", vault: "Vault under attack", capture: "Territory taken",
};
const LEGEND = [
  ["Loot field", `<circle cx="11" cy="11" r="9" fill="rgba(127,255,212,.3)" stroke="rgba(127,255,212,.6)"/>`],
  ["Ring", `<circle cx="11" cy="11" r="8" fill="none" stroke="#f4f4f0" stroke-width="2" stroke-dasharray="4 3"/>`],
  ["HQ / station", `<rect x="3" y="3" width="16" height="16" fill="#f4f4f0"/>`],
  ["Loud act", `<path d="M11 21C9 17 4 14 4 9a7 7 0 1 1 14 0c0 5-5 8-7 12z" fill="#f4f4f0"/>`],
] as const;

const CSS = `
.scan { display: grid; grid-template-columns: minmax(0, 1fr) minmax(400px, 30vw); grid-template-rows: minmax(0, 1fr) auto; height: 100vh; }
.scan .mapc { position: relative; overflow: hidden; }
.scan canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.bug { position: absolute; left: 28px; top: 24px; display: flex; font: 800 30px/1 var(--font); text-transform: uppercase; }
.bug b { background: var(--red); color: #fff; padding: 9px 14px; }
.bug span { background: var(--slab); color: var(--ink); padding: 9px 14px; }
.strap { position: absolute; left: 28px; top: 76px; max-width: 34%; font-size: 22px; color: var(--mute); text-wrap: pretty; }
.strap b { display: block; color: var(--slab); font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
.legend { position: absolute; right: 24px; top: 24px; display: grid; gap: 8px; font: 800 18px/1 var(--font); text-transform: uppercase; color: var(--mute); }
.legend div { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.legend svg { width: 22px; height: 22px; }
.l3 { position: absolute; left: 28px; bottom: 24px; max-width: calc(100% - 56px); }
.l3 .tag { display: inline-block; background: var(--red); color: #fff; font: 800 26px/1 var(--font); text-transform: uppercase; padding: 8px 14px; }
.l3 .head { display: flex; align-items: center; gap: 14px; padding: 10px 22px 10px 12px; }
.l3 .head b { font: 800 50px/1.05 var(--font); text-transform: uppercase; }
.l3 .head .chip { width: 54px; height: 54px; font-size: 36px; }
.l3 .sub { display: inline-block; background: #000; color: var(--slab); font-size: 22px; padding: 8px 16px; text-transform: uppercase; letter-spacing: .04em; }
.l3.go { animation: wipe .45s cubic-bezier(.16, 1, .3, 1); }
@keyframes wipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0); } }
.hush { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(21, 21, 21, .72); }
.hush > div { padding: 24px 44px; text-align: center; }
.hush h2 { font-size: 80px; } .hush p { margin: 6px 0 0; font-size: 26px; color: var(--mute-ink); }
.side { display: flex; flex-direction: column; gap: 16px; padding: 24px 24px 24px 0; min-height: 0; }
.side > * { flex: none; }
.race { padding: 16px 18px 12px; flex: 0 1 auto; min-height: 0; overflow: hidden; }
.race h2 { display: grid; grid-template-columns: 40px minmax(0, 1fr) 76px 32px; gap: 10px; align-items: end; font-size: 38px; margin-bottom: 10px; }
.race h2 span { grid-column: 1 / 3; grid-row: 1; }
.race h2 small { grid-column: 2; grid-row: 1; justify-self: end; margin-right: -2px; font-size: 20px; color: var(--red); letter-spacing: .04em; }
.rrow { display: grid; grid-template-columns: 40px minmax(0, 1fr) 76px 32px; align-items: center; gap: 10px; height: 48px; }
.rrow .chip { width: 40px; height: 40px; font-size: 26px; }
.rbar { position: relative; height: 40px; background: #dcdcd6; overflow: hidden; }
.rbar::after { content: ""; position: absolute; right: 0; top: 0; bottom: 0; width: 4px; background: var(--red); }
.rbar i { position: absolute; inset: 0 auto 0 0; box-shadow: inset -3px 0 0 rgba(21, 21, 21, .35); }
.rbar em { position: absolute; left: 10px; top: 0; bottom: 0; display: flex; align-items: center; gap: 10px; font: 800 26px/1 var(--font); font-style: normal; text-transform: uppercase; white-space: nowrap; }
.rbar small { font-size: 18px; color: var(--mute-ink); letter-spacing: .06em; }
.rrow > b { font: 800 36px/1 var(--font); text-align: right; font-variant-numeric: tabular-nums; }
button.kick, .slab button.kick { min-height: 32px; min-width: 32px; padding: 0; border: 0; background: none; color: var(--mute-ink); display: grid; place-items: center; }
.kick svg { width: 14px; height: 14px; }
button.kick:hover, .slab button.kick:hover { background: var(--ink); color: var(--slab); }
button.kick.armed, .slab button.kick.armed { background: var(--red); color: #fff; font-size: 16px; min-width: 56px; }
/* 9–12 players: tighter rows, a one-line Most Wanted, a smaller join tile, so nobody drops off the board. */
.dense .race h2 { font-size: 30px; margin-bottom: 6px; }
.side.dense { gap: 12px; } .dense .rrow { height: 29px; } .dense .rrow .chip { width: 25px; height: 25px; font-size: 18px; }
.dense .rbar { height: 25px; } .dense .rbar em { font-size: 20px; } .dense .rrow > b { font-size: 25px; }
.dense .wanted { display: flex; align-items: center; gap: 14px; padding: 10px 14px; }
.dense .wanted h3 { flex: none; margin: 0; font-size: 20px; }
.dense .wanted .wb { min-height: 40px; } .dense .wanted .chip { width: 40px; height: 40px; font-size: 26px; } .dense .wanted b { font-size: 26px; }
.dense .joint { grid-template-columns: 104px 1fr; } .dense .joint .qr svg { width: 104px; height: 104px; } .dense .joint .code { font-size: 44px; margin-bottom: 6px; }
.wanted { padding: 14px 18px; }
.wanted h3 { font-size: 24px; margin-bottom: 10px; }
.wanted .wb { display: flex; align-items: center; gap: 14px; min-height: 56px; }
.wanted .chip { width: 56px; height: 56px; font-size: 36px; }
.wanted b { display: block; font: 800 34px/1 var(--font); text-transform: uppercase; }
.wanted .s { color: var(--mute-ink); font-size: 21px; }
.joint { display: grid; grid-template-columns: 136px 1fr; gap: 16px; align-items: center; padding: 14px; margin-top: auto; }
.joint .qr svg { width: 136px; height: 136px; display: block; }
.joint h3 { font-size: 24px; }
.joint .code { font: 800 54px/1 var(--font); letter-spacing: .08em; margin: 2px 0 10px; }
.joint .ctl { display: flex; gap: 8px; }
.joint button { min-height: 48px; font-size: 20px; padding: 0 16px; }
.slab button { background: var(--ink); border-color: var(--ink); color: var(--slab); }
.slab button:hover { background: #000; border-color: #000; }
.slab button.alt { background: transparent; color: var(--ink); }
.slab button.alt:hover { background: var(--ink); color: var(--slab); }
.scan .crawl { grid-column: 1 / -1; }
.preshow, .result { background: var(--studio); overflow-y: auto; }
.preshow .g { display: grid; grid-template-columns: auto minmax(380px, 620px); gap: 56px; align-items: center; text-align: left; }
.preshow .qrb { padding: 22px 22px 18px; }
.preshow .qrb h2 { font-size: 34px; margin-bottom: 14px; }
.preshow .qrb svg { width: min(48vh, 440px); height: auto; display: block; }
.preshow .code { font: 800 96px/1 var(--font); letter-spacing: .1em; margin-top: 14px; }
.preshow .url { color: var(--mute-ink); font-size: 20px; overflow-wrap: anywhere; }
.preshow h1 { font-size: clamp(52px, 5vw, 76px); white-space: nowrap; }
.preshow .sec { font-size: 24px; color: var(--mute); margin: 12px 0 18px; } .preshow .sec b { color: var(--slab); }
.preshow h3 { font-size: 26px; margin: 22px 0 10px; }
.preshow .field { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px 18px; }
.preshow .prow { display: flex; align-items: center; gap: 12px; min-width: 0; font: 800 28px/1 var(--font); text-transform: uppercase; }
.preshow .prow .n { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preshow .prow .kick { color: var(--mute); }
.preshow .empty { grid-column: 1 / -1; color: var(--mute); font-size: 24px; }
.preshow .start { width: 100%; min-height: 76px; margin-top: 22px; font-size: 30px; }
.preshow .late { color: var(--mute); font-size: 20px; margin: 10px 0 0; }
.result { overflow: auto; }
.result .who { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 12px 20px; max-width: 1100px; }
.result .who .chip { width: 88px; height: 88px; font-size: 60px; } .result .who.many .chip { width: 52px; height: 52px; font-size: 34px; }
.result h1 { font-size: 96px; }
.result .why { font-size: 26px; color: var(--mute); margin: 0 0 10px; }
.result .tbl { padding: 6px 10px 10px; }
.result table { border-collapse: collapse; font-size: 26px; min-width: 760px; }
.result th { font: 800 18px/1 var(--font); letter-spacing: .1em; text-transform: uppercase; color: var(--mute-ink); padding: 14px 18px 8px; text-align: right; }
.result td { padding: 8px 18px; border-top: 2px solid var(--rule); text-align: right; font-weight: 800; font-variant-numeric: tabular-nums; }
.result td:nth-child(2), .result th:nth-child(2) { text-align: left; text-transform: uppercase; }
.result td .chip { width: 32px; height: 32px; font-size: 22px; margin-right: 12px; vertical-align: middle; }
.result .fin { display: flex; gap: 16px; align-items: center; }
`;

export function start(app: HTMLElement, code: string) {
  document.head.append(el("style", { textContent: CSS }));
  const tok = localStorage.getItem(`gtc:host:${code}`);
  if (!tok) {
    app.append(el("div", { className: "full" }, el("h1", { textContent: code, style: { fontSize: "96px", letterSpacing: ".1em" } }),
      el("p", { textContent: "This browser isn't the host of this room.", style: { fontSize: "26px" } }),
      el("button", { textContent: "Join as a player", onclick: () => (location.href = `/j/${code}`) })));
    return;
  }
  const url = `${location.origin}/j/${code}`;
  const qr = () => renderSVG(url, { whiteColor: "#f4f4f0", blackColor: "#151515", pixelSize: 8, border: 2 });
  const chip = (c: number, out = false) => el("span", { className: `chip${out ? " out" : ""}`, textContent: GLYPHS[c], style: { background: COLORS[c], color: out ? COLORS[c] : "" } });

  // ---- Play layout ----
  const canvas = el("canvas", { ariaHidden: "true" });
  const bugSec = el("span"), strap = el("div", { className: "strap" });
  const l3Chip = el("span", { className: "chip" }), l3Head = el("b"), l3Sub = el("div", { className: "sub" });
  const l3 = el("div", { className: "l3 hidden", role: "status" }, el("span", { className: "tag", textContent: "Breaking" }), el("div", { className: "head slab" }, l3Chip, l3Head), l3Sub);
  const hush = el("div", { className: "hush hidden" }, el("div", { className: "slab" }, el("h2", { textContent: "Paused" }), el("p", { textContent: "Press Space to resume" })));
  const legend = el("div", { className: "legend", ariaHidden: "true" });
  legend.innerHTML = LEGEND.map(([t, svg]) => `<div>${t}<svg viewBox="0 0 22 22">${svg}</svg></div>`).join("");
  const mapc = el("div", { className: "mapc" }, canvas, el("div", { className: "bug" }, el("b", { textContent: "Live" }), bugSec), strap, legend, l3, hush);
  const raceH = el("h2"), rows = el("div"), race = el("section", { className: "race slab" }, raceH, rows);
  const wanted = el("section", { className: "wanted slab" });
  const pauseBtn = el("button", { className: "alt", textContent: "Pause" }), endBtn = el("button", { textContent: "End" });
  const joint = el("section", { className: "joint slab" }, el("div", { className: "qr", innerHTML: qr() }),
    el("div", {}, el("h3", { textContent: "Join the chase" }), el("div", { className: "code", textContent: code }), el("div", { className: "ctl" }, pauseBtn, endBtn)));
  const news = crawl("Latest"), side = el("aside", { className: "side" }, race, wanted, joint);
  app.append(el("div", { className: "scan" }, mapc, side, news.el));

  // ---- Pre-show (lobby) ----
  const field = el("div", { className: "field" }), startBtn = el("button", { className: "start", textContent: "Waiting for players", disabled: true });
  const preSec = el("p", { className: "sec" }), preRules = el("div");
  const lobby = el("div", { className: "full preshow" }, el("div", { className: "g" },
    el("div", { className: "qrb slab" }, el("h2", { textContent: "Scan to join" }), el("div", { innerHTML: qr() }), el("div", { className: "code", textContent: code }), el("div", { className: "url", textContent: url })),
    el("div", {}, el("h1", { textContent: "Grand Theft Cosmos" }), preSec, preRules, el("h3", { textContent: "Players" }), field, startBtn,
      el("p", { className: "late", textContent: "Late joiners welcome: the code stays on screen all game." }))));
  const endScr = el("div", { className: "full result hidden" });
  const down = el("div", { className: "full veil hidden" }, el("h1", { textContent: "Signal lost", style: { fontSize: "72px" } }), el("p", { textContent: "Reconnecting to the room…", style: { fontSize: "26px" } }));
  app.append(lobby, endScr, down);

  let pub: Pub | null = null, pubAt = 0;
  const conn = connect(code, () => ({ t: "hello", v: PROTOCOL_VERSION, role: "host", tok }), onMsg, downBanner(down));
  const host = (a: string, pid?: number) => conn.send({ t: "host", a, pid });
  const theme = new Audio(themeUrl);
  theme.loop = true;
  // play() inside the click satisfies every browser's autoplay rule; sidebar() restarts it after a mid-game reload where allowed.
  startBtn.onclick = () => { theme.play().catch(() => {}); host("start"); };
  pauseBtn.onclick = () => host(pub?.st === "paused" ? "resume" : "pause");
  // Two-step confirm in the page: browsers may suppress native confirm() and return false without asking.
  let armed = "", armedT = 0;
  const confirm2 = (key: string, act: () => void) => {
    clearTimeout(armedT);
    if (armed === key) {
      armed = "";
      act();
    } else {
      armed = key;
      armedT = setTimeout(() => { armed = ""; relabel(); }, 3000);
    }
    relabel();
  };
  const relabel = () => {
    endBtn.textContent = armed === "end" ? "End game?" : "End";
    endBtn.className = armed === "end" ? "danger" : "";
    if (pub) sidebar(pub);
  };
  /** Pointer presses act on pointerdown (rows are rebuilt twice a second, which can eat a click); keyboard still uses click. */
  const tap = (b: HTMLElement, fn: () => void) => {
    b.onpointerdown = (e) => { e.preventDefault(); fn(); };
    b.onclick = (e) => { if (!e.detail) fn(); };
    return b;
  };
  tap(endBtn, () => confirm2("end", () => host("end")));
  addEventListener("keydown", (e) => {
    if (e.code !== "Space" || !pub || (pub.st !== "play" && pub.st !== "paused")) return;
    e.preventDefault();
    host(pub.st === "paused" ? "resume" : "pause");
  });
  const kickBtn = (id: number, name: string) => {
    const on = armed === `kick${id}`;
    const b = el("button", { className: `kick${on ? " armed" : ""}`, title: `Remove ${name}`, ariaLabel: on ? `Confirm removing ${name}` : `Remove ${name}` });
    if (on) b.textContent = "Kick?";
    else b.innerHTML = X_SVG;
    return tap(b, () => confirm2(`kick${id}`, () => host("kick", id)));
  };

  function onMsg(m: any) {
    if (m.t === "pub") [pub, pubAt] = [m, performance.now()], sidebar(m), listen(m);
    else if (m.t === "end") showEnd(m);
    else if (m.t === "err") {
      conn.stop();
      down.replaceChildren(el("h1", { textContent: m.e === "bad_secret" ? "Not the host of this room" : "Room not found", style: { fontSize: "64px" } }),
        el("button", { textContent: "New game", onclick: () => (location.href = "/") }));
      down.classList.remove("hidden");
    } else if (m.t === "reload") location.reload();
  }

  const STATUS = ["", "Offline", "Stasis", "Down"];
  function sidebar(p: Pub) {
    const sec = SECTORS[p.sector];
    bugSec.textContent = sec.name;
    strap.replaceChildren(el("b", { textContent: "Sky cam · loud acts only" }), sec.desc);
    preSec.innerHTML = "";
    preSec.append("Sector rule: ", el("b", { textContent: sec.name }), ` — ${sec.desc}`);
    if (preRules.dataset.t !== String(p.target)) {
      preRules.dataset.t = String(p.target);
      preRules.innerHTML = rulesCard(p.target);
    }
    lobby.classList.toggle("hidden", p.st !== "lobby");
    if (p.st === "play" && theme.paused) theme.play().catch(() => {});
    hush.classList.toggle("hidden", p.st !== "paused");
    pauseBtn.textContent = p.st === "paused" ? "Resume" : "Pause";
    const n = p.players.length;
    startBtn.disabled = !n;
    startBtn.textContent = n ? `Start the game · ${n} player${n === 1 ? "" : "s"}` : "Waiting for players";
    field.replaceChildren(...(n ? p.players.map(([id, name, c]) => el("div", { className: "prow" }, chip(c), el("span", { className: "n", textContent: name }), kickBtn(id, name)))
      : [el("p", { className: "empty", textContent: "Nobody yet. Scan the code with a phone camera to join." })]));
    raceH.replaceChildren(el("span", { textContent: "The race" }), el("small", { textContent: `${p.target.toLocaleString()} to win` }));
    side.classList.toggle("dense", n > 8);
    rows.replaceChildren(...[...p.players].sort((a, b) => b[3] - a[3]).map(([id, name, c, score, , st]) =>
      el("div", { className: "rrow" }, chip(c, st > 0),
        el("div", { className: "rbar" }, el("i", { style: { width: `${Math.min(100, (100 * score) / p.target)}%`, background: st ? "transparent" : COLORS[c] } }),
          el("em", {}, name, ...(st ? [el("small", { textContent: STATUS[st] })] : []))),
        el("b", { textContent: score.toLocaleString() }), kickBtn(id, name))));
    // Most Wanted: the sole leader by banked score (the map marks them while they're alive).
    const top = [...p.players].sort((a, b) => b[3] - a[3]);
    const lead = top[0] && top[0][3] > 0 && (!top[1] || top[0][3] > top[1][3]) ? top[0] : null;
    wanted.replaceChildren(el("h3", { textContent: "Most wanted" }), el("div", { className: "wb" }, ...(lead
      ? [chip(lead[2], lead[5] > 0), el("div", {}, el("b", { textContent: lead[1] }), el("span", { className: "s", textContent: `${lead[3].toLocaleString()} banked · ${lead[5] === 3 ? "down, respawning" : p.leader ? "marked on the map" : STATUS[lead[5]].toLowerCase() || "leads the race"}` }))]
      : [el("span", { className: "s", textContent: "Nobody yet. The sole leader gets marked on the map." })])));
    news.set([...p.ticker].reverse());
  }

  // ---- BREAKING: one headline per new ping, held at least 2.5 s, collapsing repeats; retracts when quiet ----
  type Head = { o: number; k: string; x: number; z: number };
  const heard = new Set<string>();
  let primed = false, queue: Head[] = [], shown: Head | null = null, shownAt = 0;
  function listen(p: Pub) {
    if (heard.size > 400) heard.clear();
    for (const [x, z, o, k, age] of p.pings) {
      const key = `${o}:${k}:${Math.round((p.now - age) * 4)}`;
      if (heard.has(key)) continue;
      heard.add(key);
      if (!primed || age > 3) continue; // history from before we connected isn't news
      const h = { o, k, x, z };
      const same = (q: Head | null) => q && q.o === o && q.k === k;
      if (same(shown) && performance.now() - shownAt < 6000) { shown = h; shownAt = performance.now(); continue; }
      if (queue.some(same)) continue;
      queue.push(h);
      if (queue.length > 2) queue.shift();
    }
    primed = true;
  }
  setInterval(() => {
    const now = performance.now();
    if (queue.length && (!shown || now - shownAt > 2500)) {
      shown = queue.shift()!;
      shownAt = now;
      const q = pub?.players.find((r) => r[0] === shown!.o);
      l3Chip.textContent = q ? GLYPHS[q[2]] : "?";
      l3Chip.style.background = q ? COLORS[q[2]] : "#949494";
      l3Head.textContent = pub ? headline(pub, shown) : ACT[shown.k] ?? "Loud act";

      l3.classList.remove("hidden");
      l3.classList.remove("go");
      void l3.offsetWidth;
      l3.classList.add("go");
    } else if (shown && now - shownAt > 7000) {
      shown = null;
      l3.classList.add("hidden");
    }
    if (shown) {
      const secs = Math.round((now - shownAt) / 1000);
      l3Sub.textContent = `Scanner picks up ${l3Chip.textContent} · ${secs < 2 ? "just now" : `${secs} s ago`}`;
    }
  }, 250);

  function headline(p: Pub, h: Head): string {
    const act = ACT[h.k] ?? "Loud act";
    if (h.k === "vault") return act;
    const owner = (id: number) => p.players.find((q) => q[0] === id)?.[1] ?? "someone";
    const near: [number, string][] = [[Math.hypot(h.x, h.z) - T.VAULT_R, "the Vault"]];
    for (const q of p.players) near.push([Math.hypot(q[6] - h.x, q[7] - h.z) - T.HQ_R, `${q[1]}'s HQ`]);
    for (const s of p.stations) near.push([Math.hypot(s[1] - h.x, s[2] - h.z) - 30, `${owner(s[3])}'s station`]);
    for (const f of p.fields) near.push([Math.hypot(f[1] - h.x, f[2] - h.z) - T.FIELD_R, "a loot field"]);
    const [d, name] = near.reduce((a, b) => (b[0] < a[0] ? b : a));
    if (d < 0) return `${act} at ${name}`;
    if (d < 220) return `${act} near ${name}`;
    const dirs = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"]; // screen-down is +z
    return `${act} in the ${dirs[Math.round(Math.atan2(h.z, h.x) / (Math.PI / 4)) & 7]}`;
  }

  function showEnd(e: End) {
    const wins = e.table.filter((r) => e.winner.includes(r[0]));
    const names = wins.map((r) => r[1]), [head, why] = resultCopy(names, e.reason), rk = ranks(e.table.map((r) => r[3]));
    const table = el("table", {}, el("tr", {}, ...["#", "Player", "Banked", "Kills", "Stolen", "Stations"].map((h) => el("th", { textContent: h }))),
      ...e.table.map((r, i) => el("tr", {}, el("td", { textContent: String(rk[i]) }), el("td", {}, chip(r[2]), r[1]),
        ...[r[3], r[4], r[5], r[6]].map((v) => el("td", { textContent: v.toLocaleString() })))));
    endScr.replaceChildren(
      el("div", { className: `who${wins.length > 3 ? " many" : ""}` }, ...wins.map((r) => chip(r[2])), el("h1", { textContent: head })),
      el("p", { className: "why", textContent: why }),
      el("div", { className: "tbl slab" }, table),
      el("button", { textContent: "New game", onclick: () => (location.href = "/") }));
    endScr.classList.remove("hidden");
    lobby.classList.add("hidden");
  }

  // ---- Map canvas, 30 fps ----
  const ctx = canvas.getContext("2d")!;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lastDraw = 0;
  function frame(now: number) {
    requestAnimationFrame(frame);
    if (now - lastDraw < 33) return;
    lastDraw = now;
    const dpr = Math.min(devicePixelRatio, 2), W = canvas.clientWidth, H = canvas.clientHeight;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) [canvas.width, canvas.height] = [W * dpr, H * dpr];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#151515";
    ctx.fillRect(0, 0, W, H);
    if (pub?.R) draw(pub, W, H, (now - pubAt) / 1000);
  }
  requestAnimationFrame(frame);

  function draw(p: Pub, W: number, H: number, since: number) {
    // The bottom band is the BREAKING lower third's: the disc sits above it so nothing hides under the news.
    const band = 175, r =Math.max(120, Math.min(W / 2 - 40, (H - band) / 2 - 20)), s = r / p.R, cx = W / 2, cy = 20 + (H - band) / 2;
    const X = (x: number) => cx + x * s, Y = (z: number) => cy + z * s;
    const who = (id: number) => p.players.find((q) => q[0] === id);
    const col = (id: number) => { const q = who(id); return q ? COLORS[q[2]] : "#949494"; };
    const glyph = (id: number) => { const q = who(id); return q ? GLYPHS[q[2]] : "?"; };
    const circle = (x: number, z: number, rad: number) => { ctx.beginPath(); ctx.arc(X(x), Y(z), rad, 0, Math.PI * 2); };
    const text = (t: string, x: number, y: number, size: number, color: string, weight = 800) => {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t, x, y);
    };
    const tag = (t: string, x: number, y: number, bg: string, fg: string, size = 20) => {
      ctx.font = `800 ${size}px ${FONT}`;
      const w = ctx.measureText(t).width + 14;
      ctx.fillStyle = bg;
      ctx.fillRect(x - w / 2, y - size * 0.7, w, size * 1.4);
      text(t, x, y + 1, size, fg);
    };
    const square = (x: number, y: number, size: number, color: string, letter: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
      text(letter, x, y + 1, size * 0.7, "#151515");
    };
    // Sky-cam plate: flat grey disc, faint grid, range rings, white rim
    circle(0, 0, p.R * s);
    ctx.fillStyle = "#262626";
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = "rgba(244,244,240,0.06)";
    ctx.lineWidth = 1;
    for (let g = -p.R; g <= p.R; g += 200) {
      ctx.beginPath(); ctx.moveTo(X(g), Y(-p.R)); ctx.lineTo(X(g), Y(p.R)); ctx.moveTo(X(-p.R), Y(g)); ctx.lineTo(X(p.R), Y(g)); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(244,244,240,0.12)";
    for (const k of [1 / 3, 2 / 3]) { circle(0, 0, p.R * s * k); ctx.stroke(); }
    circle(0, 0, p.R * s);
    ctx.strokeStyle = "#f4f4f0";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Loot fields: opacity shows what's left
    for (const [, x, z, , fill] of p.fields) {
      circle(x, z, T.FIELD_R * s);
      ctx.fillStyle = `rgba(127,255,212,${0.07 + 0.2 * fill})`;
      ctx.fill();
      ctx.strokeStyle = "rgba(127,255,212,0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // Rings: dashed outline when unclaimed, solid in the owner's colour when held; claim arc; red dashes when contested
    for (const [, x, z, owner, prog, by, contested] of p.rings) {
      circle(x, z, T.RING_R * s);
      ctx.strokeStyle = owner ? col(owner) : "rgba(244,244,240,0.7)";
      ctx.lineWidth = owner ? 6 : 2.5;
      ctx.setLineDash(owner ? [] : [8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (prog > 0 && by) {
        ctx.beginPath();
        ctx.arc(X(x), Y(z), T.RING_R * s + 8, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
        ctx.strokeStyle = col(by);
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      if (contested && (reduceMotion || since % 0.6 < 0.4)) {
        circle(x, z, T.RING_R * s + 15);
        ctx.strokeStyle = "#d7261e";
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (owner) text(glyph(owner), X(x), Y(z) + 1, 26, col(owner));
    }
    // Loud acts (drawn under structures, so name plates and the WANTED reticle stay legible): a pin in the actor's colour with a ripple that fades over 8 s; deaths leave a wreck X for 12 s
    for (const [x, z, o, k, age0] of p.pings) {
      const age = age0 + since;
      if (k === "death") {
        ctx.globalAlpha = Math.max(0, 1 - age / T.WRECK_S);
        ctx.strokeStyle = col(o);
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(X(x) - 11, Y(z) - 11); ctx.lineTo(X(x) + 11, Y(z) + 11); ctx.moveTo(X(x) + 11, Y(z) - 11); ctx.lineTo(X(x) - 11, Y(z) + 11); ctx.stroke();
      } else {
        const a = Math.max(0, 1 - age / T.PING_FADE);
        ctx.globalAlpha = a;
        if (!reduceMotion) { circle(x, z, 10 + age * 9); ctx.strokeStyle = col(o); ctx.lineWidth = 2; ctx.stroke(); }
        ctx.save();
        ctx.translate(X(x), Y(z));
        ctx.fillStyle = "#f4f4f0";
        ctx.fill(PIN);
        ctx.beginPath();
        ctx.arc(0, -24, 10, 0, Math.PI * 2);
        ctx.fillStyle = col(o);
        ctx.fill();
        ctx.restore();
        text(glyph(o), X(x), Y(z) - 23, 16, "#151515");
      }
      ctx.globalAlpha = 1;
    }
    // Vault: white diamond, HP bar under it; dashed once cracked
    const vr = Math.max(18, T.VAULT_R * s);
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0) - vr); ctx.lineTo(X(0) + vr, Y(0)); ctx.lineTo(X(0), Y(0) + vr); ctx.lineTo(X(0) - vr, Y(0)); ctx.closePath();
    ctx.strokeStyle = "#f4f4f0";
    ctx.lineWidth = 3;
    ctx.setLineDash(p.vault > 0 ? [] : [6, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    tag(p.vault > 0 ? "Vault" : "Vault open", X(0), Y(0) + vr + 18, "#f4f4f0", "#151515", 18);
    if (p.vault > 0) {
      ctx.fillStyle = "#151515";
      ctx.fillRect(X(0) - 30, Y(0) + vr + 34, 60, 6);
      ctx.fillStyle = "#f4f4f0";
      ctx.fillRect(X(0) - 30, Y(0) + vr + 34, (60 * p.vault) / T.VAULT_HP, 6);
    }
    // HQs: the owner's square with its letter, name tag beneath
    for (const [, name, c, , , st, hx, hz] of p.players) {
      const x = X(hx), y = Y(hz);
      if (st) { ctx.strokeStyle = COLORS[c]; ctx.lineWidth = 3; ctx.strokeRect(x - 21, y - 21, 42, 42); text(GLYPHS[c], x, y + 1, 30, COLORS[c]); }
      else square(x, y, 44, COLORS[c], GLYPHS[c]);
      tag(name.toUpperCase(), x, y + 40, "#000", "#f4f4f0", 20);
    }
    // Stations: small owner square + 3 HP pips
    for (const [, x, z, owner, hp] of p.stations) {
      square(X(x), Y(z), 26, col(owner), glyph(owner));
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i <= hp ? "#f4f4f0" : "rgba(244,244,240,0.25)";
        ctx.fillRect(X(x) - 13 + i * 9, Y(z) + 17, 8, 5);
      }
    }
    // The Crown: white when loose, the carrier's colour when held
    if (p.crown) {
      const [x, z, by] = p.crown;
      ctx.save();
      ctx.translate(X(x), Y(z));
      ctx.fillStyle = by ? col(by) : "#f4f4f0";
      ctx.fill(CROWN);
      ctx.strokeStyle = "#151515";
      ctx.lineWidth = 2;
      ctx.stroke(CROWN);
      ctx.restore();
      if (by) tag(`${glyph(by)} has the Crown`.toUpperCase(), X(x), Y(z) - 28, "#000", col(by), 18);
    }
    // Most Wanted: reticle brackets round the leader, matching the sidebar card
    if (p.leader) {
      const [id, x, z] = p.leader, cx2 = X(x), cy2 = Y(z), q = 22, L = 9;
      square(cx2, cy2, 26, col(id), glyph(id));
      ctx.strokeStyle = "#f4f4f0";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        ctx.moveTo(cx2 + sx * q, cy2 + sy * (q - L)); ctx.lineTo(cx2 + sx * q, cy2 + sy * q); ctx.lineTo(cx2 + sx * (q - L), cy2 + sy * q);
      }
      ctx.stroke();
      tag("WANTED", cx2, cy2 + q + 16, "#f4f4f0", "#151515", 18);
    }
  }
}
