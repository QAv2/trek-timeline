# Personnel dossiers & relationship threads: research notes

Worker: personnel/threads (Opus), 2026-09-25. The Uhura & Scott thread is a separate worker's file (`threads/uhura-scott.json`).
The two files don't collide, and they use the same people titles, weight scale and confidence vocabulary.

## Outputs

| File | Contents |
|---|---|
| `data/curated/personnel.json` | 128 dossiers: 91 with at least one displacement, 437 displacement legs in total; 71 have a birth date, 21 a death |
| `data/curated/threads/others.json` | 14 threads, 205 beats (147 inferred, 50 explicit, 8 estimated) |

Both files pass `json.load` and a schema check with 0 errors and 0 warnings. That check covers:
- required keys and value types, the confidence and kind enums, weights 1–3, and beat titles of 6 words or fewer;
- beats sorted by `t`, and 8–20 beats per thread;
- every `ma`, `people` and `counterparts` title resolving **exactly** on Memory Alpha (no redirects);
- every `source` being an exact MA episode or film title.

### Threads

| id | people | kind | beats | span |
|---|---|---|---|---|
| `kirk-spock` | James T. Kirk, Spock | friendship | 20 | 1930 (City) · 2258–2368 |
| `spock-chapel` | Spock, Christine Chapel | romance | 18 | 2259–2273 |
| `pike-batel` | Christopher Pike, Marie Batel | romance | 14 | 2259–2262 |
| `laan-kirk` | La'An Noonien-Singh, James T. Kirk | romance | 10 | 2022 (alt. Kirk) · 2259–2263 |
| `picard-crusher` | Jean-Luc Picard, Beverly Crusher | romance | 15 | 2353–2402 |
| `riker-troi` | William T. Riker, Deanna Troi | romance | 16 | c. 2359–2401 |
| `picard-q` | Jean-Luc Picard, Q | rivalry | 13 | 2364–2402 (+2024) |
| `worf-jadzia` | Worf, Jadzia Dax | romance | 14 | 2372–2375 |
| `odo-kira` | Odo, Kira Nerys | romance | 14 | 2365–2375 |
| `paris-torres` | Tom Paris, B'Elanna Torres | romance | 16 | 2371–2378 (+2404 erased future) |
| `seven-raffi` | Seven of Nine, Raffaela Musiker | romance | 13 | 2399–2402 (+2024) |
| `burnham-book` | Michael Burnham, Cleveland Booker | romance | 14 | 3188–3191 (+epilogue c. 3230) |
| `stamets-culber` | Paul Stamets, Hugh Culber | romance | 15 | 2256–3191 |
| `mariner-boimler` | Beckett Mariner, Brad Boimler | friendship | 13 | 2259 (crossover) · 2380–2382 |

These are the 13 suggested pairs plus **Picard & Q**, added because it is the canon's most time-travel-heavy relationship
("Tapestry", "All Good Things...", and the Picard season 2 Confederation / 2024 arc). All pairs were well enough documented
to keep. La'an & Kirk is the thinnest at 10 beats.

### Roster by series of origin (128)

- **ENT (9):** Jonathan Archer, T'Pol, Charles Tucker III, Malcolm Reed, Hoshi Sato, Travis Mayweather, Phlox, Thy'lek Shran, Daniels (Crewman)
- **History / TOS / TOS films (13):** Zefram Cochrane, Gary Seven, James T. Kirk, Spock (= Spock Prime), Leonard McCoy, Montgomery Scott,
  Nyota Uhura, Hikaru Sulu, Pavel Chekov, Sarek, Amanda Grayson, Khan Noonien Singh, Carol Marcus
- **SNW (9):** Christopher Pike, Una Chin-Riley (Number One), La'An Noonien-Singh, Erica Ortegas, Joseph M'Benga, Hemmer, Pelia, Marie Batel, Christine Chapel
- **DIS (14):** Michael Burnham, Saru, Paul Stamets, Sylvia Tilly, Hugh Culber, Philippa Georgiou, Philippa Georgiou (mirror),
  Gabriel Lorca (mirror), Ash Tyler (Klingon), Cleveland Booker, Adira Tal, Rayner, Kovich, Gabrielle Burnham
- **TNG / TNG films (15):** Jean-Luc Picard, William T. Riker, Data, Geordi La Forge, Worf, Beverly Crusher, Deanna Troi, Wesley Crusher,
  Natasha Yar, Katherine Pulaski, Q, Guinan, The Traveler, Ro Laren, Reginald Barclay
- **DS9 (16):** Benjamin Sisko, Kira Nerys, Odo, Julian Bashir, Jadzia Dax, Ezri Dax, Quark, Miles O'Brien, Jake Sisko, Elim Garak, Weyoun,
  Dukat, Rom, Nog, Kasidy Yates-Sisko, Martok
- **VOY (11):** Kathryn Janeway, Chakotay, Tuvok, B'Elanna Torres, Tom Paris, Harry Kim, The Doctor, Neelix, Kes, Seven of Nine, Braxton
- **PIC (9):** Raffaela Musiker, Cristóbal Rios, Agnes Jurati, Elnor, Soji Asha, Jack Crusher, Hugh, Tallinn, Liam Shaw
- **LD (8):** Beckett Mariner, Brad Boimler, D'Vana Tendi, Sam Rutherford, Carol Freeman, Jack Ransom, Shaxs, T'Ana
- **PRO (8):** Dal R'El, Gwyndala, Rok-Tahk, Zero, Jankom Pog, Murf, Kathryn Janeway (hologram), Asencia
- **Starfleet Academy (11):** Nahla Ake, Caleb Mir, Jay-Den Kraag, SAM, Darem Reymi, Genesis Lythe, Tarima Sadal, Lura Thok, Nus Braka,
  Charles Vance, Jett Reno. This is MA's main-cast list; Tilly and the Doctor also carry SA lanes and posts.
- **Kelvin & film antagonists (5):** James T. Kirk (alternate reality), Spock (alternate reality), Nero, Tolian Soran, Borg Queen

The roster is 128, over the ~110 target, because it covers every main cast in full, including all 11 SA leads (verified against MA's
series page), plus the requested recurring figures.

## Sources

- **Memory Alpha MediaWiki API** for all canon facts. Pages were read by sidebar, section or keyword grep, never as whole pages:
  - character articles: the `{{sidebar individual}}` born/died/species fields, career sections, alternate-timeline sections and
    Appearances lists;
  - episode Summary sections for every cited beat, and credits blocks to confirm who was physically present at each displacement;
  - the `Template:<Series> Season N` navigation templates, which give episode order and stardates;
  - the `date` field of every episode sidebar (949 episodes, 14 films and the Short Treks), which gives the in-universe year.
- **Web**, used only where MA summaries were still empty:
  - SNW season 4 (aired 24 Jul–24 Sep 2026): TrekCore reviews of 4x07, 4x09 and 4x10; Reactor's review of 4x07; Wikipedia's
    "SNW season 4" page; Screen Rant on Pelia's exit.
  - Starfleet Academy (eps 3–5 have no MA summary): the Wikipedia series page, TrekCore/Den of Geek on "Vox In Excelso",
    SlashFilm/Screen Rant on Nahla Ake (half-Lanthanite, 422 in 3195), and Screen Rant on Jett Reno's age.
  - Every web fact was cross-checked against the MA character pages, which do carry S4 and SA material.
- All prose (summaries, notes, `via` texts, post titles) is written fresh, not copied from MA.

## Conventions (what the numbers mean)

### Dates
- **`t` is a decimal year**, computed by one shared helper so every lane agrees:
  1. 24th/25th-century five-digit stardates: `t = 2323 + SD/1000`. Examples: 46125.3 → 2369.13; 78183 → 2401.18 (overridden, see below).
  2. Otherwise a month in MA's date → the middle of that month. This applies only where the series-year has no stardates.
  3. Otherwise interpolate by air order between the nearest dated episodes of the same series and year, keeping only anchors
     that stay in order. Past the last anchor, step 0.01 per episode.
  4. Films: stardate, else month, else year + 0.5.
  5. Picard season 2's 2401 frame (Stargazer, the Confederation, the return) is fixed at **2401.10**. Season 3, which MA dates to
     April 2401, is spread over **2401.25–2401.34**.
  6. Backstory beats with no episode date use year + 0.5. TMP has no MA year, so it uses **2273.5 (estimated)**.
- **Confidence:**
  - `explicit`: the year is given on screen (captions, dated logs, dialogue). This covers DIS 3188+, all of PIC, dated ENT logs,
    the Kelvin stardates and on-screen personnel files.
  - `inferred`: derived from stardate or season conventions, or MA's standard dating of TOS and the films.
  - `estimated`: approximations ("years ago", "decades later", "c.").
- **Weight:** 1 = supporting beat, 2 = major beat, 3 = turning point (meeting, marriage, death, parting). Each thread has 2–6 beats at weight 3.

### Thread beats
- **Beats are sorted by calendar `t`,** not by the order the characters lived them. Beats in Earth's past therefore sort first
  (1930 in `kirk-spock`, 2022 in `laan-kirk`, 2024 in `seven-raffi` and `picard-q`).
- **A beat that happens during a displacement sits at its true in-universe moment**, with `tText` saying so, e.g. "1930 (from 2267)"
  or "2395 (alternate future)". The `source` still names the episode.
- Beats in alternate or erased timelines are kept only where they matter to the pair, and the note always says so. They are the
  Endgame 2404, the "All Good Things..." 2395, the altered 2263 of "Tomorrow's Enterprise", and the alternate Kirk of
  "Tomorrow and Tomorrow and Tomorrow".

### Displacements
- One leg per physical move: `from` is the departure `t`, `to` is the arrival `t`, and return trips are separate legs.
- **Reality crossings and time-dilation stays are zero-length legs (`from == to`): 116 legs.** They cover the mirror universe, the
  Nexus, parallel quantum realities, the Confederation timeline, Megas-Tu, the negative universe, and the mycelial network.
  Time-dilation stays are Kasq, Dilmer III, "Gravity" and "Blink of an Eye". The reality or effect is named in `via`.
- **Included:** consciousness-only trips the character personally experienced, where on screen they live in another era:
  "Tapestry", "All Good Things...", "Visionary", "Before and After". Transporter-buffer and sleeper-ship stasis are included
  where they carry someone across eras.
- **Excluded:** dreams, holodecks, visions and memories; erased timelines where the prime character never travelled
  ("Timeless", "Year of Hell", "Children of Time"); "Living Witness" (the Doctor's backup copy, not him); Q Continuum and
  fluidic-space visits (other realms, not times or realities).

### Series lanes and counterparts
- **Series lanes:** the production series a character is credited in, plus `HISTORY` if they are physically in Earth's past before
  about 2100 (natively or by time travel), plus `MIRROR` if they are mirror-universe natives or crossed into it. Crossover
  episodes count under their own series; the DS9 crew at "Trials and Tribble-ations" do not get TOS. Very Short Treks cameos,
  archive audio, busts and file photos don't count.
- **Counterparts:** only pages titled "(mirror)", "(alternate reality)" or "(alternate timeline)", plus named duplicates (Thomas Riker,
  William Boimler, "Miles O'Brien (replicant)", Weyoun 4–8, "Ezri Tigan (mirror)", "Voq (mirror)"). Holograms, Changeling
  impostors, programs and namesakes are excluded. The one deliberate exception is "Kathryn Janeway (hologram)", Prodigy's lead,
  who has her own dossier.
  - **82 of the 202 "Name (…)" pages on MA are only redirects** and were dropped. That covers every "(Silver Blood)" page,
    nearly every "(hologram)" page, and the "(alternate timeline)" pages for Kirk, Pike, Picard, Bashir, Dukat, Martok,
    Sarek and the Borg Queen.

## Renderer caveats

- **Deep-time values** (the axis needs a clamp or break):
  - −3,500,000,000: Q shows Picard primordial Earth in "All Good Things...".
  - −64,997,738: the whole SNW crew, about 65 million years back in "Valles Marineris" (S4E1). Kirk was not aboard.
  - −2731: Spock and McCoy, 5,000 years into Sarpeidon's past in "All Our Yesterdays".
  - Pelia's birth, c. 28th century BC (−2750).
- **Far-future placeholders:**
  - 2550.0: the 26th-century Enterprise-J battle in "Azati Prime".
  - 3050.0: Daniels's 31st century.
  - 2875.0: Braxton's late-29th-century timeship.
  - 2450.0: the mid-25th century of "The Visitor".
  - c. 3230: the Discovery epilogue.
- **Undated destinations get a zero-length marker at the departure year**, with the destination named in `via`: Kirk's trip into
  Sarpeidon's undated past, and the Kirk/Spock observation trip to Orion's past in "Yesteryear".
- **Deaths known only as "by year X"** use X as `t`, with `tText` saying "by …" and confidence `estimated`: Hoshi Sato by 2268
  (the ISS Defiant's database) and Chekov by 2401 (his son Anton is president). Treat these as ceilings.
- **Loops:**
  - Hologram Janeway's four Prodigy legs form a causality loop (2382 → 2436 → before 2366, and so on); a loop marker would read
    better than straight lines.
  - Discovery's 2257 is shown as one undifferentiated year on MA. The mirror-universe return (2257.85) therefore sits later than
    the episodes that follow it, which are spread evenly across 2257.

## Judgment calls

- **Spock Prime = MA "Spock".**
  - The single dossier carries his 2387 → 2258 fall into the Kelvin reality and his death there (2263, "Star Trek Beyond",
    explicit). The Kelvin-era Spock is a separate dossier ("Spock (alternate reality)").
  - `kirk-spock` includes Spock Prime meeting the young Kelvin Kirk (2258) and his reported death (2263).
  - It also includes "Unification II", where Spock explicitly says he committed Kirk to the Khitomer mission.
- **Kelvin crew:** only Kirk and Spock (alternate reality) get dossiers. McCoy, Scott, Uhura, Sulu, Chekov and Carol Marcus
  (alternate reality) appear as `counterparts` of their prime dossiers. Add them if the KELVIN lane needs its own clickable crew.
- **Khan, `born` = null.** TOS/STID imply a mid-20th-century birth and a 1990s Botany Bay launch, but SNW shows him as a boy in
  2022. The sleeper-ship leg keeps TOS's on-screen 1996 departure, the conflict is stated in the summary, and no birth year is
  asserted.
- **Daniels and Kovich are one person.** MA "Kovich" is an alias page pointing to "Daniels (Crewman)".
  - The Kovich dossier stays because DIS credits link to [[Kovich]], but it is concise and has no displacements.
  - The Daniels dossier carries his ENT and DIS history and the Temporal Cold War legs.
- **Weyoun:** MA's "Weyoun" article is the clone progenitor; on screen he is credited as Weyoun 4–8, listed as counterparts. If
  appearances are credited to the numbered pages, this dossier may have no worldline of its own.
- **Q in SNW:** John de Lancie's "Wedding Bell Blues" role is credited on MA as [[Q]] (the Wedding Planner's father), but he is
  identified as Q only in production interviews. SNW is in Q's lanes because the credit will pull that appearance in anyway.
- **O'Brien and Ezri, `died` = null.** The O'Brien seen after "Visionary" is his own future self; Ezri's "deceased by 3195" rests
  only on a later Dax host appearing in SA.
- **Picard `died` = null.** His human body died in 2399 and his mind was moved into a synthetic golem body; the summary says so.
  Data likewise: died in 2379, ended in 2399, revived in 2401.
- **"Face the Strange", "Relativity" and "Cracked Mirror"** are compressed to their established legs; the details are named in `via`.
- **Worf–Jadzia ends with Ezri** ("Afterimage", "Penumbra", "Strange Bedfellows"), since the symbiont carries the relationship.
- **Pike's "A Quality of Mercy" trip** is encoded as a physical pair of legs, 2259 ↔ 2266, as MA words it; the episode leaves
  mind-versus-body open.
- **SNW 2263:** "Tomorrow's Enterprise" shows Kirk commanding the Enterprise and Pike as an admiral, but in an altered timeline
  that resets. Those beats are labelled as altered; Kirk's command post in the dossier stays at TOS's 2265.

## Merge-time fixes (documented here because they override lane output)

1. Seven of Nine gets the missing "The Star Gazer" leg into the Confederation 2401, like the rest of the Stargazer bridge crew.
   Her 2024 arrival is aligned to 2024.29.
2. The Doctor's Kasq time-dilation leg ("The Life of the Stars") is aligned to SAM's 3196.3.
3. Chakotay's 2436 → Ysida leg is aligned to Hologram Janeway's 2374.5, since it is the same trip.
4. Four thread beats are moved from the episode's home date to their true moment: Kirk & Spock in 1930, La'an with the alternate
   Kirk in 2022, and the "All Good Things..." alternate-2395 beats in `picard-crusher` and `riker-troi`.
5. Worf's "Trials and Tribble-ations" leg uses the DS9 crew's 2268.06 ("The Trouble with Tribbles").

## Unverified / soft spots

- **SNW S4 (MA summaries mostly empty):**
  - La'an stabbing Kirk in "The Griffin Incident": MA prose says she stabbed Kirk; a Wikipedia summary says she was stabbed. I followed MA.
  - Whether prime Kirk takes the Enterprise in 2263.
  - Ortegas's Academy post and captaincy, which come from the altered 2263.
- **Starfleet Academy dating conflicts on MA:** the Pikaru trial is dated 3178 in one article and 3180 in another, and Vance
  recruits Ake in 3192. I used 3195 for the Academy's reopening, from Thok's on-screen file and Ake's age of 422.
  - Jett Reno's 2215 birth year has no in-text MA citation; it is consistent with Screen Rant's reading of her SA age.
- **Birth dates:**
  - Janeway "20 May, c. 2344": the date is from dialogue, the year from a conflicting okudagram.
  - Pike (c. 2218) and Una (c. 2222) are "early 23rd century" on screen.
  - Estimated: Mariner c. 2350, Boimler before 2356, Tendi and Rutherford mid-2350s, Malcolm Reed (2 September, year unstated),
    Daniels c. 3050, Amanda Grayson c. 2200, Zefram Cochrane c. 2030.
- **Posts from set decoration or rosters** (flagged in the post text):
  - the 2384 Dauntless crew panel: Torres, Kim, Tuvok, the Doctor;
  - the 3195 Academy commemoration wall: Kim as admiral, Mayweather as captain, Mariner/Zero as commanders, Rok as lieutenant commander;
  - Uhura's Leondegrance command, 2301–2333, from a plaque in "The Star Gazer".
- **Approximate displacement endpoints:**
  - Chakotay's 2436 arrival and c. 2374 Ysida landing.
  - Gabrielle Burnham's first jump (c. 3186).
  - Lorca (mirror)'s undated crossing (2256.5).
  - Georgiou (mirror) landing in the Section 31 film's "early 24th century" (2324.5).
  - Jankom Pog's cryostasis (2160 → 2382).
  - The drydock, early-3190 and November-2256 cycles of "Face the Strange".
- Martok's capture year, the end of Kasidy's prison term (2373), and several Ferengi/DS9 post start years are series knowledge, not MA dates.
- Riker's and Troi's Titan posts end at 2399 as an upper bound; they had left active service by then, but the exact year is never given.

## Gaps / not done

- TAS-only regulars Arex and M'Ress are not included; they are main cast of TAS alone, and the roster was already past target.
- No Uhura & Scott thread here (the other worker's file).
- Weyoun's appearances may credit the numbered clone pages rather than "Weyoun" (see above).

## Rebuild provenance

Lane builders and the shared date helper live in this session's scratchpad (`…/scratchpad/pt/`: `tdate.py`, `build_*.py`,
`ds9_build.py`, `merge.py`), with the MA page cache in `pt/cache/`. The scratchpad is ephemeral; copy it into `tools/` if you
want reruns after this session.
