# HISTORY II: in-universe events from 2150 to the far future (research notes)

Output: `data/curated/events-late.json`, with **240 events** sorted by `t`. The file passes `json.load`, every id is unique and kebab-case, every title is 7 words or fewer, and each event cites 1 to 3 sources.

## Counts

| Century | Events | | Category | Events |
|---|---|---|---|---|
| 22nd (2150–2200) | 34 | | politics | 48 |
| 23rd | 57 | | war | 46 |
| 24th | 88 | | temporal | 38 |
| 25th | 11 | | ship | 26 |
| 26th–30th | 13 | | first-contact | 20 |
| 31st | 11 | | disaster | 19 |
| 32nd | 24 | | culture | 14 |
| 33rd and later | 2 | | science | 13 |
| | | | exploration | 10 |
| | | | institution | 6 |

- **Weights:** 56 landmark (3), 119 notable (2), 65 minor (1).
- **Confidence:** 158 explicit, 55 inferred, 27 estimated.
- **Anomalies:** 21 events carry a `conflict` note (listed below).

The 24th century makes up about 37% of the events, which is a density canon forces on the list. Canon for the 25th to 30th centuries is thin, and every item I could find on screen is included.

## Sources and method

- **Memory Alpha API.** I used the century pages (22nd–33rd, plus "Far future") as the skeleton. I checked details against the year pages (2150–2170 and 2240–2409), the topic articles (the lead and a regex search for date lines) and the `date` field in each episode's sidebar.
  - The year pages for the 31st and 32nd centuries redirect to their century pages.
- **Web searches** (TrekMovie, ScreenRant, TrekCore) covered:
  - the *Strange New Worlds* S4 finale (the season aired 24 July to 24 September 2026, and MA's episode summaries are still stubs);
  - how *Starfleet Academy* is dated.
- **Every `sources` entry is an exact MA article title.** All 237 unique titles resolve through the API as existing articles, with no redirects.
  - Some titles carry MA's unusual capitalization: `These Are The Voyages... (episode)`, `In A Mirror, Darkly (episode)`, `Sins of The Father (episode)`, `Tomorrow is Yesterday (episode)`, `The Measure Of A Man (episode)`, `Cause And Effect (episode)`, `Up The Long Ladder (episode)`, `A Matter Of Time (episode)`, `The Die is Cast (episode)`.
  - All 195 `ma` topic titles also resolve to their canonical pages. Examples: `Narada incursion reality`, `Destruction of Vulcan`, `Duotronics`, `Red angel suit`, `KSF Khi'eth`, `USS Defiant (2370)`.
- **Source check.** A script confirmed that each cited episode's MA page mentions the event's topic. I checked the weak matches by hand. Two sources mention the topic only in on-screen graphics, not in the article text:
  - *DIS* "Brother": Pike's Cardassian medal.
  - *PIC* "The Star Gazer": the commemorative plaque giving the Academy's 2161 date.

## Conventions

- **`t` for stardates.** TNG-era stardates use 41000 = 2364.0, so year = 2323 + stardate/1000.
- **`t` for months.** A known month is placed at mid-month.
- **Ties** within a year follow story order, with small offsets.
- **`t` for vague dates.** Decade- and century-level events sit on a round number, with the real range given in `tText`.
- **Confidence:**
  - *explicit*: the year or date is on screen (dialogue, a graphic, a plaque, or a stardate in an anchored season).
  - *inferred*: arithmetic from on-screen statements, such as "23 years ago", "a century ago" or "125 years after it closed".
  - *estimated*: placed only to the decade or century.
- **Alternate realities are included but labeled.**
  - Kelvin reality (4 events): the Narada incursion in 2233, Vulcan's destruction in 2258, Khan in 2259, Spock Prime's death in 2263.
  - Mirror universe (3 events).
  - Erased timelines, labeled "(erased)": the Year of Hell, Admiral Janeway's 2404, the Sol explosion of c. 2873, and the Confederation timeline.
  - The Battle of Procyon V is marked as a possible future.

## Judgment calls

- **Gorn.** The official first contact stays in 2267 ("Arena"). SNW's earlier raids appear as separate events (Finibus III in 2259, Parnassus Beta in 2261, the hibernation of the Gorn armada in 2261), and the rival dating is noted in `conflict`.
- **Parnassus Beta.** MA dates the attack to 2259, 2260 *and* 2261 on different pages. I used 2261 because the next episode's Federation centennial party anchors it.
- **SNW S4.** Only "Valles Marineris" (the Cretaceous time slip, 2262) is included. The finale, "Tomorrow's Enterprise", is a one-year-ahead alternate-future story, so it isn't a history milestone.
- **Starfleet Academy's dating** conflicts on screen:
  - Lura Thok's personnel file (born 3145, now 50) and the end-credits yearbook ("graduating class of 3196", "3196 Prince for a Day") point to fall 3195 through spring 3196. MA's year pages use this, and so did I.
  - The show's stardates convert to 3191–92, and MA's topic pages (Starbase J19-Alpha, the attack on the *Athena*) use 3191.
  - ScreenRant reads the finale as September 3192 to June 3193.
  - Paramount's marketing says "125 years after the Burn" (about 3194).
  - Separately, *DIS* "Kobayashi Maru" already shows the Academy reopening in 3190, "125 years after it closed". The 3195 event is the San Francisco campus reopening.
  - All of this is recorded in `conflict` on `starfleet-academy-reopens-sf`.
- **Section 31 (2025 film).** MA gives only "early 24th century" (its sidebar stardate of 1292.4 is anomalous). It sits at 2320 as *estimated*, with weight 1. Rachel Garrett, later captain of the Enterprise-C, is on the team.
- **Hobus.** In canon, the star that went supernova is Romulus's own sun ("Remembrance"). "Hobus" as the exploding star comes from the non-canon *Countdown* comics. The canonical Hobus system still exists in 3196 on SFA star charts, as a Federation-affiliated world after the collapse of the Romulan Free State. This is noted on `romulan-supernova`.
- **Time travel ban.** Placed "by the 32nd century" (t = 3100), not at the end of the 30th-century Temporal Wars, because Daniels is still a working time agent in the 31st century. The tension is noted on `temporal-wars`.
- **DTI.** Its first dated appearance is 2373 (Dulmur and Lucsly). SNW's "Tomorrow and Tomorrow and Tomorrow" establishes that the department did not yet exist in 2260.
- **Kovich is Daniels.** Confirmed: MA cites *DIS* "Die Trying" and "Life, Itself", and he introduces himself as "Agent Daniels" in the finale.
- **Occupation of Bajor.** Dated 2319, the usual fifty-year figure. The alternatives go in `conflict`: forty years ("Ensign Ro", "Waltz"), sixty ("Emissary"), annexation in 2328, and 2316 implied by "Things Past".
- **Terok Nor.** 2346 ("Wrongs Darker Than Death or Night") against 2351 ("Babel").
- **Cardassian War's end.** 2366 ("The Wounded", "a year ago") against "the treaty of 2367" (VOY "Dreadnought"). MA also has a separate "Armistice of 2367" article.
- **Federation–Cardassian first contact.** No date exists on screen. I added a weight-1 marker, "by 2257", inferred from the Legate's Crest of Valor held by Pike (*DIS* "Brother") and Una ("Ad Astra per Aspera").
- **Merges.** Kirk's disappearance (2293) and death (2371), the Enterprise-B launch and Kirk's loss, and Picard's synth transfer and the lifting of the synth ban each became *separate* events so that each landmark can be seen on its own.

## Anomalies recorded in `conflict` (21)

| Event id | Rival reading |
|---|---|
| `klingon-first-contact-broken-bow` | TNG "First Contact" describes a "disastrous" first contact that led to war. |
| `ferengi-unnamed-encounter` / `ferengi-official-first-contact` | Ferengi aboard the NX-01 in 2151, against the official first contact of 2364. |
| `borg-drones-revived-arctic` / `raven-assimilated` / `borg-first-contact-q-who` | Borg encountered in 2153 and 2356 without being named, against the official first contact of 2365. |
| `battle-of-donatu-v` | Georgiou in 2256 says "almost no one has seen a Klingon in a hundred years". |
| `cardassian-contact-by-2257` | No first-contact date exists on screen. |
| `gorn-parnassus-beta` | MA dates it to 2259, 2260 and 2261. |
| `gorn-first-official-contact` | SNW shows off-the-record Gorn attacks in the 2230s–2261. |
| `mirror-mirror-crossing` | Kirk's crew is credited with the first visit, but Discovery crossed a decade earlier (later classified). |
| `vger-crisis` | No on-screen year; placed about 2272–73. |
| `occupation-of-bajor-begins` | Given as 40, 50 or 60 years long. |
| `terok-nor-built` | 2346 against 2351. |
| `cardassian-war-ends` | 2366 against 2367. |
| `warp-speed-limit` | The warp 5 limit is never repealed, yet later ships ignore it. |
| `romulan-supernova` | The galaxy-wide threat claimed in 2009, the star identified as Romulus's own in PIC, and Hobus. |
| `battle-of-procyon-v` | The Sphere-Builders were defeated in 2154, so this future may be void. |
| `temporal-wars` | Daniels's 31st-century operations. |
| `the-burn` | Booker's and Vance's dates are a year apart. |
| `starfleet-academy-reopens-sf` | 3195–96 against 3191–92, and against the 3190 reopening. |

## Not fully verified (soft spots)

- **Academy's 2161 incorporation.** MA cites a Starfleet Academy emblem plaque and the commemorative plaque in PIC "The Star Gazer". I could not tie the "2161" to a spoken line, so it is marked *inferred*.
- **Estimated placements:**
  - El-Aurian homeworld: c. 2265, from Guinan's "a century ago".
  - Tzenkethi War: 2362. MA says only "24th century"; Sisko was first officer under Leyton during it, before 2367.
  - Barzan II joining the Federation: 25th century, per MA's reading of "Die Trying".
  - Last mirror crossing: 27th century, from "no crossings in 500 years" as of 3189.
  - Q: last contact c. 2590, from "not heard from in six hundred years" in 3190.
- ***Discovery* S5 epilogue** (Leto made captain, Discovery's final Red Directive mission). The year is never given; I estimated 3225. "Calypso" is then early in the 43rd century (about 1,000 years later), estimated at 4225.
- **Breen Imperium civil war (3191).** Summarized from MA's "Erigah" page and the Breen Imperium article. I did not trace which Primarch held what.
- **Lower Decks and Prodigy items** (the Ferenginar accession process in 2381, the quantum fissure outbreak in 2382, the Vau N'Akat in 2385) come from MA's year pages and topic articles, not from full episode summaries.

## Gaps (canon silent or thin)

- There is no on-screen date for:
  - the Federation–Cardassian first contact;
  - the launches of the Enterprise-C or Enterprise-F;
  - the Vulcan–Romulan reunification and the renaming to Ni'Var (known only to predate the Burn-era departure of about 3089);
  - the founding of the Emerald Chain;
  - the founding and collapse of the Romulan Free State.
- The 25th to 30th centuries rest on a handful of references: the Procyon V vision, Kal Dano and the Vorgons, Cold Front's 2769, the Temporal Integrity Commission, the Temporal Wars and the dilithium decline of 2958.
- Nothing on screen beyond SFA's spring semester of 3196 except the DIS S5 epilogue, "Calypso" and the undated "Living Witness" coda. I left out the coda and far-future predictions such as the Organian 7154 and the Horta 52267, because they are forecasts, not events.
- Left out on purpose: per-episode plots, individual births and deaths (except Kirk, Data and Spock Prime), and Lower Decks and Prodigy minutiae.

## Overlap with HISTORY I (pre-2150)

- `earth-unified-2150` sits on the boundary.
- `borg-drones-revived-arctic` refers back to the Borg sphere of 2063.
- `slingshot-to-1969`, `enterprise-cretaceous` and `temporal-agents-khan` are recorded at the *departure* year (2267, 2262, c. 2259). The past eras they reach belong to the other worker.
