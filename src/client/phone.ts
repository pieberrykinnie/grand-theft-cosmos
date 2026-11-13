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
.hud { position: absolute; inset: 0; pointer-events: none; font-size: 14px; text-shadow: 0 0 4px #000; }
.tl { position: absolute; left: max(12px, env(safe-area-inset-left)); top: 10px; width: 170px; display: grid; gap: 5px; }
.meter { position: relative; height: 16px; background: rgba(18,40,74,.8); border-radius: 4px; overflow: hidden; }
.meter i { position: absolute; inset: 0 auto 0 0; background: #3ddc97; } .meter.hold i { background: #7fffd4; }
.meter span { position: relative; padding-left: 6px; font-size: 12px; line-height: 16px; }
.pick { color: #060b1a; background: var(--gold); padding: 1px 6px; border-radius: 4px; margin-left: 6px; }
.tc { position: absolute; left: 50%; top: 6px; transform: translateX(-50%); text-align: center; width: 240px; }
.arrow { font-size: 34px; line-height: 38px; color: var(--gold); display: inline-block; }
.alabel { font-weight: bold; color: var(--gold); }
.race { position: relative; height: 6px; background: rgba(18,40,74,.8); border-radius: 3px; margin-top: 4px; }
.race i { position: absolute; top: -3px; width: 4px; height: 12px; border-radius: 2px; }
.racet { font-size: 11px; color: var(--dim); }
.info { color: var(--cyan); font-size: 13px; }
.radar { position: absolute; right: max(10px, env(safe-area-inset-right)); top: 8px; width: 140px; height: 140px; border-radius: 50%; background: rgba(6,11,26,.6); border: 1px solid rgba(46,230,230,.4); }
.bc { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); text-align: center; width: 40%; font-size: 12px; }
.bc .sec { color: var(--cyan); }
.btns { position: absolute; right: max(14px, env(safe-area-inset-right)); bottom: 14px; display: grid; grid-template-columns: 76px 112px; grid-template-rows: 76px 76px; gap: 10px; pointer-events: auto; }
.btns button { border-radius: 50%; padding: 0; font-weight: bold; font-size: 13px; color: #fff; background: rgba(18,40,74,.85); border: 2px solid var(--cyan); }
.btns .fire { grid-column: 2; grid-row: 1 / 3; align-self: end; width: 112px; height: 112px; background: rgba(255,77,109,.85); border-color: #ff9fb0; font-size: 18px; }
.btns .boost { grid-column: 1; grid-row: 2; } .btns .build { grid-column: 1; grid-row: 1; opacity: .3; } .btns .build.on { opacity: 1; background: rgba(61,220,151,.85); }
.btns button.down { filter: brightness(1.5); }
.toast, .hint { position: absolute; left: 50%; transform: translateX(-50%); padding: 6px 14px; border-radius: 8px; background: rgba(6,11,26,.8); white-space: nowrap; }
.toast { top: 38%; font-size: 18px; color: var(--gold); } .hint { top: 52%; font-size: 16px; color: var(--cyan); border: 1px solid var(--cyan); }
.vig { position: absolute; inset: 0; box-shadow: inset 0 0 90px 30px rgba(255,40,60,.75); opacity: 0; transition: opacity .35s; }
.vig.on { opacity: 1; transition: none; }
.perks { position: absolute; right: 230px; bottom: 14px; display: flex; gap: 10px; pointer-events: auto; }
.perks button { width: 150px; min-height: 96px; background: rgba(255,210,63,.95); text-align: left; font-size: 14px; }
.perks button b { display: block; font-size: 16px; }
.over { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 32px; color: var(--red); text-align: center; pointer-events: none; }
#rotate { display: none; } @media (orientation: portrait) { #rotate.want { display: flex; } }
.endscr table { border-collapse: collapse; font-size: 15px; } .endscr td, .endscr th { padding: 3px 10px; text-align: right; } .endscr td:nth-child(2) { text-align: left; }
`;

type Me = Snap["me"];
interface Frame { ms: number; me: Me; ents: Map<number, number[]> }
const HINTS = {
  full: "Hold full — go home", bank: "Banked! Pick a perk", ring: "Stay inside to claim it",
  fire: "Shooting shows you on the big screen", hull: "Run home — you'll drop your loot", build: "BUILD: plant a station here",
};
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const store = {
  get: (k: string) => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } },
  set: (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

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
  const hullM = el("div", { className: "meter" }, el("i"), el("span", { textContent: "HULL" }));
  const holdM = el("div", { className: "meter hold" }, el("i"), el("span", { textContent: "HOLD" }));
  const lvl = el("div"), pickBadge = el("span", { className: "pick hidden", textContent: "PICK A PERK" });
  const arrow = el("div", { className: "arrow", textContent: "▲" }), alabel = el("div", { className: "alabel" });
  const raceMe = el("i"), raceLead = el("i", { style: { background: "#fff" } }), racet = el("div", { className: "racet" });
  const info = el("div", { className: "info" });
  const radar = el("canvas", { className: "radar", width: 140, height: 140 });
  const ticker = el("div"), sector = el("div", { className: "sec" });
  const fireB = el("button", { className: "fire", textContent: "FIRE" }), boostB = el("button", { className: "boost", textContent: "BOOST" }), buildB = el("button", { className: "build", textContent: "BUILD" });
  const toast = el("div", { className: "toast hidden" }), hint = el("div", { className: "hint hidden" }), vig = el("div", { className: "vig" });
  const perks = el("div", { className: "perks hidden" });
  const over = el("div", { className: "over hidden" });
  const hud = el("div", { className: "hud" }, vig,
    el("div", { className: "tl" }, hullM, holdM, el("div", {}, lvl, pickBadge)),
    el("div", { className: "tc" }, arrow, alabel, el("div", { className: "race" }, raceLead, raceMe), racet, info),
    radar, el("div", { className: "bc" }, ticker, sector), toast, hint, over);
  const game = el("div", { className: "game hidden" }, renderer.domElement, joyZone, joyEl, hud, el("div", { className: "btns" }, buildB, boostB, fireB), perks);
  const lost = el("div", { className: "full veil hidden", innerHTML: "<h1>Tap to resume</h1>", onclick: () => location.reload() });
  app.append(game, joinScr, waitScr, endScr, paused, msgScr, down, rotate, lost);
  renderer.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); lost.classList.remove("hidden"); });

  // ---------- State ----------
  let pub: Pub | null = null, me: Me | null = null, frames: Frame[] = [], clockOff = NaN;
  let localH = 0, syncH = true, wasDead = false, playing = false;
  const joy = { id: -1, x: 0, y: 0, ox: 0, oy: 0 };
  let firing = false, lastSend = 0, lastIn = "", boostMax = 1, shake = 0;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const seen: string[] = store.get("gtc:hints") ?? [];
  const colorOf = (pid: number) => { const q = pub?.players.find((q) => q[0] === pid); return q ? COLORS[q[2]] : "#ffffff"; };
  const send = (m: object) => conn?.send(m);

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

  // ---------- Structures from pub (1 Hz) ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#060b1a");
  scene.fog = new THREE.Fog("#060b1a", 380, 1150);
  const camera = new THREE.PerspectiveCamera(62, 1, 1, 4000);
  scene.add(new THREE.HemisphereLight("#9fb6ff", "#1a1030", 1.4));
  const sun = new THREE.DirectionalLight("#ffffff", 1.6);
  sun.position.set(0.4, 1, 0.3);
  scene.add(sun);
  const stars = M.stars();
  scene.add(stars);
  const lootMesh = M.loot(800), boltMesh = M.bolts(500), vault = M.vault(), crown = M.crown();
  scene.add(lootMesh, boltMesh, vault, crown);
  const myShip = M.ship("#ffffff");
  scene.add(myShip.group);
  let world: THREE.Object3D | null = null;
  const hqs = new Map<string, THREE.Object3D>(), rings = new Map<string, THREE.Object3D>(), fields = new Map<string, THREE.Object3D>(), stations = new Map<string, THREE.Object3D>();
  const ships = new Map<number, M.ShipModel>();
  const booms: { obj: THREE.Object3D; tick(dt: number): boolean }[] = [];

  /** Keyed diff: create what's new, drop what's gone. */
  function sync(map: Map<string, THREE.Object3D>, items: [string, () => THREE.Object3D][]) {
    const keep = new Set(items.map((i) => i[0]));
    for (const [k, o] of map) if (!keep.has(k)) { scene.remove(o); map.delete(k); }
    for (const [k, make] of items) if (!map.has(k)) { const o = make(); map.set(k, o); scene.add(o); }
  }
  const at = (o: THREE.Object3D, x: number, z: number) => { o.position.set(x, 0, z); return o; };

  function onPub(p: Pub) {
    pub = p;
    if (p.R && !world) {
      const grid = new THREE.GridHelper(p.R * 2, Math.round(p.R / 50), "#12385a", "#0b2240");
      grid.position.y = -24;
      const rim = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 128 }, (_, i) => new THREE.Vector3(Math.cos((i / 128) * Math.PI * 2) * p.R, -20, Math.sin((i / 128) * Math.PI * 2) * p.R))), new THREE.LineBasicMaterial({ color: "#2ee6e6" }));
      world = new THREE.Group().add(grid, rim);
      scene.add(world);
    }
    sync(hqs, p.players.map((q) => [`${q[0]}:${q[2]}`, () => at(M.hq(COLORS[q[2]]), q[6], q[7])]));
    sync(rings, p.rings.map((r) => [`${r[0]}:${r[3]}`, () => {
      const m = at(M.ring(), r[1], r[2]) as THREE.Mesh;
      if (r[3]) (m.material as THREE.MeshLambertMaterial).color.set(colorOf(r[3]));
      return m;
    }]));
    sync(fields, p.fields.map((f) => [`${f[0]}`, () => at(M.field(f[0]), f[1], f[2])]));
    sync(stations, p.stations.map((s) => [`${s[0]}:${s[3]}`, () => at(M.station(colorOf(s[3])), s[1], s[2])]));
    const cracked = p.vault <= 0;
    vault.getObjectByName("a")!.position.z = cracked ? 45 : T.VAULT_R * 0.2;
    vault.getObjectByName("b")!.position.z = cracked ? -45 : -T.VAULT_R * 0.2;
    crown.visible = !!p.crown && !p.crown[2];
    if (p.crown) at(crown, p.crown[0], p.crown[1]).position.y = 10;
    ticker.textContent = p.ticker.at(-1) ?? "";
    sector.textContent = SECTORS[p.sector].name;
    paused.classList.toggle("hidden", p.st !== "paused");
    if (p.st === "lobby") {
      waitScr.innerHTML = `<h1>GRAND THEFT COSMOS</h1>${rulesCard(p.target)}<p class="sec">Sector: ${SECTORS[p.sector].name} — ${SECTORS[p.sector].desc}</p><p class="muted">${p.players.length} in the room · waiting for the host to start…</p>`;
      waitScr.classList.remove("hidden");
    } else waitScr.classList.add("hidden");
    if (p.st === "play" || p.st === "paused") startPlaying();
    myShip.hull.material = shipMat(id?.pid ?? 0);
  }
  const mats = new Map<string, THREE.Material>();
  function shipMat(pid: number) {
    const c = colorOf(pid);
    if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: c, flatShading: true, emissive: new THREE.Color(c).multiplyScalar(0.35) }));
    return mats.get(c)!;
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
    hud10(me, s);
  }

  function boom(color: string, x: number, z: number) {
    const b = M.explosion(color, x, z);
    scene.add(b.obj);
    booms.push(b);
  }

  function onEv(m: { kind: string; text: string }) {
    if (m.kind === "hit") {
      navigator.vibrate?.(40);
      vig.classList.add("on");
      setTimeout(() => vig.classList.remove("on"), 120);
      if (!reduceMotion) shake = 0.25;
      return;
    }
    if (m.kind === "dead") {
      navigator.vibrate?.(250);
      if (me) boom(colorOf(id?.pid ?? 0), me.x, me.z);
    }
    if (m.kind === "bank") showHint("bank");
    if (m.text) say(m.text);
  }

  function hud10(me: Me, s: Snap) {
    (hullM.firstChild as HTMLElement).style.width = `${(100 * me.hp) / me.hpMax}%`;
    (hullM.lastChild as HTMLElement).textContent = `HULL ${me.hp}`;
    (holdM.firstChild as HTMLElement).style.width = `${(100 * me.held) / me.hold}%`;
    (holdM.lastChild as HTMLElement).textContent = `HOLD ${me.held}/${me.hold}${me.crown ? " ♛" : ""}`;
    lvl.textContent = `L${me.level}`;
    pickBadge.classList.toggle("hidden", !me.offer);
    if (pub) {
      const lead = Math.max(...pub.players.map((q) => q[3]));
      raceMe.style.left = `${Math.min(100, (100 * me.score) / pub.target)}%`;
      raceMe.style.background = colorOf(id?.pid ?? 0);
      raceLead.style.left = `${Math.min(100, (100 * lead) / pub.target)}%`;
      racet.textContent = `you ${me.score} · lead ${lead} · goal ${pub.target}`;
    }
    // Context line: ring capture, build progress, nearby target HP
    const vaultE = s.ents.find((e) => e[1] === K.VAULT && Math.hypot(e[2] - me.x, e[3] - me.z) < 420);
    const stn = s.ents.find((e) => e[1] === K.STATION && e[5] !== id?.pid && Math.hypot(e[2] - me.x, e[3] - me.z) < 360);
    info.textContent =
      me.build >= 0 ? `BUILDING ${Math.round(me.build * 100)}% — hold still` :
      me.ring && me.ring[0] !== id?.pid ? (me.ring[2] ? "RING CONTESTED" : me.shield > 0 ? "Shielded — can't claim yet" : `CLAIMING ${Math.round(me.ring[1] * 100)}%`) :
      me.shield > 0 ? `Shield ${Math.ceil(me.shield)}s` :
      stn ? `Station ${stn[6]} HP — shoot to steal` : vaultE ? `VAULT ${vaultE[6]}/${T.VAULT_HP}` : "";
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
      perks.replaceChildren(...(me.offer ?? []).map((pid: PerkId, k: number) =>
        el("button", { onclick: () => send({ t: "act", a: "perk", k }) }, el("b", { textContent: PERKS[pid].name }), PERKS[pid].desc)));
      perks.classList.toggle("hidden", !me.offer);
    }
    // Hints
    if (me.held >= me.hold) showHint("full");
    if (me.ring) showHint("ring");
    if (me.state === "alive" && me.hp < me.hpMax * 0.3) showHint("hull");
    if (me.canBuild && me.level > 0) showHint("build");
    drawRadar(me, s);
  }

  function drawRadar(me: Me, s: Snap) {
    const c = radar.getContext("2d")!, R = 70, k = R / 600;
    c.clearRect(0, 0, 140, 140);
    c.save();
    c.beginPath();
    c.arc(R, R, R, 0, Math.PI * 2);
    c.clip();
    c.translate(R, R);
    c.rotate(-Math.PI / 2 - localH); // heading-up
    const dot = (x: number, z: number, r: number, color: string, hollow = false) => {
      c.beginPath();
      c.arc((x - me.x) * k, (z - me.z) * k, r, 0, Math.PI * 2);
      if (hollow) { c.strokeStyle = color; c.lineWidth = 1.5; c.stroke(); } else { c.fillStyle = color; c.fill(); }
    };
    c.strokeStyle = "rgba(46,230,230,.25)";
    c.beginPath();
    c.arc(0, 0, T.RADAR * k, 0, Math.PI * 2);
    c.stroke();
    if (pub) {
      for (const f of pub.fields) dot(f[1], f[2], T.FIELD_R * k, "rgba(127,255,212,.18)");
      for (const r of pub.rings) dot(r[1], r[2], T.RING_R * k, r[3] ? colorOf(r[3]) : "#2a4466", true);
      for (const q of pub.players) dot(q[6], q[7], 5, COLORS[q[2]], q[0] !== id?.pid);
      for (const st of pub.stations) dot(st[1], st[2], 3.5, colorOf(st[3]));
      dot(0, 0, 5, "#ffd23f", pub.vault <= 0);
      if (pub.crown) dot(pub.crown[0], pub.crown[1], 4, "#ffd23f");
    }
    for (const e of s.ents) if (e[1] === K.SHIP) dot(e[2], e[3], 3.5, colorOf(e[5]));
    for (const b of s.blips) dot(b[0], b[1], 3.5, colorOf(b[2]), true);
    c.restore();
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
  const o3 = new THREE.Object3D(), col = new THREE.Color(), camLook = new THREE.Vector3();
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
    const sig = `${localH.toFixed(2)}|${th.toFixed(2)}|${+fire}`;
    if (pub?.st === "play" && ((sig !== lastIn && now - lastSend >= 1000 / T.INPUT_HZ) || now - lastSend >= T.HEARTBEAT_S * 1000)) {
      send({ t: "in", h: +localH.toFixed(3), th: +th.toFixed(2), f: fire ? 1 : 0 });
      [lastIn, lastSend] = [sig, now];
    }
    draw(now, dt);
  }
  requestAnimationFrame(frame);

  function draw(now: number, dt: number) {
    if (!frames.length || !me) return void renderer.render(scene, camera);
    // Interpolate 100 ms in the past between the two snapshots around render time.
    const rms = now + clockOff - 100;
    let a = frames[0], b = frames[frames.length - 1];
    for (const f of frames) if (f.ms <= rms) a = f;
    b = frames.find((f) => f.ms > rms) ?? a;
    const u = b === a ? 0 : Math.min(1, Math.max(0, (rms - a.ms) / (b.ms - a.ms)));
    const L = (p: number, q: number) => p + (q - p) * u;
    const px = L(a.me.x, b.me.x), pz = L(a.me.z, b.me.z);
    const t = now / 1000;

    // Own ship
    myShip.group.visible = b.me.state !== "dead";
    myShip.group.position.set(px, 0, pz);
    myShip.group.rotation.y = -localH;
    myShip.hull.scale.z = 1 + 0.25 * (me.perks.thick ?? 0);
    myShip.engine.scale.setScalar(8 + (20 * me.held) / me.hold + (me.boost ? 10 : 0));
    myShip.shield.visible = me.shield > 0;
    myShip.crown.visible = !!me.crown;

    // Other ships
    const present = new Set<number>();
    for (const e of b.ents.values()) {
      if (e[1] !== K.SHIP) continue;
      present.add(e[0]);
      let s = ships.get(e[0]);
      if (!s) {
        s = M.ship(colorOf(e[0]));
        ships.set(e[0], s);
        scene.add(s.group);
      }
      const ea = a.ents.get(e[0]) ?? e;
      s.group.position.set(L(ea[2], e[2]), 0, L(ea[3], e[3]));
      s.group.rotation.y = -(ea[4] + wrap(e[4] - ea[4]) * u);
      const aux = e[6];
      s.engine.scale.setScalar(8 + 2 * (aux & 15) + (aux & F.BOOST ? 10 : 0));
      s.shield.visible = !!(aux & (F.SHIELD | F.STASIS));
      s.crown.visible = !!(aux & F.CROWN);
      s.group.visible = true;
    }
    for (const [pid, s] of ships) if (!present.has(pid)) s.group.visible = false;

    // Loot (from the newest frame; it barely moves)
    let n = 0;
    for (const e of b.ents.values()) {
      if (e[1] !== K.LOOT || n >= lootMesh.instanceMatrix.count) continue;
      o3.position.set(e[2], Math.sin(t * 2 + e[0]) * 3, e[3]);
      o3.rotation.set(0, t * 2 + e[0], 0);
      o3.scale.setScalar(e[6] >= T.CRYSTAL ? 1 : 0.7);
      o3.updateMatrix();
      lootMesh.setMatrixAt(n++, o3.matrix);
    }
    lootMesh.count = n;
    lootMesh.instanceMatrix.needsUpdate = true;

    // Bolts: extrapolated along their heading from the newest frame
    const nb = frames[frames.length - 1], ahead = (rms - nb.ms) / 1000;
    n = 0;
    for (const e of nb.ents.values()) {
      if (e[1] !== K.BOLT || n >= 500) continue;
      o3.position.set(e[2] + Math.cos(e[4]) * 450 * ahead, 0, e[3] + Math.sin(e[4]) * 450 * ahead);
      o3.rotation.set(0, -e[4], 0);
      o3.scale.setScalar(1);
      o3.updateMatrix();
      boltMesh.setMatrixAt(n, o3.matrix);
      boltMesh.setColorAt(n++, col.set(colorOf(e[5])));
    }
    boltMesh.count = n;
    boltMesh.instanceMatrix.needsUpdate = true;
    if (boltMesh.instanceColor) boltMesh.instanceColor.needsUpdate = true;

    // Spinners, explosions
    for (const m of [...hqs.values(), ...stations.values()]) { const s = m.getObjectByName("spin"); if (s) s.rotation.z = t; }
    for (const r of rings.values()) r.rotation.z = t * 0.3;
    vault.rotation.y = t * 0.2;
    crown.rotation.y = t * 2;
    for (let i = booms.length - 1; i >= 0; i--) if (!booms[i].tick(dt)) { scene.remove(booms[i].obj); booms.splice(i, 1); }

    // Chase camera
    const fx = Math.cos(localH), fz = Math.sin(localH);
    const want = new THREE.Vector3(px - fx * 80, 40, pz - fz * 80);
    if (camera.position.distanceTo(want) > 400) camera.position.copy(want);
    else camera.position.lerp(want, 1 - Math.exp(-dt * 8));
    if (shake > 0) {
      shake -= dt;
      camera.position.x += (Math.random() - 0.5) * 6;
      camera.position.y += (Math.random() - 0.5) * 6;
    }
    camera.lookAt(camLook.set(px + fx * 70, 0, pz + fz * 70));
    stars.position.copy(camera.position);
    arrowTo(px, pz, b);
    renderer.render(scene, camera);
  }

  /** The tutorial: loot when the hold is under half, HOME when half full or carrying the Crown. */
  function arrowTo(px: number, pz: number, f: Frame) {
    if (!me || !pub || me.state !== "alive") {
      arrow.style.visibility = "hidden";
      alabel.textContent = "";
      return;
    }
    let best: [number, number] | null = null, bd = Infinity, label = "LOOT";
    const near = (x: number, z: number) => { const d = Math.hypot(x - px, z - pz); if (d < bd) [best, bd] = [[x, z], d]; };
    if (me.held >= me.hold / 2 || me.crown) {
      label = "HOME";
      for (const q of pub.players) if (q[0] === id?.pid) near(q[6], q[7]);
      for (const s of pub.stations) if (s[3] === id?.pid) near(s[1], s[2]);
    } else {
      for (const e of f.ents.values()) if (e[1] === K.LOOT) near(e[2], e[3]);
      if (!best) for (const fl of pub.fields) near(fl[1], fl[2]);
    }
    if (!best) {
      arrow.style.visibility = "hidden";
      alabel.textContent = "";
      return;
    }
    const [x, z] = best as [number, number];
    arrow.style.visibility = "visible";
    arrow.style.transform = `rotate(${wrap(Math.atan2(z - pz, x - px) - localH)}rad)`;
    alabel.textContent = `${label} ${Math.round(bd)}`;
  }
}
