// Load-test bots — LOCAL DEV ONLY (each message costs free-tier budget on a deployed Worker).
//   bun scripts/bots.ts                      20 rooms × 5 bots for 180 s against http://localhost:5173
//   bun scripts/bots.ts --rooms 2 --bots 3 --secs 60 --base http://localhost:5173
//   bun scripts/bots.ts --join ABCDE --bots 2   add wandering bots to an existing room (no pass/fail)
// Pass: every reconnect succeeds and no bot goes >500 ms without a snapshot.
import { PROTOCOL_VERSION } from "../src/shared/protocol";

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("base", "http://localhost:5173"), WS = BASE.replace(/^http/, "ws");
const ROOMS = +arg("rooms", "20"), BOTS = +arg("bots", "5"), SECS = +arg("secs", "180"), JOIN = arg("join", "");
const DROP_EVERY = 60_000, GAP_LIMIT = 500;

const stats = { reconnects: 0, reconnectFails: 0, snaps: 0, sent: 0, gaps: [] as number[], errors: [] as string[] };

class Bot {
  ws!: WebSocket;
  pid = 0; sec = ""; lastSnap = 0; h = Math.random() * 6; alive = true; welcomed = false;
  constructor(public code: string, public name: string) { this.open(); }
  open() {
    this.welcomed = false;
    this.lastSnap = 0;
    const ws = (this.ws = new WebSocket(`${WS}/ws/${this.code}`));
    ws.onopen = () => ws.send(JSON.stringify(this.pid ? { t: "hello", v: PROTOCOL_VERSION, role: "player", name: this.name, pid: this.pid, sec: this.sec } : { t: "hello", v: PROTOCOL_VERSION, role: "player", name: this.name }));
    ws.onmessage = (e) => {
      if (ws !== this.ws || e.data === "pong") return;
      const m = JSON.parse(e.data as string);
      if (m.t === "welcome") {
        this.welcomed = true;
        if (m.sec) [this.pid, this.sec] = [m.pid, m.sec];
      } else if (m.t === "s") {
        const now = performance.now();
        if (this.lastSnap) stats.gaps.push(now - this.lastSnap);
        this.lastSnap = now;
        stats.snaps++;
        if (m.me.offer) this.send({ t: "act", a: "perk", k: 0 });
      } else if (m.t === "err") stats.errors.push(`${this.name}: ${m.e}`);
    };
  }
  send(m: object) { if (this.ws.readyState === WebSocket.OPEN) { this.ws.send(JSON.stringify(m)); stats.sent++; } }
  input() {
    // Worst case for the request budget: the input changes every 200 ms.
    this.h += (Math.random() - 0.5) * 1.2;
    this.send({ t: "in", h: +this.h.toFixed(3), th: +(0.3 + Math.random() * 0.7).toFixed(2), f: Math.random() < 0.4 ? 1 : 0 });
    if (Math.random() < 0.02) this.send({ t: "act", a: "boost" });
  }
  async drop() {
    this.ws.close();
    stats.reconnects++;
    this.open();
    const t = Date.now();
    while (!this.welcomed && Date.now() - t < 5000) await Bun.sleep(25);
    if (!this.welcomed) stats.reconnectFails++;
  }
}

async function room(): Promise<{ code: string; tok: string }> {
  const r = await fetch(`${BASE}/api/rooms`, { method: "POST", body: JSON.stringify({ target: 8000, sector: "random" }) });
  const { code, hostToken } = (await r.json()) as any;
  return { code, tok: hostToken };
}

const bots: Bot[] = [];
if (JOIN) {
  for (let i = 0; i < BOTS; i++) bots.push(new Bot(JOIN, `Bot${i + 1}`));
} else {
  const rooms = await Promise.all(Array.from({ length: ROOMS }, room));
  for (const r of rooms) for (let i = 0; i < BOTS; i++) bots.push(new Bot(r.code, `Bot${i + 1}`));
  await Bun.sleep(1500);
  for (const r of rooms) {
    const host = new WebSocket(`${WS}/ws/${r.code}`);
    host.onopen = () => { host.send(JSON.stringify({ t: "hello", v: PROTOCOL_VERSION, role: "host", tok: r.tok })); host.send(JSON.stringify({ t: "host", a: "start" })); };
  }
  console.log(`${ROOMS} rooms × ${BOTS} bots for ${SECS} s against ${BASE}`);
}

const inputs = setInterval(() => bots.forEach((b) => b.input()), 200);
// Each bot drops and reconnects once per minute, at a random offset.
const drops = bots.map((b) => setTimeout(function again() { if (b.alive) b.drop(); drops.push(setTimeout(again, DROP_EVERY)); }, Math.random() * DROP_EVERY));
const t0 = Date.now();
await Bun.sleep(SECS * 1000);
clearInterval(inputs);
drops.forEach(clearTimeout);
bots.forEach((b) => { b.alive = false; b.ws.close(); });

const g = stats.gaps.sort((a, b) => a - b), pct = (p: number) => g[Math.floor(g.length * p)]?.toFixed(0);
const maxGap = g.at(-1) ?? 0;
console.log(`snapshots ${stats.snaps} (${(stats.snaps / bots.length / ((Date.now() - t0) / 1000)).toFixed(1)}/s per bot), gaps p50 ${pct(0.5)} ms p99 ${pct(0.99)} ms max ${maxGap.toFixed(0)} ms`);
console.log(`inputs ${(stats.sent / bots.length / SECS).toFixed(2)}/s per bot; reconnects ${stats.reconnects}, failed ${stats.reconnectFails}; errors ${stats.errors.length ? stats.errors.slice(0, 5).join(", ") : "none"}`);
if (JOIN) process.exit(0);
const pass = stats.reconnectFails === 0 && maxGap <= GAP_LIMIT && stats.errors.length === 0;
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
