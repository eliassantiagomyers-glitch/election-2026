# ChicoSol 2026 Local Elections Dashboard

An interactive map of Chico's November 2026 local races — City Council districts and Chico Unified trustee areas — built as a single static page with no libraries and no build step. Readers hover (desktop) or tap (mobile) a highlighted district to see the candidates; on election night, the same cards show raw vote counts and a proportional results bar.

## What's in this repo

```
index.html          The page. You should not need to touch it.
css/style.css       All styling (brand colors and fonts are CSS variables at the top).
js/data.js          <-- THE FILE YOU EDIT. All race info, candidates, votes, links.
js/districts.js     District boundary geometry. Edit only to replace map shapes.
js/app.js           Map rendering and interaction logic.
images/             Candidate headshots. candidate.png is the placeholder.
```

Everything an editor does day to day happens in `js/data.js` and the `images/` folder.

## Updating the cards (before the election)

Open `js/data.js`. Each race looks like this:

```js
d4: { title: "District 4", contested: true, read_more: "#",
  candidates: [
    { name: "Addison Winslow", role: "Incumbent",  image: "images/candidate.png", votes: 0 },
    { name: "Tracy Vincent",   role: "Challenger", image: "images/candidate.png", votes: 0 }
  ]},
```

To add a race (for example when a school board race is set): find the trustee area (`t1` through `t5`), change `contested: false` to `contested: true`, and add candidate objects — copy one of the council examples. To swap in a real headshot, drop the file into `images/` and change `"images/candidate.png"` to the real filename (square images look best; they're cropped to a circle). To point "Read more" at your coverage, replace `"#"` with the article URL. Links open in the top window, so they work from inside the iframe.

Districts with `contested: false` are drawn muted; tapping one just says there's no race, so nothing is ever broken — the whole map is wired for all 7 council districts and all 5 trustee areas, and the flags decide what's active.

## Election night

Three steps, repeated as often as the county posts new numbers:

1. In `js/data.js`, set `live_election: true` (once, when polls close).
2. Enter the raw counts into each candidate's `votes`, and set `last_updated` to the time you want readers to see (it's a plain string — write it exactly as it should appear).
3. Commit and push. GitHub Pages redeploys automatically, usually in under a minute.

While `live_election` is `false`, cards show only names and roles — no zeros, no bar. When it's `true`, each card shows raw counts beside each name and a single 100%-width bar between the candidates, split by each candidate's share of the votes entered on that card. The "Results last updated" line appears under the map.

## Publishing with GitHub Pages

1. Create a repo (for example `chicosol/elections-2026`) and push these files to the root of the `main` branch.
2. In the repo: Settings → Pages → Source: "Deploy from a branch" → Branch: `main`, folder `/ (root)` → Save.
3. Your dashboard will be live at `https://<username>.github.io/<repo>/` within a couple of minutes.

## Embedding in the ChicoSol site

Paste this into a WordPress Custom HTML block:

```html
<iframe id="chicosol-elections"
  src="https://YOUR-USERNAME.github.io/YOUR-REPO/"
  style="width:100%;border:0;" height="700"
  title="Chico 2026 local elections dashboard"></iframe>
<script>
window.addEventListener("message", function (e) {
  if (e.data && e.data.type === "chicosol-embed-height") {
    document.getElementById("chicosol-elections").style.height = e.data.height + "px";
  }
});
</script>
```

The dashboard posts its own height to the parent page whenever the layer changes or a card opens, so the iframe grows and shrinks to fit and never clips the mobile bottom-sheet card. If your WordPress setup strips `<script>` tags from HTML blocks, keep the iframe and set a fixed `height="760"` — the layout still works, with a little whitespace.

## Updating the map geometry

Both layers now carry official boundaries. The five trustee areas come from the KML behind CUSD's trustee-area map (Resolution 1570-22). The seven council districts were exported in September 2026 from the city's own Chico_Voting_Districts feature service — the same layer that powers the city's "Who Is My City Council Representative" viewer — so edges are parcel-accurate, including District 5's detached Chico River Road parcel and the unincorporated county island cut out of District 6.

If the city ever redistricts (next likely after the 2030 Census), refresh the layer by pasting this into a browser:

```
https://utility.arcgis.com/usrsvcs/servers/5f17166e4dfe46bdb0e238b8f7816acf/rest/services/CityofChico_SDEonly/Chico_Voting_Districts/FeatureServer/6/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson
```

Save the result and convert it into `js/districts.js`: each district is `{ rings, label, anchor }`, where `rings` is a list of polygons and each polygon is a list of `[longitude, latitude]` points — the same structure as each GeoJSON feature's `geometry.coordinates` (flatten MultiPolygon nesting by one level). Match features to `d1`–`d7` with the `DISTRICT` attribute, keep `label`, and nudge any `anchor` whose numeral lands outside its new shape. If the proxy URL ever stops working, the city GIS office (via the Community Development department) can supply the same layer as GeoJSON or shapefile on request.

## Notes for the newsroom

The results bar supports more than two candidates (each gets a color, up to four); percentages under the bar appear only in two-way races to keep the card clean. The map is keyboard-accessible: Tab moves between districts, Enter opens a card, Escape closes it. Colors, fonts, and spacing all live at the top of `css/style.css` as variables if the site's look ever changes.
