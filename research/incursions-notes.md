# Temporal Incursion Registry: research notes

Output: `data/curated/incursions.json`, 97 records and 259 legs, validated with `json.load` plus a schema check (ids unique, titles of 7 words or fewer, enum values, every `divergence` record carries a `divergenceHint`, every `loop` record has a from = to leg).
It was generated from a session-scratch script that is not kept in the repo, so treat the JSON itself as the source of truth and edit it directly. Memory Alpha wikitext is cached under `cache/ma/inc/`, which is gitignored.

## Counts

| Series (by primary source) | Records | Legs |
|---|---|---|
| TOS | 6 | 15 |
| TAS | 1 | 4 |
| Films (prime) | 4 | 7 |
| Kelvin film | 1 | 2 |
| ENT | 15 | 28 |
| TNG | 13 | 31 |
| DS9 | 11 | 44 |
| VOY | 14 | 60 |
| DIS (incl. the *Section 31* film as a co-source) | 15 | 33 |
| SNW | 7 | 19 |
| PIC | 4 | 5 |
| LD | 1 | 1 |
| PRO | 5 | 10 |
| SA | 0 | 0 |
| Short Treks | 0 | 0 |

- **Legs by destination lane:** HISTORY 67, VOY 45, DS9 32, DIS 26, TNG 18, ENT 17, SNW 13, FUTURE 11, TOS 9, PRO 7, FILM 4, TAS 2, MIRROR 2, KELVIN 2, LD 2, PIC 2.
- **Agency:** deliberate 35, accidental 22, hostile 15, natural 8, loop 7, Q 5, observation 4, unknown 1.
- **Outcome:** divergence 29, restored 21, persistent 19, predestination 18, loop 6, unresolved 3, unknown 1.
- **Confidence:** explicit 76, inferred 14, estimated 7.

## Sources consulted

- **Memory Alpha pages, via the MediaWiki API:**
  - "Time travel": its background table of 214 legs across 73 episodes was the backbone. The table is tagged incomplete.
  - Temporal incursion, Temporal Cold War, Temporal War, Slingshot effect, Guardian of Forever, Time crystal, Orb of Time, Chroniton, Temporal rift, Temporal anomaly, Temporal causality loop, Temporal Prime Directive, Temporal Integrity Commission, Department of Temporal Investigations.
  - Predestination paradox, Pogo paradox, Time portal, Temporal vortex, Timeship (both of its ship tables), Red Angel, Red angel suit, Aeon, Krenim, Annorax.
  - People: Gabrielle Burnham, Humanoid Figure, Vosk, Na'kuhl, Daniels (Crewman), Kovich, Yor, Sera, Ymalay, Asencia, Ilthuran ("The Diviner"), Earth vessel (31st century), Philippa Georgiou (mirror), Doctari Alpha, Spock, Terralysium, USS Protostar.
- **Full-canon sweep:** I pulled all 974 episode and film pages (every season page of every series, the Short Treks, and the 14 films). For each I parsed the sidebar `date` field and scored the summary for time-travel language, then read the summaries of every candidate the table lacked. This sweep found Year of Hell, "In a Mirror, Darkly", Light and Shadows, Q2, "I, Excretus", Timescape, "We'll Always Have Paris", "Valles Marineris" and "Tomorrow's Enterprise".
- **Web checks** (MA pages for most SNW S4 and three SA episodes are still stubs):
  - "Tomorrow's Enterprise": Gizmodo and TrekCore recaps (Uhura swap mechanics, the one-year gap, the rewind).
  - "Like Chronitons Through the Hourglass", "The Griffin Incident", "Once La'An a Time": recaps confirm no time travel.
  - SA "Vitus Reflux", "Series Acclimation Mil", "Vox in Excelso": recaps confirm no time travel.
  - All ten SA S1 episodes are either summarized on MA or checked this way. None has a time-travel event. The finale's 29th-century holo-emitter is an old artifact, not a journey.
- **Title check:** every traveler and source name (250) was checked against MA titles with redirects followed. Six were corrected to canonical titles:
  - Brad Boimler, SS La Sirena, Red angel suit, Ilthuran, USS Defiant (2370), Q (Junior).
  - The one intentional non-article label is `probe (USS Discovery, unnamed)`.

## Conventions (for the build step)

- **`t`:**
  - Month known: year + (month − 0.5)/12. Year only: year + 0.5.
  - Century only: the midpoint, so the 29th century is 2850.0 and the 31st is 3050.0.
  - Hour-scale hops use hours/8766. Deep past is literal: −65,000,000; −3.5e9; the Big Bang is −1.38e10, a real-world figure because canon gives none.
- **`timeline`:** one of `prime`, `alternate`, `kelvin`, `mirror`. Which alternate timeline is meant comes from `divergenceHint`.
- **Loops:** agency `loop` with one from = to leg at the loop's time.
  - E² and Cause and Effect also carry a real displacement arc: Lorian's Enterprise 2154→2037, and the Bozeman 2278→2368.
  - Twilight's from = to leg sits at the 2153 infection. Its outcome is `divergence` (hint `twilight`), because the collapsed 2153–2165 future is a proper alternate timeline.
- **Optional leg `note`:** added where a leg needs a caveat, such as "communication, not travel", a placeholder date, or an implied return. It is not in the original schema, so consumers can ignore it.
- **`divergenceHint` is aligned to the other worker's ids.** Every hint is an exact `id` in `data/curated/divergences.json` as it stood at build time: 52 records, all resolving.
  - All 29 `divergence` records carry one.
  - 23 non-divergence records also carry a hint to the branch the other worker catalogues for the same episode. Examples: `cause-and-effect-loop`, `relativity-disruptor`, `generations-veridian`, `past-tense-bell-riots`.
  - If that file's ids change, the build can still fall back to matching by episode (`sources`).
- **`toLane`:**
  - A series lane is used when the destination is that series' own story and within about a decade of its on-screen span. This includes future scenes the series itself shows: The Visitor's 2389–2450 (DS9), All Good Things' 2395 (TNG), Shattered's 2394 (VOY), Solum in 2436 (PRO), and Face the Strange's 3218 (DIS).
  - Otherwise HISTORY for the past (including pre-series 24th-century points such as 2327, 2346, 2351 and 2365) and FUTURE for 2400 onward when no series owns the scene (26th–31st centuries, 2757, 2410).
  - Special cases: the 32nd century goes to DIS, alternate 2266 to TOS, and "Tomorrow's Enterprise" 2263 to SNW.
- **Record granularity:** one record per journey or traveler group, with round trips and multi-hop chains as legs. Parties with different intent in the same episode are split so `agency` stays honest:
  - Future's End: the Aeon's strike vs. Voyager's displacement.
  - Carpenter Street: Reptilians vs. Archer.
  - Storm Front: Vosk vs. Enterprise.
  - First Contact: the Borg vs. the Enterprise-E.
  - PIC S2: Q's shift, Q's 2024 meddling, La Sirena, and Wesley.
- **Outcome `restored`** also covers round trips that left history unchanged, such as All Our Yesterdays and Death Wish.

## Judgment calls

- **Communications and visions count, flagged in method or leg note:**
  - Eye of the Needle (per brief), The Sound of Her Voice, Timeless (Borg temporal transmitter), and the Humanoid Figure's 28th-century transmissions.
  - Chakotay's distress call from 2436, the Red Angel suit's seventh signal, and Pike's Boreth vision.
- **Described but not shown, included:**
  - Kal Dano hiding the Tox Uthat, and the time-pod's 26th-century owner.
  - The 2769 Giza anthropologists, the Na'kuhl plot to prevent Suliban sentience, and "Temporal Wars fought over Khan".
  - Yor's Kelvin-to-prime crossing, and Kovich = Daniels.
- **Kovich = Daniels:** encoded as a 31st-century → 3189 leg, confidence `inferred`. The finale reveals the identity but never says how he got there, whether by travel or by living through it ("many years and many lives").
- **"Those Old Scientists":** the brief said Orb of Time, but MA's summary shows only the Krulmuth-B portal (recharged with horonium). No Orb appears, so the method is the portal. The PRO S2 finale does use an Orb of Time with modified time crystals, but in Wesley's scanning machine, not for travel.
- **Year of Hell:** encoded as one leg from 29 Nov 2374 back to the 2170s, when the weapon ship's self-erasure undoes two centuries of incursions. Voyager's reset to 16 Mar 2374 is noted rather than drawn.
- **Tapestry and All Good Things:** encoded as Q-driven consciousness shifts, per MA's table. Q leaves it open whether Tapestry was real.
- **Parallax:** included because MA's table lists it, but confidence is `inferred`, since on screen it plays as spacetime distortion.
- **Timescape:** included for its on-screen local time reversal to before the core breach.
- **"We'll Always Have Paris":** a replayed moment, classed as `loop`.
- **Q2:** a Q-made 30-second loop. Agency is `loop`, and the method names Q.
- **Before and After:** four of Kes's jumps have no stated year. Those legs use estimates, noted per leg.
- **Fury:** the return leg (2371→2376) is implied (old Kes is next seen in 2376), not shown.

## Conflicts found

- "Valles Marineris": MA's time-travel table says 2261. The episode sidebar says stardate 2491.5 (2262). I used 2262.
- "Shockwave": the table puts the "ten months earlier" stop in 2152, but ten months before February 2152 is April 2151. I used 2151.27.
- "Captain's Holiday" (2366, not the table's 2367), "Time's Arrow, Part II" (2369, not 2368), "Azati Prime" (January 2154, not 2153): I used the episode sidebars.
- Gabrielle Burnham's escape: the table says "32nd century". "950 years" from Doctari Alpha in 2236 gives c. 3186.
- Georgiou's Guardian exit: the table says "24th century". The *Section 31* film's sidebar says "early 24th century". t = 2320 is an estimate.
- Eugenics Wars dating: SNW's Temporal-Wars-over-Khan line explicitly moves Khan's rise from the TOS-era 1990s into the 21st century. This is noted on `sera-khan-plot` and `khan-temporal-wars`.
- MA's table cites DIS "Kobayashi Maru" for the Protostar's 2382→2436 jump, which looks like a template slip, since that episode is set in 3190. I cited the PRO S1 episodes instead.
- E²: the sidebar date is "2153/2154". I used 2154.0.
- The Humanoid Figure's 28th-century origin rests on Archer's line in "Storm Front, Part II". MA also states it.

## Placeholders and unverified points

These have estimated `t` values and are flagged in `conflict` or the leg `note`:

- Kirk's Sarpeidon era (1700), the Sarpeidon exodus (1000), and the dawn of Orion civilization in Yesteryear (−5000).
- The Na'kuhl–Suliban plot (−200,000), and the Temporal-Wars origin of Sera and the Khan factions (3000).
- The home era of the SNW temporal agents and Agent Ymalay (2380), and Yor's arrival (3100).
- Gabrielle at young Spock (2239), Georgiou's early-24th-century arrival (2320), and Wesley's departure point (2401).
- "Tomorrow's Enterprise" mechanics come from recaps, because MA's page is a stub. Re-check when MA fills it in.

## Considered and excluded (not time travel)

- **Time dilation or differential time rates:** TAS "The Time Trap" and "The Counter-Clock Incident" (a reverse-time universe with age regression), VOY "Blink of an Eye" and "Gravity", LD "Fully Dilated", PRO S2 time-accelerated factories and weapon.
- **Stasis or long life:** TNG "Relics" (transporter buffer), VOY "The 37's", "Living Witness", "Dragon's Teeth", Short Trek "Calypso", and Sahar in the *Section 31* film (a 350-year-old Augment).
- **Illusions, visions or recreations:**
  - VOY "Coda" (an alien's illusory loop, even though MA's loop page cites it), TNG "Future Imperfect", DS9 "Far Beyond the Stars".
  - SNW S3 "New Life and New Civilizations" (the Vezda illusion of a life with Batel), SNW S4 "Like Chronitons Through the Hourglass" (Trelane's soap opera).
  - TNG "Encounter at Farpoint" (Q's courtroom), TOS "Spectre of the Gun", TAS "The Magicks of Megas-tu", LD "Crisis Point 2" (holodeck).
- **Alternate realities rather than time travel** (the other worker's domain): TNG "Parallels", VOY "Non Sequitur", PRO "Cracked Mirror", TOS "The Alternative Factor" (Lazarus's "time ship" crosses universes).
- **Prophets acting non-linearly:** DS9 "Emissary", "Shadows and Symbols". Accession is included because a person is physically moved.
- **Consequences of time travel rather than travel:**
  - ENT "Regeneration": Borg remnants of First Contact.
  - DIS "Life, Itself": its epilogue is a flash-forward.
  - LD "The Least Dangerous Game": a temporal rift regresses Captain Chapman to infancy, which is age regression rather than displacement.
- **No time travel found:**
  - All of SNW S3.
  - SNW S4 apart from "Valles Marineris" and "Tomorrow's Enterprise".
  - All of SA S1.
  - LD S5.
  - DIS S4.
  - PIC S1 and S3.
  - All Short Treks.
