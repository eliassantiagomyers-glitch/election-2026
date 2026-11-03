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
    return rings.map(function
