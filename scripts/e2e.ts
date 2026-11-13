// End-to-end protocol checks against a running dev server: `bun run dev`, then `bun scripts/e2e.ts [http://localhost:5173]`.
import { PROTOCOL_VERSION } from "../src/shared/protocol";

const BASE = process.argv[2] ?? "http://localhost:5173";
const WS = BASE.replace(/^http/, "ws");
let failed = 0;
const ok = (cond: unknown, what: string) => { console.log(`${cond ? "ok  " : "FAIL"} ${what}`); if (!cond) failed++; };

class Client {
  ws: WebSocket;
  msgs: any[] = [];
  closed: number | null = null;
  constructor(code: string, public hello: object) {
    this.ws = new WebSocket(`${WS}/ws/${code}`);
    this.ws.onopen = () => this.ws.send(JSON.stringify(hello));
    this.ws.onmessage = (e) => this.msgs.push(e.data === "pong" ? { t: "pong" } : JSON.parse(e.data as string));
    this.ws.onclose = (e) => (this.closed = e.code);
  }
  send(m: object | string) { this.ws.send(typeof m === "string" ? m : JSON.stringify(m)); }
  last(t: string) { return this.msgs.findLast((m) => m.t === t); }
  async wait(pred: () => unknown, ms = 3000) {
    for (const end = Date.now() + ms; Date.now() < end; await Bun.sleep(20)) if (pred()) return true;
    return false;
  }
  until(t: string, ms?: number) { return this.wait(() => this.last(t), ms); }
}
const player = (code: string, name: string, extra = {}) => new Client(code, { t: "hello", v: PROTOCOL_VERSION, role: "player", name, ...extra });

const res = await fetch(`${BASE}/api/rooms`, { method: "POST", body: JSON.stringify({ target: 600, sector: "calm" }) });
const { code, hostToken } = (await res.json()) as any;
ok(/^[A-HJ-NP-Z2-9]{5}$/.test(code) && hostToken?.length === 32, `room created ${code}`);

const host = new Client(code, { t: "hello", v: PROTOCOL_VERSION, role: "host", tok: hostToken });
ok(await host.until("pub"), "host gets pub");
const a = player(code, "Alice"), b = player(code, "Bob");
ok((await a.until("welcome")) && (await b.until("welcome")), "players welcomed");
const { pid, sec } = a.last("welcome");
ok(await host.wait(() => host.last("pub")?.players.length === 2), "host sees 2 players in lobby");

const evil = new Client(code, { t: "hello", v: PROTOCOL_VERSION, role: "host", tok: "nope" });
ok(await evil.wait(() => evil.closed === 4003), "wrong host token rejected");
const thief = player(code, "Thief", { pid, sec: "0".repeat(32) });
ok(await thief.wait(() => thief.last("err")?.e === "bad_secret"), "wrong player secret rejected");
const stale = new Client(code, { t: "hello", v: PROTOCOL_VERSION + 1, role: "player", name: "x" });
ok(await stale.until("reload"), "protocol mismatch → reload");
const nowhere = player("ZZZZZ", "x");
ok(await nowhere.wait(() => nowhere.last("err")?.e === "bad_code"), "unknown room → bad_code");
const pong = player(code, "Pinger");
await pong.until("welcome");
pong.send("ping");
ok(await pong.until("pong"), "idle ping auto-answered");

host.send({ t: "host", a: "start" });
ok(await a.until("s"), "game started, phone gets snapshots");
const s0 = a.last("s");
ok(s0.me && Array.isArray(s0.ents) && s0.me.shield > 50, "snapshot has me/ents, rookie shield on");
ok(!JSON.stringify(host.msgs).includes(sec), "secret never sent to host");

a.send({ t: "in", h: 0, th: 1, f: 0 });
await Bun.sleep(1500);
const s1 = a.last("s");
ok(Math.hypot(s1.me.vx, s1.me.vz) > 20, "thrust moves the ship");
// Snapshot cadence
const t0 = a.msgs.length;
await Bun.sleep(1000);
const n = a.msgs.slice(t0).filter((m) => m.t === "s").length;
ok(n >= 8 && n <= 12, `~10 Hz snapshots (${n}/s)`);

// Reconnect with stored identity: newest socket wins, old one closed 4001.
const a2 = player(code, "Alice", { pid, sec });
ok(await a2.until("welcome"), "reconnect with pid/sec");
ok(await a.wait(() => a.closed === 4001), "older socket closed with 4001");
ok(await a2.until("s"), "reconnected socket gets snapshots");

// Pause / resume
host.send({ t: "host", a: "pause" });
ok(await host.wait(() => host.last("pub")?.st === "paused"), "pause");
const before = a2.msgs.length;
await Bun.sleep(400);
ok(!a2.msgs.slice(before).some((m) => m.t === "s"), "no snapshots while paused");
host.send({ t: "host", a: "resume" });
ok(await host.wait(() => host.last("pub")?.st === "play"), "resume");

// Kick
host.send({ t: "host", a: "kick", pid: b.last("welcome").pid });
ok(await b.wait(() => b.last("err")?.e === "kicked"), "kicked player told");
const b2 = player(code, "Bob", { pid: b.last("welcome").pid, sec: b.last("welcome").sec });
ok(await b2.wait(() => b2.last("err")?.e === "kicked"), "kicked player can't reconnect");

// Malformed and oversized messages are ignored, not fatal.
a2.send("{not json");
a2.send({ t: "in", h: "NaN", th: 1, f: 0 });
a2.send("x".repeat(600));
await Bun.sleep(300);
ok(a2.closed === null, "garbage ignored");

// Flood: sustained >15 msg/s for 3 s closes with 4008.
const flood = player(code, "Flood");
await flood.until("welcome");
const fl = setInterval(() => { try { flood.send({ t: "in", h: 0, th: 0, f: 0 }); } catch {} }, 10);
ok(await flood.wait(() => flood.closed === 4008, 6000), "flooder closed with 4008");
clearInterval(fl);

// Room full at 12
const crowd = Array.from({ length: 12 }, (_, i) => player(code, "C" + i));
await Bun.sleep(1500);
ok(crowd.some((c) => c.last("err")?.e === "room_full"), "13th player gets room_full");

// End
host.send({ t: "host", a: "end" });
ok(await a2.wait(() => a2.last("end")?.reason === "host"), "host end → end message");
const late = player(code, "Late");
ok(await late.until("end"), "joining an ended game shows the end table");

if (process.argv.includes("--slow")) {
  // Disconnect → stasis after 10 s → reconnect ends it with a shield; then auto-pause after 30 s with nobody connected.
  const r = (await (await fetch(`${BASE}/api/rooms`, { method: "POST", body: "{}" })).json()) as any;
  const h = new Client(r.code, { t: "hello", v: PROTOCOL_VERSION, role: "host", tok: r.hostToken });
  const p = player(r.code, "Sleepy");
  await p.until("welcome");
  h.send({ t: "host", a: "start" });
  await p.until("s");
  const w = p.last("welcome");
  p.ws.close();
  ok(await h.wait(() => h.last("pub")?.players[0][5] === 1, 2000), "closed socket → offline on the Scanner");
  ok(await h.wait(() => h.last("pub")?.players[0][5] === 2, 12000), "10 s offline → stasis");
  const p2 = player(r.code, "Sleepy", { pid: w.pid, sec: w.sec });
  ok(await p2.wait(() => p2.last("s")?.me.state === "alive" && p2.last("s")?.me.shield > 0), "reconnect ends stasis with a shield");
  const before = p2.last("s").ms;
  p2.ws.close();
  h.ws.close();
  await Bun.sleep(40_000);
  const p3 = player(r.code, "Sleepy", { pid: w.pid, sec: w.sec });
  ok(await p3.until("s"), "auto-paused room resumes on reconnect");
  const jump = (p3.last("s").ms - before) / 1000;
  ok(jump > 25 && jump < 36, `auto-pause stopped the clock after ~30 s idle (sim advanced ${jump.toFixed(1)} s of 40)`);
}

console.log(failed ? `\n${failed} FAILED` : "\nall e2e checks passed");
process.exit(failed ? 1 : 0);
