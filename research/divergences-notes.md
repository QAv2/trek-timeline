# Divergence Registry: research notes

Deliverable: `data/curated/divergences.json` with 62 divergences and 18 Prime/Mirror crossings. Built 2026-09-25 from Memory Alpha (MA) wikitext. On-screen canon only.

| kind | count |
|---|---|
| alternate-timeline | 44 |
| parallel-universe | 5 |
| possible-future | 4 |
| quantum-reality | 3 |
| pocket | 3 |
| loop | 2 |
| alternate-reality | 1 (Kelvin) |

Fates: restored 18 · averted 17 · persists 11 · collapsed 11 · unknown 5.
Confidence: explicit 54 · inferred 7 · estimated 1. Crossings: explicit 15 · inferred 2 · estimated 1.

## Sources and method

- **MA MediaWiki API.** I fetched about 150 pages with `action=query&prop=revisions` and extracted only the parts I needed with Python. The scratch cache lived in the session scratchpad, so it did not collide with the shared `cache/ma/`.
  - **Backbone:** "Alternate timeline". Its two tables are MA's own list of alternate timelines and a table of causes and effects. Every row was reviewed, then included, merged or rejected as listed below.
  - **Other concept pages:** "Parallel universe", "Mirror universe", "Narada incursion reality" (the Kelvin reality; "Alternate reality" redirects there), "Antimatter universe", "Quantum fissure", "Fluidic space", "Temporal Cold War", "Anti-time" and "Anti-time future", "Solum", "USS Protostar", "ISS Enterprise (NCC-1701)", "Carmen Cho", "Gabriel Lorca (mirror)", "Gabrielle Burnham", "Annorax", "Akorem Laan", "San".
  - **Episode and film pages:** the sidebar `date` and `other date` fields, plus targeted greps of the summaries.
  - **Title check.** All 153 titles used in `sources`, `travelers`, `counterTravelers` and `vessels` are exact MA article titles. An API check on 2026-09-25 found none missing and no redirects. Note the MA spellings `In A Mirror, Darkly (episode)`, `Cause And Effect (episode)`, `Tomorrow is Yesterday (episode)` and `A Farewell To Farms (episode)`.
- **Web, for 2026 content only:**
  - Wikipedia's SNW season 4 page gives the airdates (24 July to 24 September 2026) and a synopsis of "Tomorrow's Enterprise".
  - AV Club and TrekCore recaps of "Tomorrow's Enterprise" fill in details, because MA's plot summary for it is still empty.
  - A web search found no Mirror or alternate-timeline story in Starfleet Academy S1. This matches my scan of all ten SA episode pages on MA.

## Conventions and extra fields (read before rendering)

**Years (`t`)**
- The whole-year part is MA's in-universe year for the episode.
- The fraction comes from, in order of preference:
  - a TNG-era stardate (year ≈ 2323 + SD/1000; for example 43625.2 gives 2366.63);
  - a calendar date (4 April 2063 gives 2063.26);
  - otherwise, my estimate from the episode's place in its season.
- Fractions are for ordering only. Never display them as precise dates; use `tText`.

**Branch point (`branch.t`)**
- It marks where the divergent history leaves its parent lane. For time travel, that is the moment in the past that was changed (1930 for "City on the Edge", 2233 for Kelvin), not the "present" of the episode.
- It is `null` for parallel universes, pockets and quantum-reality classes, which have no single divergence point; `tText` explains in each case.
- `branch.from` is `"prime"` everywhere except `terra-firma-mirror-2255`, which branches from the Mirror lane (`"mirror"`).

**Span and end**
- `span` covers the part of the divergent history that is seen or described.
- `end.t` always equals `span.to`, the branch's end on the chart. When the undoing happens elsewhere, `end.tText` says so; for example, Future's End is undone in 1996 while its span runs to the 29th century.

**Deep time.** `agt-anti-time` has `t = -3.5e9`. The front end must clamp or break the axis for it.

**Fates**

| fate | meaning |
|---|---|
| `restored` | the characters put history back |
| `averted` | a future or alternate outcome was prevented before Prime reached it |
| `collapsed` | the branch, loop or pocket simply ceased, or was overwritten |
| `persists` | it still exists |
| `unknown` | canon leaves it open |

**Non-schema fields (all optional; safe to ignore)**
- `inverted: true` appears on 3 divergences: `tcw-original-2150s`, `red-angel-interventions` and `eugenics-wars-1990s-original`. For these the Prime lane already shows the altered history, and the branch drawn is the overwritten original. Suggest a "ghost" style.
- On crossings:
  - `tArrive` / `tArriveText`: cross-time crossings (the Defiant, 2268 to 2155; Discovery's nine-month overshoot; Georgiou, 3189 to 2255). `t` is the departure.
  - `bidirectional` and `counterTravelers`: the "Mirror, Mirror" swap.
  - `vessels`: ship article titles.
  - `returned`: whether the travelers went back in the same story.
  - `note`: a free-text caveat.

## Judgment calls (borderline cases)

- **Tapestry.** Included and titled "(uncertain)". The `conflict` field says it is a Q scenario shown to a dying Picard, and could be real, staged or a near-death vision.
- **Mirror Universe.** One `parallel-universe` entry with `branch.t` null. Its span, 2063–2384, runs from the mirror first contact in ENT's "In A Mirror, Darkly" teaser to PRO's "Cracked Mirror". Other mirror stories fall inside it: DIS S3 "Terra Firma" in 2255, DIS S5 "Mirrors" (the Empire survives into the early 24th century), and the Section 31 flashbacks.
- **Kelvin.** `alternate-reality` (MA's term), shown on screen from 2233.01 to 2263. DIS "Terra Firma, Part 1" has Kovich cite a Kelvin time soldier who crossed from 2379, so the reality exists at least that long. PRO names it "the Narada incursion".
- **Calypso (Short Treks).** This is the Prime future, not a divergence. The DIS finale "Life, Itself" sets up Discovery's long wait, and MA dates "Calypso" to the 43rd century. Excluded.
- **Pike's Boreth vision (DIS "Through the Valley of Shadows").** Prime future with no branch, so excluded. Its branching counterpart is SNW "A Quality of Mercy", which is included.
- **"All Good Things..."** Split into two entries:
  - The anti-time (`alternate-timeline`, collapsed).
  - The 2395 future (`possible-future`; MA calls it "a possible future"). It does involve a branch, since later canon contradicts it: the Enterprise-D is lost in 2371 and Romulus in 2387.
- **ENT "Azati Prime" (26th-century Sphere-Builder war).** Entered as `possible-future` with fate `unknown`. MA: "possibly original timeline, possibly negated".
- **TNG "Firstborn".** Included even though the c. 2410 future is only described through K'mtar, who is on screen. Fate is `unknown`: MA says negated, but the episode leaves it open.
- **The three `inverted` entries.** The ENT Temporal Cold War item from the brief is modelled as the unaltered 2150s that the Sphere-Builders' incursions overwrote. The on-screen basis is Daniels in "Carpenter Street": history records no human-Xindi conflict. The Red Angel's "attempts" are modelled the same way: the original history, including Michael Burnham's death in Vulcan's Forge in 2236, overwritten by Gabrielle's jumps. Control's victory is a separate averted-future entry.
- **VOY "Shattered".** Included as the brief asked, although it is a temporal fragmentation rather than a clean branch. It includes the 2394 fragment, in which Janeway and Chakotay died in 2377.
- **DS9 "Visionary".** MA's three rows (two O'Brien deaths and the destruction of DS9) are merged into one entry.
- **DIS "Face the Strange".** MA's two rows are merged. The main entry is the averted 3218 Breen future; the 2256 foreknowledge goes into the key differences.
- **PIC S2.** The Confederation (2024–2401) and the Stargazer self-destruct are kept separate, as MA lists them.
- **PRO S2.** Split into four entries:
  - the Protostar paradox (2374–2385, restored);
  - Solum's original civil-war history (2385–2436, averted);
  - Wesley's Incursor vision (a possible future);
  - the "Cracked Mirror" deck realities (quantum realities).
  MA frames the paradox the other way round: the original "Protostar sent to Tars Lamora alone" history is negated, then partly restored. I charted the paradox state as the branch instead. Wesley's multiverse map and his claim to have visited every reality ("The Devourer of All Things, Part I") is cited on the Kelvin entry and not given one of its own.
- **LD S5.** One class entry (`quantum-reality`, persists). It covers "Dos Cerritos", the tiny-scale Endeavour, the purple-universe Enterprise-D, the "Fissure Quest" castaways, the alternate Lily Sloane's Beagle and the finale's permanent rift at Starbase 80. No other LD season has a divergence.
- **Separate universes.** Lazarus's antimatter universe, Arret's reverse-time universe, the Megas-Tu universe and fluidic space are entered as `parallel-universe`. They are separate universes rather than versions of Prime history, so the front end may want them hidden by default.
- **Pockets and loops.**
  - Pockets: the Nexus, Elysia (MA: "a pocket in the garment of time") and Beverly Crusher's warp-bubble universe.
  - Loops: "Cause And Effect" (the span starts at 2278 for the Bozeman) and Mudd's time-crystal loop.
- **Minor rows kept because MA lists them:** "Tomorrow is Yesterday" (1969), "Accession" (inferred; Akorem's unfinished poem) and "Future's End" (a predestination paradox).
- **SNW S4 "Tomorrow's Enterprise"** (aired 24 September 2026). Included with confidence `inferred`; see the conflicts section.

## Excluded, and why

- **VOY "Course: Oblivion"**: not temporal; excluded as the brief asked. **VOY "Deadlock"**: a spatial scission copies Voyager within one universe, so there is no branch.
- **Illusions and visions:**
  - VOY "Coda" (an alien illusion);
  - TNG "Future Imperfect" and "Frame of Mind";
  - DS9 "Hard Time";
  - DS9 "Far Beyond the Stars" and "Shadows and Symbols" (Benny Russell is a Prophet vision of undetermined reality);
  - SNW S4 "Like Chronitons Through the Hourglass" (a Trelane illusion);
  - PIC S1's "Admonition".
- **Time travel that changes nothing:**
  - TOS "Assignment: Earth", "All Our Yesterdays", "The Naked Time";
  - TNG "Time's Arrow", "A Matter of Time", "Captain's Holiday";
  - DS9 "Little Green Men", "Trials and Tribble-ations", "The Sound of Her Voice";
  - VOY "Eye of the Needle", "Living Witness";
  - ENT "Cold Front", "Future Tense", "Carpenter Street" (cited only as the source for the Temporal Cold War statement);
  - SNW "Those Old Scientists";
  - **SNW S4 "Valles Marineris"**: a predestination story. The Enterprise's intervention 65 million years ago creates the asteroid belt and the Chicxulub impactor, and MA lists no alternate timeline for it.
- **Q testimony or war without a timeline:** VOY "Death Wish" and "The Q and the Grey".
- **PRO S1 "Time Amok"**: time runs at different rates inside the ship, with no divergent history. **DS9 "Playing God"** (a proto-universe) and **TNG "We'll Always Have Paris"** (Manheim's dimensional window) are curiosities without a branch.
- **Realms of beings rather than divergences:** the Q Continuum, the Celestial Temple, Exosia, subspace domains, Galactic Cluster 3.
- **Starfleet Academy S1 (2026)** has none; all ten episodes were checked. Very Short Treks, novels and comics were not surveyed.

## Crossings: how they are counted

- There is one entry per episode, direction and party of travelers. A round trip within the same story is flagged `returned: true` rather than split in two.
- The exception is DIS S1. The return is its own entry because it overshoots by nine months and the roster changes: the Terran Lorca and Culber are dead, and the Terran Georgiou is aboard.
- "Mirror, Mirror" is one bidirectional swap, with the counterparts listed in `counterTravelers`.
- **Not counted as crossings:**
  - LD "The New Next Generation": a possibility field briefly remaps the Cerritos into a Terran Empire ship, but no one crosses. It is mentioned in the LD entry.
  - DIS "Vaulting Ambition": Stamets meets his counterpart inside the mycelial network.
  - TOS "The Tholian Web": Kirk is trapped in interphase, which is between universes rather than in the Mirror.
  - Georgiou's final Guardian trip: from 3189 to the Prime 24th century, which is time travel within Prime.
  - The Prime Lorca's presumed swap: never shown.
- **Dates that are estimated or inferred:**
  - The Terran Lorca's crossing: 2255, inferred from "one year, 212 days"; it is told in dialogue, not shown.
  - The ISS Enterprise refugees: `t = 2320`. The only clues are the plaque stardate 32336.6, Carmen Cho being an admiral by 2369, and MA reading the Empire's fall as early 24th century.
  - The Godsend and Dada Noe: "before 2324". The film's year is MA's reading of stardate 1292.4. How San crossed is never stated.

## Conflicts to flag for the other lanes

1. **Eugenics Wars dating.** TOS "Space Seed" (and later dialogue) puts them in 1992–1996. In SNW "Tomorrow and Tomorrow and Tomorrow", Sera says Temporal Wars incursions keep delaying these events, which now fall in the 21st century. The Prime-lane workers should follow SNW and point to `eugenics-wars-1990s-original` for the 1990s dating.
2. **Temporal Cold War.** MA's article says the timeline was "largely restored" after "Storm Front, Part II". The Xindi attack still stands in later Prime history, so the unaltered 2150s never comes back.
3. **"Yesterday's Enterprise."** The alternate Tasha Yar survives in Prime after 2344, and her daughter Sela appears in "Redemption".
4. **"Visionary."** The O'Brien who lives on is a version from a few hours later.
5. **Unresolved fates.** E² (does Lorian's ship still exist?), "Non Sequitur" (does the alternate 2372 persist?), "Firstborn", and "Terra Firma" (Carl implies the altered mirror 2255 may persist; mirror Saru's later rebellion in DIS "Mirrors" fits that).
6. **"Tomorrow's Enterprise."** MA's timeline table says Scott died in 2262 when his bridge console exploded. The recaps describe a shuttle loss in the future era, followed by his death "a year ago" in 2262 as the change spreads. The entry states both hedged, and confidence is `inferred`.
7. **DIS S2 dating.** MA dates "Such Sweet Sorrow" to 2258 while the rest of S2 is 2257, and the Xahea vision entry follows MA.
8. **"Year of Hell."** MA notes that because the weapon ship erased itself, Annorax's 2174 history should reset too. The episode shows the reset only at March 2374. The span covers 2174–2374.

## Overlap with other curated files (as of 21:06)

Eleven divergence ids are also used in other `data/curated/*.json` files, mostly `incursions.json`, which records the time-travel events themselves:

- `city-on-the-edge`
- `past-tense-bell-riots`
- `storm-front-1944`
- `tapestry`
- `the-visitor`
- `time-and-again`
- `time-squared`
- `timescape`
- `tomorrow-is-yesterday-1969`
- `year-of-hell`
- `yesterdays-enterprise`

Ids are unique within this file and follow the brief's example ids. If the front end keeps one global id namespace, either prefix these or deliberately use the shared id to link an incursion to the divergence it caused. That choice belongs to the integrator.

## Unverified or approximate

- All fractional years (see Conventions).
- Branch years worked out from dialogue: Gaia, c. 2173 ("200 years"); Molly, c. 2074 ("about three centuries", so confidence `estimated`); Akorem, 2172 ("22nd century", Bajoran year 9174); the TOS and TAS fractions.
- The ISS Enterprise crossing year (see above).
- SNW S4 finale details, pending MA's summary.
