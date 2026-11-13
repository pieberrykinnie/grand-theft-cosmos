import { DurableObject } from "cloudflare:workers";
import { PROTOCOL_VERSION, parseClient, type ClientMsg } from "../shared/protocol";
import * as sim from "../shared/sim";
import { T, type SectorId } from "../shared/tuning";
import type { Env } from "./index";

type Att = { pid: number; role: "player" | "host" };
interface Bucket { tokens: number; last: number; floodFrom: number; lastDrop: number }

const HOUR = 3600_000;
// Dev HMR re-runs this module in the same isolate; without this, old Room instances keep ticking stale games
// onto the shared sockets. In production the module runs once, so GEN never changes.
const G = globalThis as { __gtcGen?: number };
const GEN = (G.__gtcGen = (G.__gtcGen ?? 0) + 1);
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, "0")).join("");
function send(ws: WebSocket, msg: string | object) {
  try {
    ws.send(typeof msg === "string" ? msg : JSON.stringify(msg));
  } catch {} // socket already closing; its close handler cleans up
}
function close(ws: WebSocket, code: number, reason: string) {
  try {
    ws.close(code, reason);
  } catch {}
}

export class Room extends DurableObject<Env> {
  g: sim.Game | null = null;
  timer: ReturnType<typeof setInterval> | null = null;
  last = 0;
  tick = 0;
  lastSave = 0;
  idle = 0;
  alarmAt = 0;
  maxDt = 0;
  logAt = 0;
  atts = new WeakMap<WebSocket, Att>();
  buckets = new WeakMap<WebSocket, Bucket>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Answered by the runtime without waking the DO: keeps idle sockets (lobby, pause) alive for free.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
    ctx.blockConcurrencyWhile(async () => {
      this.g = (await ctx.storage.get<sim.Game>("game")) ?? null;
      if (!this.g) return;
      this.g.out = [];
      const live = new Set(ctx.getWebSockets().map((ws) => this.att(ws)?.pid));
      for (const p of this.g.players) p.conn = live.has(p.id);
    });
  }

  /** RPC from the router. Returns the host token, or null if this code holds a live game. */
  async init(code: string, target: number, sector: SectorId | "random"): Promise<string | null> {
    if (this.g && this.g.state !== "over") return null;
    for (const ws of this.ctx.getWebSockets()) close(ws, 4004, "gone");
    this.g = sim.createGame(code, target, sector, hex(16));
    this.save();
    return this.g.hostTok;
  }

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  att(ws: WebSocket): Att | undefined {
    let a = this.atts.get(ws);
    if (!a) {
      a = (ws.deserializeAttachment() as Att | null) ?? undefined;
      if (a) this.atts.set(ws, a);
    }
    return a;
  }
  setAtt(ws: WebSocket, a: Att) {
    ws.serializeAttachment(a);
    this.atts.set(ws, a);
  }

  /** Token bucket: 15/s, burst 30. Sustained flooding for 3 s closes the socket. */
  allow(ws: WebSocket): boolean {
    const now = Date.now();
    let b = this.buckets.get(ws);
    if (!b) this.buckets.set(ws, (b = { tokens: T.BURST, last: now, floodFrom: 0, lastDrop: 0 }));
    b.tokens = Math.min(T.BURST, b.tokens + ((now - b.last) / 1000) * T.RATE);
    b.last = now;
    if (b.tokens >= 1) {
      b.tokens--;
      return true;
    }
    if (now - b.lastDrop > 1000) b.floodFrom = now;
    b.lastDrop = now;
    if (now - b.floodFrom >= T.FLOOD_S * 1000) close(ws, 4008, "flood");
    return false;
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (!this.allow(ws)) return;
    const m = parseClient(raw);
    if (!m) return;
    const g = this.g;
    if (!g) {
      send(ws, { t: "err", e: "bad_code" });
      return close(ws, 4004, "bad_code");
    }
    if (m.t === "hello") return this.hello(ws, g, m);
    const a = this.att(ws);
    if (!a) return;
    if (a.role === "host") {
      if (m.t === "host") this.hostAct(g, m);
      return;
    }
    const p = sim.byId(g, a.pid);
    if (!p) return;
    sim.touch(g, p);
    if (m.t === "in") sim.input(g, p, m.h, m.th, m.f);
    else if (m.t === "act") sim.act(g, p, m.a, m.k);
    this.ensureTick();
  }

  hello(ws: WebSocket, g: sim.Game, m: Extract<ClientMsg, { t: "hello" }>) {
    if (m.v !== PROTOCOL_VERSION) {
      send(ws, { t: "reload" });
      return close(ws, 4000, "reload");
    }
    const intro = { t: "welcome", sector: g.sector, target: g.target };
    if (m.role === "host") {
      if (m.tok !== g.hostTok) {
        send(ws, { t: "err", e: "bad_secret" });
        return close(ws, 4003, "bad_secret");
      }
      this.setAtt(ws, { pid: 0, role: "host" });
      send(ws, { ...intro, pid: 0 });
      send(ws, sim.scannerView(g));
      if (g.state === "over") send(ws, sim.endView(g));
      return;
    }
    let p: sim.Player | null | undefined;
    if (m.pid !== undefined) {
      p = sim.byId(g, m.pid);
      const e = g.kicked.includes(m.pid) ? "kicked" : !p || p.sec !== m.sec ? "bad_secret" : "";
      if (e) {
        send(ws, { t: "err", e });
        return close(ws, 4003, e);
      }
      // Newest socket wins.
      for (const o of this.ctx.getWebSockets()) if (o !== ws && this.att(o)?.role === "player" && this.att(o)?.pid === m.pid) close(o, 4001, "replaced");
    } else {
      if (g.state === "over") {
        send(ws, sim.endView(g));
        return close(ws, 1000, "over");
      }
      p = sim.addPlayer(g, m.name, hex(16));
      if (!p) {
        send(ws, { t: "err", e: "room_full" });
        return close(ws, 4005, "room_full");
      }
      this.save();
    }
    this.setAtt(ws, { pid: p!.id, role: "player" });
    sim.touch(g, p!);
    send(ws, { ...intro, pid: p!.id, sec: p!.sec });
    this.pushPub();
    if (g.state === "over") send(ws, sim.endView(g));
    this.ensureTick();
  }

  hostAct(g: sim.Game, m: Extract<ClientMsg, { t: "host" }>) {
    if (m.a === "start") sim.startGame(g);
    else if (m.a === "pause" && g.state === "play") {
      g.state = "paused";
      this.stopTick();
    } else if (m.a === "resume" && g.state === "paused") g.state = "play";
    else if (m.a === "end" && g.state !== "over") {
      sim.hostEnd(g);
      return this.finish(g);
    } else if (m.a === "kick" && m.pid !== undefined && sim.byId(g, m.pid)) {
      sim.removePlayer(g, m.pid);
      for (const ws of this.ctx.getWebSockets())
        if (this.att(ws)?.role === "player" && this.att(ws)?.pid === m.pid) {
          send(ws, { t: "err", e: "kicked" });
          close(ws, 4003, "kicked");
        }
    }
    this.ensureTick();
    this.save();
    this.pushPub();
  }

  async webSocketClose(ws: WebSocket, code: number) {
    close(ws, 1000, "bye");
    this.dropSocket(ws);
  }
  async webSocketError(ws: WebSocket) {
    this.dropSocket(ws);
  }
  dropSocket(ws: WebSocket) {
    const a = this.att(ws), g = this.g;
    if (!g) return;
    const others = this.ctx.getWebSockets().filter((o) => o !== ws && o.readyState === WebSocket.OPEN);
    if (a?.role === "player" && !others.some((o) => this.att(o)?.pid === a.pid)) {
      const p = sim.byId(g, a.pid);
      if (p) p.conn = false;
    }
    if (!others.length) this.save();
  }

  ensureTick() {
    if (!this.g || this.g.state !== "play" || this.timer) return;
    this.last = Date.now();
    this.idle = 0;
    this.timer = setInterval(() => this.onTick(), 1000 / T.TICK_HZ);
  }
  stopTick() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  onTick() {
    const g = this.g;
    if (!g || g.state !== "play" || GEN !== G.__gtcGen) return this.stopTick();
    const now = Date.now(), dt = (now - this.last) / 1000;
    this.last = now;
    this.maxDt = Math.max(this.maxDt, dt);
    sim.step(g, dt);
    this.tick++;
    const socks = this.ctx.getWebSockets();
    const pub = this.tick % T.PUB_HOST_EVERY === 0 ? JSON.stringify(sim.scannerView(g)) : "";
    let players = 0;
    for (const ws of socks) {
      const a = this.att(ws);
      if (!a) continue;
      if (a.role === "host") {
        if (pub) send(ws, pub);
        continue;
      }
      if (!sim.byId(g, a.pid)) continue;
      players++;
      send(ws, JSON.stringify(sim.playerView(g, a.pid)));
      for (const o of g.out) if (o.to === a.pid) send(ws, { t: "ev", kind: o.kind, text: o.text, x: o.x, z: o.z, n: o.n });
      if (pub && this.tick % T.PUB_PHONE_EVERY === 0) send(ws, pub);
    }
    g.out = [];
    if (g.state !== "play") return this.finish(g); // step() ended the game
    // Auto-pause: nobody connected for 30 s → save and stop ticking so the DO can hibernate.
    this.idle = players ? 0 : this.idle + dt;
    if (this.idle >= T.AUTOPAUSE_S) {
      this.stopTick();
      return this.save();
    }
    if (now - this.lastSave >= T.SAVE_S * 1000) this.save();
    if (now - this.logAt >= 60_000) {
      // Workers freeze clocks during sync code, so the longest tick gap is the honest health signal.
      console.log(`room ${g.code}: max tick gap ${Math.round(this.maxDt * 1000)} ms, ${players} players`);
      [this.logAt, this.maxDt] = [now, 0];
    }
  }

  finish(g: sim.Game) {
    this.stopTick();
    const end = JSON.stringify(sim.endView(g));
    this.pushPub();
    for (const ws of this.ctx.getWebSockets()) send(ws, end);
    this.save();
    this.ctx.storage.setAlarm((this.alarmAt = Date.now() + HOUR));
  }

  pushPub() {
    if (!this.g) return;
    const pub = JSON.stringify(sim.scannerView(this.g));
    for (const ws of this.ctx.getWebSockets()) if (this.att(ws)) send(ws, pub);
  }

  save() {
    const g = this.g;
    if (!g) return;
    this.lastSave = Date.now();
    this.ctx.storage.put("game", { ...g, out: [] });
    // Cleanup alarm: 24 h after the last activity (an ended game sets its own 1 h alarm).
    if (g.state !== "over" && this.lastSave + 24 * HOUR - this.alarmAt > HOUR) this.ctx.storage.setAlarm((this.alarmAt = this.lastSave + 24 * HOUR));
  }

  async alarm() {
    this.stopTick();
    for (const ws of this.ctx.getWebSockets()) close(ws, 4004, "expired");
    this.g = null;
    await this.ctx.storage.deleteAll();
  }
}
