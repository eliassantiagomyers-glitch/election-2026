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

  var REFERENCE_LAYER = "council"; // every layer's viewer matches this layer's shape

  /* ---------- projection: lon/lat -> local km, y flipped ---------- */
  var KLON = 111.32 * Math.cos((39.75 * Math.PI) / 180);
  var KLAT = 110.96;
  function project(pt) {
    return [pt[0] * KLON, -pt[1] * KLAT];
  }

  function rawBounds(layerId) {
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
    return {
      w: maxX - minX,
      h: maxY - minY,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2
    };
  }

  function layerBounds(layerId) {
    var raw = rawBounds(layerId);
    var ref = layerId === REFERENCE_LAYER ? raw : rawBounds(REFERENCE_LAYER);
    var aspect = ref.w / ref.h;

    // grow whichever side is short so this layer's box has the reference shape;
    // the geometry stays centered and simply draws smaller inside it
    var w = raw.w, h = raw.h;
    if (w / h < aspect) w = h * aspect;
    else h = w / aspect;

    var padX = w * 0.04, padY = h * 0.04;
    return {
      x: raw.cx - w / 2 - padX,
      y: raw.cy - h / 2 - padY,
      w: w + 2 * padX,
      h: h + 2 * padY
    };
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
