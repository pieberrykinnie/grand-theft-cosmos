import { T } from "./tuning";

export const PROTOCOL_VERSION = 3; // 2: `ev` carries x/z/n (hit markers, hit direction); 3: boost is a dash toward `h`

// Entity kinds in `s.ents`: [id, kind, x, z, h, owner, aux]
export const K = { SHIP: 0, BOLT: 1, LOOT: 2, STATION: 3, VAULT: 4 } as const;
// Ship aux bits (low 4 bits = glow 0..10 from loot carried; BOOST = dashed within T.DASH_FX)
export const F = { SHIELD: 16, CROWN: 32, BOOST: 64, STASIS: 128 } as const;

export type ClientMsg =
  | { t: "hello"; v: number; role: "player"; name: string; pid?: number; sec?: string }
  | { t: "hello"; v: number; role: "host"; tok: string }
  | { t: "in"; h: number; th: number; f: 0 | 1 }
  | { t: "act"; a: "boost" | "build" | "perk"; k?: 0 | 1; h?: number }
  | { t: "host"; a: "start" | "pause" | "resume" | "end" | "kick"; pid?: number };

const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const enc = new TextEncoder();

/** 1–12 visible characters, or "" if nothing usable is left. */
export function cleanName(s: unknown): string {
  if (typeof s !== "string") return "";
  return Array.from(s.replace(/\p{C}/gu, "").trim()).slice(0, 12).join("").trim();
}

/** Trust boundary: anything a socket sends goes through here. Returns null to drop. */
export function parseClient(raw: unknown): ClientMsg | null {
  if (typeof raw !== "string" || raw.length > T.MAX_MSG || enc.encode(raw).length > T.MAX_MSG) return null;
  let m: any;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!m || typeof m !== "object") return null;
  switch (m.t) {
    case "hello": {
      if (!num(m.v)) return null;
      if (m.role === "host") return typeof m.tok === "string" ? { t: "hello", v: m.v, role: "host", tok: m.tok } : null;
      if (m.role !== "player") return null;
      const name = cleanName(m.name);
      if (!name) return null;
      if (m.pid === undefined) return { t: "hello", v: m.v, role: "player", name };
      return num(m.pid) && typeof m.sec === "string" ? { t: "hello", v: m.v, role: "player", name, pid: m.pid, sec: m.sec } : null;
    }
    case "in":
      if (!num(m.h) || !num(m.th) || (m.f !== 0 && m.f !== 1)) return null;
      return { t: "in", h: m.h, th: Math.min(1, Math.max(T.TH_MIN, m.th)), f: m.f };
    case "act":
      if (m.a === "boost" && (m.h === undefined || num(m.h))) return { t: "act", a: "boost", h: m.h };
      if (m.a === "build") return { t: "act", a: "build" };
      if (m.a === "perk" && (m.k === 0 || m.k === 1)) return { t: "act", a: "perk", k: m.k };
      return null;
    case "host":
      if (m.a === "kick") return num(m.pid) ? { t: "host", a: "kick", pid: m.pid } : null;
      if (["start", "pause", "resume", "end"].includes(m.a)) return { t: "host", a: m.a };
      return null;
  }
  return null;
}
