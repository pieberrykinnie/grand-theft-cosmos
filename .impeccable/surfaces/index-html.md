---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["src/client/main.ts","src/client/scanner.ts","src/client/phone.ts","src/client/net.ts"]
---

# Surface brief: Grand Theft Cosmos — all 2D surfaces

## Scope and mode
- Every 2D surface on the one page (`index.html`): landing `/`, Scanner `/host/CODE` (lobby, play, pause, end, errors), phone `/j/CODE` (join, wait, HUD, overlays, end), plus the DOM layer drawn over the 3D view (HOME marker, damage numbers, hit arc, vignette).
- Mode: Experience for the Scanner and the phone in play; the landing form is Operate inside the same world.
- Untouched: the Three.js scene and models, protocol, sim, server, tuning. Client-only change.

## Audience, job, proof
- Judges handed a QR (one-minute test: loot, bank, perk on the phone alone) and couch groups of 3–12 watching one laptop from ~3 m.
- Proof is the product's own truth: the Scanner hears only pings (fire, boost, build, hit, death, capture, vault, bank) and the ticker; the race to a target already exists.

## Settled decisions (user, 2026-11-13)
- News red only on LIVE, BREAKING, FIRE and danger states; crawl yellow only on the crawl. Map marks and race bars use player colours alone.
- Typeface: Barlow Condensed 600 + 800, self-hosted Latin-subset woff2, no hosted font stylesheet.
- BREAKING headline = act + landmark derived from the public ping position, with the player's chip ("SHOTS FIRED NEAR THE VAULT").
- Most Wanted gets its own card on the Scanner, tied to a matching map marker.
- Phone HUD colour roles (confirmed brief, 2026-11-13): "Loot stays aquamarine and HOME stays gold on the phone, to match the 3D scene." Gold is limited to the HOME objective, the HOME marker and the "+N BANKED" payoff; level and XP take the player's own colour. "Crawl yellow only on the crawl" governs broadcast chrome.
- Carried disciplines: one instruction at a time on the phone; timers as stepped strips; unavailable/offline/unclaimed = outline, never faded; your chip identical on phone and Scanner; HUD reveals controls when they first matter; reduced motion = static crawl, no ripples or pulses.

## Direction contract
THESIS: The laptop is live late-night TV coverage of a heist that only hears loud acts; each phone is that pilot's onboard feed. Refuses the category's neon sci-fi cockpit (glow, bevels, translucent panels, monospace terminal).

OWN-WORLD: Studio black ground, white broadcast slabs with hard square edges, news red for LIVE/BREAKING/danger, crawl yellow on black, and the twelve player colours (always with their letter) as the only other colour. Barlow Condensed caps, tabular numerals. No glow, no gradients, no rounding on chrome; circles only for thumb buttons, pins and the radar.

STORY: The room watches a broadcast and argues about who did what; a stranger on a phone follows one instruction at a time and sees their own loud act land on the TV seconds later.

FIRST VIEWPORT: Scanner 1440×900 — aerial sky-cam map (sector disc, grey plate, white rim) fills the left ~1000 px under a red LIVE badge + sector name top-left; right column: white RACE TO 600 board (chip, name, bar, score, red 600 TO WIN line), WANTED card, JOIN THE CHASE tile (QR, code, host controls); red BREAKING lower third over the map's foot; yellow-on-black crawl across the bottom edge. Phone 844×390 — telemetry strip top-left, one instruction strap top-centre, radar inset top-right, FIRE/BOOST/BUILD bottom-right, left half clear for the joystick.

FORM: Live Coverage (late-night news + election-night tally), position 1 on the ordered list; seed:ce1edb3d346326cf. Composition reference: .impeccable/mocks/decision/model-pick.html (phone instruction moves to top-centre: bottom-left is under the left thumb).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
