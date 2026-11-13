import { describe, expect, test } from "bun:test";
import { cleanName, parseClient } from "./protocol";
import { act, addPlayer, createGame, endView, hostEnd, input, playerView, scannerView, startGame, step, touch, type Game, type Player } from "./sim";
import { BASE, PERKS, SECTORS, T } from "./tuning";

const DT = 1 / T.TICK_HZ;
function run(g: Game, s: number, each?: () => void) {
  for (let i = Math.round(s / DT); i > 0; i--) {
    for (const p of g.players) touch(g, p); // everyone online unless a test says otherwise
    each?.();
    step(g, DT);
  }
}
function setup(n = 3, sector: any = "calm") {
  const g = createGame("ABCDE", 600, sector, "tok");
  const ps = Array.from({ length: n }, (_, i) => addPlayer(g, `P${i}`, `s${i}`)!);
  startGame(g);
  for (const p of ps) p.shieldUntil = 0; // drop rookie shields
  g.loot = []; // empty map unless a test adds loot
  g.fields = [];
  return { g, ps };
}
const at = (p: Player, x: number, z: number) => Object.assign(p, { x, z, vx: 0, vz: 0 });
/** Park p facing q at distance d, firing. */
function aim(g: Game, p: Player, x: number, z: number) {
  p.h = p.inH = Math.atan2(z - p.z, x - p.x);
  input(g, p, p.h, 0, 1);
}

describe("fog (§13.1)", () => {
  test("a ship outside B's sensors is not in playerView(B) or scannerView", () => {
    const { g, ps: [a, b] } = setup(3);
    at(a, 123.4, -567.8);
    at(b, 900, 300);
    run(g, 0.1);
    at(a, 123.4, -567.8);
    const pv = JSON.stringify(playerView(g, b.id));
    expect(pv).not.toContain("123.4");
    expect(playerView(g, b.id).ents.some((e) => e[0] === a.id)).toBe(false);
    expect(JSON.stringify(scannerView(g))).not.toContain("123.4");
    // inside sensors: visible
    at(b, 200, -500);
    expect(playerView(g, b.id).ents.some((e) => e[0] === a.id)).toBe(true);
  });
  test("pinging, leading or carrying the Crown is what reveals you", () => {
    const { g, ps: [a, b] } = setup(3);
    at(a, 123.4, -567.8);
    input(g, a, a.h, 0, 1); // firing pings
    run(g, 0.1);
    expect(JSON.stringify(scannerView(g).pings)).toContain(String(a.id));
    a.score = 10;
    expect(scannerView(g).leader?.[0]).toBe(a.id);
    b.score = 10; // tie: nobody alone in the lead
    expect(scannerView(g).leader).toBeNull();
  });
  test("secrets and other players' perks never leave the server", () => {
    const { g, ps: [a, b] } = setup(2);
    a.perks.heavy = 1;
    const all = JSON.stringify([scannerView(g), playerView(g, b.id), endView(g)]);
    expect(all).not.toContain("s0");
    expect(all).not.toContain("tok");
    expect(all).not.toContain("heavy");
  });
});

describe("death (§13.2)", () => {
  test("hold spills as loot and the last hitter gets the kill", () => {
    const { g, ps: [a, b] } = setup(2);
    at(a, 0, 400);
    at(b, 0, 500);
    b.held = 40;
    aim(g, a, b.x, b.z);
    run(g, 4, () => at(b, 0, 500));
    expect(b.dead).toBe(true);
    expect(a.kills).toBe(1);
    expect(b.held).toBe(0);
    expect(g.loot.reduce((s, l) => s + l.v, 0)).toBe(40);
    // respawn at HQ with a shield, perks and score kept
    run(g, T.RESPAWN_S + 0.2, () => input(g, a, a.h, 0, 0));
    expect(b.dead).toBe(false);
    expect(Math.hypot(b.x - b.hx, b.z - b.hz)).toBeLessThan(1);
    expect(b.shieldUntil).toBeGreaterThan(g.t);
  });
  test("Insurance drops only half; Pirate Code spills ×1.5", () => {
    const { g, ps: [a, b] } = setup(2, "pirate");
    b.perks.insurance = 1;
    at(a, 0, 400);
    at(b, 0, 500);
    b.held = 40;
    aim(g, a, b.x, b.z);
    run(g, 4, () => at(b, 0, 500));
    expect(b.held).toBe(20);
    expect(g.loot.reduce((s, l) => s + l.v, 0)).toBe(30);
  });
  test("picking up someone else's spilled loot counts as stolen", () => {
    const { g, ps: [a, b] } = setup(2);
    g.loot.push({ id: 999, x: 0, z: 500, v: 5, exp: 999, f: 0, from: b.id });
    at(a, 0, 500);
    run(g, 0.1);
    expect(a.held).toBe(5);
    expect(a.stolen).toBe(5);
  });
});

describe("ring (§13.3)", () => {
  test("flips after 10 s alone, freezes when contested, decays when empty", () => {
    const { g, ps: [a, b] } = setup(2);
    const r = g.rings[0];
    run(g, 5, () => at(a, r.x, r.z));
    expect(r.prog).toBeCloseTo(0.5, 1);
    run(g, 3, () => { at(a, r.x, r.z); at(b, r.x + 5, r.z); });
    expect(r.contested).toBe(true);
    expect(r.prog).toBeCloseTo(0.5, 1);
    run(g, 2, () => { at(a, 0, 0); at(b, 0, 0); });
    expect(r.prog).toBeCloseTo(0.3, 1);
    run(g, 7.1, () => at(a, r.x, r.z));
    expect(r.owner).toBe(a.id);
    // ring pays its owner +1 every 5 s
    const s = a.score;
    run(g, 5.05, () => at(a, 0, 0));
    expect(a.score).toBe(s + 1);
  });
  test("a shielded rookie can't capture", () => {
    const { g, ps: [a] } = setup(2);
    const r = g.rings[0];
    a.shieldUntil = 1e9;
    run(g, 12, () => at(a, r.x, r.z));
    expect(r.owner).toBe(0);
    expect(r.prog).toBe(0);
  });
});

describe("station theft (§13.4)", () => {
  function withStation(stations: number) {
    const { g, ps: [a, b] } = setup(2);
    for (let i = 0; i < stations; i++) g.stations.push({ id: 500 + i, x: -1000 + i * 10, z: 0, owner: a.id, hp: 400, payT: 0, cd: 0 });
    const s = { id: 600, x: 0, z: 600, owner: b.id, hp: 30, payT: 0, cd: 99 };
    g.stations.push(s);
    at(a, 0, 400);
    aim(g, a, s.x, s.z);
    run(g, 2, () => { at(a, 0, 400); g.stations.forEach((q) => (q.cd = 99)); });
    return { g, a, b, s };
  }
  test("shooting to 0 HP gives it to the last hitter at 50% HP", () => {
    const { g, a, s } = withStation(0);
    expect(s.owner).toBe(a.id);
    expect(s.hp).toBe(200);
    expect(a.taken).toBe(1);
    expect(g.stations).toContain(s);
  });
  test("destroyed instead if they already own 3", () => {
    const { g, s } = withStation(3);
    expect(g.stations).not.toContain(s);
  });
  test("BUILD: hold still 5 s, at least 300 from other structures", () => {
    const { g, ps: [a] } = setup(2);
    at(a, 0, 100); // too close to the Vault
    act(g, a, "build");
    expect(a.build).toBe(-1);
    at(a, 300, 400);
    act(g, a, "build");
    expect(a.build).toBe(0);
    run(g, 5.2);
    expect(g.stations.length).toBe(1);
    // station banks the hold
    a.held = 20;
    run(g, 0.1);
    expect(a.score).toBe(20);
  });
});

describe("vault (§13.5)", () => {
  test("0 HP spawns the Crown; left alone 30 s it returns and the Vault reseals", () => {
    const { g, ps: [a] } = setup(2);
    g.vault.hp = 15;
    at(a, 0, 200);
    aim(g, a, 0, 0);
    run(g, 1, () => at(a, 0, 200));
    expect(g.crown).not.toBeNull();
    input(g, a, a.h, 0, 0);
    run(g, T.CROWN_RETURN + 0.2, () => at(a, 0, 400));
    expect(g.crown).toBeNull();
    expect(g.vault.hp).toBe(T.VAULT_HP);
  });
  test("Crown carrier is slow, can't boost, and banks 15% of target", () => {
    const { g, ps: [a] } = setup(2);
    g.crown = { x: a.hx * 0.8, z: a.hz * 0.8, by: 0, since: g.t };
    at(a, g.crown.x, g.crown.z);
    run(g, 0.1);
    expect(a.crown).toBe(true);
    act(g, a, "boost");
    expect(a.boostT).toBe(0);
    input(g, a, a.h, 1, 0);
    run(g, 3, () => (a.boostT = 0));
    expect(Math.hypot(a.vx, a.vz)).toBeLessThanOrEqual(BASE.speed * 0.6 + 1e-6);
    at(a, a.hx, a.hz);
    run(g, 0.1);
    expect(a.score).toBe(90);
    expect(g.crown).toBeNull();
  });
  test("Vault regenerates after 5 s without damage", () => {
    const { g } = setup(2);
    g.vault.hp = 100;
    g.vault.lastDmg = g.t;
    run(g, 4.5);
    expect(g.vault.hp).toBe(100);
    run(g, 1.5);
    expect(g.vault.hp).toBeGreaterThan(100);
  });
});

describe("heading limit (§13.6)", () => {
  test("a 180° request turns at most turn × dt × 1.2 per tick", () => {
    const { g, ps: [a] } = setup(2);
    a.h = 0;
    input(g, a, Math.PI, 0, 0);
    step(g, DT);
    expect(Math.abs(a.h)).toBeCloseTo(T.TURN * DT * T.TURN_SLACK, 6);
  });
  test("throttle is clamped and the speed cap holds", () => {
    const { g, ps: [a] } = setup(2);
    at(a, 0, 300);
    input(g, a, 0, 50, 0);
    run(g, 5, () => at(a, 0, a.z));
    expect(Math.hypot(a.vx, a.vz)).toBeLessThanOrEqual(BASE.speed + 1e-6);
  });
});

describe("stasis (§13.7)", () => {
  test("after 10 s offline the ship is invulnerable and has dropped the Crown", () => {
    const { g, ps: [a, b] } = setup(2);
    a.conn = false;
    at(a, 0, 500); // away from its HQ, or it would bank the Crown
    a.crown = true;
    g.crown = { x: 0, z: 0, by: a.id, since: 0 };
    a.held = 25;
    for (let i = 0; i < 99; i++) { touch(g, b); step(g, DT); }
    expect(a.stasis).toBe(false); // still hittable for the first 10 s
    for (let i = 0; i < 3; i++) { touch(g, b); step(g, DT); }
    expect(a.stasis).toBe(true);
    expect(a.crown).toBe(false);
    expect(g.crown?.by).toBe(0);
    expect(a.held).toBe(25);
    at(b, a.x, a.z - 100);
    aim(g, b, a.x, a.z);
    const hp = a.hp;
    for (let i = 0; i < 20; i++) { touch(g, b); step(g, DT); }
    expect(a.hp).toBe(hp);
    touch(g, a); // reconnect ends stasis with a 2 s shield
    expect(a.stasis).toBe(false);
    expect(a.shieldUntil).toBeGreaterThan(g.t);
  });
  test("silent but connected: offline after 6 s, stasis 10 s later", () => {
    const { g, ps: [a, b] } = setup(2);
    for (let i = 0; i < 150; i++) { touch(g, b); step(g, DT); }
    expect(a.stasis).toBe(false);
    for (let i = 0; i < 20; i++) { touch(g, b); step(g, DT); }
    expect(a.stasis).toBe(true);
  });
});

describe("win (§13.8)", () => {
  test("banking past the target ends the game with reason target", () => {
    const { g, ps: [a] } = setup(2);
    a.score = 590;
    a.held = 20;
    at(a, a.hx, a.hz);
    run(g, 0.1);
    expect(g.state).toBe("over");
    expect(endView(g)).toMatchObject({ reason: "target", winner: [a.id] });
  });
  test("host end: the leader wins, ties share", () => {
    const { g, ps: [a, b, c] } = setup(3);
    a.score = b.score = 50;
    c.score = 10;
    hostEnd(g);
    expect(g.winners.sort()).toEqual([a.id, b.id].sort());
    expect(g.reason).toBe("host");
  });
});

describe("content tables (§13.9)", () => {
  test("every perk and sector override key exists in BASE", () => {
    for (const d of [...Object.values(PERKS), ...Object.values(SECTORS)] as any[])
      for (const k of [...Object.keys(d.mul ?? {}), ...Object.keys(d.add ?? {})]) expect(BASE).toHaveProperty(k);
  });
  test("perks are never offered past their stack limit; picks only from the offer", () => {
    const { g, ps: [a] } = setup(2);
    a.picks = 40;
    for (let i = 0; i < 40; i++) {
      run(g, 0.1);
      if (!a.offer) break;
      for (const id of a.offer) expect(a.perks[id] ?? 0).toBeLessThan(PERKS[id].max);
      act(g, a, "perk", (i % a.offer.length) as 0 | 1);
    }
    const total = Object.values(PERKS).reduce((s, p) => s + p.max, 0);
    expect(Object.values(a.perks).reduce((s, n) => s + n!, 0)).toBe(total);
    for (const [id, n] of Object.entries(a.perks)) expect(n).toBeLessThanOrEqual(PERKS[id as keyof typeof PERKS].max);
  });
  test("first bank levels you up, then every target/10", () => {
    const { g, ps: [a] } = setup(2);
    a.held = 5;
    at(a, a.hx, a.hz);
    run(g, 0.1);
    expect(a.level).toBe(1);
    expect(a.picks + (a.offer ? 0 : 0)).toBe(1);
    a.held = 55;
    run(g, 0.1);
    expect(a.level).toBe(2);
  });
});

describe("map and late join", () => {
  test("symmetric: every HQ is the same distance from the Vault and its home field", () => {
    const { g, ps } = setup(4);
    const d = ps.map((p) => Math.hypot(p.hx, p.hz));
    expect(Math.max(...d) - Math.min(...d)).toBeLessThan(1e-6);
    expect(g.rings.length).toBe(4);
  });
  test("late joiners take a free wedge, then the widest gap, with 3 picks", () => {
    const g = createGame("QWERT", 600, "calm", "t");
    addPlayer(g, "a", "x");
    addPlayer(g, "b", "y");
    startGame(g);
    const c = addPlayer(g, "c", "z")!;
    expect(c.picks).toBe(T.LATE_PICKS);
    expect(c.score).toBe(0);
    for (let i = 0; i < 9; i++) addPlayer(g, "n" + i, "s");
    expect(g.players.length).toBe(12);
    expect(addPlayer(g, "13th", "s")).toBeNull();
    const angles = g.players.map((p) => Math.atan2(p.hz, p.hx)).sort((a, b) => a - b);
    const gaps = angles.map((a, i) => (i + 1 < angles.length ? angles[i + 1] : angles[0] + 2 * Math.PI) - a);
    expect(Math.min(...gaps)).toBeGreaterThan(0.3); // nobody stacked on top of anyone
  });
  test("deterministic: same code, same map", () => {
    const m = () => { const { g } = setup(3); return JSON.stringify(g.rings.map((r) => [r.x, r.z])); };
    expect(m()).toBe(m());
  });
});

describe("protocol trust boundary", () => {
  test("parses good messages and clamps", () => {
    expect(parseClient('{"t":"in","h":1,"th":5,"f":1}')).toEqual({ t: "in", h: 1, th: 1, f: 1 });
    expect(parseClient('{"t":"act","a":"perk","k":1}')).toEqual({ t: "act", a: "perk", k: 1 });
    expect(parseClient('{"t":"hello","v":1,"role":"player","name":"  Zed  "}')).toEqual({ t: "hello", v: 1, role: "player", name: "Zed" });
  });
  test("drops garbage", () => {
    for (const bad of [
      "not json", "null", "[]", '{"t":"in","h":"1","th":0,"f":0}', '{"t":"in","h":1e999,"th":0,"f":0}',
      '{"t":"in","h":1,"th":0,"f":2}', '{"t":"act","a":"perk","k":2}', '{"t":"host","a":"nuke"}',
      '{"t":"host","a":"kick"}', '{"t":"hello","v":1,"role":"player","name":"\\u0000\\u0007"}',
      '{"t":"hello","v":1,"role":"player","name":"x","pid":3}', '{"t":"zzz"}', "x".repeat(513),
      JSON.stringify({ t: "in", h: 1, th: 0, f: 0, pad: "é".repeat(250) }),
    ]) expect(parseClient(bad)).toBeNull();
    expect(parseClient(new ArrayBuffer(4))).toBeNull();
  });
  test("names: trimmed, control chars removed, 12 chars max", () => {
    expect(cleanName("a‮b\nc")).toBe("abc");
    expect(cleanName("ABCDEFGHIJKLMNOP")).toBe("ABCDEFGHIJKL");
    expect(cleanName("🚀".repeat(20))).toBe("🚀".repeat(12));
    expect(cleanName("   ")).toBe("");
  });
});

describe("performance", () => {
  test("12-player tick p99 under 5 ms", () => {
    const g = createGame("PERFX", 8000, "calm", "t");
    for (let i = 0; i < 12; i++) addPlayer(g, "p" + i, "s");
    startGame(g);
    const times: number[] = [];
    for (let i = 0; i < 3000; i++) {
      for (const [j, p] of g.players.entries()) {
        touch(g, p);
        input(g, p, Math.sin(i / 30 + j) * 3, 1, (i + j) % 3 ? 1 : 0);
        if (i % 50 === j) act(g, p, "boost");
      }
      const t0 = performance.now();
      step(g, DT);
      for (const p of g.players) JSON.stringify(playerView(g, p.id));
      if (i % 5 === 0) JSON.stringify(scannerView(g));
      if (i >= 300) times.push(performance.now() - t0); // skip JIT warm-up
    }
    times.sort((a, b) => a - b);
    const p99 = times[Math.floor(times.length * 0.99)];
    console.log(`tick+views p99 ${p99.toFixed(3)} ms, max ${times.at(-1)!.toFixed(3)} ms, bolts ${g.bolts.length}, loot ${g.loot.length}`);
    expect(p99).toBeLessThan(5);
    expect(g.state).not.toBe("lobby");
  });
});
