import { SECTORS, T } from "../shared/tuning";
import { Room } from "./room";

export { Room };
export interface Env { ROOM: DurableObjectNamespace<Room> }

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
const stub = (env: Env, code: string) => env.ROOM.get(env.ROOM.idFromName(code));

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(req.url);
    if (pathname === "/api/rooms" && req.method === "POST") {
      const body: any = await req.json().catch(() => ({}));
      const target = T.TARGETS.includes(body?.target) ? body.target : T.TARGETS[0];
      const sector = typeof body?.sector === "string" && (body.sector === "random" || Object.hasOwn(SECTORS, body.sector)) ? body.sector : "random";
      for (let i = 0; i < 5; i++) {
        const code = Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
        const hostToken = await stub(env, code).init(code, target, sector);
        if (hostToken) return Response.json({ code, hostToken });
      }
      return new Response("no free room code", { status: 503 });
    }
    const m = pathname.match(/^\/ws\/([^/]*)$/);
    if (m) {
      if (!/^[A-Z2-9]{5}$/.test(m[1])) return new Response("bad code", { status: 400 });
      if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
      return stub(env, m[1]).fetch(req);
    }
    return new Response("not found", { status: 404 });
  },
};
