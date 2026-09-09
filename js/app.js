/* ChicoSol elections dashboard — app logic.
   Reads window.DASHBOARD_CONFIG (js/data.js) and
   window.DISTRICT_GEOMETRY (js/districts.js). No libraries. */

(function () {
  "use strict";

  var CFG = window.DASHBOARD_CONFIG;
  var GEO = window.DISTRICT_GEOMETRY;
  var BAR_COLORS = ["#a0312a", "#f8b135", "#4e6e58", "#58657d"];

  var mapWrap = document.getElementById("map");
  var svgNS = "http://www.w3.org/2000/svg";
  var card = document.getElementById("card");
  var activeLayer = "council";
  var pinnedId = null; // district id when card opened by tap/keyboard

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

  /* ---------- build one SVG layer ---------- */
  function buildLayer(layerId) {
    var b = layerBounds(layerId);
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", b.x + " " + b.y + " " + b.w + " " + b.h);
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", CFG.layers[layerId].label + " districts map");

    var ds = GEO[layerId];
    var labelSize = Math.min(b.w, b.h) * 0.055;

    Object.keys(ds).forEach(function (id) {
      var race = CFG.races[layerId][id] || { title: id, contested: false, candidates: [] };
      var path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", ringsToPath(ds[id].rings));
      path.setAttribute("class", "district " + (race.contested ? "contested" : "no-race"));
      path.setAttribute("vector-effect", "non-scaling-stroke");
      path.setAttribute("data-id", id);
      path.setAttribute("tabindex", "0");
      path.setAttribute("role", "button");
      path.setAttribute("aria-label", race.title + (race.contested ? ", contested race, press Enter for details" : ", no race on this ballot"));
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

  /* ---------- race card ---------- */
  function fmt(n) { return Number(n || 0).toLocaleString("en-US"); }

  function cardHTML(layerId, id) {
    var race = CFG.races[layerId][id];
    var live = !!CFG.live_election;
    var h = "<button class='card-close' aria-label='Close'>&times;</button>";
    h += "<h2>" + race.title + "</h2>";
    h += "<p class='race-kind'>" + CFG.layers[layerId].label + "</p>";

    if (!race.contested) {
      h += "<p class='card-note'>No race on this ballot in 2026.</p>";
      return h;
    }
    if (!race.candidates.length) {
      h += "<p class='card-note'>Candidates to be announced.</p>";
      h += footHTML(race, live);
      return h;
    }

    var total = 0;
    if (live) race.candidates.forEach(function (c) { total += Number(c.votes || 0); });

    race.candidates.forEach(function (c, i) {
      var color = BAR_COLORS[i % BAR_COLORS.length];
      h += "<div class='cand-row'>";
      h += "<img class='cand-photo' src='" + c.image + "' alt=''>";
      h += "<div class='cand-who'><div class='cand-name'>" + c.name +
           (live ? "<span class='cand-dot' style='background:" + color + "'></span>" : "") +
           "</div><div class='cand-role'>" + (c.role || "") + "</div></div>";
      if (live) h += "<div class='cand-votes'>" + fmt(c.votes) + "</div>";
      h += "</div>";

      // one 100% bar between candidate rows
      if (live && i < race.candidates.length - 1) {
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
    });

    h += footHTML(race, live);
    return h;
  }

  function footHTML(race, live) {
    var h = "<div class='card-foot'><a href='" + (race.read_more || "#") + "' target='_top'>Read more</a>";
    if (live && CFG.last_updated) h += "<span>Updated " + CFG.last_updated + "</span>";
    h += "</div>";
    return h;
  }

  function openCard(layerId, id, evt) {
    card.innerHTML = cardHTML(layerId, id);
    card.classList.add("show");
    var closeBtn = card.querySelector(".card-close");
    if (closeBtn) closeBtn.addEventListener("click", closeCard);
    positionCard(evt);
    postHeight();
  }

  function positionCard(evt) {
    if (window.matchMedia("(max-width: 640px)").matches) return; // CSS bottom sheet
    var wrapRect = mapWrap.getBoundingClientRect();
    var x = 16, y = 16;
    if (evt && typeof evt.clientX === "number") {
      x = evt.clientX - wrapRect.left + 14;
      y = evt.clientY - wrapRect.top + 14;
    }
    var cw = card.offsetWidth || 320;
    var ch = card.offsetHeight || 200;
    if (x + cw > wrapRect.width - 8) x = Math.max(8, evt ? evt.clientX - wrapRect.left - cw - 14 : 8);
    if (y + ch > wrapRect.height - 8) y = Math.max(8, wrapRect.height - ch - 8);
    card.style.left = x + "px";
    card.style.top = y + "px";
  }

  function closeCard() {
    card.classList.remove("show");
    if (pinnedId) {
      var el = mapWrap.querySelector(".district.is-active");
      if (el) el.classList.remove("is-active");
      pinnedId = null;
    }
    postHeight();
  }

  /* ---------- events ---------- */
  var hoverCapable = window.matchMedia("(hover: hover)").matches;

  function wireEvents() {
    mapWrap.addEventListener("pointermove", function (e) {
      if (!hoverCapable || pinnedId) return;
      var t = e.target.closest ? e.target.closest(".district") : null;
      if (t) {
        openCard(activeLayer, t.getAttribute("data-id"), e);
      } else if (!pinnedId) {
        closeCard();
      }
    });

    mapWrap.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest(".district") : null;
      if (!t) { closeCard(); return; }
      var id = t.getAttribute("data-id");
      var prev = mapWrap.querySelector(".district.is-active");
      if (prev) prev.classList.remove("is-active");
      t.classList.add("is-active");
      pinnedId = id;
      openCard(activeLayer, id, e);
    });

    mapWrap.addEventListener("keydown", function (e) {
      var t = e.target.closest ? e.target.closest(".district") : null;
      if (!t) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        t.click();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeCard();
    });

    document.addEventListener("click", function (e) {
      if (!mapWrap.contains(e.target) && !card.contains(e.target)) closeCard();
    });
  }

  /* ---------- layer toggle ---------- */
  function setLayer(layerId) {
    activeLayer = layerId;
    closeCard();
    var old = mapWrap.querySelector("svg");
    if (old) old.remove();
    mapWrap.insertBefore(buildLayer(layerId), card);
    document.querySelectorAll(".layer-toggle button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-layer") === layerId));
    });
    var src = document.getElementById("source-line");
    if (src) src.textContent = "Map: " + CFG.layers[layerId].source;
    postHeight();
  }

  /* ---------- iframe auto-height ---------- */
  function postHeight() {
    window.requestAnimationFrame(function () {
      var h = document.documentElement.scrollHeight;
      if (window.parent !== window) {
        window.parent.postMessage({ type: "chicosol-embed-height", height: h }, "*");
      }
    });
  }

  /* ---------- init ---------- */
  document.getElementById("dash-title").textContent = CFG.title;
  document.getElementById("dash-subtitle").textContent = CFG.subtitle;

  var lu = document.getElementById("last-updated");
  if (CFG.live_election && CFG.last_updated) {
    lu.textContent = "Results last updated " + CFG.last_updated;
  } else {
    lu.remove();
  }

  document.querySelectorAll(".layer-toggle button").forEach(function (b) {
    b.addEventListener("click", function () { setLayer(b.getAttribute("data-layer")); });
  });

  wireEvents();
  setLayer("council");
  window.addEventListener("resize", postHeight);
  window.addEventListener("load", postHeight);
})();