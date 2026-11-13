// The Scanner: the public, deliberately incomplete police-scanner view on the laptop. Canvas 2D, no Three.js.
import { renderSVG } from "uqr";
import { PROTOCOL_VERSION } from "../shared/protocol";
import { COLORS, GLYPHS, type End, type Pub } from "../shared/sim";
import { SECTORS, T } from "../shared/tuning";
import { connect, downBanner, el, rulesCard } from "./net";

const CSS = `
.scan { display: grid; grid-template-columns: 1fr minmax(340px, 30vw); height: 100vh; }
.scan canvas { width: 100%; height: 100vh; display: block; }
.scan aside { border-left: 2px solid #12284a; padding: 18px; display: flex; flex-direction: column; gap: 14px; overflow: hidden; font-size: 20px; }
.tgt { font-size: 26px; color: var(--dim); } .tgt b { color: var(--gold); }
.row { display: grid; grid-template-columns: 40px 1fr auto auto; align-items: center; gap: 8px; margin: 6px 0; }
.chip { width: 36px; height: 36px; border-radius: 8px; display: grid; place-items: center; font-weight: bold; color: #060b1a; }
.bar { height: 6px; background: #12284a; border-radius: 3px; grid-column: 2 / 4; } .bar i { display: block; height: 100%; border-radius: 3px; }
.kick { min-height: 28px; min-width: 28px; padding: 0; background: none; color: var(--dim); font-size: 20px; }
.rule { color: var(--cyan); } .tick { color: var(--dim); font-size: 17px; flex: 1; overflow: hidden; } .tick div:last-child { color: var(--fg); }
.foot { display: flex; gap: 14px; align-items: center; } .foot .qr svg { width: 120px; height: 120px; display: block; }
.code { font-size: 34px; color: var(--gold); letter-spacing: .15em; }
.lobby .grid { display: grid; grid-template-columns: auto minmax(320px, 560px); gap: 40px; align-items: center; text-align: left; }
.lobby .qr svg { width: min(46vh, 420px); height: auto; display: block; border-radius: 12px; }
.lobby .rules { font-size: 24px; } .lobby .big { font-size: 64px; color: var(--gold); letter-spacing: .2em; }
.endscr table { font-size: 24px; border-collapse: collapse; } .endscr td, .endscr th { padding: 6px 16px; text-align: right; } .endscr td:nth-child(2) { text-align: left; }
`;

export function start(app: HTMLElement, code: string) {
  const tok = localStorage.getItem(`gtc:host:${code}`);
  if (!tok) {
    app.append(el("div", { className: "full" }, el("h1", { textContent: code }), el("p", { textContent: "This browser isn't the host of this room." }), el("a", { href: `/j/${code}`, textContent: "Join as a player →", style: { color: "var(--cyan)" } })));
    return;
  }
  document.head.append(el("style", { textContent: CSS }));
  const url = `${location.origin}/j/${code}`;
  const qr = () => renderSVG(url, { whiteColor: "#d8f3ff", blackColor: "#060b1a", pixelSize: 8 });

  const canvas = el("canvas");
  const race = el("div"), rule = el("div", { className: "rule" }), tick = el("div", { className: "tick" });
  const pauseBtn = el("button", { className: "alt", textContent: "Pause" }), endBtn = el("button", { className: "alt", textContent: "End" });
  const smallQr = el("div", { className: "qr", innerHTML: qr() });
  const aside = el("aside", {}, el("div", { className: "tgt", innerHTML: "FIRST TO <b>…</b>" }), race, rule, tick,
    el("div", { className: "foot" }, smallQr, el("div", {}, el("div", { className: "code", textContent: code }), el("div", { style: { display: "flex", gap: "8px" } }, pauseBtn, endBtn))));
  const players = el("div"), startBtn = el("button", { textContent: "Start", disabled: true, style: { fontSize: "28px", width: "100%" } });
  const lobbyRules = el("div");
  const lobby = el("div", { className: "full veil lobby" }, el("h1", { textContent: "GRAND THEFT COSMOS" }),
    el("div", { className: "grid" },
      el("div", {}, el("div", { className: "qr", innerHTML: qr() }), el("div", { className: "big", textContent: code }), el("div", { className: "muted", textContent: url })),
      el("div", { style: { display: "grid", gap: "16px" } }, lobbyRules, el("div", { className: "muted", textContent: "Scan to join. Late joiners welcome — the QR stays on screen." }), players, startBtn)));
  // Click-through, so Resume / End / kick stay usable while paused.
  const paused = el("div", { className: "full veil hidden", innerHTML: "<h1>PAUSED</h1><p class=muted>Space to resume</p>", style: { pointerEvents: "none" } });
  const endScr = el("div", { className: "full veil endscr hidden" });
  const down = el("div", { className: "full veil hidden", innerHTML: "<h1>Reconnecting…</h1>" });
  app.append(el("div", { className: "scan" }, canvas, aside), lobby, paused, endScr, down);

  let pub: Pub | null = null, pubAt = 0;
  const conn = connect(code, () => ({ t: "hello", v: PROTOCOL_VERSION, role: "host", tok }), onMsg, downBanner(down));
  const host = (a: string, pid?: number) => conn.send({ t: "host", a, pid });
  startBtn.onclick = () => host("start");
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
    endBtn.textContent = armed === "end" ? "End?" : "End";
    endBtn.className = armed === "end" ? "" : "alt"; // solid when armed
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
  const kickBtn = (id: number) => tap(el("button", { className: "kick", textContent: armed === `kick${id}` ? "Kick?" : "×", title: "Kick" }), () => confirm2(`kick${id}`, () => host("kick", id)));
  const chip = (c: number) => el("div", { className: "chip", textContent: GLYPHS[c], style: { background: COLORS[c] } });

  function onMsg(m: any) {
    if (m.t === "pub") [pub, pubAt] = [m, performance.now()], sidebar(m);
    else if (m.t === "end") showEnd(m);
    else if (m.t === "err") {
      conn.stop();
      down.innerHTML = "";
      down.append(el("h1", { textContent: m.e === "bad_secret" ? "Not the host of this room" : "Room not found" }), el("a", { href: "/", textContent: "New game →", style: { color: "var(--cyan)" } }));
      down.classList.remove("hidden");
    } else if (m.t === "reload") location.reload();
  }

  function sidebar(p: Pub) {
    aside.querySelector(".tgt b")!.textContent = p.target.toLocaleString();
    const sec = SECTORS[p.sector];
    rule.textContent = `Sector: ${sec.name} — ${sec.desc}`;
    lobbyRules.innerHTML = rulesCard(p.target) + `<p class="rule">Sector: ${sec.name} — ${sec.desc}</p>`;
    lobby.classList.toggle("hidden", p.st !== "lobby");
    paused.classList.toggle("hidden", p.st !== "paused");
    pauseBtn.textContent = p.st === "paused" ? "Resume" : "Pause";
    startBtn.disabled = !p.players.length;
    const status = ["", "OFFLINE", "STASIS", "DEAD"];
    race.replaceChildren(...[...p.players].sort((a, b) => b[3] - a[3]).map(([id, name, c, score, level, st]) =>
      el("div", { className: "row" }, chip(c), el("span", { textContent: name }), el("span", { textContent: `${score} · Level ${level} ${status[st]}`, style: { color: st ? "var(--dim)" : "var(--fg)" } }),
        kickBtn(id),
        el("div", { className: "bar" }, el("i", { style: { width: `${Math.min(100, (100 * score) / p.target)}%`, background: COLORS[c] } })))));
    players.replaceChildren(...p.players.map(([id, name, c]) => el("div", { className: "row" }, chip(c), el("span", { textContent: name }), el("span"), kickBtn(id))));
    tick.replaceChildren(...p.ticker.map((s) => el("div", { textContent: s })));
  }

  function showEnd(e: End) {
    const names = e.table.filter((r) => e.winner.includes(r[0])).map((r) => r[1]);
    const table = el("table", {}, el("tr", {}, ...["#", "Player", "Banked", "Kills", "Stolen", "Stations"].map((h) => el("th", { textContent: h }))),
      ...e.table.map((r, i) => el("tr", { style: { color: COLORS[r[2]] } }, ...[i + 1, `${GLYPHS[r[2]]} ${r[1]}`, r[3], r[4], r[5], r[6]].map((v) => el("td", { textContent: String(v) })))));
    endScr.replaceChildren(el("h1", { textContent: `${names.join(" & ") || "Nobody"} WIN${names.length === 1 ? "S" : ""}!` }),
      el("p", { className: "muted", textContent: e.reason === "target" ? "Reached the target" : "Host ended the game — the leader wins" }), table,
      el("button", { textContent: "New game", onclick: () => (location.href = "/") }));
    endScr.classList.remove("hidden");
    lobby.classList.add("hidden");
  }

  // ---- Map canvas, 30 fps ----
  const ctx = canvas.getContext("2d")!;
  let lastDraw = 0;
  function frame(now: number) {
    requestAnimationFrame(frame);
    if (now - lastDraw < 33) return;
    lastDraw = now;
    const dpr = Math.min(devicePixelRatio, 2), W = canvas.clientWidth, H = canvas.clientHeight;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) [canvas.width, canvas.height] = [W * dpr, H * dpr];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#060b1a";
    ctx.fillRect(0, 0, W, H);
    if (pub?.R) draw(pub, W, H, (now - pubAt) / 1000);
  }
  requestAnimationFrame(frame);

  function draw(p: Pub, W: number, H: number, since: number) {
    const s = (Math.min(W, H) / 2 - 30) / p.R, cx = W / 2, cy = H / 2;
    const X = (x: number) => cx + x * s, Y = (z: number) => cy + z * s;
    const col = (id: number) => { const q = p.players.find((q) => q[0] === id); return q ? COLORS[q[2]] : "#456"; };
    const glyph = (id: number) => { const q = p.players.find((q) => q[0] === id); return q ? GLYPHS[q[2]] : "?"; };
    const circle = (x: number, z: number, r: number) => { ctx.beginPath(); ctx.arc(X(x), Y(z), r, 0, Math.PI * 2); };
    const text = (t: string, x: number, y: number, size: number, color: string) => {
      ctx.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t, x, y);
    };
    // Grid and rim
    ctx.save();
    circle(0, 0, p.R * s);
    ctx.clip();
    ctx.strokeStyle = "rgba(46,230,230,0.08)";
    ctx.lineWidth = 1;
    for (let g = -p.R; g <= p.R; g += 200) {
      ctx.beginPath(); ctx.moveTo(X(g), Y(-p.R)); ctx.lineTo(X(g), Y(p.R)); ctx.moveTo(X(-p.R), Y(g)); ctx.lineTo(X(p.R), Y(g)); ctx.stroke();
    }
    ctx.restore();
    circle(0, 0, p.R * s);
    ctx.strokeStyle = "rgba(46,230,230,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Fields: fill level
    for (const [, x, z, , fill] of p.fields) {
      circle(x, z, T.FIELD_R * s);
      ctx.fillStyle = `rgba(127,255,212,${0.06 + 0.22 * fill})`;
      ctx.fill();
    }
    // Rings: owner, capture progress, contested
    for (const [, x, z, owner, prog, by, contested] of p.rings) {
      circle(x, z, T.RING_R * s);
      ctx.strokeStyle = owner ? col(owner) : "#2a4466";
      ctx.lineWidth = owner ? 5 : 3;
      ctx.setLineDash(contested && since % 0.5 < 0.25 ? [6, 6] : []);
      ctx.stroke();
      ctx.setLineDash([]);
      if (prog > 0 && by) {
        ctx.beginPath();
        ctx.arc(X(x), Y(z), T.RING_R * s + 7, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
        ctx.strokeStyle = col(by);
        ctx.lineWidth = 5;
        ctx.stroke();
      }
      if (owner) text(glyph(owner), X(x), Y(z), 18, col(owner));
    }
    // HQs
    for (const [id, name, c, , , , hx, hz] of p.players) {
      circle(hx, hz, T.HQ_R * s);
      ctx.fillStyle = COLORS[c] + "22";
      ctx.fill();
      ctx.strokeStyle = COLORS[c];
      ctx.lineWidth = 2;
      ctx.stroke();
      text(GLYPHS[c], X(hx), Y(hz), 26, COLORS[c]);
      text(name, X(hx), Y(hz) + 24, 14, COLORS[c]);
    }
    // Stations: owner + HP in 3 levels
    for (const [, x, z, owner, hp] of p.stations) {
      ctx.fillStyle = col(owner);
      ctx.fillRect(X(x) - 11, Y(z) - 11, 22, 22);
      text(glyph(owner), X(x), Y(z) + 1, 15, "#060b1a");
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i <= hp ? col(owner) : "#2a4466";
        ctx.fillRect(X(x) - 11 + i * 8, Y(z) + 15, 6, 4);
      }
    }
    // Vault
    circle(0, 0, T.VAULT_R * s);
    ctx.strokeStyle = "#5a4a10";
    ctx.lineWidth = 6;
    ctx.stroke();
    if (p.vault > 0) {
      ctx.beginPath();
      ctx.arc(X(0), Y(0), T.VAULT_R * s, -Math.PI / 2, -Math.PI / 2 + (p.vault / T.VAULT_HP) * Math.PI * 2);
      ctx.strokeStyle = "#ffd23f";
      ctx.stroke();
      text("VAULT", X(0), Y(0), 13, "#ffd23f");
    } else text("OPEN", X(0), Y(0), 13, "#ffd23f");
    // Pings: fade over 8 s; deaths leave a wreck marker for 12 s
    const black = p.sector === "blackout";
    for (const [x, z, o, k, age0] of p.pings) {
      const age = age0 + since;
      if (k === "death") {
        const a = Math.max(0, 1 - age / T.WRECK_S);
        ctx.globalAlpha = a;
        ctx.strokeStyle = col(o);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(X(x) - 9, Y(z) - 9); ctx.lineTo(X(x) + 9, Y(z) + 9); ctx.moveTo(X(x) + 9, Y(z) - 9); ctx.lineTo(X(x) - 9, Y(z) + 9); ctx.stroke();
      } else {
        const a = Math.max(0, 1 - age / T.PING_FADE);
        ctx.globalAlpha = a;
        circle(x, z, 6 + age * 7);
        ctx.strokeStyle = col(o);
        ctx.lineWidth = 2;
        ctx.stroke();
        text(glyph(o), X(x), Y(z), 12, col(o));
      }
      ctx.globalAlpha = 1;
    }
    // Live: the Crown and Most Wanted
    if (p.crown) {
      const [x, z, by] = p.crown;
      text("♛", X(x), Y(z), 28 + Math.sin(since * 6) * 3, "#ffd23f");
      if (by) text(`${glyph(by)} HAS THE CROWN`, X(x), Y(z) - 26, 13, col(by));
    }
    if (p.leader) {
      const [id, x, z] = p.leader;
      circle(x, z, 8);
      ctx.fillStyle = col(id);
      ctx.fill();
      circle(x, z, 14 + Math.sin(since * 4) * 3);
      ctx.strokeStyle = col(id);
      ctx.lineWidth = 2;
      ctx.stroke();
      text(`MOST WANTED ${glyph(id)}`, X(x), Y(z) + 26, 13, col(id));
    }
    if (black) text("BLACKOUT", cx, 22, 16, "#6c88a8");
  }
}
