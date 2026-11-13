import { T } from "../shared/tuning";

export interface Conn { send(m: object): void; stop(): void; restart(): void }

/**
 * A WebSocket that reconnects itself: on close/error, after 3 s of silence, on `online`, and when the page
 * becomes visible. Backoff 250 ms doubling to 4 s with jitter. Idle sockets send "ping" (answered by the DO runtime).
 */
export function connect(code: string, hello: () => object, onMsg: (m: any) => void, onUp: (up: boolean, closeCode?: number) => void): Conn {
  const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/${code}`;
  let ws: WebSocket | null = null, backoff = 250, lastMsg = 0, retry = 0, stopped = false;

  function open() {
    clearTimeout(retry);
    if (stopped) return;
    const old = ws;
    const s = (ws = new WebSocket(url));
    old?.close();
    lastMsg = Date.now();
    s.onopen = () => s.send(JSON.stringify(hello()));
    s.onmessage = (e) => {
      if (s !== ws) return;
      lastMsg = Date.now();
      backoff = 250;
      onUp(true);
      if (e.data !== "pong") onMsg(JSON.parse(e.data));
    };
    s.onclose = s.onerror = (e) => {
      if (s !== ws) return;
      ws = null;
      if (stopped) return; // closed on purpose (game over, kicked): not "down"
      onUp(false, (e as CloseEvent).code);
      if (stopped) return;
      retry = setTimeout(open, backoff * (0.5 + Math.random()));
      backoff = Math.min(4000, backoff * 2);
    };
  }
  const now = () => { if (!stopped) open(); };
  setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const idle = Date.now() - lastMsg;
    if (idle > T.CLIENT_DEAD_S * 1000) now();
    else if (idle > 1000) ws.send("ping");
  }, 500);
  addEventListener("online", now);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && (!ws || Date.now() - lastMsg > 1000)) now();
  });
  open();
  return {
    send: (m) => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m)); },
    stop: () => { stopped = true; clearTimeout(retry); ws?.close(); },
    restart: () => { stopped = false; backoff = 250; open(); },
  };
}

/** Shows `el` only after the connection has been down for 1 s. */
export function downBanner(el: HTMLElement) {
  let t = 0;
  return (up: boolean) => {
    clearTimeout(t);
    if (up) el.classList.add("hidden");
    else t = setTimeout(() => el.classList.remove("hidden"), 1000);
  };
}

/** A landscape phone: joystick ring on the left, BUILD / BOOST / FIRE on the right. */
const CONTROLS_SVG = `<svg viewBox="0 0 64 32" aria-hidden="true"><rect x="1" y="1" width="62" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="17" r="7" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="17" r="2.5" fill="currentColor"/><circle cx="51" cy="20" r="6.5" fill="#d7261e"/><circle cx="40" cy="23" r="3.5" fill="currentColor"/><circle cx="40" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;

export const rulesCard = (target: number) => `
<div class="rules slab"><ul>
<li><b>Grab loot, bring it home.</b> First to ${target.toLocaleString()} wins.</li>
<li><b>Shoot ships</b> to make them drop their loot.</li>
<li><b>Own rings and stations.</b> They pay you over time.</li>
</ul><div class="ctl">${CONTROLS_SVG}<span>Left thumb steers · right thumb: FIRE, BOOST, BUILD</span></div></div>`;

/** Result headline and reason, shared by the Scanner and the phones. A game ended before anyone banks ties everyone. */
export function resultCopy(names: string[], reason: string): [string, string] {
  const head = names.length > 3 ? `${names.length}-way tie` : names.length ? `${names.join(" & ")} win${names.length === 1 ? "s" : ""}` : "Nobody wins";
  const why = reason === "target" ? "Reached the target first." : names.length > 1 ? "The host ended the game with a tie at the top." : "The host ended the game, so the leader wins.";
  return [head, why];
}

/** Competition ranking: tied scores share a rank (600, 600, 450 → 1, 1, 3). */
export const ranks = (scores: number[]) => scores.map((s) => 1 + scores.filter((t) => t > s).length);

/** The yellow crawl. `set` restarts the scroll only when the text changes. */
export function crawl(tag: string) {
  const span = el("span"), root = el("div", { className: "crawl" }, el("b", { textContent: tag }), el("div", {}, span));
  let last = "";
  return {
    el: root,
    set(lines: string[]) {
      const s = lines.join("   ·   ");
      if (s === last) return;
      last = s;
      span.textContent = s;
      span.style.setProperty("--dur", `${10 + s.length * 0.11}s`);
      span.style.animation = "none";
      void span.offsetWidth;
      span.style.animation = "";
    },
  };
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Omit<Partial<HTMLElementTagNameMap[K]>, "style"> & { style?: Partial<CSSStyleDeclaration> } = {} as any, ...kids: (Node | string)[]) {
  const e = document.createElement(tag);
  const { style, ...rest } = attrs as any;
  Object.assign(e, rest);
  if (style) Object.assign(e.style, style);
  e.append(...kids);
  return e;
}
