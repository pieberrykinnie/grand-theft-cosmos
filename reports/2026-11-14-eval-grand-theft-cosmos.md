# Evaluation: Grand Theft Cosmos, for a 5-minute jam pitch

2026-11-14 · Evaluated as built (GDD v2, `main` at `29030b7`) · Audience: senior undergraduates and full-time software developers

## Assumptions

- The pitch is 5 minutes with a live demo on one laptop and the judges' own phones. Judges may also play a Quick 600 game afterwards (PRODUCT.md).
- The jam's theme and official rubric are not in the repo. As a stand-in I used a university jam rubric that scores Programming, Graphics, Audio and Gameplay, each on Innovation, Completeness and Quality ([Taylor University Game Jam](https://gamejam.cse.taylor.edu/judging.php), seen November 2026).
- Budget is $0 and the build is frozen or close to it. I only propose changes of a few lines.
- No creator profile existed, so I wrote `game-trend-profile.md` from the GDD and PRODUCT.md. Team size and roles are not stated.

How I checked: I read the GDD and all game code, ran the unit tests (34 of 34 pass), ran each scoring route through the real simulation (`src/shared/sim.ts`) with one scripted player and nobody fighting back, and played one local match against three bots to watch the join flow, the first minute on the phone and the Scanner. Nothing here comes from a playtest with people. The route script is a scratch file and is not in the repo yet.

## 1. Verdict

**PIVOT, a small one: keep the game and change one rule.** The Crown can be banked at a station parked 300 units from the Vault, and that route wins a Quick game in 2:28 while the route the game teaches takes 19:02. Fix that and this is a GO.

In this skill "PIVOT" means "one named change first", not "start over". The concept, the build and the Scanner hook are all worth pitching.

## 2. Core loop

Steer your ship from your phone to glowing loot, carry it home to bank it as score and take one of two perks, while other players shoot loaded ships to spill their hold and the shared laptop screen reveals only loud acts. The first player to bank 600 wins, and dying costs you whatever you were carrying.

## 3. Scorecard

Each criterion is read through the jam lens, since nothing is being sold.

| Criterion | Score | Reason |
|---|---|---|
| Simplicity | 3 | It is built and runs today, so the effort left is about zero. But it is a backend, realtime multiplayer and nine interacting systems, and a 5-minute pitch can explain about three of them. |
| Content cost | 4 | Perks and sector rules are rows in an override table that a test validates, and the map is seeded and symmetric. There is no automated balance check: my route script found a spread the tests did not. |
| Virality (the demo moment) | 3 | The phone view alone is a readable but ordinary low-poly space shooter. The distinctive frame is a phone action dropping a pin and a "BREAKING" headline on the big screen, and that needs both screens in one shot. |
| Monetization | 2 | Not judged at a jam and nothing is built. The format has a proven host-pays model: Jackbox Party Pack 11 sells at $29.99 ([Jackbox press release](https://pressreleases.triplepointpr.com/md/jackbox-games-releasing-the-jackbox-party-pack-11-on-october-23-2025.md/), 2025) and AirConsole sells a $29.99 lifetime pass ([App Store listing](https://apps.apple.com/app/airconsole/id1017688554), seen November 2026). |
| Competition gap | 4 | None of the three phone-party leaders I checked plays in real time with a deliberately incomplete public screen (section 4). I checked three titles, so "none found" is not "none exist". |
| Trend timing | 3 | Extraction is at peak awareness and cooling: ARC Raiders' Steam peak fell from 466,372 in January to 154,498 in April 2026 ([Insider Gaming](https://insider-gaming.com/arc-raiders-player-count-drop-bleeding-months/), 2026). Phone-party play is steady, not rising: Jackbox 11 sits at 94% positive ([Fanatical](https://www.fanatical.com/en/game/the-jackbox-party-pack-11), seen November 2026). |
| Creator fit | 4 | The design routes around weak art (every model is generated in code) and plays to programming: an authoritative server, server-side fog, reconnects, 34 tests. Audio is the gap: there are no sound effects. |
| **Total** | **23 / 35** | PIVOT band (18–23). No score of 1. |

**Hard gates**

| Gate | Result |
|---|---|
| Third-party IP | **Not cleared.** `assets/audio/main_theme.mp3` has no tags, so I can't tell where it came from. The name parodies a Take-Two mark: fine at a jam, a problem for any store listing (section 8). |
| Budget and skills | Pass. It runs on the Cloudflare Free plan. |
| Build time vs window | Pass. It is built. |
| Twist visible in a muted 3-second clip | Pass, if the clip shows phone and Scanner together. |

**Existing-game notes**

- **Distance to a shippable build:** 0 days for the jam demo. For a public web release, about 5–10 days (**estimate**): a new name, sound effects, a rematch button and a plan for the Free-tier limits.
- **Reusable parts:** the room, QR join, reconnect and stasis layer (`src/worker/room.ts`, `src/client/net.ts`); the override-table simulation (`stat()` in `sim.ts`); the Scanner's broadcast UI; the procedural models.

## 4. Comparables

| Title | Publisher | Launch | Trend | Model | Top complaints |
|---|---|---|---|---|---|
| The Jackbox Party Pack 11 | Jackbox Games | 23 Oct 2025 ([press release](https://pressreleases.triplepointpr.com/md/jackbox-games-releasing-the-jackbox-party-pack-11-on-october-23-2025.md/)) | 94% positive on Steam; the previous pack was the series' lowest rated | Premium, $29.99, host pays | A shallow trivia game, a confusing deduction game, lag in the drawing game ([Vaporlens summary](https://vaporlens.app/app/3364070/the_jackbox_party_pack_11), seen November 2026) |
| Sunderfolk | Dreamhaven (dev: Secret Door) | 23 Apr 2025 ([Dreamhaven](https://dreamhaven.com/news/begin-your-adventure-in-sunderfolk-tm-on-april-23)) | About 92% positive of roughly 1,900 Steam reviews (third-party snapshot, April 2026) | Premium, host pays, free companion app | Price for the amount of content ([Vaporlens](https://vaporlens.app/app/2414270/sunderfolk)); couch-only and phones-only ([Steam discussion](https://steamcommunity.com/app/2414270/discussions/0/4696783122980091048/?ctp=2), 2024) |
| AirConsole | N-Dream | 2015 ([TechCrunch](https://techcrunch.com/2015/10/23/airconsole/amp/), October 2015) | Moving into cars: Škoda deal ([Advanced Television](https://www.advanced-television.com/2026/02/12/airconsole-partners-with-skoda), February 2026) | Free with a paid "Hero" pass | Polarized: 3.9/5 from 9.3K Android TV reviews ([Marlvel tracker](https://marlvel.ai/apps/airconsole-tv-gaming-console), April 2026). Individual complaints not collected. |
| Brawl Stars, Gem Grab mode | Supercell | Not verified | $24.5m in August 2026, a third month of decline ([PocketGamer.biz](https://pocketgamer.biz/august-2026-mobile-game-charts), August 2026) | Free with in-app purchases | Not collected. It is here for the mechanic: gems drop when the carrier dies ([Brawl Stars Wiki](https://brawlstars.fandom.com/wiki/Gem_Grab)). |
| ARC Raiders | Embark / Nexon | Not verified | 12.4M lifetime sales ([OpenCritic](https://opencritic.com/news/25620/arc-raiders-has-already-sold-2-4m-copies-in-2026), 2026); players down about 80% this year | Premium | Thin roadmap and churn; the genre is being reworked for casual players ([Gfinity](https://www.gfinityesports.com/article/extraction-shooters-are-evolving-for-casual-players), 2026) |

**Lifecycle.** Phone-as-controller party play is mature and steady. Extraction is peaking and cooling. The combination, a couch extraction game with a public partial-information screen, has no direct competitor that I found, so it sits at "emerging".

## 5. Gaps to exploit

1. **Nobody in the room-code format plays in real time.** Jackbox's complaints are about shallow or confusing prompt games. A skill game you join the same way is open ground.
2. **The big screen is always the whole truth elsewhere.** On AirConsole the TV is the game and the phone is a gamepad; in Sunderfolk the TV holds the full board. Here the phone is your private view and the shared screen is a police scanner. That inversion is the pitch.
3. **No app.** Sunderfolk needs a companion app. This is a QR code and a browser.

## 6. Every component of the loop

### What each scoring route pays

Solo, nobody fighting back, Calm sector, no perks, so these are upper bounds on income. Real games will be slower.

| Route | Loot per minute | Wins Quick 600 at | With random perks |
|---|---|---|---|
| Sit on your ring | 12 | 50:45 | 50:45 |
| Home field only (**where the radar's goal ring sends you**) | 32 | 19:02 | 19:00 |
| Station planted inside a wild field | 91 | 6:35 | 6:33 |
| Wild field, bank at HQ | 104 | 5:46 | 5:36 |
| Crack the Vault, walk the Crown to HQ | 144 | 4:11 | 3:28 |
| Crack the Vault, bank at a station 300 away | 244 | **2:28** | **1:42** |

With 8 players (a bigger map) the last three rows are 93, 105 and 235 per minute. The station route still wins in 2:33.

Two things follow. The game teaches its weakest real route and hides its strongest, a spread of 7.6 times. And the landing page's "~15 min" for Quick is not what the simulation shows: uncontested routes finish in 2.5 to 6.5 minutes.

### Component by component

| Component | As built | Evidence | Design verdict | In the pitch |
|---|---|---|---|---|
| **Join** (QR, name, rules card) | One field and one button; late join at any time; a reload is always safe | Played it: two taps from QR to the waiting card, which shows your letter and the three rules | Strong. Matches the Jackbox pattern judges already know | **Lead.** Judges scan while you say the first sentence |
| **First minute** (goal ring, hints, 60 s rookie shield) | A goal ring on the radar, one-time toasts, no damage for 60 s unless you fire | Sim: a first bank is possible within 0:02–0:28. Played: flying straight from spawn crossed the home field and picked up nothing by 0:14, and the first hint I saw was "BUILD: plant a station here", before any loot. The goal ring is a 5 px circle on a 140 px radar | The promise is reachable but fragile. Hints fire by situation, not in order, so the third-tier mechanic can arrive first. After the first bank the ring pins a follower to the 32-per-minute home field | **Show**, with a teammate saying "fly at the green crystals" |
| **Movement and dash** | Turn and thrust with inertia; a 120-unit hop every 5 s that pings the Scanner | Sim: dashing on every long leg is free speed, and its only cost is the ping | Good. Speed against stealth on one button is the game's idea in miniature | **Show.** Dash, then point at the pin on the big screen |
| **Gather** (fields, 50 hold) | Home field is slow and endless; wild fields are fast and run dry after 600 | One wild field's budget equals the whole Quick target, so fields rarely run dry before someone wins. "Players drive everything" is not visible at Quick length | Fine. The 10-crystal hold is the right size: one trip, one decision | Mention in half a sentence |
| **Carry risk** (glow, spill on death) | Your ship glows with its hold; dying spills it; kills pay nothing else | A full hold is 50, about 29 s of wild-field farming. Robbing a loaded ship is worth one trip, so aggression lands on glowing ships and not on empty ones. Gem Grab shows the rule works at scale | The best rule in the game. A station inside a field lets a player opt out: same income (91 vs 104) with nothing ever in the hold | **Lead.** "Shoot them to make them drop theirs" |
| **Bank and perks** | Automatic at HQ or your station; first bank is Level 1; one of two perks every 60 banked | About ten picks a game, close to one per full trip. Crystals fly in, "+N BANKED" pops, the bar punches | Strong cadence. Perks follow score, so the leader also becomes the strongest ship | **Show** one perk pick: it is the payoff of the one-minute promise |
| **Combat** | 40 damage per second against 100 hull; a 15° aim assist; equal ship speeds; safe inside your HQ | Code: 2.5 s to kill with every bolt landing; aim does not lead a moving target. Feel on real phones at 10 Hz is not verified | Adequate on paper, unproven in the hand. It is silent: there are no sound effects | Show briefly. Have the latency answer ready: position is server-side and inertia hides it |
| **Rings** | Park for 10 s; pays 12 a minute; radar for the owner | 2% of the target per minute. A ring held from minute 1 of a 6-minute game is about 10% of a win. You cannot claim one while shielded | The weakest component, yet it is a third of the rules card | **Hide.** Spend no words on it |
| **Stations** | Free, 5 s to build, up to 3; a bank, a turret and radar; shoot one to 0 to steal it | Code: the blaster reaches 320 and the turret 200, so a thief is never shot back and takes a station in 10 s. Stations are what enable both shortcut routes above | Rich, but the turret protects nothing and the bank is too good | **Mention** "even your base can be stolen". Don't demo it |
| **Vault and Crown** | 600 HP at the centre; the Crown is worth 90; its carrier is slowed and live on the Scanner | The dominant route by 2.3 to 3.4 times. With a nearby station the Crown is exposed for about 5 s, not the long walk the GDD describes. The Fat Crown sector doubles it. A rookie-shielded player can also pick up a loose Crown and cannot be hurt | Broken as built, and one rule away from being the best moment in the game | **Fix, then make it the climax** (section 7) |
| **The Scanner** | Map, race bars, Most Wanted, a "BREAKING" headline for each loud act, a news crawl | Played: "Shots fired in the south-west" with the actor's letter, a WANTED reticle on the leader, readable at a glance | The differentiator. Players in a fight can't look up, so it works hardest for people watching, which is what judges are | **Lead with it.** Never demo in the Blackout sector, which mutes it |
| **Most Wanted and catch-up** | The sole leader is live on the Scanner; late joiners get 3 perks | Nothing reduces banked score, so catching up means denying the leader. Games this short limit the snowball | Fine for a party game | One sentence |
| **Sector rules** | 8 global modifiers as table rows | The default is Random, which never picks Calm: a first game has a 1-in-7 chance of Blackout | Cheap replay value; the wrong default for a first game | Pick **Calm**. One sentence for the developers: new content is a row in a table |
| **Win and end** | First to the target, immediately; a table of banked, kills, stolen, stations | No rematch: "New game" sends everyone back through a new QR code | Fine for a pitch. It costs about 20 s each time a new group of judges sits down | Skip |
| **Resilience** (reconnect, stasis, late join) | Phones hold no truth; a lost phone waits in stasis | Unit-tested; the Scanner showed my hidden tab as OFFLINE within seconds | The part jam games usually lack and developers respect most | **Show.** Lock a phone on stage |
| **Audio** | One looping theme on the Scanner; nothing else | The stand-in rubric scores Audio as one of four categories and asks whether "all needed audio is included" | The largest gap against a rubric like that | Don't draw attention to it |

## 7. Pivot: the single change

**The Crown can only be banked at your HQ, never at a station.**

- **Why this one:** it removes the 2:28 win and leaves the Vault as the best route, at 144 per minute against 104, which is fair for the loudest thing you can do. It also stretches the Crown's time live on the Scanner from about 5 s to about 20 s, which gives the pitch its climax: a slowed carrier crossing the map while the room hunts it.
- **Size:** one condition in the banking block of `sim.ts`, the HOME pointer in `phone.ts` (`objective()`), one test, one GDD line.
- **Optional tuning, measured:** raising Vault HP from 600 to 1,200 brings the walked Crown to 106 per minute, level with wild-field runs. At 4 players I would leave it at 600.

**Re-score with the change:** Virality 3 → 4, because the demo now has a 20-second spectator moment (measured in the simulation, not yet seen with a room). Total **24 / 35, GO**, once the music gate is cleared.

**A 5-minute run of show** (no code needed)

| Time | What happens |
|---|---|
| Before | Start a Quick 600 room in **Calm** three minutes early, with two teammates already playing. Late joiners get 3 perks and a 60 s shield, so judges arrive in a live world |
| 0:00 | One line, with the QR code already up: "A heist you play on your phone, on a screen that only hears the loud parts" |
| 0:20 | Judges scan and fly. One instruction: grab the green crystals and bring them home |
| 1:20 | A teammate dashes and fires. Point at the pin and the BREAKING headline |
| 2:30 | A teammate cracks the Vault and walks the Crown home on the big screen. Let the judges chase |
| 3:30 | For the developers: one authoritative 10 Hz simulation per room, fog filtered on the server, reconnect and stasis (lock a phone), $0 hosting, no asset files, 34 tests |
| 4:30 | What you cut and what comes next |

Keep a 30-second recorded clip as a fallback, with gameplay from the first second ([Kenney](https://kenney.nl/learn/improving-the-presentation-of-jam-games); [AngelHack](https://angelhack.com/blog/10-tips-to-help-you-rock-your-next-hackathon-demo/)).

## 8. Kill switch

Market metrics such as D1 retention or CPI do not apply until there is a public release, so none are cited. These thresholds come from the project's own targets and today's measurements.

| Metric | Kill | Iterate | Keep | Source of threshold |
|---|---|---|---|---|
| One-minute test: strangers who bank and pick a perk within 60 s, unaided | Fewer than 3 of 5: you drive the demo, judges don't play | 3 of 5: fix the hint order and goal ring first | 4 of 5 or more | Target from GDD §13; the cut-offs are my **estimate** |
| Fastest uncontested route against wild-field runs (rerun the route script after any tuning) | Above 2× | 1.5–2× | 1.5× or less (now 2.3×; 1.4× with the change) | Measured today |
| Length of a 4-person Quick game | Under 4 minutes: someone found a dominant route | Over 12 minutes | 6–10 minutes | Simulation bounds of 2:28 and 5:46; the band is an **estimate** |
| Players reacting out loud to a Scanner headline | None in 5 minutes: drop the scanner hook and pitch the engineering | Fewer than one a minute | One a minute or more | No benchmark exists; **estimate** |

Hand-off: log each playtest in `metrics/grand-theft-cosmos.md` with `tracking-game-metrics`.

## 9. Assumptions and unknowns

- **Jam theme and rubric.** Not in the repo. If theme fit is scored, it is not addressed anywhere in the GDD.
- **No human playtest.** Every balance number is a solo, uncontested simulation. Combat feel, the one-minute promise and whether people look up at the Scanner are all unverified.
- **Music provenance.** If the theme is not original or licensed, replace it before judging. Original audio scores higher on the stand-in rubric.
- **The name.** Grand Theft Auto VI is scheduled for 19 November 2026 ([Fox 10](https://www.fox10tv.com/2026/10/16/gta-6-locks-nov-19-release-date-after-delays/?outputType=amp), October 2026), so the joke lands this week. Take-Two also opposes nearby marks: "It Takes Two" in 2021 ([VGC](https://www.videogameschronicle.com/news/hazelight-abandoned-it-takes-two-trademark-application-after-take-two-claim)) and "Vice City Subs" in 2026 ([Secure Your Trademark](https://secureyourtrademark.com/blog/take-two-blocks-vice-city-subs/)). Rename before any store or portal listing.
- **Scanner at small sizes.** In my 800×600 pane the race heading overlapped "600 to win" and the headline covered the bottom HQ. Check the real demo laptop and projector.
- **Deployed build.** I tested local dev only, not the workers.dev deployment, a real phone, or venue Wi-Fi.
- **Comparables.** Launch dates for Brawl Stars and ARC Raiders and low-star complaints for three of five titles were not collected.
