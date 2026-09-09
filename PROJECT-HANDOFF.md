# HANDOFF — ChicoSol 2026 Elections Dashboard

**Read this first.** This document briefs a fresh Claude session on a completed project so work can continue with zero context loss. It was written at the end of an incognito conversation on Sept. 8, 2026.

**Critical:** this doc describes the code but does not contain it. The user must upload `chicosol-elections-dashboard.zip` alongside this doc. If they only uploaded this doc, ask for the zip before doing any code work. If asked to regenerate anything from scratch, everything needed to do so is described below.

---

## 1. Who the user is and what this is

The user is a reporter at **ChicoSol** (chicosol.org), a nonprofit newsroom in Chico, California. They commissioned an interactive elections dashboard for the **November 3, 2026 midterms**, tracking **only local races**: Chico City Council and Chico Unified School District (CUSD) Board of Education. Their reference point was the New York Times' election-night live map. The dashboard will be embedded in their WordPress site via an iframe pointing at GitHub Pages.

The deliverable is a complete static site — no frameworks, no build step — that the newsroom can maintain by editing one config file and pushing to GitHub.

## 2. Election facts (verified during the project)

City of Chico elects council by district; **Districts 2, 4, and 6 are up on Nov. 3, 2026** (confirmed against the city clerk's election page AND the city GIS layer's incumbent attributes). The races as the user provided them:

- **District 2** — Incumbent: Kasey Reynolds; Challenger: Shelby Hebert
- **District 4** — Incumbent: Addison Winslow; Challenger: Tracy Vincent
- **District 6** — Incumbent: Tom van Overbeek; Challenger: Megan Thomas Petty

Districts 1, 3, 5, 7 are NOT on this ballot (their incumbents per city GIS, Sept 2026: Mike O'Brien d1, Dale Bennett d3, Katie Hawley d5, Bryce Goldstein d7 — useful for context pieces, not on the dashboard).

**School board:** CUSD uses five "trustee areas" (district-based elections established March 9, 2022, Resolution 1570-22, with a staggered election sequence). As of this handoff **the user does not yet know which trustee areas are up in 2026 or who is running**. All five trustee areas are built into the dashboard as blank, hidden cards awaiting the user to flip them on. Do not invent school board candidates.

## 3. Repo contents (inside the zip, under `site/`)

- `index.html` — page shell; loads Google Fonts (Oswald 500/600, Source Serif 4), the three JS files, and the stylesheet.
- `css/style.css` — all styling; design tokens are CSS variables at the top.
- `js/data.js` — **the only file the newsroom edits.** All race data, flags, links.
- `js/districts.js` — geometry module (`window.DISTRICT_GEOMETRY`). ~130KB. Official boundaries (see §5).
- `js/app.js` — all logic: projection, SVG construction, layer toggle, hover/tap cards, vote bar, iframe auto-height.
- `images/candidate.png` — neutral placeholder headshot (240×240, generated). User will replace with real photos.
- `README.md` — newsroom-facing docs: editing cards, election night, GitHub Pages setup, iframe embed snippet, geometry refresh instructions.
- `PROJECT-HANDOFF.md` — a copy of this document.

## 4. Design system (user-approved)

Brand colors given by the user: **primary `#a0312a`** (brick red), **secondary `#f8b135`** (marigold). Fonts per their site: **Oswald** for headings/numerals/names/vote figures, **Source Serif 4** for body. Supporting tokens chosen for this project: ink `#26211d`, paper `#ffffff`, map field wash `#f3eee4`, muted district fill `#e7e0d2` with stroke `#c3b8a4`, card border `#ddd4c4`. Vote-bar candidate colors in order: `#a0312a`, `#f8b135`, `#4e6e58`, `#58657d` (supports up to 4 candidates per race).

Layout: compact header (title + subtitle left, segmented City Council / School Board toggle right, secondary-yellow active state), legend line (contested = filled red key, no race = muted key), full-width SVG map on the field wash with big Oswald district numerals, quiet footer (last-updated left, map source right). The map is the one bold element; everything else stays restrained. Motion only responds to user action (hover lift = deeper fill + thicker stroke, 120ms card fade); `prefers-reduced-motion` respected. Contested districts fill primary at 30% opacity (55% on hover/active); uncontested are muted and show a minimal "No race on this ballot in 2026" card.

## 5. Geometry — provenance and structure (the hard-won part)

`js/districts.js` exposes `window.DISTRICT_GEOMETRY = { council: {d1..d7}, school: {t1..t5} }`. Each district is `{ rings, label, anchor }` where `rings` is a list of polygons, each polygon a closed list of `[longitude, latitude]` pairs (WGS84, rounded to 5 decimals ≈ 1m); `label` is the numeral string; `anchor` is a hand-tuned `[lon, lat]` where the numeral renders (verified inside each polygon by point-in-ring test).

**School layer (exact, official):** parsed from the KML export of CUSD's official trustee-area Google map (Res. 1570-22), which the user supplied. Areas 1 and 5 are huge (CUSD extends far beyond city limits, lon −122.07..−121.62, lat 39.66..40.04); that is correct, not a bug.

**Council layer (exact, official):** exported Sept 2026 from the City of Chico's own feature service. Discovery chain, for the record: the city's "Who Is My City Council Representative" viewer (`chico.maps.arcgis.com/apps/webappviewer/index.html?id=65c4f6c832e644da866c81c299a12a38`) → its app config revealed web map item `2c16df83b8c2446fb5f4ae6e4e8f199c` → the web map JSON revealed the districts layer:

```
https://utility.arcgis.com/usrsvcs/servers/5f17166e4dfe46bdb0e238b8f7816acf/rest/services/CityofChico_SDEonly/Chico_Voting_Districts/FeatureServer/6
```

The working download URL (also in the README) appends:
`/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson`

Claude could not fetch that proxied URL directly (utility.arcgis.com/usrsvcs is scoped); **the user downloaded it in their browser** (as a Safari .webarchive, which was unpacked with Python `plistlib`). Layer attributes include `DISTRICT` (1–7, used for matching), `NAME`, `COUNCILMEM`, `TermDate`, `Email`. `outSR=4326` is essential — without it the service returns Web Mercator meters.

Geometry facts a future session must preserve: **District 5 is a MultiPolygon** (main downtown/CSUC body + a detached parcel off Chico River Road to the southwest). **District 6 contains a hole** — an unincorporated county island near Humboldt Rd (~−121.78, 39.765); its ring has opposite winding (CW inside CCW), which SVG's default nonzero fill rule renders correctly as a cutout. Do not "fix" ring windings or drop small rings. Total council points: 3,938 across 9 rings. Current anchors: d1 (−121.8672, 39.7500), d2 (−121.8520, 39.7900), d3 (−121.8220, 39.7620), d4 (−121.8390, 39.7420), d5 (−121.8475, 39.7255), d6 (−121.7590, 39.7780), d7 (−121.8270, 39.7170); school t1 (−121.98, 39.79), t2 (−121.872, 39.764), t3 (−121.841, 39.756), t4 (−121.815, 39.715), t5 (−121.725, 39.86).

Historical note: an earlier build used hand-traced stylized council polygons from the city's 2022 district PDFs; those were fully replaced by the official export. The 2022 PDFs also disagree slightly with the current service around the D6/D7 boundary near E 20th St — trust the service, it reflects the Aug 2024 map updates.

## 6. How the app works (`js/app.js`)

Plain IIFE, no libraries, reads the two globals. **Projection:** equirectangular scaled to km — `x = lon × 111.32 × cos(39.75°)`, `y = −lat × 110.96` (y negated for SVG). The viewBox is computed per layer from projected extents with 4% padding, so the two layers (very different extents) each fill the frame; layers never overlay (a user requirement — one race type visible at a time).

Layer toggle rebuilds the SVG (`setLayer`). Each district is a `<path>` (multi-subpath for multi-ring) with class `district contested` or `district no-race`, `data-id`, `tabindex=0`, `role=button`, aria-labels. Numeral `<text>` elements render after paths; font-size = 5.5% of min(viewBox w,h).

**Card behavior:** desktop (`hover: hover` media query) shows the card on pointermove near the cursor, clamped inside the map bounds; click pins it (`pinnedId`, `.is-active` class). Mobile: CSS turns `.race-card` into a fixed bottom sheet ≤640px, with a visible close button; tap opens, tap-out/Escape closes. Keyboard: Tab between districts, Enter/Space opens, Escape closes.

**Card content rules (user-specified):** header = race title + layer label. If `contested:false` → "No race on this ballot in 2026." If contested with empty `candidates` → "Candidates to be announced." Otherwise one row per candidate: 42px circular photo, name (Oswald) with a small color dot when live, role line, and — only when `live_election:true` — the raw vote count right-aligned. **Between candidate rows renders ONE 100%-width stacked bar** whose segments are each candidate's share of the total votes entered on that card (equal split if total is 0, so no divide-by-zero); small percentage labels under the bar ends appear only in two-way races. The user explicitly wanted raw numbers displayed with the bar showing proportion, and explicitly did NOT want "0%" showing pre-election — hence the `live_election` gate hides all vote UI when false. Footer: "Read more" link (`target="_top"` to escape the iframe) + "Updated {last_updated}" when live.

**Iframe auto-height:** on load, resize, layer change, and card open/close the app posts `{type:'chicosol-embed-height', height}` to the parent. The README's embed snippet listens and resizes the iframe. If WordPress strips scripts, fallback is a fixed height.

## 7. `js/data.js` schema (the editable file)

```
live_election  : boolean — false pre-election (names only), true on election night
last_updated   : string, displayed verbatim when live
title, subtitle: header strings
layers         : { council:{label,source}, school:{label,source} }
races.council  : d1..d7 → { title, contested, read_more, candidates[] }
races.school   : t1..t5 → same shape, all currently contested:false, candidates:[]
candidate      : { name, role, image, votes }
```

Every geometry key must have a matching race entry and vice versa (a validation script during the build enforced this). Current state: council d2/d4/d6 contested with the candidates from §2, `votes:0`, `image:"images/candidate.png"`, `read_more:"#"`. Election-night workflow (documented in README): set `live_election:true` once, type raw counts into `votes`, update `last_updated`, commit, push; GitHub Pages redeploys in ~1 minute.

## 8. Hosting and embed plan

GitHub Pages, deploy-from-branch, `main` / root, contents of `site/` at repo root. Embed on chicosol.org via WordPress Custom HTML block with the iframe + postMessage listener (full snippet in README). User confirmed no known WordPress restrictions and will handle site-side quirks themselves ("I'll fix those in post").

## 9. Open items / what a future session might be asked to do

1. **School board races**: when the user learns which trustee areas are up, flip `contested:true` on those `t*` entries and add candidates. Trustee elections follow the sequencing in Res. 1570-22 — if asked, search for which areas vote in 2026 rather than guessing.
2. **Headshots**: replace `images/candidate.png` per candidate; square images, cropped to circle by CSS.
3. **Read more links**: replace `"#"` per race when coverage exists.
4. **Untested in a real browser**: the build was validated with `node --check`, geometry/config parity checks, coordinate-range checks, and matplotlib renders that faithfully reproduce the projection and styling — but no real browser render happened in-session. If the user reports visual bugs, that's expected territory: likely suspects are card positioning edge cases, font loading, or mobile sheet behavior.
5. **Possible enhancements discussed or implied, not built**: animated viewBox transition between layers (currently instant swap with fade), winner checkmark styling once results are final, per-candidate "Read more" links (currently one per race), precinct-level anything (out of scope).
6. **Geometry refresh** (post-2030 redistricting): use the query URL in §5/README; match on `DISTRICT`; keep anchors, re-verify with point-in-polygon; watch for the D5 MultiPolygon and D6 hole patterns.

## 10. Conversation decisions log (so nothing gets relitigated)

- Stylized-but-accurate look approved; no street basemap; standalone map on wash background.
- Hover on desktop / tap + bottom sheet on mobile approved.
- Vote display: raw numbers + single proportional 100% bar between candidates + manual last-updated string — approved in exactly this form.
- All 12 districts built with cards; visibility governed solely by `contested` booleans — this was an explicit requirement ("hidden behind a true false statement").
- GitHub Pages + iframe approved; auto-resize snippet provided.
- Oswald + Source Serif 4 confirmed as the site's fonts.
- Official geometry replaced the initial stylized tracing after a joint effort: Claude found the app config path, the user fetched two JSON configs and the final GeoJSON through their browser (Claude's fetch access couldn't reach the city's proxy). The user's uploads that made this possible: council district PDFs (2022), citywide districts PDF (2024), CUSD trustee KML, the viewer app config JSON, the web map JSON, and `chico-council_geojson.webarchive`.

## 11. If asked to rebuild from nothing

All source data is recoverable: trustee KML from CUSD's public trustee-area map (Google My Maps export), council GeoJSON from the §5 query URL (user's browser). The design tokens, schema, behaviors, and geometry structure above are sufficient to regenerate every file. Ask the user for the zip first; rebuild only if it's truly lost.
