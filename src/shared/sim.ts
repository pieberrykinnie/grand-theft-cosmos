// Pure game logic. No I/O, no clocks, no Math.random: the Room DO owns time and sockets.
import { F, K } from "./protocol";
import { BASE, PERKS, SECTORS, T, type Mod, type PerkId, type SectorId, type StatKey } from "./tuning";

export const COLORS = ["#ff4d6d", "#4dabff", "#ffd23f", "#3ddc97", "#c77dff", "#ff9f1c", "#2ee6e6", "#ff70d4", "#a3e635", "#f5f5f5", "#8d99ff", "#d4a373"];
export const GLYPHS = "ABCDEFGHJKMN";

export interface Player {
  id: number; sec: string; name: string; c: number;
  placed: boolean; hx: number; hz: number;
  x: number; z: number; h: number; vx: number; vz: number;
  hp: number; held: number; score: number; level: number; picks: number;
  offer: PerkId[] | null; perks: Partial<Record<PerkId, number>>;
  inH: number; inTh: number; inF: number;
  boostT: number; boostCd: number; fireCd: number; hqCd: number;
  lastDmg: number; hitBy: number; hitAt: number;
  dead: boolean; respawnAt: number; shieldUntil: number; stasis: boolean;
  conn: boolean; lastMsg: number; offFor: number;
  crown: boolean; build: number;
  kills: number; stolen: number; taken: number;
  pingAt: Record<string, number>;
}
export interface Ring { id: number; x: number; z: number; owner: number; prog: number; by: number; contested: boolean; payT: number }
export interface Field { id: number; x: number; z: number; home: boolean; made: number; t: number }
export interface Station { id: number; x: number; z: number; owner: number; hp: number; payT: number; cd: number }
export interface Loot { id: number; x: number; z: number; v: number; exp: number; f: number; from: number }
export interface Bolt { id: number; x: number; z: number; vx: number; vz: number; o: number; d: number; life: number; s?: 1 } // s: fired by a ship (not a turret)
export interface Ping { x: number; z: number; o: number; k: string; t: number }
export interface Out { to: number; kind: string; text: string; x?: number; z?: number; n?: number }
export interface Game {
  code: string; rs: number; target: number; sector: SectorId;
  state: "lobby" | "play" | "paused" | "over";
  t: number; W: number; R: number; nextId: number; hostTok: string;
  players: Player[]; kicked: number[];
  rings: Ring[]; fields: Field[]; stations: Station[]; loot: Loot[]; bolts: Bolt[];
  vault: { hp: number; lastDmg: number };
  crown: { x: number; z: number; by: number; since: number } | null;
  pings: Ping[]; ticker: string[]; out: Out[]; wild: number[];
  winners: number[]; reason: "" | "target" | "host";
}

const TAU = Math.PI * 2;
const EPS = 1e-9;
export const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const d2 = (ax: number, az: number, bx: number, bz: number) => (ax - bx) ** 2 + (az - bz) ** 2;
const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
const lerp = ([a, b]: number[], f: number) => a + (b - a) * f;

/** mulberry32 over g.rs, so the whole game (RNG included) is one serialisable object. */
export function rnd(g: Game): number {
  let t = (g.rs = (g.rs + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function seedOf(code: string): number {
  let h = 2166136261;
  for (const ch of code) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h | 0;
}

/** stat = base × sector × perks (+ adds). The only way sim reads a tunable. */
export function stat(g: Game, p: Player | null, k: StatKey): number {
  const s = SECTORS[g.sector] as Mod;
  let v = BASE[k] * (s.mul?.[k] ?? 1) + (s.add?.[k] ?? 0);
  if (p)
    for (const id in p.perks) {
      const d = PERKS[id as PerkId] as Mod, n = p.perks[id as PerkId]!;
      if (d.mul?.[k]) v *= d.mul[k]! ** n;
      if (d.add?.[k]) v += d.add[k]! * n;
    }
  return v;
}

export const byId = (g: Game, id: number) => g.players.find((p) => p.id === id);
const ticker = (g: Game, s: string) => { g.ticker.push(s); if (g.ticker.length > 8) g.ticker.shift(); };
const out = (g: Game, to: number, kind: string, text = "", at?: { x: number; z: number; n?: number }) => g.out.push({ to, kind, text, ...at });

export function createGame(code: string, target: number, sector: SectorId | "random", hostTok: string): Game {
  const g: Game = {
    code, rs: seedOf(code), target, sector: "calm", state: "lobby", t: 0, W: 0, R: 0, nextId: 1, hostTok,
    players: [], kicked: [], rings: [], fields: [], stations: [], loot: [], bolts: [],
    vault: { hp: T.VAULT_HP, lastDmg: -99 }, crown: null, pings: [], ticker: [], out: [], wild: [], winners: [], reason: "",
  };
  const pool = (Object.keys(SECTORS) as SectorId[]).filter((s) => s !== "calm");
  g.sector = sector === "random" ? pool[Math.floor(rnd(g) * pool.length)] : sector;
  return g;
}

export function addPlayer(g: Game, name: string, sec: string): Player | null {
  if (g.state === "over" || g.players.length >= T.MAX_PLAYERS) return null;
  let c = 0;
  while (g.players.some((q) => q.c === c)) c++;
  const p: Player = {
    id: g.nextId++, sec, name, c, placed: false, hx: 0, hz: 0, x: 0, z: 0, h: 0, vx: 0, vz: 0,
    hp: BASE.hull, held: 0, score: 0, level: 0, picks: 0, offer: null, perks: {},
    inH: 0, inTh: 0, inF: 0, boostT: 0, boostCd: 0, fireCd: 0, hqCd: 0, lastDmg: -99, hitBy: 0, hitAt: -99,
    dead: false, respawnAt: 0, shieldUntil: 0, stasis: false, conn: true, lastMsg: g.t, offFor: 0,
    crown: false, build: -1, kills: 0, stolen: 0, taken: 0, pingAt: {},
  };
  g.players.push(p);
  if (g.state !== "lobby") {
    placeHQ(g, p);
    spawn(g, p, T.ROOKIE_SHIELD);
    p.picks = T.LATE_PICKS;
    ticker(g, `${name} joined`);
  }
  return p;
}

export function removePlayer(g: Game, id: number): void {
  const p = byId(g, id);
  if (!p) return;
  dropCrown(g, p);
  for (const r of g.rings) if (r.owner === id) r.owner = 0;
  g.stations = g.stations.filter((s) => s.owner !== id);
  g.players = g.players.filter((q) => q !== p);
  g.kicked.push(id);
  ticker(g, `${p.name} was kicked`);
}

/** Empty wedge farthest from other HQs; if none is free, the midpoint of the widest gap on the rim. */
function placeHQ(g: Game, p: Player): void {
  const taken = g.players.filter((q) => q !== p && q.placed).map((q) => Math.atan2(q.hz, q.hx));
  let cands = Array.from({ length: g.W }, (_, i) => wrap((i * TAU) / g.W)).filter((a) => taken.every((b) => Math.abs(wrap(a - b)) > 1e-6));
  if (!cands.length) {
    const s = [...taken].sort((a, b) => a - b);
    cands = s.map((a, i) => wrap((a + (i + 1 < s.length ? s[i + 1] : s[0] + TAU)) / 2));
  }
  let best = cands[0], bestD = -1;
  for (const a of cands) {
    const d = Math.min(99, ...taken.map((b) => Math.abs(wrap(a - b))));
    if (d > bestD) [best, bestD] = [a, d];
  }
  p.hx = Math.cos(best) * T.HQ_AT * g.R;
  p.hz = Math.sin(best) * T.HQ_AT * g.R;
  p.placed = true;
}

function spawn(g: Game, p: Player, shield: number): void {
  Object.assign(p, { dead: false, x: p.hx, z: p.hz, vx: 0, vz: 0, boostT: 0, build: -1 });
  p.hp = stat(g, p, "hull");
  p.h = p.inH = Math.atan2(-p.hz, -p.hx);
  p.shieldUntil = Math.max(p.shieldUntil, g.t + shield);
}

function growCrystal(g: Game, f: Field): void {
  const a = rnd(g) * TAU, r = Math.sqrt(rnd(g)) * T.FIELD_R;
  g.loot.push({ id: g.nextId++, x: f.x + Math.cos(a) * r, z: f.z + Math.sin(a) * r, v: T.CRYSTAL, exp: 0, f: f.id, from: 0 });
  if (!f.home && (f.made += T.CRYSTAL) >= T.WILD_BUDGET) {
    g.fields = g.fields.filter((q) => q !== f);
    g.wild.push(g.t + T.WILD_REFORM);
    ticker(g, "A field ran dry");
  }
}

function addField(g: Game, x: number, z: number, home: boolean): void {
  const f: Field = { id: g.nextId++, x, z, home, made: 0, t: 0 };
  g.fields.push(f);
  // Start full, so a new player finds loot within seconds (GDD §3 one-minute promise).
  for (let i = home ? T.HOME_MAX : T.WILD_MAX; i > 0; i--) growCrystal(g, f);
}

export function startGame(g: Game): boolean {
  if (g.state !== "lobby" || !g.players.length) return false;
  const W = (g.W = Math.max(g.players.length, T.MIN_WEDGES));
  const R = (g.R = T.R0 + T.R_PER_WEDGE * W);
  const rr = lerp(T.RING_AT, rnd(g)) * R, wr = lerp(T.WILD_AT, rnd(g)) * R;
  for (let i = 0; i < W; i++) {
    const a = (i * TAU) / W, b = a + Math.PI / W;
    g.rings.push({ id: g.nextId++, x: Math.cos(a) * rr, z: Math.sin(a) * rr, owner: 0, prog: 0, by: 0, contested: false, payT: 0 });
    addField(g, Math.cos(a) * T.HOME_AT * R, Math.sin(a) * T.HOME_AT * R, true);
    addField(g, Math.cos(b) * wr, Math.sin(b) * wr, false);
  }
  g.state = "play";
  for (const p of g.players) {
    placeHQ(g, p);
    spawn(g, p, T.ROOKIE_SHIELD);
    p.lastMsg = g.t;
  }
  ticker(g, `Game on! First to ${g.target} wins`);
  return true;
}

export function hostEnd(g: Game): void {
  if (g.state === "over") return;
  const top = Math.max(0, ...g.players.map((p) => p.score));
  finish(g, "host", g.players.filter((p) => p.score === top).map((p) => p.id));
}
function finish(g: Game, reason: "target" | "host", winners: number[]): void {
  g.state = "over";
  g.reason = reason;
  g.winners = winners;
  ticker(g, `${winners.map((id) => byId(g, id)?.name).join(" & ") || "Nobody"} wins!`);
}

/** Any message from the player's socket. Ends stasis. */
export function touch(g: Game, p: Player): void {
  p.lastMsg = g.t;
  p.conn = true;
  p.offFor = 0;
  if (p.stasis) {
    p.stasis = false;
    p.shieldUntil = Math.max(p.shieldUntil, g.t + T.RECONNECT_SHIELD);
  }
}

export function input(g: Game, p: Player, h: number, th: number, f: 0 | 1): void {
  p.inH = wrap(h);
  p.inTh = clamp(th, T.TH_MIN, 1);
  p.inF = f;
}

export function act(g: Game, p: Player, a: "boost" | "build" | "perk", k?: 0 | 1): void {
  if (g.state !== "play") return;
  if (a === "perk") {
    const id = p.offer && k !== undefined ? p.offer[k] : undefined;
    if (!id) return;
    const hull = stat(g, p, "hull");
    p.perks[id] = (p.perks[id] ?? 0) + 1;
    if (!p.dead) p.hp += stat(g, p, "hull") - hull;
    p.picks--;
    p.offer = null;
    out(g, p.id, "perk", PERKS[id].name);
    return;
  }
  if (p.dead || p.stasis) return;
  if (a === "boost") {
    if (p.boostCd > 0 || p.crown) return;
    p.boostT = stat(g, p, "boostDur");
    p.boostCd = stat(g, p, "boostCd");
    if (!stat(g, p, "ghost")) ping(g, p, "boost");
  } else if (p.build < 0 && canBuild(g, p)) {
    p.build = 0;
    ping(g, p, "build");
  }
}

export function canBuild(g: Game, p: Player): boolean {
  if (g.state !== "play" || p.dead || p.stasis) return false;
  if (g.stations.filter((s) => s.owner === p.id).length >= T.STATION_MAX) return false;
  const gap = T.STATION_GAP ** 2, far = (x: number, z: number) => d2(p.x, p.z, x, z) >= gap;
  return far(0, 0) && g.players.every((q) => !q.placed || far(q.hx, q.hz)) && g.rings.every((r) => far(r.x, r.z)) && g.stations.every((s) => far(s.x, s.z));
}

function rollOffer(g: Game, p: Player): void {
  const avail = (Object.keys(PERKS) as PerkId[]).filter((id) => (p.perks[id] ?? 0) < PERKS[id].max);
  if (!avail.length) { p.picks = 0; return; }
  const a = avail.splice(Math.floor(rnd(g) * avail.length), 1)[0];
  p.offer = avail.length ? [a, avail[Math.floor(rnd(g) * avail.length)]] : [a];
}

function ping(g: Game, p: Player, k: string): void {
  if ((k === "fire" || k === "hit") && g.t - (p.pingAt[k] ?? -99) < T.FIRE_PING_EVERY) return;
  p.pingAt[k] = g.t;
  g.pings.push({ x: r1(p.x), z: r1(p.z), o: p.id, k, t: g.t });
}

const inOwnHQ = (p: Player) => p.placed && d2(p.x, p.z, p.hx, p.hz) <= T.HQ_R ** 2;
export const hittable = (g: Game, p: Player) => !p.dead && !p.stasis && g.t >= p.shieldUntil && !inOwnHQ(p);

function bank(g: Game, p: Player, amt: number): void {
  p.score += amt;
  // Level 1 on the first bank ("Banked! Pick a perk", GDD §3), then one per target/10.
  const lvl = p.score > 0 ? 1 + Math.floor(p.score / (g.target / T.LEVELS)) : 0;
  if (lvl > p.level) {
    p.picks += lvl - p.level;
    p.level = lvl;
  }
}

function spill(g: Game, x: number, z: number, amt: number, from: number): void {
  for (; amt > 0; amt -= T.CRYSTAL) {
    const a = rnd(g) * TAU, r = rnd(g) * 30;
    g.loot.push({ id: g.nextId++, x: x + Math.cos(a) * r, z: z + Math.sin(a) * r, v: Math.min(T.CRYSTAL, amt), exp: g.t + T.SPILL_LIFE, f: 0, from });
  }
}

function dropCrown(g: Game, p: Player): void {
  if (!p.crown || !g.crown) return;
  p.crown = false;
  Object.assign(g.crown, { x: p.x, z: p.z, by: 0, since: g.t });
  ticker(g, `${p.name} dropped the Crown`);
}

/** (fx, fz): a point the shot came from, so the victim's phone can show which side it was hit on. */
function damageShip(g: Game, q: Player, dmg: number, by: number, fx = q.x, fz = q.z): void {
  if (!hittable(g, q)) return;
  q.hp -= dmg;
  q.lastDmg = g.t;
  if (by && by !== q.id) [q.hitBy, q.hitAt] = [by, g.t];
  ping(g, q, "hit");
  out(g, q.id, "hit", "", { x: r1(fx), z: r1(fz) });
  if (q.hp > 0) return;
  Object.assign(q, { dead: true, hp: 0, respawnAt: g.t + T.RESPAWN_S, build: -1, boostT: 0, vx: 0, vz: 0 });
  const drop = Math.round(q.held * stat(g, q, "dropFrac"));
  q.held -= drop;
  spill(g, q.x, q.z, Math.round(drop * stat(g, null, "spillMul")), q.id);
  dropCrown(g, q);
  const killer = q.hitBy && g.t - q.hitAt <= T.KILL_WINDOW ? byId(g, q.hitBy) : undefined;
  if (killer) {
    killer.kills++;
    out(g, killer.id, "kill", `You destroyed ${q.name}`);
  }
  q.hitBy = 0;
  ping(g, q, "death");
  out(g, q.id, "dead", killer ? `Destroyed by ${killer.name}` : "Destroyed");
  ticker(g, killer ? `${killer.name} destroyed ${q.name}` : `${q.name} was destroyed`);
}

export const stationMax = (g: Game, s: Station) => stat(g, byId(g, s.owner) ?? null, "stationHp");

function damageStation(g: Game, s: Station, dmg: number, by: number): void {
  s.hp -= dmg;
  if (s.hp > 0) return;
  const a = byId(g, by), was = byId(g, s.owner)?.name ?? "someone";
  if (!a) { s.hp = 1; return; }
  if (g.stations.filter((q) => q.owner === by).length >= T.STATION_MAX) {
    g.stations = g.stations.filter((q) => q !== s);
    ticker(g, `${a.name} destroyed ${was}'s station`);
    return;
  }
  s.owner = by;
  s.hp = stationMax(g, s) * T.TAKEN_AT;
  s.payT = 0;
  a.taken++;
  ping(g, a, "capture");
  ticker(g, `${a.name} stole ${was}'s station`);
}

function damageVault(g: Game, dmg: number, by: number): void {
  const p = byId(g, by);
  g.vault.hp -= dmg;
  g.vault.lastDmg = g.t;
  if (p) ping(g, p, "vault"); // cracking is loud: every hit pings
  if (g.vault.hp > 0) return;
  g.vault.hp = 0;
  g.crown = { x: 0, z: 0, by: 0, since: g.t };
  ticker(g, `${p?.name ?? "Someone"} cracked the Vault! The Crown is out`);
}

/** Segment (s, s+d) vs circle: fraction along the segment of first contact, or -1. */
export function segHit(sx: number, sz: number, dx: number, dz: number, cx: number, cz: number, r: number): number {
  const fx = sx - cx, fz = sz - cz;
  const c = fx * fx + fz * fz - r * r;
  if (c <= 0) return 0;
  const a = dx * dx + dz * dz, b = 2 * (fx * dx + fz * dz), disc = b * b - 4 * a * c;
  if (!a || disc < 0) return -1;
  const s = (-b - Math.sqrt(disc)) / (2 * a);
  return s >= 0 && s <= 1 ? s : -1;
}

function shoot(g: Game, x: number, z: number, dir: number, d: number, range: number, o: number, ship = false): void {
  const v = BASE.boltSpeed;
  g.bolts.push({ id: g.nextId++, x, z, vx: Math.cos(dir) * v, vz: Math.sin(dir) * v, o, d, life: range / v, ...(ship ? { s: 1 as const } : {}) });
}

function nearestEnemy(g: Game, owner: number, x: number, z: number, r: number): Player | undefined {
  let best: Player | undefined, bd = r * r;
  for (const q of g.players) {
    const dd = d2(x, z, q.x, q.z);
    if (q.id !== owner && dd <= bd && hittable(g, q)) [best, bd] = [q, dd];
  }
  return best;
}

function turret(g: Game, owner: number, x: number, z: number, range: number, dps: number): boolean {
  const q = nearestEnemy(g, owner, x, z, range);
  if (!q) return false;
  const lead = Math.sqrt(d2(x, z, q.x, q.z)) / BASE.boltSpeed;
  shoot(g, x, z, Math.atan2(q.z + q.vz * lead - z, q.x + q.vx * lead - x), dps / T.TURRET_RATE, range * 1.5, owner);
  return true;
}

function aimDir(g: Game, p: Player): number {
  const cone = stat(g, p, "aimCone");
  let best = p.h, bd = stat(g, p, "range") ** 2;
  const consider = (x: number, z: number) => {
    const dd = d2(p.x, p.z, x, z), a = Math.atan2(z - p.z, x - p.x);
    if (dd < bd && Math.abs(wrap(a - p.h)) <= cone) [best, bd] = [a, dd];
  };
  for (const q of g.players) if (q !== p && hittable(g, q)) consider(q.x, q.z);
  for (const s of g.stations) if (s.owner !== p.id) consider(s.x, s.z);
  if (!g.crown) consider(0, 0);
  return best;
}

export function step(g: Game, dt: number): void {
  if (g.state !== "play") return;
  dt = clamp(dt, 0, T.MAX_DT);
  const t = (g.t += dt), P = g.players;

  for (const p of P) {
    // Offline after 6 s of silence (or a closed socket); stasis after 10 s offline.
    p.offFor = !p.conn || t - p.lastMsg > T.OFFLINE_S ? p.offFor + dt : 0;
    if (!p.stasis && p.offFor >= T.STASIS_S - EPS) {
      Object.assign(p, { stasis: true, vx: 0, vz: 0, build: -1, boostT: 0 });
      dropCrown(g, p);
    }
    if (p.dead && t >= p.respawnAt - EPS) spawn(g, p, T.RESPAWN_SHIELD);
    if (p.picks > 0 && !p.offer) rollOffer(g, p);
  }

  // Movement
  for (const p of P) {
    p.boostCd = Math.max(0, p.boostCd - dt);
    p.boostT = Math.max(0, p.boostT - dt);
    if (p.dead || p.stasis) continue;
    const turn = T.TURN * dt * T.TURN_SLACK;
    p.h = wrap(p.h + clamp(wrap(p.inH - p.h), -turn, turn));
    const boost = p.boostT > 0 ? stat(g, p, "boostMul") : 1, building = p.build >= 0;
    const acc = stat(g, p, "accel") * (building ? 0 : p.inTh) * boost;
    p.vx += Math.cos(p.h) * acc * dt;
    p.vz += Math.sin(p.h) * acc * dt;
    const k = Math.exp(-stat(g, p, "drag") * dt * (building ? 6 : 1));
    p.vx *= k;
    p.vz *= k;
    const cap = stat(g, p, "speed") * boost * (p.crown ? stat(g, null, "crownSpeed") : 1), sp = Math.hypot(p.vx, p.vz);
    if (sp > cap) [p.vx, p.vz] = [(p.vx * cap) / sp, (p.vz * cap) / sp];
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    const d = Math.hypot(p.x, p.z);
    if (d > g.R) {
      const nx = p.x / d, nz = p.z / d, o = p.vx * nx + p.vz * nz;
      [p.x, p.z] = [nx * g.R, nz * g.R];
      if (o > 0) [p.vx, p.vz] = [p.vx - o * nx, p.vz - o * nz];
    }
  }

  // Building: press BUILD, keep off the throttle, and the ship brakes; 5 s below speed 5 plants it.
  for (const p of P) {
    if (p.build < 0) continue;
    if (Math.abs(p.inTh) > 0.2) { p.build = -1; out(g, p.id, "info", "Build cancelled"); continue; }
    if (Math.hypot(p.vx, p.vz) < T.BUILD_SPEED) p.build += dt;
    if (p.build < T.BUILD_S - EPS) continue;
    p.build = -1;
    if (!canBuild(g, p)) { out(g, p.id, "info", "Can't build here"); continue; }
    g.stations.push({ id: g.nextId++, x: p.x, z: p.z, owner: p.id, hp: stat(g, p, "stationHp"), payT: 0, cd: 0 });
    ticker(g, `${p.name} built a station`);
  }

  // Firing
  for (const p of P) {
    p.fireCd -= dt;
    if (!p.inF || p.dead || p.stasis) { p.fireCd = Math.max(p.fireCd, 0); continue; }
    if (p.fireCd > EPS) continue;
    p.fireCd = Math.max(0, p.fireCd + 1 / stat(g, p, "fireRate"));
    if (t < p.shieldUntil) p.shieldUntil = 0; // firing drops your shield early
    ping(g, p, "fire");
    const dir = aimDir(g, p), guns = stat(g, p, "guns"), c = Math.cos(p.h), s = Math.sin(p.h);
    for (let i = 0; i < guns; i++) {
      const off = (i - (guns - 1) / 2) * 8;
      shoot(g, p.x + c * 12 - s * off, p.z + s * 12 + c * off, dir, stat(g, p, "dmg"), stat(g, p, "range"), p.id, true);
    }
  }

  // Turrets: HQs and stations shoot the nearest hittable enemy.
  for (const q of P) {
    q.hqCd = Math.max(0, q.hqCd - dt);
    if (q.placed && q.hqCd <= EPS && turret(g, q.id, q.hx, q.hz, T.HQ_R, stat(g, q, "hqDps"))) q.hqCd = 1 / T.TURRET_RATE;
  }
  for (const s of g.stations) {
    s.cd = Math.max(0, s.cd - dt);
    if (s.cd <= EPS && turret(g, s.owner, s.x, s.z, T.STATION_RANGE, stat(g, byId(g, s.owner) ?? null, "stationDps"))) s.cd = 1 / T.TURRET_RATE;
  }

  // Bolts: swept segment vs circle each tick, so fast bolts can't tunnel.
  const flying: Bolt[] = [];
  for (const b of g.bolts) {
    const dx = b.vx * dt, dz = b.vz * dt;
    let best = 2, hit: (() => void) | null = null, what = "";
    const test = (x: number, z: number, r: number, kind: string, fn: () => void) => {
      const s = segHit(b.x, b.z, dx, dz, x, z, r);
      if (s >= 0 && s < best) [best, hit, what] = [s, fn, kind];
    };
    const fx = b.x - b.vx * 0.2, fz = b.z - b.vz * 0.2;
    for (const q of P) if (q.id !== b.o && hittable(g, q)) test(q.x, q.z, T.SHIP_R, "ship", () => damageShip(g, q, b.d, b.o, fx, fz));
    for (const s of g.stations) if (s.owner !== b.o) test(s.x, s.z, T.STATION_R, "station", () => damageStation(g, s, b.d, b.o));
    if (!g.crown) test(0, 0, T.VAULT_R, "vault", () => damageVault(g, b.d, b.o));
    if (hit) {
      (hit as () => void)();
      // Hit marker for the shooter's phone only: where it landed and for how much.
      if (b.s) out(g, b.o, "dealt", what, { x: r1(b.x + dx * best), z: r1(b.z + dz * best), n: Math.round(b.d) });
      continue;
    }
    b.x += dx;
    b.z += dz;
    if ((b.life -= dt) > 0) flying.push(b);
  }
  g.bolts = flying;

  for (const p of P) {
    if (p.dead || p.stasis) continue;
    const max = stat(g, p, "hull");
    p.hp = Math.min(max, p.hp + (t - p.lastDmg >= stat(g, p, "regenDelay") - EPS ? stat(g, p, "regen") * dt : 0));
    // Pickup
    const hold = stat(g, p, "hold"), pr = stat(g, p, "pickup");
    for (const l of g.loot) {
      if (p.held >= hold) break;
      if (l.v <= 0 || d2(p.x, p.z, l.x, l.z) > pr * pr) continue;
      const take = Math.min(l.v, hold - p.held);
      l.v -= take;
      p.held += take;
      if (l.from && l.from !== p.id) p.stolen += take;
    }
    if (g.crown && !g.crown.by && d2(p.x, p.z, g.crown.x, g.crown.z) <= (pr + 15) ** 2) {
      g.crown.by = p.id;
      p.crown = true;
      p.boostT = 0;
      ticker(g, `${p.name} grabbed the Crown!`);
    }
    // Banking: automatic inside your HQ or one of your stations.
    if (!p.held && !p.crown) continue;
    if (!inOwnHQ(p) && !g.stations.some((s) => s.owner === p.id && d2(p.x, p.z, s.x, s.z) <= T.BANK_R ** 2)) continue;
    let amt = p.held;
    p.held = 0;
    if (p.crown) {
      amt += Math.round(stat(g, null, "crownValue") * g.target);
      p.crown = false;
      g.crown = null;
      g.vault = { hp: T.VAULT_HP, lastDmg: -99 };
      ticker(g, `${p.name} banked the Crown!`);
    }
    bank(g, p, amt);
    if (!stat(g, p, "ghost")) ping(g, p, "bank");
    out(g, p.id, "bank", `Banked +${amt}`);
  }
  g.loot = g.loot.filter((l) => l.v > 0 && (!l.exp || l.exp > t));

  // Rings: alone inside for 10 s claims; contested freezes; empty decays.
  for (const r of g.rings) {
    const ids = new Set<number>();
    for (const p of P) if (!p.dead && !p.stasis && t >= p.shieldUntil && d2(p.x, p.z, r.x, r.z) <= T.RING_R ** 2) ids.add(p.id);
    r.contested = ids.size > 1;
    const solo = ids.size === 1 ? [...ids][0] : 0;
    if (solo && solo !== r.owner) {
      if (r.by !== solo) [r.by, r.prog] = [solo, 0];
      r.prog += dt / T.CAPTURE_S;
      if (r.prog >= 1 - EPS) {
        const p = byId(g, solo)!;
        Object.assign(r, { owner: solo, prog: 0, by: 0, payT: 0 });
        ping(g, p, "capture");
        ticker(g, `${p.name} claimed a ring`);
      }
    } else if (!r.contested) {
      r.prog = Math.max(0, r.prog - T.RING_DECAY * dt);
      if (!r.prog) r.by = 0;
    }
    const o = r.owner && byId(g, r.owner);
    if (o && (r.payT += dt) >= T.RING_PAY_EVERY - EPS) {
      r.payT -= T.RING_PAY_EVERY;
      bank(g, o, stat(g, null, "ringPay"));
    }
  }
  for (const s of g.stations) {
    const o = byId(g, s.owner);
    if (o && (s.payT += dt) >= T.STATION_PAY_EVERY - EPS) {
      s.payT -= T.STATION_PAY_EVERY;
      bank(g, o, stat(g, o, "stationPay"));
    }
  }

  // Fields grow; a dry wild field re-forms elsewhere 30 s later.
  const count = new Map<number, number>();
  for (const l of g.loot) if (l.f) count.set(l.f, (count.get(l.f) ?? 0) + 1);
  for (const f of [...g.fields]) {
    const every = stat(g, null, f.home ? "homeEvery" : "wildEvery");
    if ((f.t += dt) < every - EPS) continue;
    f.t -= every;
    if ((count.get(f.id) ?? 0) < (f.home ? T.HOME_MAX : T.WILD_MAX)) growCrystal(g, f);
  }
  while (g.wild.length && g.wild[0] <= t + EPS) {
    g.wild.shift();
    const a = rnd(g) * TAU, r = lerp(T.NEW_WILD_AT, rnd(g)) * g.R;
    addField(g, Math.cos(a) * r, Math.sin(a) * r, false);
    ticker(g, "A new field formed");
  }

  // Vault and Crown
  if (g.crown) {
    const c = g.crown, p = c.by ? byId(g, c.by) : undefined;
    if (p) [c.x, c.z] = [p.x, p.z];
    else if (t - c.since >= T.CROWN_RETURN - EPS) {
      g.crown = null;
      g.vault = { hp: T.VAULT_HP, lastDmg: -99 };
      ticker(g, "The Crown returned to the Vault");
    }
  } else if (t - g.vault.lastDmg >= T.VAULT_REGEN_AFTER - EPS) g.vault.hp = Math.min(T.VAULT_HP, g.vault.hp + T.VAULT_REGEN * dt);

  g.pings = g.pings.filter((pg) => t - pg.t < (pg.k === "death" ? T.WRECK_S : T.PING_FADE));

  const won = P.filter((p) => p.score >= g.target);
  if (won.length) finish(g, "target", won.map((p) => p.id));
}

// ---------- Views: all fog filtering happens here, on the server ----------

export function leader(g: Game): Player | undefined {
  const s = [...g.players].sort((a, b) => b.score - a.score);
  return s[0] && s[0].score > 0 && (!s[1] || s[0].score > s[1].score) ? s[0] : undefined;
}

const shipAux = (g: Game, q: Player) =>
  Math.round((10 * q.held) / stat(g, q, "hold")) | (g.t < q.shieldUntil ? F.SHIELD : 0) | (q.crown ? F.CROWN : 0) | (q.boostT > 0 ? F.BOOST : 0) | (q.stasis ? F.STASIS : 0);

export function playerView(g: Game, id: number) {
  const p = byId(g, id)!, t = g.t;
  const s2 = stat(g, p, "sensors") ** 2, near = (x: number, z: number) => d2(p.x, p.z, x, z) <= s2;
  const ents: number[][] = [];
  for (const q of g.players) if (q !== p && !q.dead && near(q.x, q.z)) ents.push([q.id, K.SHIP, r1(q.x), r1(q.z), r2(q.h), q.id, shipAux(g, q)]);
  for (const b of g.bolts) if (near(b.x, b.z)) ents.push([b.id, K.BOLT, r1(b.x), r1(b.z), r2(Math.atan2(b.vz, b.vx)), b.o, 0]);
  for (const l of g.loot) if (near(l.x, l.z)) ents.push([l.id, K.LOOT, r1(l.x), r1(l.z), 0, 0, l.v]);
  for (const s of g.stations) if (near(s.x, s.z)) ents.push([s.id, K.STATION, r1(s.x), r1(s.z), 0, s.owner, Math.ceil(s.hp)]);
  if (!g.crown && near(0, 0)) ents.push([0, K.VAULT, 0, 0, 0, 0, Math.ceil(g.vault.hp)]);
  const radar = [...g.rings, ...g.stations].filter((s) => s.owner === id);
  const blips: number[][] = [];
  if (radar.length)
    for (const q of g.players)
      if (q !== p && !q.dead && !near(q.x, q.z) && radar.some((s) => d2(s.x, s.z, q.x, q.z) <= T.RADAR ** 2)) blips.push([r1(q.x), r1(q.z), q.id]);
  const ring = g.rings.find((r) => d2(p.x, p.z, r.x, r.z) <= T.RING_R ** 2);
  return {
    t: "s" as const,
    ms: Math.round(t * 1000),
    me: {
      x: r1(p.x), z: r1(p.z), h: r2(p.h), vx: r1(p.vx), vz: r1(p.vz),
      hp: Math.ceil(p.hp), hpMax: stat(g, p, "hull"), held: p.held, hold: stat(g, p, "hold"),
      score: p.score, level: p.level, picks: p.picks, offer: p.offer, perks: p.perks,
      boostCd: r1(p.boostCd), boost: p.boostT > 0 ? 1 : 0, shield: r1(Math.max(0, p.shieldUntil - t)),
      state: p.dead ? "dead" : p.stasis ? "stasis" : "alive", respawnIn: p.dead ? Math.ceil(p.respawnAt - t) : 0,
      crown: p.crown ? 1 : 0, build: p.build < 0 ? -1 : r2(p.build / T.BUILD_S), canBuild: p.build < 0 && canBuild(g, p) ? 1 : 0,
      ring: ring ? [ring.owner, ring.by === id ? r2(ring.prog) : 0, ring.contested ? 1 : 0] : null,
    },
    ents,
    blips,
  };
}
export type Snap = ReturnType<typeof playerView>;

export function scannerView(g: Game) {
  const t = g.t, black = stat(g, null, "blackout") > 0, lead = leader(g);
  const status = (p: Player) => (p.dead ? 3 : p.stasis ? 2 : p.offFor > 0 || !p.conn ? 1 : 0);
  return {
    t: "pub" as const,
    st: g.state, now: r1(t), target: g.target, sector: g.sector, R: g.R,
    players: g.players.map((p) => [p.id, p.name, p.c, p.score, p.level, status(p), r1(p.hx), r1(p.hz), p.kills] as [number, string, number, number, number, number, number, number, number]),
    rings: g.rings.map((r) => [r.id, r1(r.x), r1(r.z), r.owner, r2(r.prog), r.by, r.contested ? 1 : 0]),
    fields: g.fields.map((f) => [f.id, r1(f.x), r1(f.z), f.home ? 1 : 0, f.home ? 1 : r2(1 - f.made / T.WILD_BUDGET)]),
    stations: g.stations.map((s) => [s.id, r1(s.x), r1(s.z), s.owner, Math.min(2, Math.floor((3 * s.hp) / stationMax(g, s)))]),
    vault: g.crown ? 0 : Math.ceil(g.vault.hp),
    crown: g.crown ? [r1(g.crown.x), r1(g.crown.z), g.crown.by] : null,
    leader: lead && !lead.dead ? [lead.id, r1(lead.x), r1(lead.z)] : null,
    pings: g.pings.filter((pg) => !black || pg.k === "death").map((pg) => [pg.x, pg.z, pg.o, pg.k, r1(t - pg.t)] as [number, number, number, string, number]),
    ticker: g.ticker,
  };
}
export type Pub = ReturnType<typeof scannerView>;

export function endView(g: Game) {
  const table = [...g.players].sort((a, b) => b.score - a.score).map((p) => [p.id, p.name, p.c, p.score, p.kills, p.stolen, p.taken] as [number, string, number, number, number, number, number]);
  return { t: "end" as const, winner: g.winners, reason: g.reason, table };
}
export type End = ReturnType<typeof endView>;
