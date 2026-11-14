# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Two web surfaces from one page (`index.html`, routed in `src/client/main.ts`): the **Scanner** on a host laptop (`/host/CODE`, Canvas 2D) and the **phone** view (`/j/CODE`, Three.js, landscape only). The landing page `/` creates or joins a room.

## Users

**Primary: game-jam judges.** A stranger at a judging table is handed a QR code with no explanation and plays a Quick 600 game (about 15 min). Success is that within 60 seconds they have flown to loot, banked it and picked a perk, without reading anything beyond the 3-line rules card.

**Secondary: couch-party groups** of 3–8 people (up to 12) in one room, one laptop on a shared screen and everyone on their own phone, playing repeat games at Quick, Standard or Marathon length.

## Product Purpose

A couch-party space heist: grab loot, bring it home, first to the target wins; shoot people to make them drop theirs. It exists to turn one laptop and a room of phones into a shared, talk-across-the-table game that needs no installs or accounts. Success at the jam is the one-minute test passing with strangers.

## Positioning

The laptop is a **public police scanner**, not a shared view of the game: it shows the map, ownership and the score race, but ship positions only as pings when someone does something loud (firing, dashing, banking, building, dying). Flying quietly hides you. Each phone sees only its own sensor range, and all filtering happens on the server. The table sees the noise, never the whole picture, so suspicion, deals and betrayals happen out loud in the room.

## Operating Context

- A living room or judging table: the Scanner must read from about 3 metres; phones are held in landscape with both thumbs (joystick left, FIRE / DASH / BUILD right).
- Players join by scanning a QR code, type a name and wait on the rules card. Anyone can join mid-game; the QR stays in a corner of the Scanner.
- The host controls Start, Pause (space bar), End and kick from the Scanner.
- Venue Wi-Fi is flaky, phones lock, pages get refreshed, batteries drain in long games. Reconnecting and stasis are routine states, not errors.
- Sessions are short at the jam (Quick 600); Standard (~1 h) and Marathon (~4 h) exist but are untested for pacing.

## Capabilities and Constraints

- **Source of the rules:** `GDD.md` (v2) is the current plan and a **living draft**, not a contract. Every number lives in `src/shared/tuning.ts`.
- **Shipped:** rooms and QR join, lobby, one shared world per room, loot and banking, combat, rings, building and stealing stations, Vault and Crown, 12 perks offered 2 at a time on level-up, 8 sector rules, pause/kick/reconnect, server-side fog of war.
- **Deliberately out of scope:** eras or global timers, a shop or currency, accounts or cross-game progression, chat, matchmaking, NPC combat AI, 3D on the Scanner, a rematch button, localisation.
- **Hosting:** Cloudflare Workers + one Durable Object per room, kept on the Free plan ($0). A hit Free limit kills live games rather than billing.
- **Performance budget:** ≤250 KB JS gzipped total; first load under 2 s on 4G; the Scanner never downloads Three.js; phone capped at 30 fps, DPR ≤1.5, no post-processing.
- **Assets:** every 3D asset is generated in code; there are no asset files (current approach, not a commitment).
- **Security:** player names are rendered only via `textContent` / `fillText`; secrets never appear in URLs, QR codes or screenshots.
- **Terminology:** Scanner, loot, bank / HOME, hold, ring, station, Vault, Crown, ping, ticker, stasis, rookie shield, perk, sector rule, Most Wanted, target.

## Brand Commitments

- **Name:** Grand Theft Cosmos.
- Nothing else is binding. The art direction in `GDD.md` §8 (low-poly neon noir, Scanner as a vector radar, monospace type) describes the current build and is open to change.
- **Current voice:** terse, imperative, plain. Rules are three short lines; hints are at most 6 words ("Hold full — go home").

## Evidence on Hand

- The game itself, playable via `bun run dev` / deployed to workers.dev, plus `GDD.md`.
- Automated checks: `src/shared/sim.test.ts`, `scripts/bots.ts` (load), `scripts/e2e.ts`.
- **None in the repo:** playtest results from the one-minute test, testimonials, press, player counts, screenshots or marketing art. Do not fabricate any of these.

## Product Principles

1. **Understood in one minute.** The radar and the hints are the tutorial. Anything that adds reading time for a first-time judge has to earn it.
2. **The big screen is public and deliberately incomplete.** Loud actions reveal you, quiet ones don't. Never leak private information to the Scanner.
3. **Players drive everything.** Nothing changes on a clock; everything can be stolen.
4. **Nobody loses to the network.** Reconnecting, stasis and refreshes are first-class states with calm, clear UI.
5. **The room is the chat.** Design for people talking across the table, not for in-game communication.

## Accessibility & Inclusion

- Every player has a **colour and a letter glyph** on every HQ, station, ping and bar; colour is never the only cue.
- Touch targets are at least 64 px; hints need no more than a glance.
- `prefers-reduced-motion` disables screen shake and CSS animation.
- Scanner text must be readable from about 3 metres.
- Nothing depends on vibration, fullscreen or wake lock (iOS lacks or limits them).
