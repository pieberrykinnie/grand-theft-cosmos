import { SECTORS, T } from "../shared/tuning";
import { el, rulesCard } from "./net";

const app = document.getElementById("app")!;
const [, route, raw] = location.pathname.split("/");
const code = (raw ?? "").toUpperCase();

if (route === "host" && /^[A-Z2-9]{5}$/.test(code)) import("./scanner").then((m) => m.start(app, code));
else if (route === "j" && /^[A-Z2-9]{5}$/.test(code)) import("./phone").then((m) => m.start(app, code));
else landing();

function landing() {
  const names = ["Quick", "Standard", "Marathon"], mins = ["~15 min", "~1 h", "~4 h"];
  const target = el("select", {}, ...T.TARGETS.map((t, i) => el("option", { value: String(t), textContent: `${names[i]} ${t.toLocaleString()} (${mins[i]})` })));
  const sector = el("select", {}, el("option", { value: "random", textContent: "Random sector rule" }),
    ...Object.entries(SECTORS).map(([id, s]) => el("option", { value: id, textContent: `${s.name}${id === "calm" ? " (first game)" : ""} — ${s.desc}` })));
  const err = el("p", { className: "muted" });
  const create = el("button", { textContent: "Create room", onclick: async () => {
    create.disabled = true;
    try {
      const r = await fetch("/api/rooms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target: +target.value, sector: sector.value }) });
      if (!r.ok) throw new Error(await r.text());
      const { code, hostToken } = (await r.json()) as { code: string; hostToken: string };
      localStorage.setItem(`gtc:host:${code}`, hostToken);
      location.href = `/host/${code}`;
    } catch (e) {
      err.textContent = `Couldn't create a room: ${(e as Error).message}`;
      create.disabled = false;
    }
  } });
  const join = el("input", { placeholder: "CODE", maxLength: 5, autocapitalize: "characters", style: { width: "8em", textTransform: "uppercase" } });
  const go = () => /^[A-Za-z2-9]{5}$/.test(join.value) && (location.href = `/j/${join.value.toUpperCase()}`);
  join.onkeydown = (e) => { if (e.key === "Enter") go(); }; // a `false` return would cancel every other key
  const card = el("div", { className: "card" });
  card.innerHTML = `<h1>GRAND THEFT COSMOS</h1><p class="muted">Couch-party space heist · 2–12 players · one laptop, everyone's phones</p>${rulesCard(600)}`;
  card.append(
    el("h3", { textContent: "Host on this laptop" }),
    el("div", { style: { display: "grid", gap: "10px" } }, target, sector, create),
    err,
    el("h3", { textContent: "Or join a game" }),
    el("div", { style: { display: "flex", gap: "10px" } }, join, el("button", { className: "alt", textContent: "Join", onclick: go })),
  );
  app.style.overflow = "auto";
  app.style.height = "100%";
  app.append(card);
}
