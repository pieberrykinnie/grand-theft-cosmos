---
name: Grand Theft Cosmos
description: Late-night live coverage of a couch-party space heist; the laptop is the broadcast, each phone is a pilot's onboard feed.
colors:
  studio-black: "#151515"
  studio-raised: "#202020"
  plate-grey: "#2b2b2b"
  map-plate: "#262626"
  broadcast-slab: "#f4f4f0"
  slab-hot: "#ffffff"
  ink: "#151515"
  pure-black: "#000000"
  mute: "#949494"
  mute-ink: "#5c5c5c"
  rule: "#c9cac4"
  slab-track: "#dcdcd6"
  hud-block: "rgba(21, 21, 21, 0.9)"
  veil: "rgba(21, 21, 21, 0.94)"
  news-red: "#d7261e"
  news-red-pressed: "#a81a14"
  error-text: "#ff8a80"
  crawl-yellow: "#ffcb05"
  loot-aquamarine: "#7fffd4"
  home-gold: "#ffd23f"
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
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(64px, 8.4vw, 132px)"
    fontWeight: 800
    lineHeight: 0.86
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "50px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "0.01em"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.01em"
  body:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
  body-large:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
  button:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.04em"
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.12em"
  numeral:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "36px"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "\"tnum\" 1"
  crawl:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: "56px"
    letterSpacing: "0.02em"
  hud:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1
rounded:
  none: "0"
  full: "50%"
spacing:
  xs: "8px"
  sm: "14px"
  md: "16px"
  lg: "24px"
  xl: "56px"
components:
  button-primary:
    backgroundColor: "{colors.broadcast-slab}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "64px"
  button-primary-hover:
    backgroundColor: "{colors.slab-hot}"
  button-alt:
    backgroundColor: "transparent"
    textColor: "{colors.broadcast-slab}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "64px"
  button-danger:
    backgroundColor: "{colors.news-red}"
    textColor: "{colors.slab-hot}"
    rounded: "{rounded.none}"
    height: "64px"
  button-disabled:
    backgroundColor: "transparent"
    textColor: "{colors.mute}"
  button-on-slab:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.broadcast-slab}"
    rounded: "{rounded.none}"
    height: "48px"
    padding: "0 16px"
  input-field:
    backgroundColor: "{colors.studio-raised}"
    textColor: "{colors.broadcast-slab}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "64px"
  player-chip:
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    size: "36px"
  rules-card:
    backgroundColor: "{colors.broadcast-slab}"
    textColor: "{colors.ink}"
    typography: "{typography.body-large}"
    rounded: "{rounded.none}"
    padding: "18px 22px"
  crawl:
    backgroundColor: "{colors.pure-black}"
    textColor: "{colors.crawl-yellow}"
    typography: "{typography.crawl}"
    height: "56px"
  crawl-tag:
    backgroundColor: "{colors.crawl-yellow}"
    textColor: "{colors.pure-black}"
    padding: "0 16px"
  live-bug:
    backgroundColor: "{colors.news-red}"
    textColor: "{colors.slab-hot}"
    padding: "9px 14px"
  breaking-tag:
    backgroundColor: "{colors.news-red}"
    textColor: "{colors.slab-hot}"
    padding: "8px 14px"
  hud-block:
    backgroundColor: "{colors.hud-block}"
    textColor: "{colors.broadcast-slab}"
    typography: "{typography.hud}"
    rounded: "{rounded.none}"
  thumb-fire:
    backgroundColor: "{colors.news-red}"
    textColor: "{colors.slab-hot}"
    rounded: "{rounded.full}"
    size: "112px"
  thumb-button:
    backgroundColor: "{colors.studio-black}"
    textColor: "{colors.broadcast-slab}"
    rounded: "{rounded.full}"
    size: "76px"
---

# Design System: Grand Theft Cosmos

## Overview

**Creative North Star: "Late-Night Live Coverage"**

The laptop is a live late-night news broadcast of a heist it can only hear through loud acts: a red LIVE bug, an aerial sky-cam map, an election-night race board, a red BREAKING lower third and a yellow-on-black crawl. Each phone is that pilot's onboard feed: a few hard black HUD blocks over the 3D view, one instruction at a time. The whole 2D layer is studio black, white broadcast slabs with square edges, and condensed capitals, read from about three metres away by a couch of 3 to 12 people.

The system refuses the category's neon sci-fi cockpit: no glow, no bevels, no translucent glass panels, no monospace terminal. Depth comes from a white slab sitting on studio black, never from light. Colour is rationed by role, so a colour on screen always means one thing: red is the news or danger, yellow is the crawl, a player colour is a player and always carries that player's letter.

Mode differs by surface. The Scanner and the phone in play are Experience surfaces, built for spectacle and glanceability. The landing form is an Operate surface in the same world: dark wells for fields, white slabs for actions, and plain sentences. The phone HUD sits over a Three.js scene that still uses the earlier neon palette and is outside this system; the phone's loot aquamarine and HOME gold exist to match that scene.

**Key Characteristics:**
- Studio black ground, white square slabs, news red, crawl yellow and twelve lettered player colours, with nothing else.
- Barlow Condensed in two weights (600, 800), uppercase headings, tabular numerals for every score and count.
- Hard square edges on all chrome; circles only for thumb buttons, map pins and the radar, plus the map's own geometry.
- No glow, no smooth gradients, no rounding on chrome.
- Unavailable, offline or unclaimed reads as an outline, never as a faded fill.
- Timers are 10-step strips; the phone gives one instruction at a time.

## Colors

A broadcast palette: near-black studio and off-white slabs carry the structure, and every chromatic colour is locked to one role.

### Primary
- **Broadcast Slab** (`broadcast-slab`): the white of every card, primary button, rules card, race board, vault and map rim. Text on it is ink. Hovered slab buttons go to pure white (`slab-hot`).
- **News Red** (`news-red`): the LIVE bug, the BREAKING tag, the FIRE thumb button, danger states (low hull, hit arc, damage vignette, contested ring dashes, armed kick, danger buttons) and the race target line with its "600 TO WIN" label. Pressed FIRE darkens to `news-red-pressed`.

### Secondary
- **Crawl Yellow** (`crawl-yellow`): the crawl only, as text on pure black and as the crawl's tag block.

### Tertiary
- **Player colours** (`player-a` to `player-n`, glyphs A B C D E F G H J K M N): the twelve player identities. They mark HQs, stations, pins, ring ownership and claim arcs, race bars, chips and table rows. On the phone, the player's own colour fills their chip, their level number and their XP bar.
- **Loot Aquamarine** (`loot-aquamarine`): loot. Loot fields on the map, the HOLD meter, the carried amount on the HOME marker, loot damage numbers and the LOOT objective on the phone.
- **Home Gold** (`home-gold`): on the phone only, and only for the HOME objective, the HOME marker and the "+N BANKED" payoff.

### Neutral
- **Studio Black** (`studio-black`): page ground, canvas clear, map glyph ink. **Ink** (`ink`) is the same value used as text on slabs.
- **Studio Raised** (`studio-raised`): form field wells and select options.
- **Plate Grey** (`plate-grey`): dividers between landing sections. **Map Plate** (`map-plate`): the sky-cam sector disc.
- **Pure Black** (`pure-black`): crawl ground, BREAKING sub-strap, map name tags.
- **Mute** (`mute`): secondary text on black, labels, legend, disabled outlines. **Mute Ink** (`mute-ink`): secondary text on slabs.
- **Rule** (`rule`): 2px dividers inside slabs and table rows. **Slab Track** (`slab-track`): empty race bar track.
- **HUD Block** (`hud-block`) and **Veil** (`veil`): near-opaque studio black behind phone HUD blocks and full-screen overlays. They are dark scrims, not glass: no blur.
- **Error Text** (`error-text`): inline form errors on black.

### Named Rules
**The Broadcast Red Rule.** News red appears only on LIVE, BREAKING, FIRE, danger states and the race target line. Never as decoration, never as a player marker.

**The Crawl-Only Yellow Rule.** Crawl yellow lives on the crawl and nowhere else.

**The Letter-With-Colour Rule.** A player colour never appears alone on chrome: chips, HQs, stations, pins and owned rings carry the player's letter. A player's chip looks identical on the phone and the Scanner.

**The Gold Means Home Rule.** On the phone, gold is limited to the HOME objective, the HOME marker and "+N BANKED". Level and XP take the player's own colour, never gold.

## Typography

**Display Font:** Barlow Condensed 800 (with Arial Narrow, sans-serif)
**Body Font:** Barlow Condensed 600 (with Arial Narrow, sans-serif)

**Character:** One condensed grotesque in two weights, self-hosted (Latin-subset woff2, OFL, registered with `FontFace` so the CSS and the Scanner canvas share it). Heavy caps read like on-air graphics; the 600 weight keeps sentences readable at TV distance.

### Hierarchy
- **Display** (800, clamp 64–132px, 0.86): the landing title; the Scanner result headline at 96px and the room code at 96px.
- **Headline** (800, 50px, 1.05): the BREAKING headline; race board heading at 38px.
- **Title** (800, 34px, 1): Most Wanted name, card titles at 24–30px.
- **Body** (600, 20px, 1.3): base text. **Body large** (600, 24px, 1.2): rules card lines and on-screen sentences at couch distance.
- **Button** (800, 22px, 0.04em, uppercase): every button.
- **Label** (800, 16px, 0.12em, uppercase, mute): form labels and table headers (18px, 0.1em).
- **Numeral** (800, 36px, tabular): race scores; every score, count and meter value uses tabular numerals.
- **Crawl** (800, 26px on a 56px line, 0.02em, uppercase).
- **HUD** (800, 16px, uppercase): phone HUD base; meter names at 14px with 0.08em tracking. The ticker on the phone drops to 600 15px sentence case.

### Named Rules
**The One Family Rule.** Barlow Condensed 600 and 800 only, including on the canvas. Headings, buttons, labels and tags are uppercase; sentences are not.

**The Tabular Numbers Rule.** Any number that changes in play (scores, HP, hold, timers, table cells) is set with tabular numerals so columns do not jitter.

## Layout

**Scanner** (16:9 laptop on a TV): a two-column grid, map left (`minmax(0, 1fr)`) and a sidebar right (`minmax(400px, 30vw)`), with the crawl spanning the full width along the bottom. The map canvas holds the LIVE bug and caption top-left, the legend top-right and the BREAKING lower third bottom-left; the sector disc is sized to stay above a 175px band reserved for the lower third. The sidebar stacks the race board, the Most Wanted card and the JOIN THE CHASE tile (pushed to the bottom) with 16px gaps and 24px outer padding.

**Dense mode (9–12 players).** The sidebar switches to a dense variant: race rows drop from 48px to 29px with 25px chips, Most Wanted collapses to one line, the join tile's QR shrinks from 136px to 104px. Nobody drops off the board.

**Phone in play** (landscape): telemetry block top-left (220px), one instruction strap top-centre, radar top-right (140px), thumb buttons bottom-right, left half kept clear for the floating joystick, broadcast ticker bottom-centre. Everything respects `env(safe-area-inset-*)`. Under 760px wide the telemetry block narrows to 180px and the radar to 116px. Portrait shows a full-screen "Turn your phone sideways" card.

**Landing** (Operate): a centred two-column grid (max 1360px, 56px side padding): title, pitch and rules card left; host form and join form right; crawl along the bottom. At 900px and below it becomes a single column ordered title, join, rules, host, because a phone visitor almost always came to join.

**Overlays** fill the viewport, centre their content, and pad by at least 16px or the safe-area inset.

**Rhythm:** 8px within groups, 14–16px between controls, 24px around blocks, 40–64px between landing columns. Minimum touch target 64px for form actions; thumb buttons 76px and 112px.

## Elevation & Depth

Flat. Depth comes from contrast, a white slab on studio black, or a near-opaque black block over the 3D scene. There are no drop shadows on chrome. The few shadows in the build are hard and functional: a 2px inset outline (hint and perk prompts on the phone, the radar rim, the ring around the near-white player K chip on a slab) and a 3px dark edge closing each race bar fill.

The over-scene layer on the phone is the only place soft shadows appear, and only for legibility or danger: floating damage numbers and the BANKED pop carry a dark text shadow so they read over the moving 3D view, and taking damage shows a red inset vignette. These belong to the over-scene layer and do not carry over to chrome.

### Named Rules
**The Flat Studio Rule.** No glow, no smooth gradients and no blur on chrome. Hard-stop gradients that draw segmented meters (the BOOST cooldown dial, the HOLD slot dividers) are drawings of steps, not shading, and are allowed.

## Shapes

Square. Every slab, button, field, chip, tag, HUD block, map tag and HQ marker has a 0 radius. Borders are 2px (fields, outline buttons, dividers) or 3px (thumb buttons, focus rings).

Circles are reserved. On chrome they appear only for the thumb buttons (BUILD, BOOST, FIRE), map pins and the radar. The map's own geometry is circular because the world is: the sector disc, range rings, loot fields, territory rings, claim arcs and ping ripples, and the joystick ring. The vault is a white diamond; the Crown and the pin are fixed paths.

Unavailable, offline, stunned and unclaimed states turn a filled shape into its outline: outline chips for offline players, a dashed ring when unclaimed, a dashed diamond when the vault is cracked, an outlined HQ square when stunned, an outlined BUILD button when building is unavailable, outline buttons when disabled.

## Components

### Buttons
Hard white broadcast slabs: confident, square, uppercase.
- **Shape:** square (0), 64px minimum height and width, 2px border.
- **Primary:** slab fill, ink text, 0 24px padding. Hover goes to pure white.
- **Alt:** transparent with a slab border and slab text; hover fills slab.
- **Danger:** news red fill and border, white text.
- **Disabled:** transparent with a mute outline and mute text; never a faded fill.
- **On a slab:** inverted to ink fill and slab text (48px in the join tile); hover goes to pure black.
- **Focus:** 3px solid slab outline offset 3px; ink on slabs.

### Chips
- **Style:** a square block in the player's colour holding the player's letter in ink (36px base; 25–88px by context).
- **State:** offline is the same chip as an outline in the player's colour with a transparent fill. On a slab, chips get a 2px inset ink ring so player K stays visible.

### Cards / Containers
- **Corner Style:** square (0).
- **Background:** broadcast slab with ink text (rules card, race board, Most Wanted, join tile, result table, BREAKING headline); near-opaque studio black for phone HUD blocks.
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** 2px rule dividers inside; no outer border.
- **Internal Padding:** 14–22px.

### Inputs / Fields
- **Style:** dark wells (studio raised) with a 2px mute border, 0 radius, 64px tall, 800-weight 26px text; selects at 22px with a slab chevron.
- **Focus / Hover:** border brightens to slab; caret in news red.
- **Error:** an error-text line under the field with `role="alert"`.
- **Choice tiles** (game length): bordered rows that fill slab with ink text when checked.

### Navigation
None. Each URL is one surface: landing, Scanner, phone.

### The Crawl (signature)
A pure black 56px band with a crawl-yellow tag block (LATEST, SECTORS) and uppercase yellow text scrolling right to left at a speed set by its length. Under reduced motion it stops and sits still, left-aligned.

### Broadcast Bugs and the Lower Third (signature)
LIVE is a red block joined to a slab block naming the sector. BREAKING is a red tag over a slab headline (player chip plus act and landmark, 50px) over a black sub-strap, wiping in from the left in 0.45s. Pausing drops a centred slab over a dark scrim.

### Race Board (signature)
A slab card titled THE RACE with the red target label, then one row per player: chip, a bar in the player's colour on a slab-track ground ending at a 4px red target line, the name inside the bar, and a tabular score. Offline players' bars are empty.

### Sky-Cam Map (signature, Canvas 2D)
Map plate disc with a faint grid, two range rings and a slab rim. Loot fields in translucent aquamarine (opacity shows what remains). Rings are dashed slab when unclaimed and solid in the owner's colour with their letter when held, with a claim arc in the claimer's colour and red dashes when contested. Loud acts drop a slab pin with a coloured head and letter, ripple and fade over 8s; deaths leave an X for 12s. HQs are 44px player squares with a black name tag; stations are 26px squares with three HP pips. Most Wanted gets slab reticle brackets and a WANTED tag matching its sidebar card.

### Phone HUD (signature)
- **Telemetry block:** chip, level and XP in the player's colour; HULL (slab, red when low), HOLD (aquamarine, slotted) and RACE meters with tabular values.
- **Instruction strap:** one line at top-centre with a direction arrow and distance; gold for HOME, aquamarine for LOOT. First-time hints and the perk prompt take over the same strap with a 2px slab outline.
- **Timer strip:** one status at a time as 10 square steps.
- **Thumb buttons:** FIRE is a 112px red circle; BOOST is a 76px dial whose segmented ring shows cooldown; BUILD is an outline until building is possible, then fills slab. Pressed buttons scale to 0.94.
- **Perk pick:** two slab cards above the thumb buttons, uppercase name over a sentence.

## Do's and Don'ts

### Do:
- **Do** keep news red to LIVE, BREAKING, FIRE, danger and the race target line.
- **Do** pair every player colour with its letter, and print a player's chip identically on phone and Scanner.
- **Do** limit gold on the phone to the HOME objective, the HOME marker and "+N BANKED"; give level and XP the player's own colour.
- **Do** show unavailable, offline, stunned or unclaimed things as outlines (solid or dashed).
- **Do** show timers and cooldowns as 10-step strips or segmented dials.
- **Do** give the phone one instruction at a time; hints and the perk prompt reuse the same strap.
- **Do** switch the Scanner sidebar to dense mode at 9–12 players so every row stays on screen.
- **Do** use tabular numerals for every changing number.
- **Do** stop the crawl and drop ripples, pulses and camera shake under reduced motion.

### Don't:
- **Don't** add glow, bevels, translucent blurred panels or a monospace terminal look; that is the neon cockpit this world replaced.
- **Don't** round chrome corners or put smooth gradients on chrome.
- **Don't** use circles on chrome beyond thumb buttons, pins and the radar.
- **Don't** fade a control or player to show it is unavailable.
- **Don't** use crawl yellow anywhere but the crawl.
- **Don't** use a player colour as a decorative accent or without its letter.
- **Don't** add a second typeface or weights beyond 600 and 800.
