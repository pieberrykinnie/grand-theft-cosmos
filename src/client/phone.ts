// The phone: third-person Three.js view, HUD, joystick, arrow, hints. A terminal that holds no truth.
import * as THREE from "three";
import { cleanName, F, K, PROTOCOL_VERSION } from "../shared/protocol";
import { COLORS, GLYPHS, type End, type Pub, type Snap } from "../shared/sim";
import { BASE, PERKS, SECTORS, T, type PerkId } from "../shared/tuning";
import * as M from "./models";
import { connect, downBanner, el, ranks, resultCopy, rulesCard, type Conn } from "./net";

const CSS = `
.game { position: fixed; inset: 0; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.game canvas.gl { position: absolute; inset: 0; width: 100%; height: 100%; }
.joyzone { position: absolute; left: 0; top: 0; bottom: 0; width: 50%; }
.joy { position: absolute; width: 130px; height: 130px; margin: -65px 0 0 -65px; border: 3px solid rgba(244,244,240,.6); border-radius: 50%; pointer-events: none; }
.joy i { position: absolute; left: 40px; top: 40px; width: 44px; height: 44px; border-radius: 50%; background: rgba(244,244,240,.85); }
.hud { position: absolute; inset: 0; pointer-events: none; font: 800 16px/1 var(--font); text-transform: uppercase; }
.blk { background: rgba(21,21,21,.9); color: var(--slab); }
.tl { position: absolute; left: max(10px, env(safe-area-inset-left)); top: 8px; width: 220px; padding: 8px 10px 9px; display: grid; gap: 7px; }
.lvrow { display: grid; grid-template-columns: 30px 1fr; gap: 4px 8px; align-items: end; }
.lvrow .chip { grid-row: span 2; width: 30px; height: 30px; font-size: 22px; }
.lvl { color: var(--slab); white-space: nowrap; }
.mrow { display: grid; grid-template-columns: 40px 1fr 50px; align-items: center; gap: 6px; }
.mrow b { font-size: 14px; letter-spacing: .08em; color: var(--mute); }
.mrow .v { font-size: 17px; text-align: right; font-variant-numeric: tabular-nums; }
.trk { position: relative; height: 10px; background: rgba(244,244,240,.18); overflow: hidden; }
.trk i, .trk u { position: absolute; inset: 0 auto 0 0; width: 0; transition: width .3s cubic-bezier(.16,1,.3,1); }
.hull i { background: var(--slab); }
.hull.low i { background: var(--red); } .hull.low b, .hull.low .v { color: #ff6b5e; }
.hold i { background: var(--loot); }
.hold .trk::after, .lvrow .trk::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent calc(100% - 2px), #151515 0) 0 0 / calc(100% / var(--n, 10)) 100%; }
.hold.full b, .hold.full .v { color: var(--loot); }
.lvrow .trk u { z-index: 1; width: 3px; background: var(--slab); transition: left .3s; }
.punch { animation: punch .45s cubic-bezier(.16,1,.3,1); }
@keyframes punch { 0% { transform: scale(1.1); filter: brightness(1.8); } 100% { transform: none; filter: none; } }
/* Top-centre column: centred in the gap between the telemetry block and the radar, never under either. */
.tc { position: absolute; top: 8px; left: calc(max(10px, env(safe-area-inset-left)) + 228px); right: calc(max(10px, env(safe-area-inset-right)) + 148px); display: grid; justify-items: center; gap: 4px; }
.tc > * { max-width: 100%; } .obj .t { min-width: 0; }
.obj { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 4px 14px 4px 8px; font-size: 20px; }
.obj svg { width: 26px; height: 26px; flex: none; fill: currentColor; }
.obj.home { color: var(--gold); } .obj.loot { color: var(--loot); }
.obj .t { color: var(--slab); text-wrap: balance; line-height: 1.05; }
.obj .d { color: var(--mute); font-size: 17px; font-variant-numeric: tabular-nums; }
.obj.hint, .obj.ask { box-shadow: inset 0 0 0 2px var(--slab); }
.obj.hint svg, .obj.hint .d, .obj.ask svg, .obj.ask .d { display: none; }
.tmr { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4px 8px; padding: 5px 10px; font-size: 15px; text-align: center; }
.steps { display: flex; gap: 3px; } .steps i { width: 11px; height: 10px; background: rgba(244,244,240,.22); } .steps i.on { background: var(--slab); }
.radar { position: absolute; right: max(10px, env(safe-area-inset-right)); top: 8px; width: 140px; height: 140px; border-radius: 50%; background: rgba(21,21,21,.9); box-shadow: inset 0 0 0 2px var(--slab); }
.bc { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); max-width: 36%; padding: 6px 12px; font: 600 15px/1.2 var(--font); text-transform: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bc:empty { display: none; }
.btns { position: absolute; right: max(14px, env(safe-area-inset-right)); bottom: 14px; display: grid; grid-template-columns: 76px 112px; grid-template-rows: 76px 76px; gap: 10px; pointer-events: auto; }
.btns button, .btns button:hover { position: relative; border-radius: 50%; padding: 0; min-height: 0; font-size: 18px; color: var(--slab); background: #151515; border: 3px solid var(--slab); }
.btns .fire, .btns .fire:hover { grid-column: 2; grid-row: 1 / 3; align-self: end; width: 112px; height: 112px; background: var(--red); border-color: var(--red); color: #fff; font-size: 26px; }
.btns .boost, .btns .boost:hover { grid-column: 1; grid-row: 2; border: 0; background: repeating-conic-gradient(#151515 0 4deg, transparent 0 36deg), conic-gradient(var(--slab) var(--p, 100%), #4a4a4a 0); }
.btns .boost::before { content: ""; position: absolute; inset: 7px; border-radius: 50%; background: #151515; }
.btns .boost span { position: relative; }
.btns .build, .btns .build:hover { grid-column: 1; grid-row: 1; background: rgba(21,21,21,.4); border-color: var(--mute); color: var(--mute); }
.btns .build.on, .btns .build.on:hover { background: var(--slab); border-color: var(--slab); color: var(--ink); }
.btns button.down { transform: scale(.94); }
.btns .fire.down { background: var(--red-d); border-color: var(--red-d); }
.btns .boost.down::before { background: #3a3a3a; }
.fxl { position: absolute; inset: 0; overflow: hidden; }
.num { position: absolute; left: 0; top: 0; font-size: 24px; color: #fff; text-shadow: 0 1px 2px #000, 0 2px 8px rgba(0,0,0,.6); opacity: 0; will-change: transform, opacity; }
.num.st { color: var(--rule); } .num.lt { color: var(--loot); font-size: 19px; }
.hm { position: absolute; left: 0; top: 0; display: flex; align-items: center; gap: 5px; padding: 4px 7px 4px 5px; background: rgba(21,21,21,.88); font-size: 15px; white-space: nowrap; will-change: transform; }
.hm svg { width: 18px; height: 18px; fill: currentColor; }
.hm span { color: var(--slab); } .hm small { color: var(--loot); font-size: 15px; }
.dirhit { position: absolute; left: 50%; top: 58%; width: 0; height: 0; opacity: 0; transition: opacity .6s; }
.dirhit i { position: absolute; left: -70px; top: -125px; width: 140px; height: 40px; border-radius: 50%; border-top: 7px solid var(--red); }
.dirhit.on { opacity: 1; transition: none; }
.pop { position: absolute; left: 50%; top: 37%; transform: translateX(-50%); font-size: 44px; color: var(--gold); text-shadow: 0 2px 10px rgba(0,0,0,.7); white-space: nowrap; opacity: 0; }
.pop.go { animation: pop 1.6s cubic-bezier(.16,1,.3,1) forwards; }
@keyframes pop { 0% { opacity: 0; transform: translate(-50%, 12px) scale(.7); } 12% { opacity: 1; transform: translate(-50%, 0) scale(1.1); } 24% { transform: translate(-50%, 0) scale(1); } 75% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -18px); } }
.toast { position: absolute; left: 50%; top: 45%; transform: translateX(-50%); padding: 8px 16px; font-size: 22px; white-space: nowrap; }
.vig { position: absolute; inset: 0; box-shadow: inset 0 0 90px 30px rgba(215,38,30,.7); opacity: 0; transition: opacity .35s; }
.vig.on { opacity: 1; transition: none; }
/* The perk pick hangs under its own strap, over the sky, clear of the ship and the thumbs. */
.perks { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; max-width: 380px; pointer-events: auto; }
.perks button { min-height: 64px; padding: 8px 12px; display: flex; flex-direction: column; justify-content: flex-start; gap: 4px; text-align: left; font: 600 15px/1.15 var(--font); letter-spacing: 0; text-transform: none; }
.perks button b { font: 800 20px/1 var(--font); text-transform: uppercase; }
.perks button:active { background: var(--ink); color: var(--slab); }
.over { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 8px; pointer-events: none; }
.over b { padding: 8px 16px; background: var(--red); color: #fff; font-size: 34px; }
.over b.calm { background: var(--slab); color: var(--ink); }
.over span { padding: 6px 14px; font-size: 24px; }
.msg h1 { font-size: clamp(36px, 10vh, 56px); } .msg p { margin: 0; font-size: 22px; color: var(--mute); max-width: 36ch; }
@media (max-width: 760px) {
  .tl { width: 180px; } .radar { width: 116px; height: 116px; }
  .tc { left: calc(max(10px, env(safe-area-inset-left)) + 188px); right: calc(max(10px, env(safe-area-inset-right)) + 124px); } .obj { font-size: 17px; } .obj svg { width: 22px; height: 22px; }
}
#rotate { display: none; } @media (orientation: portrait) { #rotate.want { display: flex; } }
#rotate svg { width: 96px; height: 96px; }
.joinscr, .waitscr { overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; touch-action: pan-y; justify-content: safe center; }
.joinscr h1 { font-size: clamp(40px, 10vh, 72px); }
.joinscr .room { margin: 0; font-size: 24px; color: var(--mute); } .joinscr .room b { color: var(--slab); letter-spacing: .1em; }
.joinscr form { display: grid; gap: 10px; width: min(380px, 90vw); text-align: left; }
.joinscr .lbl { margin-bottom: 0; }
.waitcard { margin: auto; display: flex; flex-direction: column; gap: clamp(8px, 2.2vh, 14px); width: min(620px, 94vw); text-align: left; }
.you { display: flex; align-items: center; gap: 14px; }
.you .chip { width: clamp(44px, 13vh, 60px); height: clamp(44px, 13vh, 60px); font-size: clamp(30px, 9vh, 42px); }
.you b { display: block; font-size: clamp(24px, 7vh, 36px); text-transform: uppercase; }
.you div > span { color: var(--mute); font-size: clamp(15px, 4.2vh, 20px); }
.waitscr .rules { padding: clamp(10px, 2.6vh, 16px) clamp(14px, 3vw, 20px); }
.waitscr .rules li { font-size: clamp(15px, 4.6vh, 22px); }
.waitscr .rules .ctl { margin-top: clamp(6px, 1.8vh, 12px); padding-top: clamp(6px, 1.8vh, 10px); font-size: clamp(13px, 3.6vh, 17px); }
.waitscr p { margin: 0; font-size: clamp(15px, 4.2vh, 20px); color: var(--mute); } .waitscr p b { color: var(--slab); }
.endscr { justify-content: flex-start; overflow: auto; }
.endscr h1 { font-size: clamp(32px, 10vh, 60px); } .endscr p { margin: 0; }
.endscr .tbl { padding: 4px 8px 8px; }
.endscr table { border-collapse: collapse; font-size: 18px; }
.endscr th { padding: 8px 10px 4px; font: 800 13px/1 var(--font); letter-spacing: .1em; text-transform: uppercase; color: var(--mute-ink); text-align: right; }
.endscr td { padding: 4px 10px; border-top: 2px solid var(--rule); font-weight: 800; text-align: right; font-variant-numeric: tabular-nums; }
.endscr td:nth-child(2), .endscr th:nth-child(2) { text-align: left; text-transform: uppercase; }
.endscr td .chip { width: 22px; height: 22px; margin-right: 8px; font-size: 16px; vertical-align: middle; }
.endscr tr.me td { background: #e2e3dc; }
`;
// Objective arrow (shaft + head, pointing up = straight ahead), the HOME house, and the rotate-your-phone picture.
const ARROW_SVG = `<svg viewBox="-16 -16 32 32" aria-hidden="true"><path d="M0-14 12 0H4.5v13h-9V0H-12z"/></svg>`;
const HOUSE_SVG = `<svg viewBox="-12 -12 24 24" aria-hidden="true"><path d="M0-10 10-1H7v10H-7V-1h-3z"/></svg>`;
const ROTATE_SVG = `<svg viewBox="0 0 96 96" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="4"><rect x="34" y="14" width="28" height="48" rx="4"/><rect x="22" y="56" width="52" height="28" rx="4" stroke-dasharray="6 5"/><path d="M76 30a26 26 0 0 1-6 28m0 0 1-11m-1 11-10-3"/></svg>`;

type Me = Snap["me"];
interface Frame { ms: number; me: Me; ents: Map<number, number[]> }
interface Ev { kind: string; text: string; x?: number; z?: number; n?: number }
const HINTS = {
  full: "Hold full — go home", bank: "Banked! Pick a perk", ring: "Stay inside to claim it",
  fire: "Shooting shows you on the big screen", hull: "Run home — you'll drop your loot", build: "BUILD: plant a station here",
};
const TAU = Math.PI * 2;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const store = {
  get: (k: string) => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } },
  set: (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
/** Restart a CSS one-shot animation. */
const replay = (e: HTMLElement, cls: string) => { e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); };

export function start(app: HTMLElement, code: string) {
  document.head.append(el("style", { textContent: CSS }));
  const key = `gtc:${code}`;
  let id: { pid: number; sec: string; name: string } | null = store.get(key);
  let conn: Conn | null = null;

  // ---------- Screens ----------
  const nameIn = el("input", { id: "pname", value: id?.name ?? store.get("gtc:name") ?? "", maxLength: 12, placeholder: "e.g. Mira", autocomplete: "nickname" as AutoFill, enterKeyHint: "go" });
  const joinForm = el("form", {}, el("label", { className: "lbl", htmlFor: "pname", textContent: "Your name" }), nameIn, el("button", { textContent: "Join the game" }));
  const joinScr = el("div", { className: "full joinscr" }, el("h1", { textContent: "Grand Theft Cosmos" }), el("p", { className: "room" }, "Room ", el("b", { textContent: code })), joinForm);
  const waitScr = el("div", { className: "full veil waitscr hidden" });
  const msgScr = el("div", { className: "full veil msg hidden" });
  const endScr = el("div", { className: "full veil endscr hidden" });
  const down = el("div", { className: "full veil msg hidden" }, el("h1", { textContent: "Signal lost" }), el("p", { textContent: "Reconnecting… if it takes a while, your ship waits safely in stasis." }));
  const rotate = el("div", { className: "full veil msg", id: "rotate", innerHTML: ROTATE_SVG }, el("h1", { textContent: "Turn your phone sideways" }), el("p", { textContent: "The game plays in landscape, both thumbs on the screen." }));
  const paused = el("div", { className: "full veil msg hidden" }, el("h1", { textContent: "Paused" }), el("p", { textContent: "The host will resume the game." }));

  // ---------- Game layer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.domElement.className = "gl";
  const joyZone = el("div", { className: "joyzone" }), joyEl = el("div", { className: "joy hidden" }, el("i"));
  const meter = (cls: string, name: string) => {
    const fill = el("i"), v = el("span", { className: "v" });
    return { row: el("div", { className: `mrow ${cls}` }, el("b", { textContent: name }), el("div", { className: "trk" }, fill), v), fill, v };
  };
  const hullM = meter("hull", "Hull"), holdM = meter("hold", "Hold");
  // Your chip prints exactly as on the Scanner, so a glance from phone to big screen finds you.
  // One 10-step bar is both race and XP: each step is a level (target / LEVELS banked); the white tick is the leader.
  const myChip = el("span", { className: "chip" }), lvl = el("span", { className: "lvl", textContent: "Level 0" }), xpFill = el("i"), raceLead = el("u", { className: "hidden" });
  const lvrow = el("div", { className: "lvrow" }, myChip, lvl, el("div", { className: "trk" }, xpFill, raceLead));
  const obj = el("div", { className: "obj blk hidden", innerHTML: ARROW_SVG }), objT = el("span", { className: "t" }), objD = el("span", { className: "d" });
  obj.append(objT, objD);
  const objSvg = obj.firstElementChild as SVGElement;
  // One status at a time as a 10-step strip: build, ring claim, shield, or the HP of what you're shooting.
  const steps = el("div", { className: "steps" }, ...Array.from({ length: 10 }, () => el("i")));
  const tmrT = el("span"), tmr = el("div", { className: "tmr blk hidden" }, tmrT, steps);
  const radar = el("canvas", { className: "radar", width: 140, height: 140 });
  const ticker = el("div", { className: "bc blk" });
  const fireB = el("button", { className: "fire", textContent: "Fire" }), boostB = el("button", { className: "boost" }, el("span", { textContent: "Boost" })), buildB = el("button", { className: "build hidden", textContent: "Build" });
  const toast = el("div", { className: "toast blk hidden" }), vig = el("div", { className: "vig" });
  const pop = el("div", { className: "pop" }), dirHit = el("div", { className: "dirhit" }, el("i"));
  const homeT = el("span", { textContent: "HOME" }), homeAmt = el("small");
  const homeMk = el("div", { className: "hm hidden", innerHTML: HOUSE_SVG }, homeT, homeAmt);
  const fxl = el("div", { className: "fxl" }, homeMk);
  const perks = el("div", { className: "perks hidden" });
  const over = el("div", { className: "over hidden" });
  const hud = el("div", { className: "hud" }, vig, fxl, dirHit,
    el("div", { className: "tl blk" }, lvrow, hullM.row, holdM.row),
    el("div", { className: "tc" }, obj, tmr, perks),
    radar, ticker, pop, toast, over);
  const game = el("div", { className: "game hidden" }, renderer.domElement, joyZone, joyEl, hud, el("div", { className: "btns" }, buildB, boostB, fireB));
  const lost = el("div", { className: "full veil msg hidden", onclick: () => location.reload() }, el("h1", { textContent: "Tap to resume" }), el("p", { textContent: "The 3D view stopped. Your ship is still in the game." }));
  app.append(game, joinScr, waitScr, endScr, paused, msgScr, down, rotate, lost);
  renderer.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); lost.classList.remove("hidden"); });

  // ---------- State ----------
  let pub: Pub | null = null, me: Me | null = null, frames: Frame[] = [], clockOff = NaN;
  let localH = 0, syncH = true, wasDead = false, playing = false;
  // iOS Safari hands out huge, often negative touch pointerIds, so "no finger" is null, not a number.
  const joy = { id: null as number | null, x: 0, y: 0, ox: 0, oy: 0 };
  let firing = false, lastSend = 0, lastIn = "", boostMax = 1, turnIn = 0, thIn = 0;
  let trauma = 0, fovKick = 0, roll = 0, downBy = "", lastNews = "", newsT = 0;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const seen: string[] = store.get("gtc:hints") ?? [];
  const playerOf = (pid: number) => pub?.players.find((q) => q[0] === pid);
  const colorOf = (pid: number) => { const q = playerOf(pid); return q ? COLORS[q[2]] : "#ffffff"; };
  const glyphOf = (pid: number) => { const q = playerOf(pid); return q ? GLYPHS[q[2]] : "?"; };
  const nameOf = (pid: number) => { const q = playerOf(pid); return q ? `${GLYPHS[q[2]]} ${q[1]}` : ""; };
  const send = (m: object) => conn?.send(m);
  // QA hook (?debug): read-only view of what this phone already knows, for scripted playtests.
  if (new URLSearchParams(location.search).has("debug")) Object.assign(window, { __gtc: { get me() { return me; }, get pub() { return pub; }, get h() { return localH; }, get ents() { return [...(frames.at(-1)?.ents.values() ?? [])]; }, get info() { return { ...renderer.info.render, ...renderer.info.memory, programs: renderer.info.programs?.length }; } } });

  /** First-time hints take over the instruction banner for 4 s, so there is still only one sentence on screen. */
  let hintUntil = 0;
  function showHint(k: keyof typeof HINTS) {
    if (seen.includes(k)) return;
    seen.push(k);
    store.set("gtc:hints", seen);
    objT.textContent = HINTS[k];
    obj.classList.add("hint");
    obj.classList.remove("hidden");
    hintUntil = performance.now() + 4000;
  }
  let toastT = 0;
  function say(text: string) {
    toast.textContent = text;
    toast.classList.remove("hidden");
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.add("hidden"), 1800);
  }
  function popup(e: HTMLElement, text: string) {
    e.textContent = text;
    replay(e, "go");
  }
  function message(title: string, body = "", action?: [string, () => void]) {
    msgScr.replaceChildren(el("h1", { textContent: title }), el("p", { textContent: body }), ...(action ? [el("button", { textContent: action[0], onclick: action[1] })] : []));
    msgScr.classList.remove("hidden");
  }

  // ---------- Join & network ----------
  const hello = () => (id ? { t: "hello", v: PROTOCOL_VERSION, role: "player", name: id.name, pid: id.pid, sec: id.sec } : { t: "hello", v: PROTOCOL_VERSION, role: "player", name: cleanName(nameIn.value) });
  function join() {
    const name = cleanName(nameIn.value);
    if (!id && !name) return nameIn.focus();
    store.set("gtc:name", name || id?.name);
    joinScr.classList.add("hidden");
    rotate.classList.add("want");
    if (!conn) conn = connect(code, hello, onMsg, onUp);
  }
  joinForm.onsubmit = (e) => { e.preventDefault(); join(); };
  if (id) join(); // reloading the page is always safe

  const banner = downBanner(down);
  function onUp(up: boolean, closeCode?: number) {
    banner(up);
    if (closeCode === 4001) {
      conn?.stop();
      message("Playing in another tab", "This tab was replaced by a newer one.", ["Play here", () => { msgScr.classList.add("hidden"); conn?.restart(); }]);
    }
  }

  function onMsg(m: any) {
    switch (m.t) {
      case "welcome":
        if (m.sec) store.set(key, (id = { pid: m.pid, sec: m.sec, name: cleanName(nameIn.value) || id?.name || "?" }));
        frames = [];
        clockOff = NaN;
        syncH = true;
        return;
      case "pub":
        return onPub(m);
      case "s":
        return onSnap(m);
      case "ev":
        return onEv(m);
      case "end":
        return showEnd(m);
      case "reload":
        return location.reload();
      case "err":
        if (m.e === "bad_secret") {
          // Stale identity (room was recreated): forget it and join fresh on the next reconnect.
          localStorage.removeItem(key);
          id = null;
          return;
        }
        conn?.stop();
        return message(m.e === "kicked" ? "You were removed by the host" : m.e === "room_full" ? "Room is full" : `No game with code ${code}`, "", ["Home", () => (location.href = "/")]);
    }
  }

  // ---------- Scene ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#060b1a");
  scene.fog = new THREE.Fog("#08102a", 420, 1250);
  const camera = new THREE.PerspectiveCamera(62, 1, 1, 4000);
  scene.add(new THREE.HemisphereLight("#9fb6ff", "#1a1030", 1.3));
  const sun = new THREE.DirectionalLight("#ffffff", 1.7);
  sun.position.set(0.4, 1, 0.3);
  const rimLight = new THREE.DirectionalLight("#2ee6e6", 0.9); // cool back light lifts hull edges off the void
  rimLight.position.set(-0.5, 0.25, -0.8);
  scene.add(sun, rimLight);
  const backdrop = M.backdrop(), dust = M.dust();
  const lootMesh = M.loot(800), lootHalo = M.halos(800, M.LOOT_C, 30), bolts = M.bolts(500), vault = M.vault(), crown = M.crown(), arrow3 = M.arrow();
  scene.add(backdrop, dust.obj, lootMesh, lootHalo, bolts.sleeve, bolts.core, vault, crown, arrow3.obj);
  const fx = M.effects(scene);
  const vaultA = vault.getObjectByName("a")!, vaultB = vault.getObjectByName("b")!, vaultCage = vault.getObjectByName("cage")!, vaultOrbit = vault.getObjectByName("orbit")!, vaultCore = vault.getObjectByName("core")!;
  const myShip = M.ship("#ffffff");
  scene.add(myShip.group);
  let world: THREE.Object3D | null = null;
  const hqs = new Map<string, M.Base>(), rings = new Map<string, M.RingModel>(), fields = new Map<string, M.FieldModel>(), stations = new Map<string, M.Base>();
  const ships = new Map<number, M.ShipModel>();

  /** Keyed diff: create what's new, drop (and free) what's gone, and keep positions current. */
  function sync<V extends { obj: THREE.Object3D }>(map: Map<string, V>, items: [string, () => V, number, number][]) {
    const keep = new Set(items.map((i) => i[0]));
    for (const [k, v] of map) if (!keep.has(k)) { scene.remove(v.obj); M.dispose(v.obj); map.delete(k); }
    for (const [k, make, x, z] of items) {
      let v = map.get(k);
      if (!v) map.set(k, (v = make())), scene.add(v.obj);
      v.obj.position.set(x, 0, z); // HQs exist in the lobby before they're placed
    }
  }
  const myHQ = () => { const q = playerOf(id?.pid ?? 0); return q && hqs.get(`${q[0]}:${q[2]}`); };

  function onPub(p: Pub) {
    pub = p;
    if (p.R && !world) scene.add((world = M.world(p.R)));
    const mine = id?.pid ?? 0;
    sync(hqs, p.players.map((q) => [`${q[0]}:${q[2]}`, () => M.hq(COLORS[q[2]], q[0] === mine, `${GLYPHS[q[2]]} ${q[1]}`), q[6], q[7]]));
    sync(rings, p.rings.map((r) => [`${r[0]}:${r[3]}`, () => M.ring(r[3] ? colorOf(r[3]) : null, glyphOf(r[3])), r[1], r[2]]));
    for (const r of p.rings) rings.get(`${r[0]}:${r[3]}`)?.setProg(r[4], r[5] ? colorOf(r[5]) : "#ffffff");
    sync(fields, p.fields.map((f) => [`${f[0]}`, () => M.field(f[0]), f[1], f[2]]));
    for (const f of p.fields) fields.get(`${f[0]}`)?.setFill(f[4]);
    sync(stations, p.stations.map((s) => [`${s[0]}:${s[3]}`, () => M.station(colorOf(s[3]), glyphOf(s[3])), s[1], s[2]]));
    const cracked = p.vault <= 0;
    vaultA.position.z = cracked ? 45 : T.VAULT_R * 0.2;
    vaultB.position.z = cracked ? -45 : -T.VAULT_R * 0.2;
    vaultCore.visible = cracked;
    crown.visible = !!p.crown && !p.crown[2];
    if (p.crown) crown.position.set(p.crown[0], 10, p.crown[1]);
    const news = p.ticker.at(-1) ?? "";
    if (news !== lastNews) { // each headline stays 6 s, then the bottom of the screen clears
      lastNews = news;
      ticker.textContent = news;
      clearTimeout(newsT);
      newsT = setTimeout(() => (ticker.textContent = ""), 6000);
    }
    paused.classList.toggle("hidden", p.st !== "paused");
    if (p.st === "lobby") {
      const q = playerOf(mine), sec = SECTORS[p.sector];
      waitScr.replaceChildren(el("div", { className: "waitcard" },
        el("div", { className: "you" }, ...(q ? [el("span", { className: "chip", textContent: GLYPHS[q[2]], style: { background: COLORS[q[2]] } })] : []),
          el("div", {}, el("b", { textContent: q ? `You're ${GLYPHS[q[2]]} · ${q[1]}` : "Joining…" }), el("span", { textContent: "Look for your letter on the big screen." }))),
        el("div", { innerHTML: rulesCard(p.target) }),
        el("p", {}, "Sector rule: ", el("b", { textContent: sec.name }), ` — ${sec.desc}`),
        el("p", { textContent: `${p.players.length} in the room · waiting for the host to start` })));
      waitScr.classList.remove("hidden");
    } else waitScr.classList.add("hidden");
    if (p.st === "play" || p.st === "paused") startPlaying();
    const c = colorOf(mine);
    if (myShip.color !== c) myShip.setColor(c);
    homeMk.style.color = c;
  }

  function startPlaying() {
    if (playing) return;
    playing = true;
    waitScr.classList.add("hidden");
    game.classList.remove("hidden");
    wakeLock();
  }
  async function wakeLock() {
    try { await (navigator as any).wakeLock?.request("screen"); } catch {}
  }
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && playing && wakeLock());

  // ---------- Snapshots (10 Hz) ----------
  function onSnap(s: Snap) {
    const off = s.ms - performance.now();
    clockOff = isNaN(clockOff) || Math.abs(off - clockOff) > 1000 ? off : clockOff + (off - clockOff) * 0.1;
    frames.push({ ms: s.ms, me: s.me, ents: new Map(s.ents.map((e) => [e[0], e])) });
    if (frames.length > 6) frames.shift();
    const prev = me;
    me = s.me;
    startPlaying();
    if (syncH || (wasDead && me.state === "alive")) [localH, syncH] = [me.h, false];
    wasDead = me.state === "dead";
    // Ships that vanish deep inside sensor range just died.
    const last = frames.at(-2);
    if (last && prev) for (const e of last.ents.values()) if (e[1] === K.SHIP && !frames.at(-1)!.ents.has(e[0]) && Math.hypot(e[2] - me.x, e[3] - me.z) < 380) boom(colorOf(e[5]), e[2], e[3]);
    if (prev) {
      if (me.state === "alive" && prev.state === "alive" && me.held > prev.held) pickup(me.held - prev.held);
      if (me.score > prev.score) replay(lvrow, "punch"); // ring and station income lands here too
      if (me.level > prev.level) replay(lvl, "punch"); // the strap and perk cards announce it; no third pop
      if (me.boost && !prev.boost && !reduceMotion) fovKick = 7;
    }
    hud10(me, s);
  }

  function boom(color: string, x: number, z: number) {
    fx.burst(x, 0, z, color, 40, 160, 0.9);
    fx.burst(x, 0, z, "#ffffff", 14, 70, 0.45);
    fx.shock(x, z, color, 90, 0.6);
    fx.flash(x, 4, z, color, 130, 0.35);
  }
  function pickup(d: number) {
    const p = myShip.group.position;
    fx.burst(p.x, 2, p.z, M.LOOT_C, 6 + d, 70, 0.45);
    num(d, "lt", p.x, 18, p.z, "+");
    replay(holdM.row, "punch");
  }

  function onEv(m: Ev) {
    const sp = myShip.group.position;
    switch (m.kind) {
      case "dealt": { // our bolt landed: hit marker where it hit, for how much
        const x = m.x ?? 0, z = m.z ?? 0;
        num(m.n ?? 0, m.text === "ship" ? "" : "st", x, 12, z);
        fx.burst(x, 4, z, "#fff3c4", 9, 120, 0.3);
        fx.flash(x, 4, z, "#ffffff", 30, 0.12);
        if (m.text === "ship") {
          let best: M.ShipModel | undefined, bd = 30;
          for (const s of ships.values()) { const d = Math.hypot(s.group.position.x - x, s.group.position.z - z); if (s.group.visible && d < bd) [best, bd] = [s, d]; }
          best?.hit();
        }
        return;
      }
      case "hit":
        navigator.vibrate?.(40);
        vig.classList.add("on");
        setTimeout(() => vig.classList.remove("on"), 120);
        trauma = Math.min(1, trauma + 0.45);
        myShip.hit();
        if (me && m.x !== undefined && m.z !== undefined && (m.x !== me.x || m.z !== me.z)) {
          dirHit.style.transform = `rotate(${wrap(Math.atan2(m.z - me.z, m.x - me.x) - localH)}rad)`;
          dirHit.classList.add("on");
          setTimeout(() => dirHit.classList.remove("on"), 160);
        }
        return;
      case "dead": // who did it goes on the Destroyed card, not in a toast on top of it
        navigator.vibrate?.(250);
        trauma = 1;
        boom(colorOf(id?.pid ?? 0), sp.x, sp.z);
        downBy = m.text;
        over.dataset.k = "";
        return;
      case "bank": { // crystals fly from the hold into the bank, the zone flares, the XP bar fills
        showHint("bank");
        popup(pop, m.text.replace(/^Banked (\+\d+)/, "$1 BANKED"));
        const h = myHQ(), st = [...stations.values()].find((s) => Math.hypot(s.obj.position.x - sp.x, s.obj.position.z - sp.z) <= T.BANK_R + 40);
        const b = h && Math.hypot(h.obj.position.x - sp.x, h.obj.position.z - sp.z) <= T.HQ_R + 40 ? h : st ?? h;
        if (b) {
          fx.bankFlight(sp.x, sp.z, b.obj.position.x, b.obj.position.z, Math.max(3, Math.min(16, Math.round((+(m.text.match(/\d+/)?.[0] ?? 0)) / T.CRYSTAL))));
          b.pulse = 1;
          setTimeout(() => { fx.burst(b.obj.position.x, 30, b.obj.position.z, M.GOLD_C, 24, 90, 0.7); fx.shock(b.obj.position.x, b.obj.position.z, M.GOLD_C, 150, 0.7); }, 520);
        }
        return;
      }
    }
    if (m.text) say(m.text);
  }

  let shieldMax = 1, lastShield = 0;
  function hud10(me: Me, s: Snap) {
    const pid = id?.pid ?? 0, q = playerOf(pid);
    if (q) {
      myChip.textContent = GLYPHS[q[2]];
      myChip.style.background = lvl.style.color = xpFill.style.background = COLORS[q[2]]; // level and XP are yours: your colour
    }
    const hpF = me.hp / me.hpMax;
    hullM.fill.style.width = `${100 * hpF}%`;
    hullM.v.textContent = `${me.hp}`;
    hullM.row.classList.toggle("low", hpF < 0.3);
    holdM.fill.style.width = `${(100 * me.held) / me.hold}%`;
    holdM.v.textContent = `${me.held}/${me.hold}`;
    holdM.row.style.setProperty("--n", String(Math.round(me.hold / T.CRYSTAL)));
    holdM.row.classList.toggle("full", me.held >= me.hold);
    // Level and race share one bar: banked score toward the target, one step per level (the first bank is Level 1).
    const target = pub?.target ?? T.TARGETS[0], lead = Math.max(0, ...(pub?.players.map((r) => r[3]) ?? []));
    lvl.textContent = `Level ${me.level}`;
    xpFill.style.width = `${Math.min(100, (100 * me.score) / target)}%`;
    raceLead.style.left = `calc(${Math.min(100, (100 * lead) / target)}% - 3px)`;
    raceLead.classList.toggle("hidden", lead <= me.score);
    // One instruction at a time. objective() adds the arrow and distance; a first-time hint takes the banner for 4 s.
    const vaultE = s.ents.find((e) => e[1] === K.VAULT && Math.hypot(e[2] - me.x, e[3] - me.z) < 420);
    const stn = s.ents.find((e) => e[1] === K.STATION && e[5] !== pid && Math.hypot(e[2] - me.x, e[3] - me.z) < 360);
    const inRing = me.ring && me.ring[0] !== pid;
    const instr =
      me.state !== "alive" ? "" :
      me.build >= 0 ? "Hold still — building" :
      inRing && me.ring![2] ? "Ring contested" :
      inRing && me.shield > 0 ? "Shielded: can't claim rings" :
      inRing ? "Stay in the ring" :
      me.offer ? `Level up: pick a perk${me.picks > 1 ? ` (${me.picks} waiting)` : ""}` :
      me.crown ? "Fly home with the Crown" :
      me.held >= me.hold ? "Hold full — fly home" :
      me.held >= me.hold / 2 ? `Fly home to bank +${me.held}` :
      me.held ? "Grab more, or bank at home" : "Fly to the glowing loot";
    if (performance.now() > hintUntil) {
      obj.classList.remove("hint");
      obj.classList.toggle("ask", instr.startsWith("Level up")); // the perk pick owns the banner; no arrow or distance
      objT.textContent = instr;
      obj.classList.toggle("hidden", !instr);
    }
    // One status strip: build > ring claim > shield > the HP of what you're near
    if (me.shield > shieldMax || (me.shield > 0 && lastShield === 0)) shieldMax = me.shield;
    lastShield = me.shield;
    const claim = inRing && !me.ring![2] && me.ring![1] > 0 ? me.ring![1] : -1;
    const st: [string, number] | null =
      me.state !== "alive" ? null :
      me.build >= 0 ? ["Building", me.build] :
      claim >= 0 ? ["Claiming ring", claim] :
      me.shield > 0 ? [`Shield ${Math.floor(Math.ceil(me.shield) / 60)}:${String(Math.ceil(me.shield) % 60).padStart(2, "0")} · firing drops it`, me.shield / shieldMax] :
      stn ? [`Station ${stn[6]} HP · shoot to steal`, Math.min(1, stn[6] / BASE.stationHp)] :
      vaultE ? [`Vault ${vaultE[6]}/${T.VAULT_HP} · shoot to crack`, vaultE[6] / T.VAULT_HP] : null;
    tmr.classList.toggle("hidden", !st || !!me.offer);
    if (st) {
      tmrT.textContent = st[0];
      const on = Math.round(st[1] * 10);
      [...steps.children].forEach((c, i) => c.classList.toggle("on", i < on));
    }
    // The ring we're claiming fills at 10 Hz (the public view only updates at 1 Hz).
    if (me.ring && me.ring[1] > 0) for (const r of rings.values()) if (Math.hypot(r.obj.position.x - me.x, r.obj.position.z - me.z) <= T.RING_R + 1) r.setProg(me.ring[1], colorOf(pid));
    buildB.classList.toggle("on", !!me.canBuild);
    if (me.boostCd > boostMax || me.boostCd === 0) boostMax = Math.max(me.boostCd, 0.1);
    boostB.style.setProperty("--p", `${me.boostCd > 0 ? Math.floor(10 - (10 * me.boostCd) / boostMax) * 10 : 100}%`);
    // Destroyed / stasis card
    over.classList.toggle("hidden", me.state === "alive");
    const ov = me.state === "dead" ? `dead${me.respawnIn}` : me.state;
    if (over.dataset.k !== ov) {
      over.dataset.k = ov;
      over.replaceChildren(...(me.state === "dead" ? [el("b", { textContent: downBy || "Destroyed" }), el("span", { className: "blk", textContent: `Back in ${me.respawnIn}` })]
        : me.state === "stasis" ? [el("b", { className: "calm", textContent: "Stasis" }), el("span", { className: "blk", textContent: "Your ship is safe. Reconnecting…" })] : []));
    }
    // Perk cards
    const sig = JSON.stringify(me.offer);
    if (perks.dataset.sig !== sig) {
      perks.dataset.sig = sig;
      perks.replaceChildren(...(me.offer ?? []).map((pk: PerkId, k: number) =>
        el("button", { onclick: () => send({ t: "act", a: "perk", k }) }, el("b", { textContent: PERKS[pk].name }), PERKS[pk].desc)));
      perks.classList.toggle("hidden", !me.offer);
    }
    // Hints
    if (me.held >= me.hold) showHint("full");
    if (me.ring) showHint("ring");
    if (me.state === "alive" && me.hp < me.hpMax * 0.3) showHint("hull");
    if (me.canBuild && me.level > 0) showHint("build");
    buildB.classList.toggle("hidden", !seen.includes("build")); // BUILD arrives with its hint, then stays
    drawRadar(me, s);
  }

  // ---------- Radar: heading-up, 600 units to the rim; HOME and the objective stay pinned to the rim when far ----------
  let radarGoal: [number, number, string] | null = null;
  function drawRadar(me: Me, s: Snap) {
    const c = radar.getContext("2d")!, R = 70, k = R / 600, cs = Math.cos(-Math.PI / 2 - localH), sn = Math.sin(-Math.PI / 2 - localH);
    const P = (x: number, z: number): [number, number] => { const dx = (x - me.x) * k, dz = (z - me.z) * k; return [R + dx * cs - dz * sn, R + dx * sn + dz * cs]; };
    const pin = (x: number, z: number, edge: number): [number, number, boolean] => {
      const [px, py] = P(x, z), d = Math.hypot(px - R, py - R);
      return d > edge ? [R + ((px - R) * edge) / d, R + ((py - R) * edge) / d, true] : [px, py, false];
    };
    const dot = (x: number, z: number, r: number, color: string, hollow = false) => {
      const [px, py] = P(x, z);
      c.beginPath();
      c.arc(px, py, r, 0, TAU);
      if (hollow) { c.strokeStyle = color; c.lineWidth = 1.5; c.stroke(); } else { c.fillStyle = color; c.fill(); }
    };
    c.clearRect(0, 0, 140, 140);
    c.save();
    c.beginPath();
    c.arc(R, R, R - 1, 0, TAU);
    c.clip();
    c.fillStyle = "rgba(244,244,240,.08)"; // forward cone
    c.beginPath();
    c.moveTo(R, R);
    c.arc(R, R, R, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
    c.fill();
    c.strokeStyle = "rgba(244,244,240,.22)";
    c.lineWidth = 1;
    c.beginPath();
    c.arc(R, R, T.RADAR * k, 0, TAU);
    c.stroke();
    if (pub) {
      for (const f of pub.fields) dot(f[1], f[2], T.FIELD_R * k, `rgba(127,255,212,${0.1 + 0.15 * f[4]})`);
      for (const r of pub.rings) dot(r[1], r[2], T.RING_R * k, r[3] ? colorOf(r[3]) : "#949494", true);
      for (const q of pub.players) if (q[0] !== id?.pid) dot(q[6], q[7], 5, COLORS[q[2]], true);
      for (const st of pub.stations) { const [x, y] = P(st[1], st[2]); c.fillStyle = colorOf(st[3]); c.fillRect(x - 3, y - 3, 6, 6); }
      const [vx, vy] = P(0, 0);
      c.fillStyle = "#f4f4f0";
      c.beginPath();
      c.moveTo(vx, vy - 5); c.lineTo(vx + 5, vy); c.lineTo(vx, vy + 5); c.lineTo(vx - 5, vy);
      if (pub.vault > 0) c.fill(); else { c.strokeStyle = "#f4f4f0"; c.stroke(); }
      if (pub.crown) dot(pub.crown[0], pub.crown[1], 4, "#f4f4f0");
    }
    for (const e of s.ents) if (e[1] === K.LOOT) dot(e[2], e[3], 1.6, "#7fffd4");
    for (const e of s.ents) if (e[1] === K.SHIP) dot(e[2], e[3], 3.5, colorOf(e[5]));
    for (const b of s.blips) dot(b[0], b[1], 3.5, colorOf(b[2]), true);
    c.restore();
    if (radarGoal) {
      const [gx, gy] = pin(radarGoal[0], radarGoal[1], R - 6);
      c.strokeStyle = radarGoal[2];
      c.lineWidth = 2;
      c.beginPath();
      c.arc(gx, gy, 5, 0, TAU);
      c.stroke();
    }
    const q = playerOf(id?.pid ?? 0);
    if (q) {
      const [hx, hy, far] = pin(q[6], q[7], R - 10);
      c.save();
      c.translate(hx, hy);
      c.scale(far ? 0.8 : 0.7, far ? 0.8 : 0.7);
      c.fillStyle = COLORS[q[2]];
      c.strokeStyle = "#151515";
      c.lineWidth = 2.5;
      c.fill(new Path2D("M0-10 10-1H7v10H-7V-1h-3z"));
      c.stroke(new Path2D("M0-10 10-1H7v10H-7V-1h-3z"));
      c.restore();
    }
    c.fillStyle = "#fff";
    c.beginPath();
    c.moveTo(R, R - 6); c.lineTo(R - 4, R + 4); c.lineTo(R + 4, R + 4);
    c.fill();
  }

  function showEnd(e: End) {
    const names = e.table.filter((r) => e.winner.includes(r[0])).map((r) => r[1]), [head, why] = resultCopy(names, e.reason), rk = ranks(e.table.map((r) => r[3]));
    const chip = (c: number) => el("span", { className: "chip", textContent: GLYPHS[c], style: { background: COLORS[c] } });
    endScr.replaceChildren(el("h1", { textContent: head }),
      el("p", { className: "muted", textContent: why }),
      el("div", { className: "tbl slab" }, el("table", {}, el("tr", {}, ...["#", "Player", "Banked", "Kills", "Stolen", "Stations"].map((h) => el("th", { textContent: h }))),
        ...e.table.map((r, i) => el("tr", { className: r[0] === id?.pid ? "me" : "" }, el("td", { textContent: String(rk[i]) }), el("td", {}, chip(r[2]), r[1]),
          ...[r[3], r[4], r[5], r[6]].map((v) => el("td", { textContent: v.toLocaleString() })))))),
      el("button", { textContent: "Home", onclick: () => (location.href = "/") }));
    endScr.classList.remove("hidden");
    conn?.stop();
  }

  // ---------- Controls ----------
  joyZone.onpointerdown = (e) => {
    if (joy.id !== null) return;
    joyZone.setPointerCapture(e.pointerId);
    Object.assign(joy, { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 });
    Object.assign(joyEl.style, { left: `${e.clientX}px`, top: `${e.clientY}px` });
    joyEl.classList.remove("hidden");
  };
  joyZone.onpointermove = (e) => {
    if (e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
    const d = Math.hypot(dx, dy), max = 55;
    if (d > max) [dx, dy] = [(dx * max) / d, (dy * max) / d];
    const dead = (v: number) => (Math.abs(v) < 0.15 ? 0 : v);
    [joy.x, joy.y] = [dead(dx / max), dead(-dy / max)];
    (joyEl.firstChild as HTMLElement).style.transform = `translate(${dx}px, ${dy}px)`;
  };
  joyZone.onpointerup = joyZone.onpointercancel = (e) => {
    if (e.pointerId !== joy.id) return;
    Object.assign(joy, { id: null, x: 0, y: 0 });
    joyEl.classList.add("hidden");
    (joyEl.firstChild as HTMLElement).style.transform = "";
  };
  const press = (b: HTMLElement, down: () => void, up?: () => void) => {
    b.onpointerdown = (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add("down"); down(); };
    b.onpointerup = b.onpointercancel = () => { b.classList.remove("down"); up?.(); };
    b.oncontextmenu = (e) => e.preventDefault();
  };
  // iOS Safari double-tap-zooms despite touch-action: none, and the game then blocks the pinch back out.
  // Cancelling touchend stops it; the perk cards are the only clicks in the game layer.
  game.addEventListener("touchend", (e) => (e.target as Element).closest(".perks") || e.preventDefault(), { passive: false });
  press(fireB, () => { firing = true; showHint("fire"); }, () => (firing = false));
  press(boostB, () => send({ t: "act", a: "boost" }));
  press(buildB, () => send({ t: "act", a: "build" }));
  // Keyboard for laptop testing: arrows/WASD, space fire, shift boost, B build, 1/2 perks.
  const keys = new Set<string>();
  addEventListener("keydown", (e) => {
    keys.add(e.code);
    if (e.code === "ShiftLeft") send({ t: "act", a: "boost" });
    if (e.code === "KeyB") send({ t: "act", a: "build" });
    if (e.code === "Digit1" || e.code === "Digit2") send({ t: "act", a: "perk", k: e.code === "Digit1" ? 0 : 1 });
  });
  addEventListener("keyup", (e) => keys.delete(e.code));

  // ---------- Render loop (30 fps cap) ----------
  const o3 = new THREE.Object3D(), col = new THREE.Color(), white = new THREE.Color("#ffffff"), camLook = new THREE.Vector3(), want = new THREE.Vector3(), v3 = new THREE.Vector3();
  let lastT = performance.now();
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();

  function frame(now: number) {
    requestAnimationFrame(frame);
    if (now - lastT < 32 || !playing) return;
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    const kx = (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0);
    const ky = (keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0) - (keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0);
    const jx = joy.id !== null ? joy.x : kx, jy = joy.id !== null ? joy.y : ky;
    const fire = firing || keys.has("Space");
    // Only our own heading is predicted, at the server's turn rate.
    if (me?.state === "alive") localH = wrap(localH + jx * T.TURN * dt);
    const th = jy >= 0 ? jy : jy * -T.TH_MIN;
    [turnIn, thIn] = [me?.state === "alive" ? jx : 0, th];
    const sig = `${localH.toFixed(2)}|${th.toFixed(2)}|${+fire}`;
    if (pub?.st === "play" && ((sig !== lastIn && now - lastSend >= 1000 / T.INPUT_HZ) || now - lastSend >= T.HEARTBEAT_S * 1000)) {
      send({ t: "in", h: +localH.toFixed(3), th: +th.toFixed(2), f: fire ? 1 : 0 });
      [lastIn, lastSend] = [sig, now];
    }
    draw(now, dt);
  }
  requestAnimationFrame(frame);

  // Damage / pickup numbers: DOM text anchored to a world point, rising and fading over 0.8 s.
  // Hits landing together (twin guns, one tick) on the same spot add up into one number.
  const nums: { e: HTMLElement; x: number; y: number; z: number; t: number; v: number; cls: string; jx: number }[] = [];
  function num(v: number, cls: string, x: number, y: number, z: number, plus = "") {
    let n = nums.find((q) => q.t < 0.15 && q.cls === cls && Math.hypot(q.x - x, q.z - z) < 40);
    if (n) v += n.v;
    else {
      n = nums.find((q) => q.t >= 1);
      if (!n && nums.length < 16) fxl.append((n = { e: el("div"), x: 0, y: 0, z: 0, t: 1, v: 0, cls, jx: 0 }).e), nums.push(n);
      n ??= nums.reduce((a, b) => (a.t > b.t ? a : b));
      n.jx = (Math.random() - 0.5) * 28;
    }
    Object.assign(n, { x, y, z, t: 0, v, cls });
    n.e.className = `num ${cls}`;
    n.e.textContent = `${plus}${v}`;
  }
  /** World point → CSS pixels; null when behind the camera. */
  function screen(x: number, y: number, z: number): [number, number] | null {
    v3.set(x, y, z).project(camera);
    return v3.z > 1 ? null : [((v3.x + 1) / 2) * innerWidth, ((1 - v3.y) / 2) * innerHeight];
  }

  function draw(now: number, dt: number) {
    fx.tick(dt);
    if (!frames.length || !me) {
      backdrop.position.copy(camera.position);
      return void renderer.render(scene, camera);
    }
    // Interpolate 100 ms in the past between the two snapshots around render time. Half of all snapshots land
    // later than average, so past the newest one keep extrapolating (up to a tick) instead of freezing then jumping.
    const rms = now + clockOff - 100;
    const b = frames.find((f) => f.ms > rms) ?? frames[frames.length - 1], a = frames[Math.max(0, frames.indexOf(b) - 1)];
    const u = b === a ? 0 : Math.min(2, Math.max(0, (rms - a.ms) / (b.ms - a.ms)));
    const L = (p: number, q: number) => p + (q - p) * u;
    const um = a.me.state === b.me.state ? u : Math.min(u, 1); // a respawn teleports: never extrapolate past it
    const px = a.me.x + (b.me.x - a.me.x) * um, pz = a.me.z + (b.me.z - a.me.z) * um;
    const t = now / 1000, ease = Math.min(1, dt * 7);

    // Own ship: rolls into turns, flames follow the throttle, cargo glows with the hold.
    myShip.group.visible = b.me.state !== "dead";
    myShip.group.position.set(px, 0, pz);
    myShip.group.rotation.y = -localH;
    roll += (turnIn * 0.5 - roll) * ease;
    myShip.body.rotation.x = roll;
    myShip.hull.scale.z = 1 + 0.25 * (me.perks.thick ?? 0);
    const thr = me.state === "alive" ? Math.max(0, thIn) : 0;
    myShip.flames.scale.x = 0.2 + thr * 0.8 + (me.boost ? 1 : 0);
    myShip.engine.scale.setScalar(9 + thr * 6 + (me.boost ? 14 : 0));
    const carry = me.held / me.hold;
    myShip.cargo.scale.setScalar(carry ? 24 + 40 * carry : 0.01);
    myShip.cargo.material.opacity = 0.3 + 0.5 * carry;
    myShip.shield.visible = me.shield > 0;
    myShip.crown.visible = !!me.crown;
    myShip.tick(dt);

    // Other ships
    const present = new Set<number>();
    for (const e of b.ents.values()) {
      if (e[1] !== K.SHIP) continue;
      present.add(e[0]);
      let s = ships.get(e[0]);
      if (!s) {
        s = M.ship(colorOf(e[0]), nameOf(e[0]));
        ships.set(e[0], s);
        scene.add(s.group);
      }
      if (s.color !== colorOf(e[0])) s.setColor(colorOf(e[0]));
      const ea = a.ents.get(e[0]) ?? e, turn = wrap(e[4] - ea[4]);
      s.group.position.set(L(ea[2], e[2]), 0, L(ea[3], e[3]));
      s.group.rotation.y = -(ea[4] + turn * u);
      s.body.rotation.x += (Math.max(-0.5, Math.min(0.5, turn * 3)) - s.body.rotation.x) * ease;
      const aux = e[6], boost = aux & F.BOOST ? 1 : 0, c2 = (aux & 15) / 10;
      s.flames.scale.x = 0.8 + boost;
      s.engine.scale.setScalar(12 + boost * 14);
      s.cargo.scale.setScalar(c2 ? 24 + 40 * c2 : 0.01);
      s.cargo.material.opacity = 0.3 + 0.5 * c2;
      s.shield.visible = !!(aux & (F.SHIELD | F.STASIS));
      s.crown.visible = !!(aux & F.CROWN);
      s.group.visible = true;
      s.tick(dt);
    }
    for (const [pid, s] of ships) if (!present.has(pid)) s.group.visible = false;

    // Loot (from the newest frame; it barely moves), each with a halo
    let n = 0;
    const halo = lootHalo.geometry.attributes.position as THREE.BufferAttribute;
    for (const e of b.ents.values()) {
      if (e[1] !== K.LOOT || n >= lootMesh.instanceMatrix.count) continue;
      const y = 3 + Math.sin(t * 2 + e[0]) * 3;
      o3.position.set(e[2], y, e[3]);
      o3.rotation.set(0, t * 2 + e[0], 0);
      o3.scale.setScalar(e[6] >= T.CRYSTAL ? 1 : 0.7);
      o3.updateMatrix();
      lootMesh.setMatrixAt(n, o3.matrix);
      halo.setXYZ(n++, e[2], y, e[3]);
    }
    lootMesh.count = n;
    lootMesh.instanceMatrix.needsUpdate = halo.needsUpdate = true;
    lootHalo.geometry.setDrawRange(0, n);

    // Bolts: extrapolated along their heading from the newest frame
    const nb = frames[frames.length - 1], ahead = (rms - nb.ms) / 1000;
    n = 0;
    for (const e of nb.ents.values()) {
      if (e[1] !== K.BOLT || n >= 500) continue;
      o3.position.set(e[2] + Math.cos(e[4]) * 450 * ahead, 0, e[3] + Math.sin(e[4]) * 450 * ahead);
      o3.rotation.set(0, -e[4], 0);
      o3.scale.setScalar(1);
      o3.updateMatrix();
      bolts.core.setMatrixAt(n, o3.matrix);
      bolts.sleeve.setMatrixAt(n, o3.matrix);
      bolts.sleeve.setColorAt(n, col.set(colorOf(e[5])));
      bolts.core.setColorAt(n++, col.lerp(white, 0.6));
    }
    for (const m of [bolts.core, bolts.sleeve]) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }

    // Structures: spin, hide detail beyond the fog, zone glow (HOME pulses while you carry loot near it)
    const home = myHQ();
    for (const [map, r, sp] of [[hqs, 60, 0.4], [stations, 40, 0.8], [rings, T.RING_R, 0.06], [fields, T.FIELD_R, 0.05]] as const) {
      for (const o of (map as Map<string, M.Base | M.FieldModel>).values()) {
        o.detail.visible = Math.hypot(o.obj.position.x - px, o.obj.position.z - pz) < 1300 + r;
        o.spin.rotation.y = t * sp;
      }
    }
    for (const h of [...hqs.values(), ...stations.values()]) {
      const near = h === home && (me.held > 0 || me.crown) && Math.hypot(h.obj.position.x - px, h.obj.position.z - pz) < 600;
      h.pulse = Math.max(h.pulse - dt * 1.4, near ? 0.25 + 0.2 * Math.sin(t * 6) : 0);
      const zm = h.zone.material as THREE.MeshBasicMaterial;
      zm.opacity = h.zone.userData.base + h.pulse * 0.9;
    }
    vault.rotation.y = t * 0.2;
    // Nothing is solid: the Vault turns see-through as you fly into it instead of filling the camera with gold.
    (vault.userData.mat as THREE.Material).opacity = Math.min(1, Math.max(0.15, (Math.hypot(camera.position.x, camera.position.z) - T.VAULT_R) / 120));
    vaultCage.rotation.y = -t * 0.35;
    vaultOrbit.rotation.y = t * 0.5;
    vaultCore.scale.setScalar(T.VAULT_R * (2.2 + 0.3 * Math.sin(t * 4)));
    crown.rotation.y = t * 2;

    // Chase camera; trauma shake on hits, a short FOV kick on boost
    const fx0 = Math.cos(localH), fz0 = Math.sin(localH);
    want.set(px - fx0 * 80, 40, pz - fz0 * 80);
    if (camera.position.distanceTo(want) > 400) camera.position.copy(want);
    else camera.position.lerp(want, 1 - Math.exp(-dt * 8));
    if (trauma > 0) {
      const k = reduceMotion ? 0 : trauma * trauma * 12;
      camera.position.x += (Math.random() - 0.5) * k;
      camera.position.y += (Math.random() - 0.5) * k;
      trauma = Math.max(0, trauma - dt * 1.8);
    }
    fovKick *= Math.exp(-dt / 0.25);
    if (Math.abs(camera.fov - 62 - fovKick) > 0.05) {
      camera.fov = 62 + fovKick;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(camLook.set(px + fx0 * 70, 0, pz + fz0 * 70));
    camera.updateMatrixWorld();
    backdrop.position.copy(camera.position);
    dust.update(camera.position.x, camera.position.z);

    objective(px, pz, b, t);
    homeMarker(px, pz);
    for (const q of nums) {
      if (q.t >= 1) continue;
      q.t = Math.min(1, q.t + dt / 0.8);
      const p = screen(q.x, q.y, q.z);
      if (!p || q.t >= 1) { q.e.style.opacity = "0"; continue; }
      q.e.style.opacity = String(Math.min(1, 2.5 - q.t * 2.5));
      q.e.style.transform = `translate(${p[0] + q.jx}px, ${p[1] - q.t * 42}px) translate(-50%, -50%) scale(${q.t < 0.12 ? 1.6 - q.t * 5 : 1})`;
    }
    renderer.render(scene, camera);
  }

  /** The tutorial: loot when the hold is under half, HOME when half full or carrying the Crown. */
  function objective(px: number, pz: number, f: Frame, t: number) {
    let best: [number, number] | null = null, bd = Infinity, home = false;
    const near = (x: number, z: number) => { const d = Math.hypot(x - px, z - pz); if (d < bd) [best, bd] = [[x, z], d]; };
    if (me && pub && me.state === "alive") {
      if (me.held >= me.hold / 2 || me.crown) {
        home = true;
        for (const q of pub.players) if (q[0] === id?.pid) near(q[6], q[7]);
        for (const s of pub.stations) if (s[3] === id?.pid) near(s[1], s[2]);
      } else {
        for (const e of f.ents.values()) if (e[1] === K.LOOT) near(e[2], e[3]);
        if (!best) for (const fl of pub.fields) near(fl[1], fl[2]);
      }
    }
    arrow3.obj.visible = !!best && bd > 60;
    radarGoal = null;
    obj.classList.toggle("loot", !!best && !home);
    obj.classList.toggle("home", !!best && home);
    objSvg.style.display = best ? "" : "none";
    if (!best) return void (objD.textContent = "");
    const [x, z] = best as [number, number], ang = Math.atan2(z - pz, x - px), c = home ? M.GOLD_C : M.LOOT_C;
    radarGoal = [x, z, c];
    // The 3D arrow hovers over the ship and points where you'd fly; it nudges toward the target to show motion.
    const rel = wrap(ang - localH), nudge = 4 + Math.sin(t * 5) * 4;
    arrow3.setColor(c);
    arrow3.obj.position.set(px, 18, pz);
    arrow3.obj.rotation.y = -localH;
    arrow3.mesh.rotation.y = -rel;
    arrow3.mesh.position.set(Math.cos(rel) * nudge, 0, Math.sin(rel) * nudge);
    objSvg.style.transform = `rotate(${wrap(ang - localH)}rad)`;
    objD.textContent = `${Math.round(bd)}`;
  }

  /** HOME tag over your HQ while it's on screen. Off screen, the radar rim and the objective arrow already point home. */
  function homeMarker(px: number, pz: number) {
    const q = playerOf(id?.pid ?? 0);
    const p = q && me && me.state !== "dead" && Math.hypot(q[6] - px, q[7] - pz) >= T.HQ_R ? screen(q[6], 50, q[7]) : null;
    const on = !!p && p[0] > 30 && p[0] < innerWidth - 30 && p[1] > 30 && p[1] < innerHeight - 30;
    homeMk.classList.toggle("hidden", !on);
    if (!p || !on) return;
    homeAmt.textContent = me!.held || me!.crown ? `+${me!.held}${me!.crown ? " + Crown" : ""}` : "";
    homeMk.style.transform = `translate(${p[0]}px, ${p[1]}px) translate(-50%, -11px)`;
  }
}
