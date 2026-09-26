# Chronometric Archive

A navigable timeline of the entire Star Trek canon, built as the console a future Temporal Integrity Commission would use.

**Live:** https://qav2.github.io/trek-timeline/

- **The continuum:** every episode and film of every series, placed at its in-universe date on one zoomable field, from deep time to the 43rd century. Drag to pan; scroll or pinch to zoom. The era ribbon shows the whole of time.
- **History:** canonical milestones between the episodes, with contradictions in the canon flagged as chronometric anomalies.
- **Incursions:** every time-travel event, drawn as an arc from departure to arrival and colored by outcome (restored, predestination, divergence, persistent, loop).
- **Divergences:** alternate timelines, the Mirror Universe and the Kelvin reality, with branch points, fates and Mirror crossings.
- **Personnel and worldlines:** everyone in the credited cast records. A person's worldline follows the order they lived through the records, jumps through time included.
- **Threads:** relationship arcs traced across series, starting with Uhura and Scott.
- **Stardate resolver**, search (press `/`), deep links for everything, and keyboard stepping (`←` `→`).

## Data

Episode and film records, in-universe dates, stardates and cast lists come from [Memory Alpha](https://memory-alpha.fandom.com) through its API (CC BY-NC). History events, incursions, divergences, threads and dossiers were compiled for this archive from on-screen canon, and every entry cites its source episodes. Loglines are written for the archive.

Rebuild the data:

```sh
python3 tools/fetch_records.py      # fetch episode and film pages into cache/ (idempotent)
python3 tools/parse_records.py      # dates, stardates, cast -> build/records.raw.json
python3 tools/render_briefs.py      # research/<thread>.md -> docs/briefs/
python3 tools/build.py              # merge with data/curated/ -> docs/data/archive.json
```

The site is static: `docs/` is served as-is by GitHub Pages. To run it locally, serve that folder, for example with `python3 -m http.server -d docs`.

## Licence and disclaimer

Code: MIT. Data in `docs/data` and `data/curated`: CC BY-NC 4.0, since it's derived in part from Memory Alpha.

This is an unofficial fan reference. Star Trek and related marks belong to CBS Studios and Paramount; this project isn't affiliated with or endorsed by them. The Temporal Integrity Commission is a fictional agency.
