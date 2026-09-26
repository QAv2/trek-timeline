# HISTORY I: deep time to 2150, research notes

Output: `data/curated/events-early.json`. It holds 160 events sorted by `t` and runs from the birth of the universe to the NX-01 keel-laying in 2150.
Compiled 2026-09-25 from Memory Alpha (MediaWiki API), covering on-screen canon through SNW Season 4 (aired July 23 – September 24, 2026).

## Counts

| category | n | | weight | n | | confidence | n |
|---|---|---|---|---|---|---|---|
| exploration | 27 | | 3 (landmark) | 21 | | explicit | 101 |
| war | 19 | | 2 (notable) | 77 | | inferred | 50 |
| temporal | 18 | | 1 (minor) | 62 | | estimated | 9 |
| politics | 17 | | | | | | |
| disaster | 14 | | | | | | |
| deep-time | 13 | | | | | | |
| earth | 13 | | | | | | |
| ancient | 11 | | | | | | |
| culture | 11 | | | | | | |
| science | 11 | | | | | | |
| first-contact | 6 | | | | | | |

Twelve events carry a `conflict` note (the chronometric anomalies, listed below).

## Sources and method

- **Backbone:** Memory Alpha's era pages. I used *Distant past* (billions of years ago to about 1 CE), the century pages *1st century* through *22nd century*, the decade pages from *1900s* to *2140s*, and year pages 1893–2150. These list events with their source episodes, so each candidate came with a citation.
- **Verification:** each candidate was checked against its topic page (e.g. *Progenitor*, *Tkon Empire*, *Eugenics Wars*, *World War III*, *Zefram Cochrane*, *Kahless the Unforgettable*). Where the dating hinged on a line of dialogue, I also checked the episode page. Examples: "four billion years" in *The Chase*, "six thousand centuries ago" in *Return to Tomorrow*, "fifteen centuries ago" in *Rightful Heir*, "three thousand years" in *Destiny*, "nearly 1,000 years old" in *Anomaly (ENT)*, and "120 years" in *The Xindi*.
- **Source validation:** `sources` holds 151 distinct titles and `ma` holds 146 topic titles. All were re-checked live against the API after the file was written: every one exists, none is a redirect, and every source is an episode or film page (it carries `{{sidebar episode}}` or `{{sidebar film}}`). Episode articles keep MA's own spelling and suffixes, e.g. `Carbon Creek (episode)` (plain "Carbon Creek" is the town), `Anomaly (ENT) (episode)`, `Up The Long Ladder (episode)`, `In A Mirror, Darkly, Part II (episode)`, `Tomorrow is Yesterday (episode)`. Films have no suffix.
- **2025–26 canon:** I swept the MA season pages for SNW S3, SNW S4 and Starfleet Academy S1, plus the *Star Trek: Section 31* page, for pre-2150 year links.
  - Only SNW 4x01 *Valles Marineris* (2026-07-23) adds pre-2150 history: a Martian–Dol'drm war 65 million years ago and the Chicxulub impactor as a fragment of the destroyed Dol'drm world.
  - SNW S3 contributes only Pelia's age, used in the Lanthanite event.
  - Starfleet Academy's *Series Acclimation Mil* shows a New Orleans history display, including an "Advanced Weather Control Station opens" entry for 2123. I skipped it as background dressing.
  - *Section 31* and the other SFA episodes have nothing before 2150.
  - The MA pages for SNW S4 are only weeks old and may still change.
- All summaries are my own wording. No Memory Alpha prose was copied.

## Conventions

- **`t`:** a float year, negative for BCE. For "X years ago" I computed `t` from the in-universe year of the episode where it is said. For example, the Orbs are "10,000 years" before 2369, giving −7631. Values of 100,000 years or more are rounded (−600000, −4e9). Month-level dates get a fraction of the year: April 5, 2063 is 2063.26.
- **Ties:** events with the same `t` keep their authoring order, which is causal. The Martian war comes before the Chicxulub impact, and the Vaadwaur bombardment before the Borg entry.
- **Confidence:**
  - `explicit`: a year, or a stated span, is given on screen.
  - `inferred`: the date is computed from on-screen information. Examples are age arithmetic, "X years ago" statements tied to a named century, and the order of the three 4th-century Vulcan events (330, 360, 375).
  - `estimated`: the event is canon but no date is given; the placement is a reasoned guess (list below).
- **Categories:**
  - `deep-time` covers cosmic and prehistoric events, roughly older than 100,000 years.
  - `ancient` covers relics and works of ancient civilizations. It includes the 12th-century Sphere-Builder spheres.
  - `temporal` covers anything caused by time travel. Roswell is filed here rather than under `first-contact`.
  - Everything else is filed by nature: war, disaster, politics, exploration, science, culture, first-contact, and earth (Earth-specific milestones).

## Chronometric anomalies (the `conflict` field)

1. **Age of the universe:** 16 billion years (*Good Shepherd*) or 20 billion (*Latent Image*). I used 16. MA also cites an okudagram in *The Royale* implying 72 billion; I left it out of the note as too thin.
2. **Bajoran antiquity:** Picard says Bajorans were "architects and artists… when Humans were not yet standing erect" (*Ensign Ro*). The oldest Bajoran site dated on screen is a 30,000-year-old city (*The Reckoning*).
3. **Dominion founding:** 2,000 years before 2372 (*To the Death*) or "10,000 years ago" (*The Dogs of War*). I used the 4th century, which also fits the Jem'Hadar's two millennia of service.
4. **Kahless:** "fifteen centuries" before 2369 (*Rightful Heir*, 9th century) or Qam-Chee "a thousand years ago" (*Looking for par'Mach…*, 14th century). I used the 9th century.
5. **Vulcan warp and Carbon Creek:** Quark says in 1947 that the Ferengi will have warp "centuries before… even the Vulcans". Vulcans crew starships in 1957 (*Carbon Creek*) and had reached P'Jem by about 850 BCE.
6. **Eugenics Wars:** 1992–96 (*Space Seed*, used as the date), or "two hundred years ago" from 2373, i.e. the 2170s (*Doctor Bashir, I Presume*). SNW makes it 21st-century: Khan is a child in 2022, and the wars fall between the Second Civil War and WWIII, with temporal interference blamed on screen.
7. **Botany Bay:** the 1990s launch is impossible in SNW's revised history, and SNW gives no replacement date.
8. **Sanctuary Districts:** DS9 shows walled, guarded camps in every city. Picard S2's 2024 Los Angeles district has no walls and appears only on a poster (*Assimilation*).
9. **Start of WWIII:** about 2026 comes from a Starfleet archive display (*In A Mirror, Darkly, Part II*), not dialogue. SNW's single escalation from civil war to Eugenics Wars to WWIII collides with the TOS dating of the Eugenics Wars.
10. **Kzinti Wars:** Sulu puts the last war about 200 years before 2269, i.e. about 2069. That is six years after Earth's first warp flight, and after Friendship One (2067) was launched with humanity having "no idea" what lay out there.
11. **First Mars colony:** 2103 (*The 37's*, *Lifesigns*), but *Terra Nova* has Utopia Planitia on Mars and New Berlin on the Moon settled by 2069.
12. **Cochrane's disappearance:** 2117 (*Metamorphosis* arithmetic, plus an archive file), but *Broken Bow* has him dedicating the Warp Five Complex in 2119.

## Judgment calls

- **Borders:** I stopped at 2150. Two events sit on the border: *Earth fully unified* (2150) and *Keel of Enterprise NX-01 laid* (2150.75, Archer chosen that October). HISTORY II may carry a United Earth event of its own; keep one of the two.
- **Gabriel Bell and the Bell Riots** are separate entries. Bell's death (August 31, 2024, `temporal`) and the riots (September 1–3, `politics`) are distinct milestones. History records Bell dying on September 3.
- **Progenitors:** one event (−4e9, from "four billion years" in *The Chase*). The *Discovery* S5 revelation, that the Progenitors were themselves made by unknown creators, goes in the summary rather than a separate entry. MA dates the species' flourishing to 4.5 billion years ago.
- **Chicxulub:** no conflict flagged. SNW gives the impactor an origin, but no earlier episode contradicts it. The Enterprise-of-2262 causal loop is in the summary.
- **Vulcan spaceflight:** P'Jem (about 850 BCE) and the 4th-century Romulan exodus show pre-Surak spaceflight. I read Soval's "1,500 years to rebuild and travel to the stars" as a *return* to space in the mid-19th century (`vulcans-return-to-space`). I did not flag this as a contradiction.
- **Ferengi:** Gint and the Rules of Acquisition are folded into *Rise of the Ferengi Alliance*. Nog says it took ten thousand years to build the Alliance; Gint's own era is never dated.
- **Trill:** this is the weakest anchor. *Forget Me Not* (3189) cites two millennia of joining without a successful non-Trill host, which I read as joining being on record by about 1189.
- **Weight 3 (21 events):** Progenitors, the anti-time eruption, Chicxulub, the Voth, the Tkon, the Iconians, the first Orb, the Awakening, the Romulan exodus, Kahless, 1893, 1930, 1986, the Eugenics Wars, the Botany Bay, the Bell Riots, the start of WWIII, the end of WWIII, the Borg in 2063, First Contact, and the 2150 unification.

## Estimated placements (canon event, undated on screen)

| id | t | basis |
|---|---|---|
| voth-ancestors-leave-earth | −2e7 | must precede Voth recorded history (about 20 million years ago) |
| talos-iv-nuclear-war | −3e5 | "hundreds of thousands of years" before 2254 |
| borg-cybernetic-evolution-begins | −2e5 | Guinan: "thousands of centuries" |
| kalandans-extinct | −500 | outpost "only a few thousand years old" in 2268 |
| preservers-transplant-amerinds | 1780 | "some centuries" before 2268; MA notes the named tribes were at risk in the late 18th century |
| earth-saturn-probe | 2015 | "early 21st century" (Chronology guesses 2009 or 2020; non-canon) |
| humpback-whales-extinct | 2050 | "21st century" |
| vulcans-mentor-earth | 2064 | after First Contact; no founding date for the Vulcan presence |
| european-hegemony | 2110 | "early 22nd century"; its distress beacon dates to 2123 |

## Tensions noted but not flagged

- **Terra 10:** colonists left Earth before the intersat code lapsed (about 2069). This sits uneasily with Terra Nova (2078) as "Earth's first extrasolar colony", but the arrival dates are unknown.
- **Voyager 6:** Decker says it was launched "more than 300 years ago" (before about 1973). The Encyclopedia's 1999 date is non-canon.
- **Ocampa:** "Five hundred Ocampan generations" since the Warming, against the Caretaker's thousand years of care. The two are compatible given Ocampa lifespans.
- **Xindus:** the date (2033) is inferred from T'Pol's "120 years". MA's year pages say 2033, and its decade page says "2030s".

## Gaps: requested but not placeable before 2150

- **Species 8472 and fluidic space:** no dated canon before the Borg war of 2373.
- **Dyson sphere (*Relics*):** construction is never dated.
- **Cardassia's First Hebitian civilization:** undated. The plundering of its vaults is "22nd century" (the Encyclopedia says the late 2160s), so probably HISTORY II.
- **Remans:** their origin and enslavement are undated.
- **Zhat Vash:** founded "hundreds of years before the 24th century", too vague to place. It is mentioned in the Admonition event instead.
- **El-Aurians:** before 2150, canon has only Guinan's visits to Earth (1893, 2024). Both are covered inside *Time's Arrow* and the Picard S2 events. Their homeworld's fall (about 2265) belongs to HISTORY II.
- **Founding of the Earth Cargo Service:** undated. The *Horizon*'s commissioning in 2102 stands in for it.
- **Founding of United Earth's Starfleet:** undated.
- **Borg origin:** only Guinan's line and the Vaadwaur's "a few systems" in 1484.

## Caveats

- I checked summaries against MA's episode and topic pages, not full transcripts.
- Several relative dates depend on MA's quotation of the line. The main one is Sulu's "two hundred years ago" for the Kzinti, taken from a background note on MA.
- Early in the session another worker's `ma.py` overwrote mine in the shared scratchpad. Their cache folder briefly held 14 of my JSON files, which I have since removed. All my later work used a private subfolder (`scratchpad/hist_early/`); nothing in the project tree was touched apart from the two output files.
