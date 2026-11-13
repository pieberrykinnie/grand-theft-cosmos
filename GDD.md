# Grand Theft Cosmos — Game Design Document

v2 · 2026-11-13 · Scoped for a 28-hour game-jam build · Target: $0 hosting

> **Changes from v1.** The world is flat: there are no eras, phases or global timers, and only players change the game. There is one win condition. Every collectable is the same thing, **loot**. Upgrades are a pick-one-of-two choice when you level up, instead of a shop. A new player understands the game within **1 minute**.

---

## 1. Pitch

**Grab loot, bring it home, first to the target wins. Shoot people to make them drop theirs.**

A couch-party space heist for 2–12 players and one laptop. The laptop runs **the Scanner**: a top-down map of the galaxy that everyone in the room can see. It shows who owns what, the score race, and a flash on the map whenever someone does something loud. Each player scans a QR code and flies their own ship from their phone in third person.

### Pillars

1. **You get it in 1 minute.** One sentence explains the goal, an arrow shows the way, and there are 3 buttons.
2. **The big screen is a police scanner.** It is public, live and deliberately incomplete. Shooting, boosting and banking give you away, while flying around quietly doesn't.
3. **Everything can be stolen:** the loot in your hold, your stations, and the Crown.
4. **Players drive everything.** Nothing in the world changes on a clock. Fields run dry because people mine them, and the Vault opens because someone cracks it.
5. **Nobody loses to the network.** Dropped connections, locked screens and page refreshes are routine.

Diplomacy happens out loud, because everyone is in the same room.

---

## 2. Scope

**In:**
- creating a room and joining by QR code, plus a lobby
- one shared live world per room
- loot, banking, combat, rings, building and stealing stations, the Vault and the Crown, level-up perks
- sector rules (replayability, §4.8)
- pause, kick, reconnect, server-side fog of war

**Out** (listed so nobody builds them):
- eras, phases and global timers
- a shop or currency (the score is the only number)
- accounts and progression that carries between games
- chat, matchmaking, NPC combat AI, a physics engine
- 3D on the Scanner
- client-side position prediction, a binary wire format
- a rematch button, localisation

**Stretch** (only after the build is frozen): NPC convoys, player-placed bounties, nebulae that hide pings, WebAudio sound effects, engine trails.

**Where the replayability comes from** (all of it is data tables, not new mechanics):
- a pool of 12 perks, offered 2 at a time at random, so every game produces different builds
- 8 sector rules, one per game
- a map template rolled fresh each game (kept symmetric, so it stays fair)
- the people at the table

**Room size:** up to 12 players, designed for 3–8. The expected and maximum loads both average 5 per room.

---

## 3. The one-minute promise

A judge scans the QR code, and 60 seconds later should have completed the whole loop: grab loot, bank it, level up.

**Rules card.** Shown large on the Scanner in the lobby, and on each phone while it waits to start:

> 1. **Grab loot, bring it home.** First to **600** wins.
> 2. **Shoot ships** to make them drop their loot.
> 3. **Own rings and stations.** They pay you over time.

Below the card is a picture of the controls: the joystick on the left, FIRE / BOOST / BUILD on the right.

**The arrow** is the tutorial. A single thick 3D arrow hovers over your ship (gold for HOME, aquamarine for loot), echoed by an objective chip at the top of the HUD with the distance and a one-line instruction:
- When your hold is less than half full, it points to the nearest loot or field.
- When it's half full or more, or you're carrying the Crown, it points to your nearest bank, labelled HOME.

A new player who just follows the arrow completes the core loop without reading anything.

**Hints.** Each hint is at most 6 words. It appears the first time its situation comes up, then never again (remembered in `localStorage`).

| Situation | Hint |
|---|---|
| Hold is full | "Hold full — go home" |
| First time banking | "Banked! Pick a perk" |
| Entering a ring | "Stay inside to claim it" |
| Firing for the first time | "Shooting shows you on the big screen" |
| Hull drops below 30% | "Run home — you'll drop your loot" |
| BUILD becomes available | "BUILD: plant a station here" |

**Rookie shield.** For your first 60 s in a game you can't be damaged. Firing drops the shield early, and while it's up you can't capture rings. The first minute is for learning, and the shield also protects people who join late.

**Everything else is automatic.** Picking up loot, banking, capturing and turrets all happen without input. The only choices are where to fly, FIRE, BOOST, BUILD, and which of two perks to take.

---

## 4. Session flow

1. **Host** opens `/` on the laptop and picks:
   - a **target**: **Quick 600** (about 15 min, the default and the one for judging), **Standard 2,500** (about 1 h) or **Marathon 8,000** (about 4 h)
   - a **sector rule**: Random by default, or Calm, or a specific one

   The page calls `POST /api/rooms` and opens `/host/CODE`.
2. **Lobby (Scanner):** the QR code for `https://<app>/j/CODE`, the code in plain text, the rules card, and the players who have joined, each with a colour, a letter glyph and a kick button. The host presses **Start**.
3. **Phone:** scan, type a name (remembered), tap **Join**, and read the rules card while waiting.
4. **Play.** Anyone can join late at any time: the QR code stays in a corner of the Scanner.
5. **End:** the first player to reach the target in banked loot wins. The host can also press **End**, in which case the current leader wins. The Scanner and the phones show the winner and the final table (banked loot, kills, loot stolen, stations taken).

The host can **Pause** (space bar), **End** (with confirmation) and kick a player.

---

## 5. Rules

All numbers here are starting values. They live in `src/shared/tuning.ts`, mirrored in §15.

### 5.1 Core loop

Fly to loot → grab it → fly home → bank (now it's score, and safe) → pick a perk → repeat, while robbing loaded ships, claiming rings and planting stations.

### 5.2 Ships

- The world is a flat **2D plane** (x, z). Rendering is 3D, but gameplay is circles on a plane: ships don't collide with each other and there are no obstacles.
- Movement has inertia: thrust along the heading, light drag, and a speed cap of 70. Turning is fast, at 180°/s.
- **Boost:** 1.8× top speed for 1.5 s, with a 5 s cooldown.
- **Hull:** 100 HP. It regenerates 5 HP/s once you've gone 6 s without taking damage. There are no shields.
- **Blaster:** fires straight ahead, 4 bolts/s at 10 damage each, with a range of 320. **Aim assist:** a bolt locks onto the nearest target within a 15° cone.
- **Hold:** 50 loot. **Your ship glows brighter the more you carry**, so anyone close enough to see you can tell who is worth robbing.
- **Sensors:** 450 units.
- **Death:** everything in your hold spills out as loot crystals, and whoever dealt damage last (within 10 s) gets the kill. You respawn at your HQ after 5 s with a 3 s shield. Your perks and score are kept.

### 5.3 The map (seeded, symmetric, rolled each game)

- Wedges `W = max(players at start, 4)`. Map radius `R = 800 + 150·W`, so 1,400 for 4 wedges and 2,600 for 12.
- Every wedge gets the same layout, rotated by `2π/W`:
  - an **HQ** at 0.92R
  - a **home field** at 0.75R
  - a **ring** at a radius rolled each game between 0.47R and 0.63R
  - a **wild field** on the boundary between wedges, at a radius rolled each game between 0.30R and 0.45R
- The **Vault** sits at the centre.
- Every game looks different, but every player gets the same distances to everything.
- **Late joiners** take an empty wedge if one is left. Otherwise their HQ goes at the midpoint of the widest gap between HQs on the rim. They start with **3 perk picks** to help them catch up, and 0 score.
- PRNG: mulberry32 seeded from the room code.

### 5.4 Things on the map

Every rule below fits in a single line in the game:

| Thing | Rule |
|---|---|
| **Loot** (glowing crystals worth 5 each) | Fly over it to pick it up, until your hold is full. Spilled loot disappears after 120 s. |
| **Home field** | Grows 1 crystal every 10 s, with at most 6 floating at once. It never runs out, but it's slow. |
| **Wild field** | Grows 1 crystal every 4 s, with at most 15 floating. **It runs dry after producing 600 loot**, and a new one forms elsewhere (0.25–0.7R) 30 s later. Fields move because players use them up. |
| **HQ** (one per player) | Your bank, respawn point and safe zone (radius 140). You can't be hurt there, and a 30 dps turret shoots intruders. It can't be taken. |
| **Ring** (one per wedge) | Stay inside it (radius 110) for 10 s to claim it. Progress freezes when it's contested and decays when it's empty. **It pays its owner +1 every 5 s** and shows the owner nearby ships on their radar. |
| **Station** (built by players) | Press **BUILD** and hold still for 5 s. Free, up to 3 each, at least 300 from other structures. It's a bank, a 12 dps turret, and radar for its owner, and **pays +1 every 10 s**. **Shoot it to 0 HP and it becomes yours** at 50% HP. If you already own 3, it's destroyed instead. |
| **Vault** (centre) | Shoot it (600 HP) to crack it open, and **the Crown** pops out. If nobody damages it for 5 s, the Vault regenerates 20 HP/s. Cracking it is loud: every shot pings you on the Scanner. |
| **Crown** | Worth **15% of the target**. The carrier flies at 0.6× speed, can't boost, and **appears live on the Scanner**. It drops if the carrier dies or goes into stasis. If nobody touches it for 30 s it goes back into the Vault, which reseals at full HP. Once it's banked, the Vault reseals. |

### 5.5 Score and levels

- **Score = loot banked.** Banking is automatic the moment you enter your HQ or one of your stations. Ring and station income goes straight to your bank. The score never goes down.
- **Levels:** every `target / 10` banked, you **level up** and get to pick 1 of 2 random perks. That gives about 9 picks per game whatever the target. The choice appears as two large cards on the phone. You can keep flying and tap whenever you like, and offers wait for you.
- **Most Wanted:** whoever is alone in the lead **appears live on the Scanner**. This is the anti-snowball rule: the leader is visible to everyone and becomes the obvious target.

### 5.6 Perks (12, offered 2 at a time)

| Perk | Effect | Stacks |
|---|---|---|
| Heavy Bolts | +30% damage | 3 |
| Rapid Fire | +30% fire rate | 3 |
| Twin Guns | Fire 2 bolts at once | 1 |
| Thick Hull | +40 max hull | 3 |
| Thrusters | +12% top speed | 3 |
| Afterburner | −35% boost cooldown | 2 |
| Big Hold | +25 hold | 3 |
| Magnet | +60% pickup radius | 2 |
| Ghost | Boosting and banking no longer ping you on the Scanner | 1 |
| Fortify | Your stations get +50% HP and turret damage | 2 |
| Patch Kit | Hull starts regenerating 2 s after damage instead of 6 | 1 |
| Insurance | You drop only half your hold when you die | 1 |

Each perk is a modification of tuning values for that one player, and the hull models grow as perks stack. Offers never include a perk that's already maxed out.

### 5.7 Combat

- The server is authoritative. Bolts are simulated as moving points. Hits are tested segment-against-circle each tick (ship radius 10, station radius 30, Vault radius 60), so fast bolts can't pass through a target between ticks.
- Damage is free-for-all, and there are no teams. Alliances are spoken and can be broken.
- Turrets target the nearest enemy ship that isn't shielded and isn't in stasis.

### 5.8 Sector rules (one per game; replayability)

The rule for the game is shown as one line on the Scanner and the phones. It's a set of global tuning changes and adds no new mechanics.

| Rule | Effect |
|---|---|
| Calm | No change (recommended for first-time players) |
| Mother Lode | Fields grow crystals 2× faster |
| Blackout | The Scanner shows only deaths, the leader and the Crown |
| Glass Cannons | All damage ×2 |
| Hot Rings | Rings pay ×2 |
| Afterburners | Everyone ×1.25 speed, boost cooldown halved |
| Fat Crown | The Crown is worth ×2, and its carrier flies at ×0.45 |
| Pirate Code | Loot spilled on death is worth ×1.5 |

### 5.9 Winning

**The first player to reach the target in banked loot wins, immediately.** The Crown, rings, stations and kills are all just routes to that one number. If the host ends the game, the current leader wins. Players who tie share the win.

Expected pace for a leader, to be tuned at Quick length: field runs give about 40–60 loot/min, a ring pays 12/min each, a station 6/min each. So Quick 600 takes about 12–15 min. Standard and Marathon are extrapolations.

---

## 6. Information model: who sees what

All filtering happens **on the server**. No client ever receives data it isn't allowed to display.

| Information | Scanner (laptop, public) | Your phone (private) |
|---|---|---|
| Map layout: HQs, rings, fields, Vault | Exact | Exact |
| Ring owner, capture progress, contested state | Shown | Shown |
| Stations | Owner, HP in 3 levels | Exact HP when inside your sensors |
| Fields | How much is left, as a fill level | Crystals visible within your sensors |
| Vault HP, Crown position | Shown | Shown on the radar |
| **Ship positions** | **Pings only**, plus the leader and the Crown carrier live | Exact within 450 of your ship, and as radar blips near your rings and stations |
| How much other ships carry | Never | How brightly they glow, within your sensors |
| Score, level and connection status for everyone | Exact | Exact (sent at 1 Hz) |
| Perks | Never | Only your own |

**Pings** are circles in the owner's colour that fade over 8 s. They're triggered by:
- firing (at most once per ship every 2 s)
- boosting
- taking a hit
- dying (a wreck marker that lasts 12 s)
- capturing
- banking
- starting a build

**Flying around and picking up loot are silent.** This is the "obstructed broadcast": the table sees the noise, never the whole picture.

---

## 7. UX

### 7.1 Phone (landscape, third person)

- **Left half of the screen:** a floating joystick that appears wherever your thumb lands. Left and right turn the ship; up is thrust and down is brake or reverse (−0.4). About 40 lines of pointer-event code.
- **Right side:** **FIRE** (large, hold to fire), **BOOST** (tap), **BUILD** (lit only where a station is allowed).
- **HUD:**
  - the arrow (§3): 3D over the ship, plus the objective chip and a one-line instruction
  - hull bar
  - hold bar, segmented one crystal per notch
  - "Level N" and an XP bar (banked loot toward the next level), and a "PICK A PERK" badge while an offer is waiting
  - a score race bar showing you, the leader and the target
  - a HOME marker over your HQ, pinned to the screen edge and pointing at it when it's off screen; it shows the loot you'd bank
  - hit markers: the damage you dealt floats up where your bolt landed; taking a hit flashes a red arc on the side it came from
  - on banking, crystals fly from your ship into the bank, "+N BANKED" pops and the XP bar fills (phone only; the Scanner just pings)
  - boost cooldown ring
  - the latest ticker line
  - the sector rule
  - a radar (a 2D canvas about 160 px wide)
  - a red vignette when you take damage
- **Overlays:**
  - "Rotate your phone" when in portrait
  - "Reconnecting…", shown only after the connection has been gone for 1 s
  - "Destroyed — 5"
  - "Stasis"
  - the perk cards (two large buttons that leave the joystick visible)
- **Device features:** the Screen Wake Lock is requested when the game starts and again whenever the page becomes visible. Phones vibrate on hits and on death (Android only; iOS ignores it).

### 7.2 Scanner (laptop)

- **Left:** the map on a 2D canvas, full height. **Right:** a sidebar with:
  - the target and score race bars (colour, letter glyph, name, score, level, status)
  - the sector rule
  - the last 8 ticker lines
  - a small QR code
- It redraws on each public update (2 Hz) and animates ping fades at 30 fps.
- Large monospace type, readable from 3 metres away.

### 7.3 Accessibility and hardware

- Every player has a **colour and a letter glyph** on every HQ, station, ping and bar, so colour is never the only cue.
- Buttons are at least 64 px, and hints never need more than a glance to read. If a player has reduced motion turned on, screen shake is disabled.
- **Battery:** a 30 fps cap, device pixel ratio ≤ 1.5, `powerPreference: 'low-power'`, no antialiasing, no shadows and no post-processing. Marathon players should bring chargers. A phone that dies just leaves its ship in stasis (§10).

---

## 8. Art direction and assets

**Style:** low-poly neon noir. Dark navy space, flat-shaded hulls in the player's colour with glowing trim, glowing bolts and loot, distance fog and a starfield. The Scanner is a vector radar: thin cyan grid, glowing glyphs, monospace text.

**Every 3D asset is generated in code from Three.js primitives.** There are 0 asset files to download.

| Asset | Construction |
|---|---|
| Ship | Extruded dart hull, swept wings, fin, twin nacelles, canopy and trim in one mesh (4 material groups). It rolls into turns, engine flames follow the throttle, and a loot-coloured glow under it grows with the loot carried. Wings widen with Thick Hull. |
| HQ / Station | A dock below the flight plane, a halo ring above the camera, a bank zone with inward chevrons, and a sky beam that ignores fog (yours is the brightest) / the same idea, smaller, with a turret |
| Ring | A ticked rim in the owner's colour and a progress arc that fills while someone claims it |
| Field | A glowing loot-coloured nebula (one `Points` draw) inside a dashed rim. Nothing solid, so it never reads as an obstacle |
| Loot | An `InstancedMesh` of emissive crystal shards that spin and bob, each with a halo (one `Points` draw) |
| Vault / Crown | A gold dodecahedron in a wire cage with an orbit ring; it cracks open (2 halves) and turns see-through when you fly into it / a gold crown with a glow sprite |
| Bolts | Two `InstancedMesh`es: a bright core and a coloured additive sleeve |
| Effects | One pooled `Points` system for sparks (hits, pickups, explosions) plus pooled shockwave rings, flashes and bank crystals |
| Backdrop | A canvas-gradient nebula sky, 1,560 tinted stars, a ringed planet, and space dust that wraps around the camera to show speed |

- **Materials:** `MeshLambertMaterial` with `flatShading` and an emissive colour. **Lighting:** 1 hemisphere light, 1 directional key light and 1 cool directional rim light (no shadows).
- **Budget:** at most 250 KB of JavaScript gzipped in total (Three.js is about 170 KB of that). First load under 2 s on 4G.
- **Code splitting:** the Scanner never downloads Three.js, because the phone view is loaded with a dynamic `import()`.

---

## 9. Technical architecture

```
 Phones (Three.js) ─── wss ──┐
                             ├──> Worker (router) ──> Room Durable Object (one per room code)
 Laptop Scanner (Canvas 2D) ─┘       │                  · authoritative simulation at 10 Hz
                                     │                  · fog filter applied per socket
                                     └─ static assets   · state snapshot to SQLite every 10 s
                                        (free, served by Workers Static Assets)
```

- **Runtime:** Cloudflare Workers, plus one Durable Object (DO) class, `Room`, backed by SQLite (the only kind on the Free plan). The DO is created near the host's laptop.
- **Bun** handles tooling (package management, `bun test`, the bot script). Production runs on Cloudflare's workerd runtime, not Bun.
- **Vite** builds the client and runs the dev server. `@cloudflare/vite-plugin` runs the Worker and DO inside `vite dev` on the same origin. *Verify DO and WebSocket support in hour 0; the docs don't state it explicitly. Fallback: `wrangler dev` plus `vite build --watch`.*
- **Hosting:** `https://grand-theft-cosmos.<subdomain>.workers.dev`, with HTTPS and WSS for free.

### Dependencies

| Package | Why it earns its place |
|---|---|
| `three` | The 3D phone view |
| `uqr` | A tiny QR encoder with no dependencies (`renderSVG`) |
| dev: `vite`, `typescript`, `wrangler`, `@cloudflare/vite-plugin`, `@types/three` | Build, types and deployment |

**Rejected:**
- Socket.IO, PartyKit, Colyseus: plain WebSockets were requested, and the DO already does what they would.
- cannon, rapier: the game is circles on a plane.
- nipplejs: the joystick is about 40 lines.
- msgpack: JSON fits the budget, and outbound messages are free.
- zod: only 5 message shapes to check by hand.
- React: the DOM here is tiny.
- Post-processing: costs phone GPU and battery.

### Files

```
wrangler.jsonc
vite.config.ts
index.html                 one page; main.ts routes by path
src/shared/tuning.ts       every number in §15, plus the PERKS and SECTORS override tables
src/shared/protocol.ts     message types, PROTOCOL_VERSION
src/shared/sim.ts          pure game logic: createGame, addPlayer, step(game, dt), playerView, scannerView
src/shared/sim.test.ts     bun test
src/worker/index.ts        router (~30 lines)
src/worker/room.ts         Room DO: sockets, tick, persistence, rate limits
src/client/main.ts         "/" → landing, "/host/:code" → scanner, "/j/:code" → phone
src/client/net.ts          WebSocket that reconnects itself
src/client/scanner.ts      Canvas 2D Scanner
src/client/phone.ts        Three.js view, HUD, joystick, arrow, hints
src/client/models.ts       procedurally generated meshes
scripts/bots.ts            load-test bots (Bun)
```

Perks and sector rules are both **tables of tuning overrides**. `sim.ts` reads stats through one function, `stat(player, key) = base × sector × perks`, so adding content means adding a row, not writing code.

### `wrangler.jsonc`

```jsonc
{
  "name": "grand-theft-cosmos",
  "main": "src/worker/index.ts",
  "compatibility_date": "<scaffold date>",
  "assets": {
    // add "directory": "./dist" only if not using the Vite plugin
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*", "/ws/*"]   // array form needs wrangler ≥ 4.20 / vite plugin ≥ 1.7
  },
  "durable_objects": { "bindings": [{ "name": "ROOM", "class_name": "Room" }] },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["Room"] }]
}
```

### Worker router

- `POST /api/rooms {target, sector}`: picks a 5-character code from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L), then calls `stub.init(...)` over RPC. If that code already holds a live game, it retries with a new code (up to 5 times). Returns `{code, hostToken}`.
- `GET /ws/:code` with `Upgrade: websocket`: checks the code against `^[A-Z2-9]{5}$`, then `stub.fetch(request)`.
- Everything else is served from static assets.

---

## 10. Netcode, reliability and recovery

### Protocol (JSON, short keys; clients send intents only)

**Client → server**

| Message | Contents | When |
|---|---|---|
| `hello` | `{t, v, role:"player", name, pid?, sec?}` or `{t, v, role:"host", tok}` | First message on every socket |
| `in` | `{t, h, th, f}`: heading in radians, throttle from −0.4 to 1, fire 0/1 | When it changes, at most **5 Hz**. If nothing has changed, it is resent every 2 s as a heartbeat. |
| `act` | `{t, a:"boost"\|"build"\|"perk", k?:0\|1}` | When the player taps |
| `host` | `{t, a:"start"\|"pause"\|"resume"\|"end"\|"kick", pid?}` | Host only |

**Server → client**

| Message | Contents | Rate |
|---|---|---|
| `welcome` | `{pid, sec, map, sector, target}` | After `hello` |
| `s` | `{k, ms, me:{x,z,h,vx,vz,hp,hpMax,held,hold,score,level,offer,perks,boostCd,shield,state,respawnIn,crown}, ents:[[id,kind,x,z,h,owner,aux]], blips:[[x,z,owner]]}` | 10 Hz, to each phone, already fog-filtered |
| `pub` | `scannerView`: scores, rings, stations, fields, pings, the leader, Vault HP, Crown, ticker | 2 Hz to the host and 1 Hz to phones (it is public by definition) |
| `ev` | `{text, kind, x?, z?, n?}` | Ticker and personal events, as they happen. `dealt` (your bolt hit something: where, `n` damage) and `hit` (you were hit; x/z is a point the shot came from) carry positions |
| `end` | `{winner, reason:"target"\|"host", table}` | Once |
| `err` / `reload` | `room_full`, `bad_code`, `bad_secret`, `kicked` / a protocol version mismatch | — |

**Smoothing:**
- Phones draw entities 100 ms in the past, interpolating between snapshots. Bolts are extrapolated along their heading.
- **Only your own heading is predicted:** the phone integrates the joystick at the server's 180°/s turn rate and sends the result as `h`. The server limits how far the heading can change per tick (turn rate × dt × 1.2).
- Position stays server-authoritative, and inertia hides the remaining 150–250 ms of latency.
- **Snapshots are always complete, never deltas**, so recovering from a reconnect is just "receive the next message".

### Recovery

Principle: **the server holds all the truth, and phones are terminals that hold none of it.** Reloading the page is always safe.

1. **Identity.** The server issues `pid` and `sec` (a 128-bit random secret), stored in `localStorage["gtc:CODE"]`. The host token is stored in `localStorage["gtc:host:CODE"]`. Secrets are sent in `hello`, never in a URL.
2. **Client reconnect.**
   - It reconnects when the socket closes or errors, or after **3 s without any message**.
   - Backoff starts at 250 ms and doubles up to a 4 s cap, with random jitter, and retries for as long as the page is open.
   - It reconnects immediately on the `online` event and when the page becomes visible again.
3. **Newest socket wins.** When a known `pid` connects again, the server closes the older socket with code 4001.
4. **Disconnect → stasis.**
   - If the server hears nothing from a player for 6 s, it marks them **offline**.
   - After **10 s offline** the ship enters **stasis**: it stops, can't be touched or damaged, and can't capture or pick up anything. **It drops the Crown**, and it keeps the loot in its hold.
   - During those first 10 s the ship can still be hit, so pulling the plug doesn't help you escape a fight.
   - Reconnecting ends stasis with a 2 s shield.
5. **Persistence.**
   - The DO writes `ctx.storage.put("game", game)` every 10 s, on pause, at the end of the game, when the last socket closes, and on every lobby change.
   - On wake-up it reloads the game inside `blockConcurrencyWhile`.
   - `dt` is limited to 250 ms. The most that can be lost is 10 s.
6. **Tick lifecycle.**
   - The DO uses the WebSocket Hibernation API (`ctx.acceptWebSocket`, with `{pid, role}` stored in each socket's attachment).
   - The 10 Hz `setInterval` runs **only while a game is running and not paused**.
   - **Auto-pause:** if no players are connected for 30 s, the game saves and stops ticking, so the DO can hibernate and isn't billed for duration. It resumes by itself when a player reconnects.
7. **Deploys restart every DO.** **Don't deploy while a real game is in progress.** If it happens anyway, clients reconnect and resume from the last snapshot. A `PROTOCOL_VERSION` mismatch makes the server send `reload`.
8. **WebGL context lost:** show "Tap to resume", which reloads the page.
9. **Cleanup:** an alarm runs `deleteAll()` 1 hour after a game ends, or 24 hours after the last activity.
10. **Host drops out:** the game keeps running, since the Scanner is only a viewer. It reconnects the same way a phone does.

---

## 11. Security and fairness

| Threat | Defence |
|---|---|
| Speed hacks, teleporting, faking damage or score | **The server is authoritative.** Clients send heading, throttle and buttons. The server limits heading change per tick, keeps throttle in range, and enforces fire rate, boost cooldown, build rules and perk offers (you can only pick from the 2 cards you were offered). |
| Map hacks, or reading the network traffic | **Fog is applied on the server** (§6). The Scanner receives only public data, so a host who is also a player gains nothing. |
| Taking over someone else's ship | A 128-bit `sec` for each player in each room. Host actions require the host token. Neither ever appears in a URL, QR code or screenshot. |
| Malformed or oversized messages | Messages over 512 bytes are dropped. `JSON.parse` is wrapped in a try. Every field is type-checked and checked with `Number.isFinite`. Unknown message types are ignored. |
| Message floods (which also use up the free request budget) | A token bucket per socket: 15 messages/s with a burst of 30. Extra messages are dropped. If the overflow lasts 3 s the socket is closed with code 4008. |
| Abusive names, or injecting markup through them | 1–12 characters, trimmed, control characters removed. Rendered only with `textContent` or `fillText`. |
| Uninvited people joining | 5-character codes (31⁵ ≈ 28.6 million possibilities), a cap of 12 per room, and the host's kick. |
| Leaving a game to avoid dying | A 10 s window in which the ship can still be hit before stasis, and stasis drops the Crown. |
| Spawn camping, or the starting position deciding the game | A symmetric map, an HQ safe zone, the 60 s rookie shield and the 3 s respawn shield. |
| One leader running away with the game | Most Wanted: the leader appears live on the Scanner. Ships glow by how much they carry. Late joiners get 3 perk picks. |
| Cross-site WebSocket hijacking (CSWSH) or CSRF | Not applicable: no cookies are used, and everything is over WSS. |

**Accepted for the jam:**
- An attacker draining the shared daily free budget across many rooms. Rate limiting at the edge would need a custom domain and WAF rules.
- Secrets are compared with plain `===`.

---

## 12. Cost: staying at $0

Figures are from Cloudflare's pricing pages as of 2026-11-13. Game length now depends on the target, so the budget is per hour of play.

| Cloudflare resource | Free allowance | How this game uses it |
|---|---|---|
| DO requests | 100,000 per day | **1 per 20 incoming WebSocket messages**, plus 1 per connection. Outgoing messages are free. |
| DO duration | 13,000 GB-s per day, billed at 128 MB | 450 GB-s per room-hour while a game is ticking |
| SQLite rows written | 100,000 per day | 360 per room-hour (1 snapshot every 10 s) |
| Worker requests | 100,000 per day | 1 per socket connection or room created. **Static assets are free.** |

Worst case, every player steering constantly at 5 Hz: **900 DO requests per player-hour.**

| Scenario | Requests per day | Duration per day | Rows written | Fits on Free? |
|---|---|---|---|---|
| **Expected:** 2 rooms × 5 players × 4 h | 36,000 (36%) | 3,600 GB-s (28%) | 2,880 (3%) | **Yes** |
| **Maximum:** 20 rooms × 5 players × 4 h | 360,000 (360%) | 36,000 GB-s (277%) | 28,800 (29%) | **No** |

- **What Free can sustain:** about 110 player-hours a day, which is roughly **5 Marathon games or about 80 Quick games** of 5 players. Judging sessions are Quick games, so they cost almost nothing.
- **Maximum capacity for 4-hour games needs Workers Paid** ($5/month, including 1 million requests and 400,000 GB-s), with no code changes. A full day at maximum load beyond the included amounts costs about $0.50.
- **When a Free limit is hit, the game fails; it isn't billed.** Operations start returning errors, which kills any game in progress. Limits reset at 00:00 UTC.
- **Test locally.** `vite dev` and `wrangler dev` run workerd on your own machine and use none of the allowance. Never `console.log` once per tick; log the maximum tick time once a minute instead.

---

## 13. Testing

**Unit tests** with `bun test` on `src/shared/sim.test.ts` (pure functions, no network):
1. **Fog:** a ship outside player B's sensor range never appears in `playerView(B)`, and never appears in `scannerView` unless it has pinged or is the leader or the Crown carrier.
2. **Death:** the hold spills as loot (half of it with Insurance), and the last hitter gets the kill.
3. **Ring:** ownership flips after 10 s alone in the zone, freezes when contested, and a shielded rookie can't capture it.
4. **Station theft:** shooting a station to 0 HP gives it to the last hitter at 50% HP, and destroys it instead if they already own 3.
5. **Vault:** 0 HP spawns the Crown. A Crown left alone for 30 s goes back in and the Vault reseals.
6. **Heading limit:** a requested 180° turn in a single tick turns at most turn rate × dt × 1.2.
7. **Stasis:** after 10 s offline, the ship is invulnerable and has dropped the Crown.
8. **Win:** banking past the target ends the game with `reason: "target"`.
9. **Content tables:** every key in every perk and sector override exists in the base tuning, which catches typos. Perks are never offered past their stack limit.

**Load test** (`scripts/bots.ts`, **local dev only**):
- 20 rooms × 5 bots sending random input at 5 Hz.
- Every 60 s, bots randomly drop their connection and reconnect.
- Pass when every reconnect succeeds, no phone goes more than 500 ms without a snapshot, and the server's 99th-percentile tick time is under 5 ms.

**One-minute test** (the one that matters for judging): hand the QR code to someone who has never seen the game and say nothing. **Within 60 s they should have banked loot and picked a perk.** Watch where they hesitate, then fix the arrow or the hints, not the rules card.

**Real-device checklist** (deployed build, Quick target, at least 3 phones):
- iPhone Safari and Android Chrome both join by QR code.
- Landscape layout and the wake lock work.
- 5 s of airplane mode recovers on its own.
- Locking the screen for 30 s recovers on its own, with the ship in stasis.
- Refreshing the page in the middle of a fight recovers.

---

## 14. 28-hour build plan

**Deploy at every milestone.** The last good deploy is your safety net.

| Hours | Build | Done when |
|---|---|---|
| 0–2 | Scaffold Vite, TypeScript and the Vite plugin. Worker router. A DO that echoes over a WebSocket. **Deploy to workers.dev.** Confirm the plugin works with DOs and WebSockets. | A phone on mobile data gets the echo back from the deployed URL. |
| 2–6 | `protocol.ts`, `tuning.ts`. `sim.ts` movement and the heading limit. Room DO: create, `hello`, join, reconnect, tick, snapshots to storage. `net.ts`, joystick, Scanner showing debug dots. | **M1:** 2 phones steer dots on the laptop, and the airplane-mode test recovers. |
| 6–10 | Phone 3D (models, chase camera, stars, interpolation). Map generation, fields, loot pickup, HQ, banking, score, target win, the arrow. | **M2: a complete game you can win.** Deploy it. |
| 10–13 | Bolts, aim assist, damage and regeneration, death spill, respawn, shields, Most Wanted. Pings and ticker on the Scanner. | **M3:** a fun 10-minute game. Deploy it. |
| 13–17 | **Sleep.** | — |
| 17–20 | Rings, stations (build, turret, theft), radar blips. `playerView` / `scannerView` fog. | **M4:** the full map. |
| 20–22 | Levels and perk cards, sector rules, Vault and Crown, hints, rules card, lobby with QR, pause and kick, end screen. | **M5: feature freeze.** |
| 22–25 | One-minute test with strangers. Device checklist. Bots run locally. Adjust `tuning.ts`. | §13 passes. |
| 25–27 | Polish: pickup sparkle, hit flash, screen shake, explosions, haptics. Bug fixes only. | — |
| 27–28 | Final deploy, demo recording, submission. **No deploys after this point.** | Shipped. |

**When behind schedule, cut in this order:**
1. Everything on the stretch list.
2. Sector rules (Calm only).
3. Perks, down to 6.
4. The Vault and the Crown.
5. Station turrets.

**Never cut:** building stations, rings, reconnect and stasis, server-side fog, the target win, joining by QR code, the arrow.

---

## 15. Tuning table (`src/shared/tuning.ts`)

| Group | Values |
|---|---|
| Room | `MAX_PLAYERS 12` · targets `600 / 2,500 / 8,000` (default 600) · level every `target/10` |
| Network | `TICK_HZ 10` · public update to host `2 Hz`, to phones `1 Hz` · input `≤5 Hz` with a `2 s` heartbeat · save every `10 s` · client considers the socket dead after `3 s` · server marks offline after `6 s` · stasis after `10 s` offline · auto-pause after `30 s` with no players · max message `512 B` · rate limit `15/s`, burst `30` |
| Map | `W = max(players, 4)` · `R = 800 + 150W` · HQ `0.92R` · home field `0.75R` · ring `0.47–0.63R` (rolled) · wild field `0.30–0.45R` (rolled) · minimum station spacing `300` |
| Ship | radius `10` · top speed `70` · acceleration `140` · drag `0.8/s` · turn `180°/s` · throttle `−0.4..1` · boost `×1.8 / 1.5 s / 5 s cooldown` · hull `100` · regeneration `5/s` after `6 s` · sensors `450` · respawn `5 s` · respawn shield `3 s` · rookie shield `60 s` |
| Weapon | `10` damage · `4/s` · bolt speed `450` · range `320` · aim assist `15°` · kill credit window `10 s` |
| Loot | crystal value `5` · hold `50` · pickup radius `25` · spilled loot lasts `120 s` |
| Fields | radius `120` · home: `1 crystal / 10 s`, at most `6` floating, never runs out · wild: `1 / 4 s`, at most `15` floating, runs dry after `600`, a new one forms `30 s` later in `0.25–0.7R` |
| Ring | radius `110` · capture `10 s` · decay `10%/s` · pays `+1 / 5 s` · radar `450` |
| HQ | radius `140` (bank and safe zone) · turret `30 dps` |
| Station | free · max `3` · build `5 s` (speed `< 5`) · `400` HP · turret `12 dps` / range `200` · bank radius `110` · pays `+1 / 10 s` · radar `450` · taken at `50%` HP |
| Vault and Crown | Vault `600` HP, regenerates `20/s` after `5 s` without damage · Crown worth `15%` of the target · carrier speed `×0.6` · Crown returns after `30 s` untouched |
| Late join | `3` perk picks, score `0` |
| Scanner pings | fade `8 s` · firing pings at most once per `2 s` · death marker `12 s` |

---

## 16. Risks

| Risk | Mitigation |
|---|---|
| A judge doesn't get the game within 1 minute | The arrow, the 3-line rules card, the hints, the rookie shield. The one-minute test in §13 is a requirement before freezing. |
| A daily Free limit is hit and kills a live game | The budget in §12. Test locally. Switch to Paid ($5) before running at maximum capacity. |
| Deploying during a live game | A deploy freeze. Snapshots and automatic reconnect limit the damage to ≤10 s. |
| The Vite plugin doesn't handle DOs or WebSockets in dev | Checked in hour 0. Fallback: `wrangler dev` plus `vite build --watch`. |
| iOS Safari: no vibration, no fullscreen, wake lock only from iOS 16.4 | Nothing in the design depends on these features. |
| Phone battery and heat in Marathon games | 30 fps cap, pixel ratio ≤ 1.5, no post-processing, chargers. A dead phone means stasis, not a loss. |
| Venue Wi-Fi is flaky | The game is hosted on the internet, so phones can switch to mobile data, and the reconnect design covers the switch. |
| Standard and Marathon pacing are untested | Every number is in one file. Tune at Quick and extrapolate. |
| Scope overrun | The cut order in §14. M2 at hour 10 is already a complete, winnable game. |
