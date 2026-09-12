/* FIM Results Viewer, Barbados, Hurricane Tomas 2010: one forecast cycle, eleven parish
   products and an island mosaic. Leaflet plus plain JavaScript. Layers load on demand from
   <event>/layers/<cycle>/<Parish>_P_<threshold>_raw.png */

"use strict";

var D = window.FIM_DATA;
var EV = window.EVENT_DIR || "";
var THRESHOLDS = D.thresholds;
var REG = D.regions.slice();               // eleven parishes
var ISL = D.island;
var LB = [[D.bounds.south, D.bounds.west], [D.bounds.north, D.bounds.east]];
var LIKELIHOOD = [["#8dc63f", "Very low, under 20 percent"], ["#fff200", "Low, 20 to 40 percent"],
                  ["#f7941d", "Medium, 40 to 60 percent"], ["#ed1c24", "High, over 60 percent"]];

var key = "Island", thr = "30cm";
var map, overlay, parishLayer, selLayer = null;
var tip = document.getElementById("tip");

function region() {
  if (key === "Island") return ISL;
  return REG.filter(function (r) { return r.key === key; })[0];
}
function regBounds(r) { return r.key === "Island" ? ISL.bounds : r.bounds; }

/* ---------- state in the address ---------- */

function readHash() {
  var h = new URLSearchParams(location.hash.slice(1));
  var p = h.get("p");
  if (p && (p === "Island" || REG.some(function (r) { return r.key === p; }))) key = p;
  if (THRESHOLDS.indexOf(h.get("t")) >= 0) thr = h.get("t");
}
function writeHash() {
  var h = new URLSearchParams();
  h.set("p", key); h.set("t", thr);
  history.replaceState(null, "", "#" + h.toString());
}

/* ---------- basemap ----------
   CARTO raster basemaps require an API key since August 2026. This key was issued to the
   University of Iowa for the domains ahwalab.github.io and localhost. It is a browser side
   key: it is visible in this file by design, and CARTO restricts it to those domains.
   To rotate it, replace the value here and in the other two viewer repositories.
   CARTO and OpenStreetMap attribution must stay visible on the map, which it does below. */

var CARTO_KEY = "cb1_2hul_1_d1beea1581cc2f8c94ba52d4";
var CARTO_LIGHT = "https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png" +
                  "?key=" + CARTO_KEY;
var ESRI_IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/" +
                   "World_Imagery/MapServer/tile/{z}/{y}/{x}";

/* ---------- map ---------- */

function buildMap() {
  map = L.map("map", { zoomControl: true, attributionControl: true });
  map.attributionControl.setPrefix("");
  var street = L.tileLayer(CARTO_LIGHT, {
    maxZoom: 19, attribution: "OpenStreetMap contributors, CARTO" }).addTo(map);
  var sat = L.tileLayer(ESRI_IMAGERY, { maxZoom: 19, attribution: "Esri World Imagery" });
  L.control.layers({ "Street map": street, "Satellite": sat }, {},
    { position: "topleft", collapsed: true }).addTo(map);

  overlay = L.imageOverlay("", LB, { opacity: 0.82, interactive: false, className: "fim-overlay" });
  overlay.addTo(map);

  parishLayer = L.geoJSON(D.aoc, {
    style: function () { return { color: "#0d3b5e", weight: 1.2, dashArray: "5,4", fill: true,
                                  fillOpacity: 0.0 }; },
    onEachFeature: function (f, l) {
      l.bindTooltip(f.properties.name, { sticky: true });
      l.on("click", function () { key = f.properties.key; draw(true); });
    }
  }).addTo(map);
  map.fitBounds(LB, { padding: [12, 12] });

  var lg = L.control({ position: "bottomright" });
  lg.onAdd = function () {
    var d = L.DomUtil.create("div", "map-legend");
    d.innerHTML = "<b>Likelihood of exceeding the depth</b>" +
      LIKELIHOOD.map(function (x) { return "<div><i style='background:" + x[0] + "'></i>" + x[1] + "</div>"; }).join("") +
      "<div style='margin-top:4px'><i style='border:2px dashed #0d3b5e;background:none;" +
      "border-radius:0'></i>Parish boundaries, click one to select it</div>" +
      "<div style='margin-top:2px'><i style='border:2px solid #1a2733;background:none;" +
      "border-radius:0'></i>Selected parish window</div>";
    return d;
  };
  lg.addTo(map);
}

/* ---------- parish picker ---------- */

function buildPicker() {
  var el = document.getElementById("seg-parish");
  el.innerHTML = "";
  var b0 = document.createElement("button");
  b0.textContent = "Whole island"; b0.dataset.p = "Island";
  el.appendChild(b0);
  REG.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (r) {
    var b = document.createElement("button");
    b.textContent = r.name.replace("Saint ", "St "); b.dataset.p = r.key;
    b.title = r.name + ", max unit streamflow " + r.max_uq + " m3/s/km2";
    el.appendChild(b);
  });
  el.querySelectorAll("button").forEach(function (b) {
    b.onclick = function () { key = b.dataset.p; draw(true); };
  });
}

function layerPath(r) {
  return EV + "layers/" + D.cycle + "/" + r.key + "_P_" + thr + "_raw.png";
}

/* ---------- draw ---------- */

function draw(refit) {
  var r = region();
  document.querySelectorAll("#seg-parish button").forEach(function (o) { o.classList.toggle("on", o.dataset.p === key); });
  document.querySelectorAll("#seg-thr button").forEach(function (o) { o.classList.toggle("on", o.dataset.t === thr); });

  document.getElementById("cyctitle").textContent = (key === "Island" ? "Whole island" : r.name) +
    ", cycle " + D.cycle;
  var badge = document.getElementById("badge");
  if (key === "Island") { badge.textContent = "11 parishes triggered"; badge.className = "badge trig"; }
  else if (r.status === "triggered") { badge.textContent = "triggered"; badge.className = "badge trig"; }
  else { badge.textContent = "quiet"; badge.className = "badge quiet"; }

  var lb = regBounds(r);
  overlay.setBounds(L.latLngBounds(lb));
  overlay.setUrl(layerPath(r));
  if (selLayer) { map.removeLayer(selLayer); selLayer = null; }
  if (key !== "Island") {
    selLayer = L.rectangle(lb, { color: "#1a2733", weight: 1.5, fill: false, dashArray: null, interactive: false }).addTo(map);
  }
  if (refit) map.fitBounds(lb, { padding: [12, 12] });

  var kv = document.getElementById("kv");
  var rows = [];
  if (key === "Island") {
    rows.push(["Parishes with a flood map", "11 of 11, each on its own scenario library"]);
    rows.push(["Highest parish trigger value", Math.max.apply(null, REG.map(function (x) { return x.max_uq; })) + " m3/s/km2"]);
    rows.push(["Trigger", "1.0 m3/s/km2 over each parish"]);
    rows.push(["Ensemble members", D.members]);
    rows.push(["Cells with any likelihood", ISL.wet_cells.toLocaleString() + " at 0.10 m, " + ISL.stats["10cm"].raw.area_km2 + " km2"]);
    rows.push(["Cells over 60 percent", ISL.stats["10cm"].raw.px_ge60.toLocaleString() + " at 0.10 m, " + ISL.stats["10cm"].raw.area_ge60_km2 + " km2"]);
  } else {
    rows.push(["Max unit streamflow, trigger", r.max_uq + " m3/s/km2"]);
    rows.push(["Trigger", r.trigger_threshold + " m3/s/km2"]);
    rows.push(["Members over the trigger", r.trigger_runs.members_over + " of " + r.members.n]);
    rows.push(["Member rain totals", r.members.rain_mm[0] + " to " + r.members.rain_mm[1] + " mm, mean " + r.members.rain_mean_mm]);
    rows.push(["Distinct matched storms", r.members.p_scenarios + " of " + r.n_storms]);
    rows.push(["Window", r.shape[0] + " by " + r.shape[1] + " cells, parish plus buffer"]);
    rows.push(["Cells with any likelihood", r.wet_cells.toLocaleString() + " in the window at 0.10 m"]);
    rows.push(["Inside the parish", r.stats["10cm"].raw.px_own.toLocaleString() + " cells, " + r.stats["10cm"].raw.area_km2_own + " km2 at 0.10 m"]);
  }
  rows.push(["View", "Pluvial, " + thr.replace("cm", " cm")]);
  kv.innerHTML = rows.map(function (x) { return "<dt>" + x[0] + "</dt><dd>" + x[1] + "</dd>"; }).join("");

  var tb = document.getElementById("sttable");
  var h = "<tr><th>Threshold</th><th>Max likelihood</th><th>Pixels over 0</th><th>Pixels over 60 percent</th>" +
          (key === "Island" ? "<th>Area, km2</th>" : "<th>In parish</th>") + "</tr>";
  THRESHOLDS.forEach(function (t) {
    var s = r.stats[t].raw;
    h += "<tr" + (t === thr ? " class='on'" : "") + "><td>" + t.replace("cm", " cm") + "</td><td>" + s.maxp +
         "</td><td>" + s.px.toLocaleString() + "</td><td>" + s.px_ge60.toLocaleString() + "</td><td>" +
         (key === "Island" ? s.area_km2 : s.px_own.toLocaleString()) + "</td></tr>";
  });
  tb.innerHTML = h;

  var n = REG.slice().sort(function (a, b) { return b.max_uq - a.max_uq; });
  var pt = document.getElementById("parishtable");
  var ph = "<tr><th>Parish</th><th>Trigger value</th><th>Rain, mean</th><th>Wet km2</th><th>Over 60%, km2</th></tr>";
  n.forEach(function (x) {
    var s = x.stats[thr].raw;
    ph += "<tr class='" + (x.key === key ? "on" : "") + "' data-p='" + x.key + "'><td>" + x.name + "</td><td>" + x.max_uq +
          "</td><td>" + x.members.rain_mean_mm + " mm</td><td>" + s.area_km2_own + "</td><td>" + s.area_ge60_km2_own + "</td></tr>";
  });
  pt.innerHTML = ph;
  pt.querySelectorAll("tr[data-p]").forEach(function (row) {
    row.style.cursor = "pointer";
    row.onclick = function () { key = row.dataset.p; draw(true); };
  });

  drawStrip();
  writeHash();
}

/* ---------- parish strip ---------- */

var strip = document.getElementById("strip");
var order = null;
function stripGeom() { return { W: strip.clientWidth || 1000, H: 150, L: 44, R: 20, T: 12, B: 44 }; }

function drawStrip() {
  var G = stripGeom(), W = G.W, H = G.H, L = G.L, R = G.R, T = G.T, Bm = G.B;
  strip.setAttribute("viewBox", "0 0 " + W + " " + H);
  strip.style.height = H + "px";
  order = REG.slice().sort(function (a, b) { return b.max_uq - a.max_uq; });
  var n = order.length, bw = (W - L - R) / n;
  var uTop = Math.ceil(Math.max.apply(null, order.map(function (x) { return x.max_uq; })) / 5) * 5;
  var y = function (u) { return T + (1 - u / uTop) * (H - T - Bm); };
  var g = "";
  for (var u = 0; u <= uTop + 0.001; u += 5) {
    g += "<line x1='" + L + "' y1='" + y(u) + "' x2='" + (W - R) + "' y2='" + y(u) + "' stroke='#eceff3'/>";
    g += "<text x='" + (L - 7) + "' y='" + (y(u) + 3.5) + "' text-anchor='end' font-size='10' fill='#8b98a5'>" + u + "</text>";
  }
  g += "<line x1='" + L + "' y1='" + y(1) + "' x2='" + (W - R) + "' y2='" + y(1) + "' stroke='#9aa7b3'/>";
  g += "<text x='" + (W - R - 4) + "' y='" + (y(1) - 4) + "' text-anchor='end' font-size='10' fill='#8b98a5'>trigger 1.0</text>";
  order.forEach(function (x, i) {
    var xi = L + i * bw, on = x.key === key;
    g += "<rect class='mbar' data-i='" + i + "' x='" + (xi + 4).toFixed(1) + "' y='" + y(x.max_uq).toFixed(1) +
         "' width='" + (bw - 8).toFixed(1) + "' height='" + (H - Bm - y(x.max_uq)).toFixed(1) +
         "' fill='" + (on ? "#0d3b5e" : "#2b6ca3") + "' opacity='" + (on ? 1 : 0.55) + "'/>";
    g += "<text x='" + (xi + bw / 2) + "' y='" + (H - Bm + 14) + "' text-anchor='middle' font-size='10' fill='#5b6770'>" +
         x.name.replace("Saint ", "St ") + "</text>";
    g += "<text x='" + (xi + bw / 2) + "' y='" + (y(x.max_uq) - 4) + "' text-anchor='middle' font-size='10' fill='#1a2733'>" + x.max_uq + "</text>";
  });
  g += "<text x='" + L + "' y='" + (H - 6) + "' font-size='10' fill='#8b98a5'>maximum unit streamflow over each parish, m3/s per km2, the value the trigger reads; click a bar to select the parish</text>";
  strip.innerHTML = g;
}
strip.addEventListener("click", function (e) {
  var r = strip.getBoundingClientRect(), G = stripGeom();
  var fx = (e.clientX - r.left) / r.width * G.W;
  var i = Math.floor((fx - G.L) / ((G.W - G.L - G.R) / order.length));
  if (i >= 0 && i < order.length) { key = order[i].key; draw(true); }
});
strip.addEventListener("mousemove", function (e) {
  var r = strip.getBoundingClientRect(), G = stripGeom();
  var fx = (e.clientX - r.left) / r.width * G.W;
  var bw = (G.W - G.L - G.R) / order.length;
  var i = Math.floor((fx - G.L) / bw);
  if (i < 0 || i >= order.length) { tip.style.display = "none"; return; }
  var x = order[i];
  tip.style.display = "block";
  tip.style.left = ((G.L + (i + 0.5) * bw) / G.W * strip.clientWidth) + "px";
  tip.style.top = "14px";
  tip.textContent = x.name + ": trigger value " + x.max_uq + " m3/s/km2, " + x.members.p_scenarios +
    " matched storms, " + x.stats["10cm"].raw.area_km2_own + " km2 wet at 0.10 m.";
});
strip.addEventListener("mouseleave", function () { tip.style.display = "none"; });

/* ---------- controls ---------- */

document.querySelectorAll("#seg-thr button").forEach(function (b) {
  b.onclick = function () { thr = b.dataset.t; draw(false); };
});
document.getElementById("zoomwet").onclick = function () {
  var r = region();
  map.fitBounds(r.wet_bbox ? L.latLngBounds(r.wet_bbox) : L.latLngBounds(regBounds(r)), { padding: [20, 20] });
};
document.getElementById("zoomisland").onclick = function () { map.fitBounds(LB, { padding: [12, 12] }); };
window.addEventListener("resize", drawStrip);

readHash();
buildMap();
buildPicker();
draw(true);
window.addEventListener("hashchange", function () { readHash(); draw(true); });
