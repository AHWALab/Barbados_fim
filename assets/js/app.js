/* FIM Results Viewer, Barbados Saint Thomas.
   Leaflet plus plain JavaScript. Layers load on demand from
   assets/layers/<cycle>/P_<threshold>_<variant>.png */

"use strict";

var D = window.FIM_DATA;
var cycles = D.cycles;
var THRESHOLDS = D.thresholds;          // 10cm, 30cm, 70cm, 100cm
var B = D.bounds;
var LB = [[B.south, B.west], [B.north, B.east]];
function cycBounds(c) { return c.bounds || LB; }

var idx = 0, thr = "30cm", variant = "raw", playing = null;
var map, overlay, aocLayer, lastWindow = null;

var quiet = document.getElementById("quiet");
var sel = document.getElementById("cycsel");
var tip = document.getElementById("tip");

/* ---------- state in the address, so a view can be shared ---------- */

function readHash() {
  var h = new URLSearchParams(location.hash.slice(1));
  var c = h.get("c");
  if (c) { var i = cycles.findIndex(function (x) { return x.cycle === c; }); if (i >= 0) idx = i; }
  if (THRESHOLDS.indexOf(h.get("t")) >= 0) thr = h.get("t");
  if (h.get("ob") === "1") variant = "ob";
}
function writeHash() {
  var h = new URLSearchParams();
  h.set("c", cycles[idx].cycle); h.set("t", thr);
  if (variant === "ob") h.set("ob", "1");
  history.replaceState(null, "", "#" + h.toString());
}

/* ---------- helpers ---------- */

function cycleHour(c) {
  var d = parseInt(c.cycle.slice(6, 8), 10);
  var h = parseInt(c.cycle.slice(9, 11), 10);
  return (d - 16) * 24 + h;
}
function layerPath(c) {
  return "assets/layers/" + c.cycle + "/P_" + thr + "_" + variant + ".png";
}
function fmt(v) { return (v === null || v === undefined) ? "-" : v; }
function statAt(c, t, v) {
  return (c.stats && c.stats[t] && c.stats[t][v]) || null;
}
function wetHere(c) { var s = statAt(c, thr, variant); return s && s.px > 0; }

/* ---------- map ---------- */

function buildMap() {
  map = L.map("map", { zoomControl: true, attributionControl: true });
  map.attributionControl.setPrefix("");
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19, attribution: "OpenStreetMap contributors, CARTO"
  }).addTo(map);
  var sat = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 19, attribution: "Esri World Imagery" });
  L.control.layers({ "Street map": map._layers[Object.keys(map._layers)[0]], "Satellite": sat },
    {}, { position: "topleft", collapsed: true }).addTo(map);

  overlay = L.imageOverlay("", LB, { opacity: 0.82, interactive: false,
    className: "fim-overlay" });
  overlay.addTo(map);

  if (D.aoc) {
    aocLayer = L.geoJSON(D.aoc, { style: { color: "#0d3b5e", weight: 2, dashArray: "5,4",
      fill: false } }).addTo(map);
  }
  map.fitBounds(LB, { padding: [12, 12] });
  lastWindow = null;

  var lg = L.control({ position: "bottomright" });
  lg.onAdd = function () {
    var d = L.DomUtil.create("div", "map-legend");
    d.innerHTML = "<b>Likelihood of exceeding the depth</b>" +
      "<div><i style='background:#8dc63f'></i>Very low, under 20 percent</div>" +
      "<div><i style='background:#fff200'></i>Low, 20 to 40 percent</div>" +
      "<div><i style='background:#f7941d'></i>Medium, 40 to 60 percent</div>" +
      "<div><i style='background:#ed1c24'></i>High, over 60 percent</div>" +
      "<div style='margin-top:4px'><i style='border:2px dashed #0d3b5e;background:none;" +
      "border-radius:0'></i>Saint Thomas, area of concern</div>";
    return d;
  };
  lg.addTo(map);
}

/* ---------- cycle select ---------- */

cycles.forEach(function (c, i) {
  var o = document.createElement("option");
  o.value = i;
  o.textContent = c.label + (c.has_products ? "" : "  (quiet)");
  sel.appendChild(o);
});
sel.onchange = function () { idx = parseInt(sel.value, 10); draw(); };

/* ---------- day and hour picker ---------- */

function buildClock() {
  var days = {};
  cycles.forEach(function (c, i) {
    var d = c.cycle.slice(6, 8);
    (days[d] = days[d] || []).push(i);
  });
  var el = document.getElementById("clock");
  el.innerHTML = "";
  Object.keys(days).sort().forEach(function (d) {
    var row = document.createElement("div"); row.className = "dayrow";
    var lab = document.createElement("div"); lab.className = "day";
    lab.textContent = parseInt(d, 10) + " Aug"; row.appendChild(lab);
    var have = {};
    days[d].forEach(function (i) { have[parseInt(cycles[i].cycle.slice(9, 11), 10)] = i; });
    for (var h = 0; h < 24; h++) {
      var chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = String(h).padStart(2, "0");
      if (have[h] === undefined) { chip.classList.add("gap"); }
      else {
        var i = have[h], c = cycles[i];
        chip.title = c.label + ", max unit streamflow " + fmt(c.max_uq) + " m3/s/km2";
        if (!c.has_products) chip.classList.add("quiet");
        else if (wetHere(c)) chip.classList.add("wet");
        if (i === idx) chip.classList.add("sel");
        chip.onclick = (function (k) { return function () { idx = k; draw(); }; })(i);
      }
      row.appendChild(chip);
    }
    el.appendChild(row);
  });
}

/* ---------- main draw ---------- */

function draw() {
  var c = cycles[idx];
  sel.value = idx;
  document.getElementById("cyctitle").textContent = "Cycle " + c.cycle;
  var badge = document.getElementById("badge");
  if (c.has_products && c.window_ok === false) {
    badge.textContent = "wrong window"; badge.className = "badge warn";
  } else if (c.status === "triggered") { badge.textContent = "triggered"; badge.className = "badge trig"; }
  else if (c.has_products) { badge.textContent = "products, trigger not met"; badge.className = "badge warn"; }
  else { badge.textContent = "quiet"; badge.className = "badge quiet"; }
  var wn = document.getElementById("windownote");
  if (c.has_products && c.window_ok === false) {
    wn.style.display = "block";
    wn.innerHTML = "<strong>This cycle is not Saint Thomas.</strong> Its rasters are " +
      c.shape[0] + " by " + c.shape[1] + " cells on the <strong>" +
      c.window_aoc.replace("BB08_", "").replace(/([a-z])([A-Z])/g, "$1 $2") +
      "</strong> window, which they cover in full, while the other cycles are 275 by 252 on " +
      "Saint Thomas. The map has moved to that window so the layer is drawn where it belongs. " +
      "Read this cycle as a routing defect in the run, not as part of the Saint Thomas sequence.";
  } else { wn.style.display = "none"; }

  if (c.has_products) {
    quiet.style.display = "none";
    var lb = cycBounds(c);
    overlay.setBounds(L.latLngBounds(lb));
    overlay.setUrl(layerPath(c));
    overlay.getElement() && (overlay.getElement().style.display = "");
    var wid = c.window_aoc || "BB11_SaintThomas";
    if (wid !== lastWindow) { map.fitBounds(lb, { padding: [12, 12] }); lastWindow = wid; }
    var n = cycles[idx + 1];
    if (n && n.has_products) { var pre = new Image(); pre.src = layerPath(n); }
  } else {
    var el = overlay.getElement(); if (el) el.style.display = "none";
    quiet.style.display = "flex";
    quiet.textContent = "Quiet cycle. No run exceeded the trigger of " +
      fmt(c.trigger_threshold) + " m3/s/km2 over the area of concern, so no flood map was issued.";
  }

  var kv = document.getElementById("kv");
  var rows = [["Max unit streamflow", fmt(c.max_uq) + " m3/s/km2"],
              ["Trigger", fmt(c.trigger_threshold) + " m3/s/km2"]];
  if (c.members) {
    rows.push(["Member rain totals", c.members.rain_mm[0] + " to " + c.members.rain_mm[1] + " mm"]);
    rows.push(["Distinct matched storms", c.members.p_scenarios + " of 200"]);
    rows.push(["Ensemble members", c.members.n]);
  }
  if (c.wet_cells) rows.push(["Cells with any likelihood", c.wet_cells.toLocaleString() + " at 0.10 m"]);
  if (c.window_aoc) rows.push(["Product window", c.window_aoc.replace(/^BB\d+_/, "").replace(/([a-z])([A-Z])/g, "$1 $2")]);
  rows.push(["View", "Pluvial, " + thr.replace("cm", " cm") +
             (variant === "ob" ? ", overbank only" : "")]);
  kv.innerHTML = rows.map(function (r) {
    return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("");

  var tb = document.getElementById("sttable");
  if (c.has_products) {
    var h = "<tr><th>Threshold</th><th>Max likelihood</th><th>Pixels over 0</th>" +
            "<th>Pixels over 60 percent</th></tr>";
    THRESHOLDS.forEach(function (t) {
      var s = statAt(c, t, variant);
      h += "<tr" + (t === thr ? " class='on'" : "") + "><td>" + t.replace("cm", " cm") +
           "</td><td>" + (s ? s.maxp : "-") + "</td><td>" +
           (s ? s.px.toLocaleString() : "-") + "</td><td>" +
           (s ? s.px_ge60.toLocaleString() : "-") + "</td></tr>";
    });
    tb.innerHTML = h;
  } else { tb.innerHTML = ""; }

  buildClock();
  drawStrip();
  writeHash();
}

/* ---------- timeline strip ---------- */

var strip = document.getElementById("strip");

function stripGeom() {
  var W = strip.clientWidth || 1000, H = 130;
  return { W: W, H: H, L: 38, R: 30, T: 10, B: 36 };
}

function drawStrip() {
  var G = stripGeom(), W = G.W, H = G.H, L = G.L, R = G.R, T = G.T, Bm = G.B;
  strip.setAttribute("viewBox", "0 0 " + W + " " + H);
  var hours = cycles.map(cycleHour);
  var hMax = hours[hours.length - 1];
  var x = function (h) { return L + h / hMax * (W - L - R); };
  var uqs = cycles.map(function (c) { return c.max_uq ? parseFloat(c.max_uq) : 0; });
  var uTop = Math.max(1.5, Math.ceil(Math.max.apply(null, uqs) * 2) / 2);
  var y = function (u) { return T + (1 - u / uTop) * (H - T - Bm); };
  var g = "";

  g += "<rect x='" + x(24) + "' y='" + T + "' width='" + (x(48) - x(24)) +
       "' height='" + (H - T - Bm) + "' fill='#f5f7fa'/>";

  for (var u = 0; u <= uTop + 0.001; u += 0.5) {
    g += "<line x1='" + L + "' y1='" + y(u) + "' x2='" + (W - R) + "' y2='" + y(u) +
         "' stroke='#eceff3' stroke-width='1'/>";
    g += "<text x='" + (L - 7) + "' y='" + (y(u) + 3.5) + "' text-anchor='end' font-size='10' fill='#8b98a5'>" +
         u.toFixed(1) + "</text>";
  }
  g += "<line x1='" + L + "' y1='" + y(1) + "' x2='" + (W - R) + "' y2='" + y(1) +
       "' stroke='#9aa7b3' stroke-width='1'/>";
  g += "<text x='" + (W - R - 4) + "' y='" + (y(1) - 4) + "' text-anchor='end' font-size='10' fill='#8b98a5'>trigger 1.0</text>";

  for (var h = 0; h <= hMax; h += 6) {
    var xi = x(h), midnight = h % 24 === 0;
    g += "<line x1='" + xi + "' y1='" + (H - Bm) + "' x2='" + xi + "' y2='" + (H - Bm + (midnight ? 7 : 4)) +
         "' stroke='#b7c2cc' stroke-width='1'/>";
    if (midnight) g += "<line x1='" + xi + "' y1='" + T + "' x2='" + xi + "' y2='" + (H - Bm) +
                       "' stroke='#d4dce4' stroke-width='1'/>";
    g += "<text x='" + xi + "' y='" + (H - Bm + 17) + "' text-anchor='middle' font-size='10' fill='#8b98a5'>" +
         String(h % 24).padStart(2, "0") + ":00</text>";
  }
  g += "<text x='" + x(12) + "' y='" + (H - 3) + "' text-anchor='middle' font-size='11' font-weight='600' fill='#5b6770'>16 August 2026</text>";
  g += "<text x='" + x(36) + "' y='" + (H - 3) + "' text-anchor='middle' font-size='11' font-weight='600' fill='#5b6770'>17 August 2026</text>";

  cycles.forEach(function (c, i) {
    if (c.has_products) {
      g += "<rect x='" + (x(hours[i]) - 5) + "' y='" + T + "' width='10' height='" +
           (H - T - Bm) + "' fill='#2b6ca3' opacity='0.10'/>";
    }
  });

  var pts = "", area = "M" + x(hours[0]) + "," + (H - Bm);
  cycles.forEach(function (c, i) {
    var px = x(hours[i]).toFixed(1), py = y(uqs[i]).toFixed(1);
    pts += px + "," + py + " "; area += "L" + px + "," + py;
  });
  area += "L" + x(hours[hours.length - 1]) + "," + (H - Bm) + "Z";
  g += "<path d='" + area + "' fill='#2b6ca3' opacity='0.08'/>";
  g += "<polyline points='" + pts + "' fill='none' stroke='#2b6ca3' stroke-width='2' stroke-linejoin='round' stroke-linecap='round'/>";

  var cx = x(hours[idx]);
  g += "<line x1='" + cx + "' y1='" + (T - 4) + "' x2='" + cx + "' y2='" + (H - Bm) +
       "' stroke='#1a2733' stroke-width='2.4'/>";
  g += "<circle cx='" + cx + "' cy='" + y(uqs[idx]) + "' r='4' fill='#2b6ca3' stroke='#fff' stroke-width='2'/>";
  strip.innerHTML = g;
}

function stripIndexFromEvent(e) {
  var r = strip.getBoundingClientRect(), G = stripGeom();
  var fx = (e.clientX - r.left) / r.width * G.W;
  var hours = cycles.map(cycleHour), hMax = hours[hours.length - 1];
  var h = (fx - G.L) / (G.W - G.L - G.R) * hMax;
  var best = 0, bd = 1e9;
  hours.forEach(function (hh, i) { var d = Math.abs(hh - h); if (d < bd) { bd = d; best = i; } });
  return best;
}

strip.addEventListener("click", function (e) { idx = stripIndexFromEvent(e); draw(); });
strip.addEventListener("mousemove", function (e) {
  var i = stripIndexFromEvent(e), c = cycles[i], G = stripGeom();
  var hours = cycles.map(cycleHour);
  var px = G.L + hours[i] / hours[hours.length - 1] * (G.W - G.L - G.R);
  tip.style.display = "block";
  tip.style.left = (px / G.W * strip.clientWidth) + "px";
  tip.style.top = "14px";
  tip.textContent = c.label + " UTC. Max unit streamflow " + fmt(c.max_uq) + " m3/s/km2, " +
    (c.has_products ? "flood map issued." : "no product.");
});
strip.addEventListener("mouseleave", function () { tip.style.display = "none"; });

/* ---------- controls ---------- */

document.querySelectorAll("#seg-thr button").forEach(function (b) {
  b.onclick = function () {
    thr = b.dataset.t;
    document.querySelectorAll("#seg-thr button").forEach(function (o) {
      o.classList.toggle("on", o === b); });
    draw();
  };
});
var obBtn = document.getElementById("obtoggle");
obBtn.onclick = function () {
  variant = variant === "raw" ? "ob" : "raw";
  obBtn.classList.toggle("on", variant === "ob");
  draw();
};
document.getElementById("prev").onclick = function () { idx = Math.max(idx - 1, 0); draw(); };
document.getElementById("next").onclick = function () { idx = Math.min(idx + 1, cycles.length - 1); draw(); };
document.addEventListener("keydown", function (e) {
  if (e.key === "ArrowRight") { idx = Math.min(idx + 1, cycles.length - 1); draw(); }
  if (e.key === "ArrowLeft") { idx = Math.max(idx - 1, 0); draw(); }
});
document.getElementById("play").onclick = function () {
  var self = this;
  if (playing) { clearInterval(playing); playing = null; self.textContent = "Play"; self.classList.remove("on"); return; }
  self.textContent = "Pause"; self.classList.add("on");
  playing = setInterval(function () {
    idx = (idx + 1) % cycles.length; draw();
    if (idx === cycles.length - 1) {
      clearInterval(playing); playing = null;
      self.textContent = "Play"; self.classList.remove("on");
    }
  }, 700);
};
document.getElementById("jumpevent").onclick = function () {
  var i = cycles.findIndex(function (c) { return c.has_products && c.window_ok !== false; });
  if (i >= 0) { idx = i; draw(); }
};
document.getElementById("zoomwet").onclick = function () {
  var c = cycles[idx];
  map.fitBounds(c.wet_bbox ? L.latLngBounds(c.wet_bbox) : cycBounds(c), { padding: [20, 20] });
};

window.addEventListener("resize", drawStrip);

/* ---------- start ---------- */

readHash();
buildMap();
document.querySelectorAll("#seg-thr button").forEach(function (o) {
  o.classList.toggle("on", o.dataset.t === thr); });
obBtn.classList.toggle("on", variant === "ob");
draw();

/* a shared link whose address is pasted while the page is already open should
   still move the view */
window.addEventListener("hashchange", function () {
  readHash();
  draw();
});
