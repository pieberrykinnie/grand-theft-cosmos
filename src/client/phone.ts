// The phone: third-person Three.js view, HUD, joystick, arrow, hints. A terminal that holds no truth.
import * as THREE from "three";
import { cleanName, F, K, PROTOCOL_VERSION } from "../shared/protocol";
import { COLORS, GLYPHS, type End, type Pub, type Snap } from "../shared/sim";
import { PERKS, SECTORS, T, type PerkId } from "../shared/tuning";
import * as M from "./models";
import { connect, downBanner, el, rulesCard, type Conn } from "./net";

const CSS = `
.game { position: fixed; inset: 0; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.game canvas.gl { position: absolute; inset: 0; width: 100%; height: 100%; }
.joyzone { position: absolute; left: 0; top: 0; bottom: 0; width: 50%; }
.joy { position: absolute; width: 130px; height: 130px; margin: -65px 0 0 -65px; border: 2px solid rgba(46,230,230,.45); border-radius: 50%; pointer-events: none; }
.joy i { position: absolute; left: 43px; top: 43px; width: 44px; height: 44px; border-radius: 50%; background: rgba(46,230,230,.55); }
.hud { position: absolute; inset: 0; pointer-events: none; font-size: 14px; text-shadow: 0 1px 3px #000; }
.panel { background: linear-gradient(135deg, rgba(14,28,64,.86), rgba(6,11,26,.62)); border: 1px solid rgba(46,230,230,.32); border-radius: 3px 12px 3px 3px; }
.tl { position: absolute; left: max(10px, env(safe-area-inset-left)); top: 8px; width: 196px; display: grid; gap: 5px; padding: 7px 9px; }
.mrow { display: grid; grid-template-columns: 30px 1fr 54px; align-items: center; gap: 6px; }
.mrow b { font-size: 10px; letter-spacing: .1em; color: var(--dim); }
.mrow .v { font-size: 12px; text-align: right; font-variant-numeric: tabular-nums; }
.trk { position: relative; height: 10px; background: rgba(18,40,74,.95); border-radius: 2px; overflow: hidden; }
.trk i { position: absolute; inset: 0 auto 0 0; width: 0; transition: width .3s ease-out; }
.hull i { background: linear-gradient(90deg, #22a872, #3ddc97); }
.hull.low i { background: var(--red); } .hull.low .v { color: var(--red); }
.hold i { background: linear-gradient(90deg, #2fb895, #7fffd4); box-shadow: 0 0 6px #7fffd4; }
.hold .trk::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent calc(100% - 2px), rgba(6,11,26,.95) 0) 0 0 / calc(100% / var(--n, 10)) 100%; }
.hold.full .v, .hold.full b { color: #7fffd4; }
.lvrow { display: flex; align-items: center; justify-content: space-between; height: 18px; margin-top: 2px; }
.lvl { font-size: 15px; font-weight: bold; color: var(--gold); }
.xp .trk { height: 7px; } .xp i { background: linear-gradient(90deg, #c99400, #ffd23f); box-shadow: 0 0 6px #ffd23f; }
.pick { color: #060b1a; background: var(--gold); padding: 0 6px; border-radius: 3px; font-size: 11px; font-weight: bold; line-height: 16px; text-shadow: none; animation: glowp .8s ease-in-out infinite alternate; }
@keyframes glowp { to { box-shadow: 0 0 12px var(--gold); } }
.punch { animation: punch .45s ease-out; }
@keyframes punch { 0% { transform: scale(1.12); filter: brightness(2.2); } 100% { transform: none; filter: none; } }
.tc { position: absolute; left: 50%; top: 8px; transform: translateX(-50%); width: 236px; display: grid; justify-items: center; gap: 3px; text-align: center; }
.obj { display: flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px 0 6px; color: var(--gold); font-weight: bold; font-size: 15px; border-color: currentColor; }
.obj svg { width: 24px; height: 24px; fill: currentColor; stroke: #060b1a; stroke-width: 1.5; filter: drop-shadow(0 0 3px currentColor); }
.obj.loot { color: #7fffd4; } .obj .d { color: var(--fg); font-weight: normal; font-size: 13px; font-variant-numeric: tabular-nums; }
.goal { font-size: 12px; color: var(--fg); }
.race { position: relative; width: 210px; height: 5px; background: rgba(18,40,74,.9); border-radius: 3px; margin-top: 3px; }
.race u { position: absolute; inset: 0 auto 0 0; border-radius: 3px; opacity: .55; }
.race i { position: absolute; top: -3px; width: 4px; height: 11px; margin-left: -2px; border-radius: 2px; }
.racet { font-size: 11px; color: var(--dim); font-variant-numeric: tabular-nums; }
.info { color: var(--cyan); font-size: 12px; }
.radar { position: absolute; right: max(10px, env(safe-area-inset-right)); top: 8px; width: 140px; height: 140px; border-radius: 50%; background: radial-gradient(circle, rgba(12,26,60,.8), rgba(6,11,26,.88)); border: 1px solid rgba(46,230,230,.45); box-shadow: inset 0 0 14px rgba(46,230,230,.18); }
.bc { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); text-align: center; width: 40%; font-size: 12px; }
.bc .sec { color: var(--cyan); }
.btns { position: absolute; right: max(14px, env(safe-area-inset-right)); bottom: 14px; display: grid; grid-template-columns: 76px 112px; grid-template-rows: 76px 76px; gap: 10px; pointer-events: auto; }
.btns button { border-radius: 50%; padding: 0; font-weight: bold; font-size: 13px; color: #fff; background: rgba(18,40,74,.85); border: 2px solid var(--cyan); box-shadow: 0 0 10px rgba(46,230,230,.25); text-shadow: 0 1px 2px #000; }
.btns .fire { grid-column: 2; grid-row: 1 / 3; align-self: end; width: 112px; height: 112px; background: radial-gradient(circle at 50% 38%, #ff7a93, #c22c4b); border-color: #ffb3c1; font-size: 18px; box-shadow: 0 0 18px rgba(255,77,109,.45); }
.btns .boost { grid-column: 1; grid-row: 2; } .btns .build { grid-column: 1; grid-row: 1; opacity: .3; } .btns .build.on { opacity: 1; background: rgba(61,220,151,.85); }
.btns button.down { filter: brightness(1.5); transform: scale(.95); }
.fxl { position: absolute; inset: 0; overflow: hidden; }
.num { position: absolute; left: 0; top: 0; font-weight: bold; font-size: 18px; color: #fff; text-shadow: 0 0 3px #000, 0 1px 4px #000; opacity: 0; will-change: transform, opacity; }
.num.st { color: var(--gold); } .num.lt { color: #7fffd4; font-size: 14px; }
.home { position: absolute; left: 0; top: 0; display: grid; justify-items: center; font-size: 11px; font-weight: bold; line-height: 13px; white-space: nowrap; will-change: transform; }
.home svg { width: 22px; height: 22px; stroke: #060b1a; stroke-width: 1.6; filter: drop-shadow(0 0 4px currentColor); }
.home span { color: #fff; } .home small { color: #7fffd4; font-size: 11px; }
.home .chev { position: absolute; left: 50%; top: 11px; width: 0; height: 0; }
.home .chev::before { content: ""; position: absolute; left: -7px; top: -27px; border: 7px solid transparent; border-top: 0; border-bottom: 10px solid currentColor; }
.home.on .chev { display: none; }
.dirhit { position: absolute; left: 50%; top: 58%; width: 0; height: 0; opacity: 0; transition: opacity .6s; }
.dirhit i { position: absolute; left: -70px; top: -125px; width: 140px; height: 40px; border-radius: 50%; border-top: 7px solid rgba(255,60,80,.95); filter: drop-shadow(0 0 6px #ff3c50); }
.dirhit.on { opacity: 1; transition: none; }
.pop { position: absolute; left: 50%; top: 24%; transform: translateX(-50%); font-size: 26px; font-weight: bold; color: var(--gold); text-shadow: 0 0 14px rgba(255,210,63,.55), 0 2px 4px #000; white-space: nowrap; opacity: 0; }
.pop.lv { top: 33%; color: #fff; text-shadow: 0 0 14px rgba(255,210,63,.9), 0 2px 4px #000; }
.pop.go { animation: pop 1.6s ease-out forwards; }
@keyframes pop { 0% { opacity: 0; transform: translate(-50%, 12px) scale(.6); } 12% { opacity: 1; transform: translate(-50%, 0) scale(1.15); } 24% { transform: translate(-50%, 0) scale(1); } 75% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -18px); } }
.toast, .hint { position: absolute; left: 50%; transform: translateX(-50%); padding: 6px 14px; border-radius: 8px; background: rgba(6,11,26,.8); white-space: nowrap; }
.toast { top: 42%; font-size: 18px; color: var(--gold); } .hint { top: 52%; font-size: 16px; color: var(--cyan); border: 1px solid var(--cyan); }
.vig { position: absolute; inset: 0; box-shadow: inset 0 0 90px 30px rgba(255,40,60,.75); opacity: 0; transition: opacity .35s; }
.vig.on { opacity: 1; transition: none; }
.perks { position: absolute; right: 230px; bottom: 14px; display: grid; gap: 6px; pointer-events: auto; }
.perks h4 { margin: 0; color: var(--gold); font-size: 13px; text-align: center; text-shadow: 0 1px 3px #000; letter-spacing: .06em; }
.perks div { display: flex; gap: 10px; }
.perks button { width: 150px; min-height: 92px; color: var(--fg); background: linear-gradient(160deg, #1d2f60, #0b1430); border: 2px solid var(--gold); text-align: left; font-size: 13px; box-shadow: 0 0 16px rgba(255,210,63,.35); }
.perks button b { display: block; font-size: 16px; color: var(--gold); margin-bottom: 4px; }
.over { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 32px; color: var(--red); text-align: center; pointer-events: none; }
#rotate { display: none; } @media (orientation: portrait) { #rotate.want { display: flex; } }
.endscr table { border-collapse: collapse; font-size: 15px; } .endscr td, .endscr th { padding: 3px 10px; text-align: right; } .endscr td:nth-child(2) { text-align: left; }
`;
// Objective arrow (shaft + head, pointing up = straight ahead) and the HOME house.
const ARROW_SVG = `<svg viewBox="-16 -16 32 32"><path d="M0-14 12 0H4.5v13h-9V0H-12z"/></svg>`;
const HOUSE_SVG = `<svg viewBox="-12 -12 24 24" fill="currentColor"><path d="M0-10 10-1H7v10H-7V-1h-3z"/></svg>`;

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
  const nameIn = el("input", { value: id?.name ?? store.get("gtc:name") ?? "", maxLength: 12, placeholder: "Your name", autocomplete: "nickname" as AutoFill });
  const joinBtn = el("button", { textContent: "Join", style: { width: "100%" } });
  const joinScr = el("div", { className: "full" }, el("h1", { textContent: "GRAND THEFT COSMOS" }), el("div", { className: "code", textContent: `Room ${code}`, style: { color: "var(--gold)" } }),
    el("div", { style: { display: "grid", gap: "10px", width: "min(360px, 90vw)" } }, nameIn, joinBtn));
  const waitScr = el("div", { className: "full veil hidden" });
  const msgScr = el("div", { className: "full veil hidden" });
  const endScr = el("div", { className: "full veil endscr hidden", style: { overflow: "auto", justifyContent: "flex-start" } });
  const down = el("div", { className: "full veil hidden", innerHTML: "<h1>Reconnecting…</h1>" });
  const rotate = el("div", { className: "full veil", id: "rotate", innerHTML: "<h1>↻</h1><p>Rotate your phone</p>" });
  const paused = el("div", { className: "full veil hidden", innerHTML: "<h1>PAUSED</h1>" });

  // ---------- Game layer ----------
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.domElement.className = "gl";
  const joyZone = el("div", { className: "joyzone" }), joyEl = el("div", { className: "joy hidden" }, el("i"));
  const meter = (cls: string, name: string) => {
    const fill = el("i"), v = el("span", { className: "v" });
    return { row: el("div", { className: `mrow ${cls}` }, el("b", { textContent: name }), el("div", { className: "trk" }, fill), v), fill, v };
  };
  const hullM = meter("hull", "HULL"), holdM = meter("hold", "HOLD"), xpM = meter("xp", "XP");
  const lvl = el("span", { className: "lvl", textContent: "Level 0" }), pickBadge = el("span", { className: "pick hidden", textContent: "PICK A PERK" });
  const obj = el("div", { className: "obj panel hidden", innerHTML: ARROW_SVG }), objT = el("span"), objD = el("span", { className: "d" });
  obj.append(objT, objD);
  const objSvg = obj.firstElementChild as SVGElement;
  const goal = el("div", { className: "goal" });
  const raceFill = el("u"), raceMe = el("i"), raceLead = el("i", { style: { background: "#fff" } }), racet = el("div", { className: "racet" });
  const info = el("div", { className: "info" });
  const radar = el("canvas", { className: "radar", width: 140, height: 140 });
  const ticker = el("div"), sector = el("div", { className: "sec" });
  const fireB = el("button", { className: "fire", textContent: "FIRE" }), boostB = el("button", { className: "boost", textContent: "BOOST" }), buildB = el("button", { className: "build", textContent: "BUILD" });
  const toast = el("div", { className: "toast hidden" }), hint = el("div", { className: "hint hidden" }), vig = el("div", { className: "vig" });
  const pop = el("div", { className: "pop" }), popLv = el("div", { className: "pop lv" }), dirHit = el("div", { className: "dirhit" }, el("i"));
  const homeT = el("span", { textContent: "HOME" }), homeAmt = el("small"), chev = el("i", { className: "chev" });
  const homeMk = el("div", { className: "home hidden", innerHTML: HOUSE_SVG }, homeT, homeAmt, chev);
  const fxl = el("div", { className: "fxl" }, homeMk);
  const perks = el("div", { className: "perks hidden" });
  const over = el("div", { className: "over hidden" });
  const hud = el("div", { className: "hud" }, vig, fxl, dirHit,
    el("div", { className: "tl panel" }, hullM.row, holdM.row, el("div", { className: "lvrow" }, lvl, pickBadge), xpM.row),
    el("div", { className: "tc" }, obj, goal, el("div", { className: "race" }, raceFill, raceLead, raceMe), racet, info),
    radar, el("div", { className: "bc" }, ticker, sector), pop, popLv, toast, hint, over);
  const game = el("div", { className: "game hidden" }, renderer.domElement, joyZone, joyEl, hud, el("div", { className: "btns" }, buildB, boostB, fireB), perks);
  const lost = el("div", { className: "full veil hidden", innerHTML: "<h1>Tap to resume</h1>", onclick: () => location.reload() });
  app.append(game, joinScr, waitScr, endScr, paused, msgScr, down, rotate, lost);
  renderer.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); lost.classList.remove("hidden"); });

  // ---------- State ----------
  let pub: Pub | null = null, me: Me | null = null, frames: Frame[] = [], clockOff = NaN;
  let localH = 0, syncH = true, wasDead = false, playing = false;
  const joy = { id: -1, x: 0, y: 0, ox: 0, oy: 0 };
  let firing = false, lastSend = 0, lastIn = "", boostMax = 1, turnIn = 0, thIn = 0;
  let trauma = 0, fovKick = 0, roll = 0;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const seen: string[] = store.get("gtc:hints") ?? [];
  const playerOf = (pid: number) => pub?.players.find((q) => q[0] === pid);
  const colorOf = (pid: number) => { const q = playerOf(pid); return q ? COLORS[q[2]] : "#ffffff"; };
  const glyphOf = (pid: number) => { const q = playerOf(pid); return q ? GLYPHS[q[2]] : "?"; };
  const nameOf = (pid: number) => { const q = playerOf(pid); return q ? `${GLYPHS[q[2]]} ${q[1]}` : ""; };
  const send = (m: object) => conn?.send(m);
  // QA hook (?debug): read-only view of what this phone already knows, for scripted playtests.
  if (new URLSearchParams(location.search).has("debug")) Object.assign(window, { __gtc: { get me() { return me; }, get pub() { return pub; }, get h() { return localH; }, get ents() { return [...(frames.at(-1)?.ents.values() ?? [])]; }, get info() { return { ...renderer.info.render, ...renderer.info.memory, programs: renderer.info.programs?.length }; } } });

  function showHint(k: keyof typeof HINTS) {
    if (seen.includes(k)) return;
    seen.push(k);
    store.set("gtc:hints", seen);
    hint.textContent = HINTS[k];
    hint.classList.remove("hidden");
    setTimeout(() => hint.classList.add("hidden"), 4000);
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
  joinBtn.onclick = join;
  nameIn.onkeydown = (e) => { if (e.key === "Enter") join(); }; // a `false` return would cancel every other key
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
    ticker.textContent = p.ticker.at(-1) ?? "";
    sector.textContent = SECTORS[p.sector].name;
    paused.classList.toggle("hidden", p.st !== "paused");
    if (p.st === "lobby") {
      waitScr.innerHTML = `<h1>GRAND THEFT COSMOS</h1>${rulesCard(p.target)}<p class="sec">Sector: ${SECTORS[p.sector].name} — ${SECTORS[p.sector].desc}</p><p class="muted">${p.players.length} in the room · waiting for the host to start…</p>`;
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
      if (me.score > prev.score) replay(xpM.row, "punch"); // ring and station income lands here too
      if (me.level > prev.level) {
        popup(popLv, `LEVEL ${me.level}!`);
        replay(lvl, "punch");
      }
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
      case "dead":
        navigator.vibrate?.(250);
        trauma = 1;
        boom(colorOf(id?.pid ?? 0), sp.x, sp.z);
        break;
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

  function hud10(me: Me, s: Snap) {
    const hpF = me.hp / me.hpMax;
    hullM.fill.style.width = `${100 * hpF}%`;
    hullM.v.textContent = `${me.hp}`;
    hullM.row.classList.toggle("low", hpF < 0.3);
    holdM.fill.style.width = `${(100 * me.held) / me.hold}%`;
    holdM.v.textContent = `${me.held}/${me.hold}`;
    holdM.row.style.setProperty("--n", String(Math.round(me.hold / T.CRYSTAL)));
    holdM.row.classList.toggle("full", me.held >= me.hold);
    // Level and XP: XP is banked loot; every target/10 banked is a level (the first bank is Level 1).
    const step = (pub?.target ?? T.TARGETS[0]) / T.LEVELS, into = me.level ? me.score - (me.level - 1) * step : 0;
    lvl.textContent = `Level ${me.level}`;
    xpM.fill.style.width = `${(100 * into) / step}%`;
    xpM.v.textContent = me.level ? `${Math.floor(into)}/${step}` : "bank!";
    pickBadge.classList.toggle("hidden", !me.offer);
    if (pub) {
      const lead = Math.max(...pub.players.map((q) => q[3])), mine = colorOf(id?.pid ?? 0);
      raceMe.style.left = raceFill.style.width = `${Math.min(100, (100 * me.score) / pub.target)}%`;
      raceMe.style.background = raceFill.style.background = mine;
      raceLead.style.left = `${Math.min(100, (100 * lead) / pub.target)}%`;
      raceLead.classList.toggle("hidden", lead <= me.score);
      racet.textContent = `banked ${me.score}/${pub.target} · ${lead > me.score ? `leader ${lead}` : me.score ? "you lead" : `first to ${pub.target} wins`}`;
    }
    goal.textContent =
      me.state !== "alive" ? "" :
      me.crown ? "Crown! Fly HOME to bank it" :
      me.held >= me.hold ? "Hold full — fly HOME to bank" :
      me.held >= me.hold / 2 ? `Fly HOME to bank +${me.held}` :
      me.held ? `Grab more loot, or bank at HOME` : "Fly over glowing crystals";
    // Context line: ring capture, build progress, nearby target HP
    const vaultE = s.ents.find((e) => e[1] === K.VAULT && Math.hypot(e[2] - me.x, e[3] - me.z) < 420);
    const stn = s.ents.find((e) => e[1] === K.STATION && e[5] !== id?.pid && Math.hypot(e[2] - me.x, e[3] - me.z) < 360);
    info.textContent =
      me.build >= 0 ? `BUILDING ${Math.round(me.build * 100)}% — hold still` :
      me.ring && me.ring[0] !== id?.pid ? (me.ring[2] ? "RING CONTESTED" : me.shield > 0 ? "Shielded — can't claim rings" : `CLAIMING RING ${Math.round(me.ring[1] * 100)}%`) :
      me.shield > 0 ? `Shield ${Math.ceil(me.shield)}s · firing drops it` :
      stn ? `Station ${stn[6]} HP — shoot to steal` : vaultE ? `VAULT ${vaultE[6]}/${T.VAULT_HP} — shoot to crack` : "";
    // The ring we're claiming fills at 10 Hz (the public view only updates at 1 Hz).
    if (me.ring && me.ring[1] > 0) for (const r of rings.values()) if (Math.hypot(r.obj.position.x - me.x, r.obj.position.z - me.z) <= T.RING_R + 1) r.setProg(me.ring[1], colorOf(id?.pid ?? 0));
    buildB.classList.toggle("on", !!me.canBuild);
    if (me.boostCd > boostMax || me.boostCd === 0) boostMax = Math.max(me.boostCd, 0.1);
    const pct = me.boostCd > 0 ? 100 - (100 * me.boostCd) / boostMax : 100;
    boostB.style.background = `conic-gradient(rgba(46,230,230,.7) ${pct}%, rgba(18,40,74,.85) 0)`;
    over.classList.toggle("hidden", me.state === "alive");
    over.textContent = me.state === "dead" ? `Destroyed — ${me.respawnIn}` : me.state === "stasis" ? "Stasis" : "";
    // Perk cards
    const sig = JSON.stringify(me.offer);
    if (perks.dataset.sig !== sig) {
      perks.dataset.sig = sig;
      perks.replaceChildren(el("h4", { textContent: `LEVEL UP — PICK ONE${me.picks > 1 ? ` (${me.picks} picks)` : ""}` }), el("div", {}, ...(me.offer ?? []).map((pid: PerkId, k: number) =>
        el("button", { onclick: () => send({ t: "act", a: "perk", k }) }, el("b", { textContent: PERKS[pid].name }), PERKS[pid].desc))));
      perks.classList.toggle("hidden", !me.offer);
    }
    // Hints
    if (me.held >= me.hold) showHint("full");
    if (me.ring) showHint("ring");
    if (me.state === "alive" && me.hp < me.hpMax * 0.3) showHint("hull");
    if (me.canBuild && me.level > 0) showHint("build");
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
    c.fillStyle = "rgba(46,230,230,.07)"; // forward cone
    c.beginPath();
    c.moveTo(R, R);
    c.arc(R, R, R, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
    c.fill();
    c.strokeStyle = "rgba(46,230,230,.22)";
    c.lineWidth = 1;
    c.beginPath();
    c.arc(R, R, T.RADAR * k, 0, TAU);
    c.stroke();
    if (pub) {
      for (const f of pub.fields) dot(f[1], f[2], T.FIELD_R * k, `rgba(127,255,212,${0.1 + 0.15 * f[4]})`);
      for (const r of pub.rings) dot(r[1], r[2], T.RING_R * k, r[3] ? colorOf(r[3]) : "#3a5a88", true);
      for (const q of pub.players) if (q[0] !== id?.pid) dot(q[6], q[7], 5, COLORS[q[2]], true);
      for (const st of pub.stations) { const [x, y] = P(st[1], st[2]); c.fillStyle = colorOf(st[3]); c.fillRect(x - 3, y - 3, 6, 6); }
      const [vx, vy] = P(0, 0);
      c.fillStyle = "#ffd23f";
      c.beginPath();
      c.moveTo(vx, vy - 5); c.lineTo(vx + 5, vy); c.lineTo(vx, vy + 5); c.lineTo(vx - 5, vy);
      if (pub.vault > 0) c.fill(); else { c.strokeStyle = "#ffd23f"; c.stroke(); }
      if (pub.crown) dot(pub.crown[0], pub.crown[1], 4, "#ffd23f");
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
      c.strokeStyle = "#060b1a";
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
    const names = e.table.filter((r) => e.winner.includes(r[0])).map((r) => r[1]);
    endScr.replaceChildren(el("h1", { textContent: `${names.join(" & ") || "Nobody"} WIN${names.length === 1 ? "S" : ""}!` }),
      el("table", {}, el("tr", {}, ...["#", "Player", "Banked", "Kills", "Stolen", "Stations"].map((h) => el("th", { textContent: h }))),
        ...e.table.map((r, i) => el("tr", { style: { color: COLORS[r[2]] } }, ...[i + 1, `${GLYPHS[r[2]]} ${r[1]}`, r[3], r[4], r[5], r[6]].map((v) => el("td", { textContent: String(v) }))))),
      el("button", { textContent: "Home", onclick: () => (location.href = "/") }));
    endScr.classList.remove("hidden");
    conn?.stop();
  }

  // ---------- Controls ----------
  joyZone.onpointerdown = (e) => {
    if (joy.id >= 0) return;
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
    Object.assign(joy, { id: -1, x: 0, y: 0 });
    joyEl.classList.add("hidden");
    (joyEl.firstChild as HTMLElement).style.transform = "";
  };
  const press = (b: HTMLElement, down: () => void, up?: () => void) => {
    b.onpointerdown = (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add("down"); down(); };
    b.onpointerup = b.onpointercancel = () => { b.classList.remove("down"); up?.(); };
    b.oncontextmenu = (e) => e.preventDefault();
  };
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
    const jx = joy.id >= 0 ? joy.x : kx, jy = joy.id >= 0 ? joy.y : ky;
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
    // Interpolate 100 ms in the past between the two snapshots around render time.
    const rms = now + clockOff - 100;
    let a = frames[0], b = frames[frames.length - 1];
    for (const f of frames) if (f.ms <= rms) a = f;
    b = frames.find((f) => f.ms > rms) ?? a;
    const u = b === a ? 0 : Math.min(1, Math.max(0, (rms - a.ms) / (b.ms - a.ms)));
    const L = (p: number, q: number) => p + (q - p) * u;
    const px = L(a.me.x, b.me.x), pz = L(a.me.z, b.me.z);
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
    obj.classList.toggle("hidden", !best);
    arrow3.obj.visible = !!best && bd > 60;
    radarGoal = null;
    if (!best) return;
    const [x, z] = best as [number, number], ang = Math.atan2(z - pz, x - px), c = home ? M.GOLD_C : M.LOOT_C;
    radarGoal = [x, z, c];
    // The 3D arrow hovers over the ship and points where you'd fly; it nudges toward the target to show motion.
    const rel = wrap(ang - localH), nudge = 4 + Math.sin(t * 5) * 4;
    arrow3.setColor(c);
    arrow3.obj.position.set(px, 18, pz);
    arrow3.obj.rotation.y = -localH;
    arrow3.mesh.rotation.y = -rel;
    arrow3.mesh.position.set(Math.cos(rel) * nudge, 0, Math.sin(rel) * nudge);
    obj.classList.toggle("loot", !home);
    objSvg.style.transform = `rotate(${wrap(ang - localH)}rad)`;
    objT.textContent = home ? "HOME" : "LOOT";
    objD.textContent = `${Math.round(bd)}`;
  }

  /** HOME tag over your HQ when it's on screen; pinned to an ellipse around the ship, pointing at it, when it isn't. */
  function homeMarker(px: number, pz: number) {
    const q = playerOf(id?.pid ?? 0);
    const d = q ? Math.hypot(q[6] - px, q[7] - pz) : 0;
    if (!q || !me || me.state === "dead" || d < T.HQ_R) return void homeMk.classList.add("hidden");
    homeMk.classList.remove("hidden");
    homeAmt.textContent = me.held || me.crown ? `+${me.held}${me.crown ? " ♛" : ""}` : "";
    const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2;
    v3.set(q[6], 50, q[7]).applyMatrix4(camera.matrixWorldInverse);
    let dx: number, dy: number, on = false;
    if (v3.z < 0) {
      v3.applyMatrix4(camera.projectionMatrix);
      [dx, dy] = [(v3.x * W) / 2, (-v3.y * H) / 2];
      on = Math.abs(dx) < cx - 30 && Math.abs(dy) < cy - 30;
    } else [dx, dy] = [v3.x, Math.abs(v3.z) + 1]; // behind the camera: bottom of the screen, on the correct side
    if (!on) {
      const rx = cx - 70, ry = cy - 56, k = 1 / Math.hypot(dx / rx, dy / ry);
      [dx, dy] = [dx * k, dy * k];
      chev.style.transform = `rotate(${Math.atan2(dx, -dy)}rad)`;
    }
    homeMk.classList.toggle("on", on);
    homeMk.style.transform = `translate(${cx + dx}px, ${cy + dy}px) translate(-50%, -11px)`;
  }
}
