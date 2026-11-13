import { SECTORS, T } from "../shared/tuning";
import f600 from "./fonts/barlow-condensed-600.woff2?url";
import f800 from "./fonts/barlow-condensed-800.woff2?url";
import { crawl, el, rulesCard } from "./net";

// Self-hosted Barlow Condensed (OFL, see fonts/OFL.txt). Registered here so CSS and the Scanner's canvas share it.
for (const [url, weight] of [[f600, "600"], [f800, "800"]]) {
  const face = new FontFace("Barlow Condensed", `url(${url}) format("woff2")`, { weight });
  document.fonts.add(face);
  face.load().catch(() => {}); // the fallback stack still reads if the font fails
}

const app = document.getElementById("app")!;
const [, route, raw] = location.pathname.split("/");
const code = (raw ?? "").toUpperCase();

const CSS = `
.land { height: 100%; display: grid; grid-template-rows: 1fr auto; }
.land main { overflow: auto; display: grid; grid-template-columns: minmax(0, 1fr) minmax(340px, 500px); gap: 40px 64px; align-content: center; width: 100%; max-width: 1360px; margin: 0 auto; padding: 32px 56px; }
.land h1 { font-size: clamp(64px, 8.4vw, 132px); line-height: 0.86; }
.land .pitch { font-size: 26px; color: var(--mute); margin: 20px 0 32px; max-width: 32ch; text-wrap: pretty; }
.land h2 { font-size: 30px; margin-bottom: 14px; }
.land form, .land .joinf { display: grid; gap: 14px; }
.land fieldset { border: 0; margin: 0; padding: 0; display: grid; gap: 8px; }
.len { position: relative; display: grid; grid-template-columns: auto 1fr; align-items: baseline; gap: 12px; min-height: 64px; padding: 14px 18px; border: 2px solid var(--mute); cursor: pointer; }
.len input { position: absolute; opacity: 0; pointer-events: none; }
.len b { font-size: 28px; font-weight: 800; text-transform: uppercase; }
.len span { text-align: right; color: var(--mute); }
.len:hover { border-color: var(--slab); }
.len:has(input:checked) { background: var(--slab); border-color: var(--slab); color: var(--ink); }
.len:has(input:checked) span { color: var(--mute-ink); }
.len:has(input:focus-visible) { outline: 3px solid var(--slab); outline-offset: 3px; }
.land .joinf { margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--plate); }
.land .err:empty { min-height: 0; margin: 0; }
.land .row { display: flex; gap: 10px; }
.land .code { width: 6.2em; flex: none; letter-spacing: 0.24em; text-transform: uppercase; }
/* On a phone the visitor almost always came to join: title, join, rules, then hosting. */
@media (max-width: 900px) {
  .land main { display: flex; flex-direction: column; gap: 24px; padding: 28px 18px; }
  .land .intro, .land .act { display: contents; }
  .land h1 { font-size: 64px; }
  .land .pitch { margin: -8px 0 0; }
  .land .joinf { order: 1; margin: 0; padding: 0; border: 0; }
  .land .rules { order: 2; }
  .land form { order: 3; }
}
`;

function landing() {
  document.head.append(el("style", { textContent: CSS }));
  const kinds = [["Quick", "~15 min"], ["Standard", "~1 h"], ["Marathon", "~4 h"]];
  const lengths = el("fieldset", {}, el("legend", { className: "lbl", textContent: "Game length" }),
    ...T.TARGETS.map((t, i) => el("label", { className: "len" },
      el("input", { type: "radio", name: "len", value: String(t), checked: i === 0 }),
      el("b", { textContent: kinds[i][0] }),
      el("span", { textContent: `First to ${t.toLocaleString()} · ${kinds[i][1]}` }))));
  const sector = el("select", { id: "sector" }, el("option", { value: "random", textContent: "Random sector rule" }),
    ...Object.entries(SECTORS).map(([id, s]) => el("option", { value: id, textContent: `${s.name}${id === "calm" ? " (first game)" : ""} — ${s.desc}` })));
  const err = el("p", { className: "err", role: "alert" });
  const create = el("button", { type: "submit", textContent: "Create room" });
  const form = el("form", {}, el("h2", { textContent: "Host on this laptop" }), lengths,
    el("div", {}, el("label", { className: "lbl", htmlFor: "sector", textContent: "Sector rule" }), sector), create, err);
  form.onsubmit = async (e) => {
    e.preventDefault();
    create.disabled = true;
    create.textContent = "Creating room…";
    try {
      const target = +(form.querySelector<HTMLInputElement>("input[name=len]:checked")?.value ?? T.TARGETS[0]);
      const r = await fetch("/api/rooms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target, sector: sector.value }) });
      if (!r.ok) throw new Error(await r.text());
      const { code, hostToken } = (await r.json()) as { code: string; hostToken: string };
      localStorage.setItem(`gtc:host:${code}`, hostToken);
      location.href = `/host/${code}`;
    } catch (e) {
      err.textContent = `Couldn't create a room: ${(e as Error).message}. Try again.`;
      create.disabled = false;
      create.textContent = "Create room";
    }
  };
  const join = el("input", { id: "code", className: "code", placeholder: "ABCDE", maxLength: 5, autocapitalize: "characters", autocomplete: "off", spellcheck: false });
  const joinErr = el("p", { className: "err", role: "alert" });
  const go = () => {
    if (/^[A-Za-z2-9]{5}$/.test(join.value)) location.href = `/j/${join.value.toUpperCase()}`;
    else joinErr.textContent = "Room codes are 5 letters or numbers, shown on the host's screen.";
  };
  join.onkeydown = (e) => { if (e.key === "Enter") go(); }; // a `false` return would cancel every other key
  const joinf = el("div", { className: "joinf" }, el("h2", { textContent: "Join a game" }),
    el("div", {}, el("label", { className: "lbl", htmlFor: "code", textContent: "Room code" }),
      el("div", { className: "row" }, join, el("button", { className: "alt", textContent: "Join", onclick: go }))), joinErr);
  const intro = el("div", { className: "intro" }, el("h1",{ innerHTML: "Grand<br>Theft<br>Cosmos" }),
    el("p", { className: "pitch", textContent: "A couch-party space heist for 2–12 players. One laptop on the big screen, everyone's phones in their hands." }));
  intro.insertAdjacentHTML("beforeend", rulesCard(T.TARGETS[0]));
  const sectors = crawl("Sectors");
  sectors.set(Object.values(SECTORS).map((s) => `${s.name} — ${s.desc}`));
  app.append(el("div", { className: "land" }, el("main", {}, intro, el("div", { className: "act" }, form, joinf)), sectors.el));
}

if (route === "host" && /^[A-Z2-9]{5}$/.test(code)) import("./scanner").then((m) => m.start(app, code));
else if (route === "j" && /^[A-Z2-9]{5}$/.test(code)) import("./phone").then((m) => m.start(app, code));
else landing();
