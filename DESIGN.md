---
name: Grand Theft Cosmos
description: Couch-party space heist — a public Scanner on the laptop, a private cockpit on every phone.
colors:
  radar-cyan: "#2ee6e6"
  bank-gold: "#ffd23f"
  loot-aquamarine: "#7fffd4"
  alarm-red: "#ff4d6d"
  hull-green: "#3ddc97"
  deep-space-navy: "#060b1a"
  panel-navy: "#0a1430"
  field-navy: "#0d1730"
  track-navy: "#12284a"
  field-stroke: "#23406a"
  unclaimed-steel: "#3a5a88"
  starlight: "#d8f3ff"
  dim-steel: "#6c88a8"
  player-a: "#ff4d6d"
  player-b: "#4dabff"
  player-c: "#ffd23f"
  player-d: "#3ddc97"
  player-e: "#c77dff"
  player-f: "#ff9f1c"
  player-g: "#2ee6e6"
  player-h: "#ff70d4"
  player-j: "#a3e635"
  player-k: "#f5f5f5"
  player-m: "#8d99ff"
  player-n: "#d4a373"
typography:
  display:
    fontFamily: "ui-monospace, \"SF Mono\", Menlo, Consolas, monospace"
    fontSize: "64px"
    fontWeight: 400
    letterSpacing: "0.2em"
  headline:
    fontFamily: "ui-monospace, \"SF Mono\", Menlo, Consolas, monospace"
    fontSize: "36px"
    fontWeight: 700
    letterSpacing: "0.05em"
  title:
    fontFamily: "ui-monospace, \"SF Mono\", Menlo, Consolas, monospace"
    fontSize: "26px"
    fontWeight: 400
  body:
    fontFamily: "ui-monospace, \"SF Mono\", Menlo, Consolas, monospace"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.35
  hud:
    fontFamily: "ui-monospace, \"SF Mono\", Menlo, Consolas, monospace"
    fontSize: "14px"
    fontWeight: 400
    fontFeature: "\"tnum\""
  label:
    fontFamily: "ui-monospace, \"SF Mono\", Menlo, Consolas, monospace"
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: "0.1em"
rounded:
  hairline: "3px"
  chip: "8px"
  control: "10px"
  panel: "12px"
  card: "14px"
  round: "50%"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.radar-cyan}"
    textColor: "{colors.deep-space-navy}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
    height: "64px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.radar-cyan}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
    height: "64px"
  input:
    backgroundColor: "{colors.field-navy}"
    textColor: "{colors.starlight}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px"
    height: "56px"
  rules-card:
    backgroundColor: "{colors.panel-navy}"
    textColor: "{colors.starlight}"
    rounded: "{rounded.card}"
    padding: "16px 20px"
  thumb-button:
    backgroundColor: "rgba(18,40,74,0.85)"
    textColor: "#ffffff"
    rounded: "{rounded.round}"
    size: "76px"
  thumb-fire:
    backgroundColor: "{colors.alarm-red}"
    textColor: "#ffffff"
    rounded: "{rounded.round}"
    size: "112px"
  perk-card:
    backgroundColor: "{colors.panel-navy}"
    textColor: "{colors.starlight}"
    rounded: "{rounded.control}"
    width: "150px"
    height: "92px"
  player-chip:
    textColor: "{colors.deep-space-navy}"
    rounded: "{rounded.chip}"
    size: "36px"
---

# Design System: Grand Theft Cosmos

## Overview

**Creative North Star: "Neon Heist Noir"**

Dark navy space where the only light comes from things worth stealing. Loot crystals, player trim, bolts and objectives glow; everything else sits back in the dark. The look is low-poly and flat-shaded on the phone, and a flat vector radar on the Scanner, held together by one monospace typeface and one cyan instrument line that runs through both.

Every colour has a job. Gold means home and score, aquamarine means loot, cyan is the instrument itself, red is danger, and the twelve player colours mean ownership. The interface reads like glowing instruments on a cockpit console: translucent navy panels with thin cyan strokes, light emitted rather than cast, no drop shadows. Density is low on the Scanner (it must read from across a room) and tight on the phone HUD, which hugs the corners so the 3D view stays clear.

Everything is drawn in code. 3D models are Three.js primitives, icons are inline SVG, the QR is generated, the Scanner is Canvas 2D.

**Key Characteristics:**
- Deep navy ground (#060b1a) everywhere: page, scene background, Scanner canvas.
- Glow instead of shadow: coloured `box-shadow` halos, `drop-shadow` on icons, additive 3D sprites.
- One monospace family for every surface and size.
- Fixed colour roles shared by HTML, Canvas and 3D.
- Every player colour travels with its letter glyph.

## Colors

A near-black navy field lit by a few saturated, emissive signal colours.

### Primary
- **Radar Cyan** (#2ee6e6): the instrument colour. Primary buttons, headings, the rules-card border, HUD panel strokes, the joystick ring, the Scanner grid and map rim, sector-rule text and hints. It frames information; it is never the information's subject.

### Secondary
- **Bank Gold** (#ffd23f): home, score and objective. The HOME arrow and marker, the target number, level and XP bar, "PICK A PERK", perk-card borders, the Vault and the Crown, room codes, and emphasis inside the rules card.

### Tertiary
- **Loot Aquamarine** (#7fffd4): loot and nothing else. Crystals, field nebulae and rims, the hold bar, the loot objective chip, pickup numbers and the cargo glow under a loaded ship.
- **Alarm Red** (#ff4d6d): danger and damage. FIRE, low hull, the damage vignette, the directional hit arc, "Destroyed".
- **Hull Green** (#3ddc97): hull health and the lit BUILD button.

### Neutral
- **Deep Space Navy** (#060b1a): page and scene background, Scanner canvas, and the text colour on cyan or gold fills.
- **Panel Navy** (#0a1430): the rules card and the dark end of panel gradients.
- **Field Navy** (#0d1730) with **Field Stroke** (#23406a): input fills and borders.
- **Track Navy** (#12284a): bar tracks, the Scanner sidebar divider, and (at 85% opacity) the thumb-button fill.
- **Unclaimed Steel** (#3a5a88): rings and structures nobody owns yet.
- **Starlight** (#d8f3ff): body text.
- **Dim Steel** (#6c88a8): secondary text, HUD row labels, ticker history.

### Player palette
Twelve fixed colours, each tied to a glyph from `ABCDEFGHJKMN` (no I or L): A #ff4d6d, B #4dabff, C #ffd23f, D #3ddc97, E #c77dff, F #ff9f1c, G #2ee6e6, H #ff70d4, J #a3e635, K #f5f5f5, M #8d99ff, N #d4a373. They colour ships, HQs, stations, ring arcs, pings, score bars, chips and end-table rows.

### Named Rules
**The Colour Has a Job Rule.** Gold is home and score, aquamarine is loot, cyan is the instrument, red is danger, and player colours are ownership. A role colour is never used as decoration.

**The Glyph Partner Rule.** A player colour never appears alone: every HQ, station, ping, chip and score row carries the owner's letter glyph. Players A, C, D and G share hues with Alarm Red, Bank Gold, Hull Green and Radar Cyan, so the glyph is what tells ownership apart from a system cue.

## Typography

**Display Font:** ui-monospace (with "SF Mono", Menlo, Consolas, monospace)
**Body Font:** the same stack
**Label/Mono Font:** the same stack

**Character:** A single system monospace everywhere, like a terminal readout or radar console. Hierarchy comes from size, weight, colour and letter-spacing, never from a second family.

### Hierarchy
- **Display** (400, 64px, 0.2em tracking): the room code in the lobby, in Bank Gold. Smaller code repeats in the Scanner footer (34px, 0.15em).
- **Headline** (700, 36px, 0.05em tracking): "GRAND THEFT COSMOS" in Radar Cyan, set in caps. Shrinks on phones with `clamp(18px, 4.5vh, 26px)`.
- **Title** (400, 26px): Scanner sidebar headline ("FIRST TO 600"); the lobby rules card runs at 24px.
- **Body** (400, 18px, 1.35): landing page and forms. The Scanner sidebar runs larger (20px, ticker 17px) to read from about 3 metres.
- **HUD** (400, 14px, tabular figures): phone HUD base; values 12–13px, level 15px bold, toasts 18px, pops 26px bold.
- **Label** (700, 10px, 0.1em tracking, caps): HUD row labels (HULL, HOLD, XP) in Dim Steel.

### Named Rules
**The One Typeface Rule.** Every surface uses the system monospace stack. Never add a second family.

**The Tabular Numbers Rule.** Any number that changes during play (hull, hold, distance, score race) uses `font-variant-numeric: tabular-nums` so it doesn't jitter.

## Layout

- **Landing:** a single centred column, max 640px, 24px/16px padding, stacked form controls with 10px gaps.
- **Scanner:** a two-column grid: the map canvas fills the left at full viewport height; a sidebar of `minmax(340px, 30vw)` sits right, separated by a 2px Track Navy rule, padded 18px with 14px gaps. The QR and host controls pin to the sidebar's foot. The lobby is a centred two-column grid (QR left, rules right) with a 40px gap.
- **Phone (landscape only):** the 3D view fills the screen. The HUD hugs the edges inside safe-area insets: status panel top-left (196px), objective chip and race bar top-centre (236px), radar top-right (140px circle), thumb buttons bottom-right on a 76px + 112px grid with 10px gaps, ticker and sector line bottom-centre. The left half is the joystick zone and stays empty. Perk cards sit beside the thumb buttons so the joystick stays visible.
- **Portrait phones** get a full-screen "Rotate your phone" overlay.
- **Wait and join screens** scale with viewport height (`clamp(…vh…)`) so the rules card fits a short landscape phone without scrolling.

## Elevation & Depth

The system is flat and lit, not lifted. Nothing uses a drop shadow to sit above anything else. Depth comes from translucent navy panels over the 3D scene, thin cyan strokes, and coloured glow: soft `box-shadow` halos in the element's own colour, `drop-shadow` on SVG icons, and additive sprites in 3D. The only dark shadow is a text lift that keeps HUD text legible over the moving scene.

### Shadow Vocabulary
- **HUD text lift** (`text-shadow: 0 1px 3px #000`): all HUD text over the 3D view.
- **Control glow** (`box-shadow: 0 0 10px rgba(46,230,230,.25)`): thumb buttons.
- **Fire glow** (`box-shadow: 0 0 18px rgba(255,77,109,.45)`): the FIRE button.
- **Perk glow** (`box-shadow: 0 0 16px rgba(255,210,63,.35)`): perk cards.
- **Bar glow** (`box-shadow: 0 0 6px <bar colour>`): hold and XP fills.
- **Radar well** (`box-shadow: inset 0 0 14px rgba(46,230,230,.18)`): the radar disc.
- **Damage vignette** (`box-shadow: inset 0 0 90px 30px rgba(255,40,60,.75)`): full-screen hit flash.

### Named Rules
**The Glow Not Shadow Rule.** Things emit light in their own colour; they do not cast shadows. Add a halo, never a drop shadow.

## Shapes

Small, precise radii for instruments; full circles for things the thumb presses. Bars and badges use a 3px hairline radius. HUD panels have one notched corner (`3px 12px 3px 3px`), giving them a console-bezel silhouette. Buttons and inputs use 10px, chips and toasts 8px, the rules card 14px. Thumb buttons, the joystick and the radar are perfect circles. The hold bar is segmented, one notch per crystal. The 3D world is low-poly and flat-shaded, and fields are dashed rims around a nebula so they never read as solid obstacles.

## Components

### Buttons
Glowing instrument keys: solid cyan to act, outlined cyan for the alternative.
- **Shape:** gently rounded (10px), at least 64px tall and wide.
- **Primary:** Radar Cyan fill, Deep Space Navy text, 12px 20px padding.
- **Ghost:** transparent with a 2px Radar Cyan border and cyan text ("Join", "Pause", "End").
- **Disabled:** 35% opacity.

### Thumb buttons (phone)
- **Shape:** circles. BOOST and BUILD are 76px; FIRE is 112px and spans both rows.
- **Default:** Track Navy at 85% with a 2px cyan ring, white bold 13px label, control glow.
- **FIRE:** radial red gradient (#ff7a93 → #c22c4b), pale pink ring (#ffb3c1), fire glow, 18px label.
- **BOOST cooldown:** the fill becomes a cyan conic sweep that refills as the cooldown ends.
- **BUILD:** 30% opacity until a station is allowed, then Hull Green.
- **Pressed:** `brightness(1.5)` and `scale(.95)`.

### Cards / Containers
- **Rules card:** Panel Navy, 2px Radar Cyan border, 14px radius, 16px 20px padding; bold phrases in Bank Gold; a dim controls line underneath.
- **HUD panel:** diagonal gradient from rgba(14,28,64,.86) to rgba(6,11,26,.62), 1px cyan stroke at 32%, notched corner.
- **Perk card:** 150 × 92px minimum, navy gradient (#1d2f60 → #0b1430), 2px Bank Gold border, perk glow; perk name in 16px gold, effect in 13px.

### Inputs / Fields
- **Style:** Field Navy fill, 2px Field Stroke border, 10px radius, 12px padding, 56px tall, Starlight text. Room-code entry is uppercase.

### Chips
- **Player chip (Scanner):** 36px square, 8px radius, filled with the player colour, glyph in bold Deep Space Navy.
- **Objective chip (phone):** a HUD panel 30px tall with a glowing arrow icon and bold 15px label; gold for HOME, aquamarine for LOOT, with the distance in Starlight.
- **PICK A PERK badge:** gold fill, navy 11px bold text, 3px radius, pulsing gold glow.

### HUD bars
Thin 10px tracks (7px for XP) in Track Navy with a 2px radius. Fills are gradients in the role colour: hull green (red when low), hold aquamarine segmented per crystal, XP gold. Width changes ease over 0.3s.

### Scanner map (signature)
A Canvas 2D radar on Deep Space Navy: a faint cyan grid (8% alpha), a cyan map rim (50%), fields as aquamarine discs whose opacity shows what's left, rings as circles stroked in the owner's colour (Unclaimed Steel when free), HQs as tinted discs with the glyph and name, the Vault as a gold ring. Pings are expanding circles in the owner's colour that fade over 8s. The Crown is a pulsing gold ♛.

### Feedback motion
- **Punch** (0.45s ease-out): scale 1.12 with brightness 2.2 settling to rest, on HUD values that just changed.
- **Pop** (1.6s ease-out): "+N BANKED" and level-up text rise, overshoot, then fade.
- **Hit cues:** a red arc on the side the shot came from (0.6s fade) and the damage vignette (0.35s fade).
- `prefers-reduced-motion` turns off all CSS animation and transitions, plus screen shake and the boost FOV kick.

## Do's and Don'ts

### Do:
- **Do** pair every player colour with its letter glyph (The Glyph Partner Rule).
- **Do** keep each role colour to its job: gold for home and score, aquamarine for loot, cyan for the instrument, red for danger.
- **Do** lift all HUD text over the 3D view with `text-shadow: 0 1px 3px #000`.
- **Do** keep thumb targets at least 64px (the shipped sizes are 76px and 112px).
- **Do** use tabular figures for any number that changes during play.
- **Do** keep the phone HUD in the corners and the left half clear for the joystick.
- **Do** keep Scanner sidebar text at 17px or larger so it reads from across the room.

### Don't:
- **Don't** add drop shadows for elevation; use a glow in the element's own colour (The Glow Not Shadow Rule).
- **Don't** introduce a second typeface.
- **Don't** render the Scanner in 3D; it is a flat Canvas 2D radar.
- **Don't** use gold, aquamarine or red decoratively; a player would read it as an objective, loot or damage.
- **Don't** add animation that ignores `prefers-reduced-motion`.
