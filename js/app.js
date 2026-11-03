/* ChicoSol elections dashboard — app logic.
   Reads window.DASHBOARD_CONFIG (js/data.js) and
   window.DISTRICT_GEOMETRY (js/districts.js). No libraries.
   Draws the council map and lists every contested race beneath it. */
(function () {
  "use strict";

  var CFG = window.DASHBOARD_CONFIG;
  var GEO = window.DISTRICT_GEOMETRY;
  var LAYER = "council";
  var BAR_COLORS = ["#a0312a", "#f8b135", "#4e6e58", "#58657d"];

  var mapWrap = document.getElementById("map");
  var listEl = document.getElementById("race-list");
  var svgNS = "http://www.w3.org/2000/svg";

  /* ---------- projection: lon/lat -> local km, y flipped ---------- */
  var KLON = 111.32 * Math.cos((39.75 * Math.PI) / 180);
  var KLAT = 110.96;
  function project(pt) {
    return [pt[0] * KLON, -pt[1] * KLAT];
  }

  function layerBounds(layerId) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    var ds = GEO[layerId];
    Object.keys(ds).forEach(function (id) {
      ds[id].rings.forEach(function (ring) {
        ring.forEach(function (pt) {
          var p = project(pt);
          if (p[0] < minX) minX = p[0];
          if (p[0] > maxX) maxX = p[0];
          if (p[1] < minY) minY = p[1];
          if (p[1] > maxY) maxY = p[1];
        });
      });
    });
    var padX = (maxX - minX) * 0.04, padY = (maxY - minY) * 0.04;
    return { x: minX - padX, y: minY - padY, w: (maxX - minX) + 2 * padX, h: (maxY - minY) + 2 * padY };
  }

  function ringsToPath(rings) {
    return rings.map(function (ring) {
      return "M" + ring.map(function (pt) {
        var p = project(pt);
        return p[0].toFixed(3) + " " + p[1].toFixed(3);
      }).join("L") + "Z";
    }).join("");
  }

  /* ---------- build the SVG map ---------- */
  function buildMap(layerId) {
    var b = layerBounds(layerId);
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", b.x + " " + b.y + " " + b.w + " " + b.h);
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", CFG.layers[layerId].label + " districts map");

    var ds = GEO[layerId];
    var labelSize = Math.min(b.w, b.h) * 0.04;

    // draw contested districts last so their red outline is never
    // overpainted by a neighboring muted district's border
    var drawOrder = Object.keys(ds).sort(function (a, b2) {
      var ca = (CFG.races[layerId][a] || {}).contested ? 1 : 0;
      var cb = (CFG.races[layerId][b2] || {}).contested ? 1 : 0;
      return ca - cb;
    });

    drawOrder.forEach(function (id) {
      var race = CFG.races[layerId][id] || { title: id, contested: false, candidates: [] };
      var path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", ringsToPath(ds[id].rings));
      path.setAttribute("class", "district " + (race.contested ? "contested" : "no-race"));
      path.setAttribute("vector-effect", "non-scaling-stroke");
      path.setAttribute("data-id", id);
      if (race.contested) {
        path.setAttribute("tabindex", "0");
        path.setAttribute("role", "link");
        path.setAttribute("aria-label", race.title + ", contested race, press Enter to jump to results");
      } else {
        path.setAttribute("aria-label", race.title + ", no race on this ballot");
      }
      svg.appendChild(path);
    });

    // reference roads: non-interactive orientation layer
    if (window.MAP_ROADS) {
      var roadFont = Math.min(b.w, b.h) * 0.026;
      var roadsG = document.createElementNS(svgNS, "g");
      roadsG.setAttribute("class", "roads");
      window.MAP_ROADS.forEach(function (rd) {
        if (rd.layers.indexOf(layerId) === -1) return;
        var rp = document.createElementNS(svgNS, "path");
        rp.setAttribute("d", rd.paths.map(function (seg) {
          return "M" + seg.map(function (pt) {
            var q = project(pt);
            return q[0].toFixed(3) + " " + q[1].toFixed(3);
          }).join("L");
        }).join(""));
        rp.setAttribute("class", "road road-" + rd.kind);
        rp.setAttribute("vector-effect", "non-scaling-stroke");
        roadsG.appendChild(rp);
      });
      svg.appendChild(roadsG);

      var roadLabels = document.createElementNS(svgNS, "g");
      roadLabels.setAttribute("class", "road-labels");
      window.MAP_ROADS.forEach(function (rd) {
        if (rd.layers.indexOf(layerId) === -1) return;
        rd.labels.forEach(function (lb) {
          var a = project([lb.x, lb.y]);
          var t = document.createElementNS(svgNS, "text");
          t.setAttribute("x", a[0]);
          t.setAttribute("y", a[1]);
          t.setAttribute("text-anchor", "middle");
          t.setAttribute("dominant-baseline", "central");
          t.setAttribute("font-size", roadFont * (rd.kind === "hwy" ? 1.25 : 1));
          t.setAttribute("stroke-width", roadFont * 0.3);
          t.setAttribute("transform", "rotate(" + lb.angle + " " + a[0] + " " + a[1] + ")");
          t.setAttribute("class", "road-label road-label-" + rd.kind);
          t.textContent = lb.text;
          roadLabels.appendChild(t);
        });
      });
      svg.appendChild(roadLabels);
    }

    // labels last so they sit above fills
    Object.keys(ds).forEach(function (id) {
      var race = CFG.races[layerId][id] || { contested: false };
      var a = project(ds[id].anchor);
      var t = document.createElementNS(svgNS, "text");
      t.setAttribute("x", a[0]);
      t.setAttribute("y", a[1]);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("dominant-baseline", "central");
      t.setAttribute("font-size", labelSize);
      t.setAttribute("class", "district-label" + (race.contested ? " on-contested" : ""));
      t.textContent = ds[id].label;
      svg.appendChild(t);
    });

    return svg;
  }

  /* ---------- results list ---------- */
  function fmt(n) { return Number(n || 0).toLocaleString("en-US"); }

  function raceHTML(layerId, id) {
    var race = CFG.races[layerId][id];
    var live = !!CFG.live_election;
    var h = "<h2>" + race.title + "</h2>";
    h += "<p class='race-kind'>" + CFG.layers[layerId].label + "</p>";

    if (!race.candidates.length) {
      h += "<p class='race-note'>Candidates to be announced.</p>";
      return h;
    }

    var total = 0;
    if (live) race.candidates.forEach(function (c) { total += Number(c.votes || 0); });

    race.candidates.forEach(function (c, i) {
      var color = BAR_COLORS[i % BAR_COLORS.length];
      h += "<div class='cand-row'>";
      h += "<div class='cand-who'><div class='cand-name'>" + c.name +
        (live ? "<span class='cand-dot' style='background:" + color + "'></span>" : "") +
        "</div><div class='cand-role'>" + (c.role || "") + "</div></div>";
      if (live) h += "<div class='cand-votes'>" + fmt(c.votes) + "</div>";
      h += "</div>";
    });

    // one 100% bar beneath the candidates
    if (live) {
      h += "<div class='vote-bar'>";
      race.candidates.forEach(function (cc, j) {
        var share = total > 0 ? (Number(cc.votes || 0) / total) * 100 : 100 / race.candidates.length;
        h += "<span style='width:" + share.toFixed(2) + "%;background:" + BAR_COLORS[j % BAR_COLORS.length] + "'></span>";
      });
      h += "</div>";
      if (total > 0 && race.candidates.length === 2) {
        var p0 = (Number(race.candidates[0].votes || 0) / total) * 100;
        h += "<div class='vote-pcts'><span>" + p0.toFixed(1) + "%</span><span>" + (100 - p0).toFixed(1) + "%</span></div>";
      }
    }

    return h;
  }

  function buildList(layerId) {
    var races = CFG.races[layerId];
    var ids = Object.keys(races).filter(function (id) { return races[id].contested; });
    var h = "";
    if (CFG.live_election && CFG.last_updated) {
      h += "<p class='results-updated'>Results last updated " + CFG.last_updated + "</p>";
    }
    ids.forEach(function (id) {
      h += "<section class='race' id='race-" + id + "' data-id='" + id + "'>" + raceHTML(layerId, id) + "</section>";
    });
    listEl.innerHTML = h;
  }

  /* ---------- map <-> list linking ---------- */
  function clearActive() {
    var a = mapWrap.querySelector(".district.is-active");
    if (a) a.classList.remove("is-active");
    var r = listEl.querySelector(".race.is-active");
    if (r) r.classList.remove("is-active");
  }

  function activate(id) {
    clearActive();
    var path = mapWrap.querySelector(".district[data-id='" + id + "']");
    var sec = document.getElementById("race-" + id);
    if (path) path.classList.add("is-active");
    if (sec) {
      sec.classList.add("is-active");
      sec.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function wireEvents() {
    mapWrap.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest(".district.contested") : null;
      if (!t) { clearActive(); return; }
      activate(t.getAttribute("data-id"));
    });

    mapWrap.addEventListener("keydown", function (e) {
      var t = e.target.closest ? e.target.closest(".district.contested") : null;
      if (!t) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate(t.getAttribute("data-id"));
      }
    });

    // hovering a race in the list lights up its district on the map
    listEl.addEventListener("pointerover", function (e) {
      var sec = e.target.closest ? e.target.closest(".race") : null;
      if (!sec) return;
      var path = mapWrap.querySelector(".district[data-id='" + sec.getAttribute("data-id") + "']");
      if (path) path.classList.add("is-hover");
    });
    listEl.addEventListener("pointerout", function (e) {
      var sec = e.target.closest ? e.target.closest(".race") : null;
      if (!sec) return;
      var path = mapWrap.querySelector(".district[data-id='" + sec.getAttribute("data-id") + "']");
      if (path) path.classList.remove("is-hover");
    });
  }

  /* ---------- iframe auto-height ---------- */
  function postHeight() {
    window.requestAnimationFrame(function () {
      var dash = document.querySelector(".dash");
      var h = Math.ceil(dash ? dash.getBoundingClientRect().height : document.body.offsetHeight);
      if (window.parent !== window) {
        window.parent.postMessage({ type: "chicosol-embed-height", height: h }, "*");
      }
    });
  }

  /* ---------- init ---------- */
  mapWrap.appendChild(buildMap(LAYER));
  buildList(LAYER);
  wireEvents();
  postHeight();
  window.addEventListener("resize", postHeight);
  window.addEventListener("load", postHeight);
})();
