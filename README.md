# FIM Results Viewer: Saint Thomas, Barbados

Interactive viewer for probabilistic flood inundation maps produced with TITO and
`tito_utils.fim_utils`. The dataset is the hindcast of 16 to 17 August 2026 for the
Saint Thomas pilot (FIM site `Barbados_SaintThomas`, store `fim_store_BB11_SaintThomas_v1`):
48 hourly forecast cycles, 50 ensemble members each.

**Live site:** https://ahwalab.github.io/Barbados_fim/

Companion products:
[flood potential](https://ahwalab.github.io/Barbados_warnings/) and
[impact based forecast](https://ahwalab.github.io/Barbados_IFB/).

## What the viewer shows

Each map is the likelihood that flood depth exceeds a chosen threshold, computed by matching
every ensemble member to a library of 200 pre-simulated flood scenarios for the parish and
counting members pixel by pixel.

Barbados is a **pluvial only** site: members are matched by their rainfall total over the area
of concern, taken from the real RainyDay storm totals. There is no fluvial library here, so the
fluvial and combined routines of the Guatemala product do not apply and their buttons are
disabled. Depth thresholds are 0.10, 0.30, 0.70 and 1.00 m, set in
`fim_config/Barbados_SaintThomas.yaml`.

## Repository layout

    index.html               the viewer, English
    assets/css/style.css     styles
    assets/js/app.js         viewer logic, plain JavaScript on Leaflet
    assets/js/xlinks.js      rewrites the sibling product links when served from GitHub Pages
    assets/vendor/           Leaflet 1.9.4, vendored so the page works offline
    assets/data/cycles.js    cycle list, per cycle statistics, window audit, area of concern
    assets/layers/           one PNG per cycle, threshold and variant

Layer path convention: `assets/layers/<cycle>/P_<threshold>_<variant>.png`, threshold in
`10cm`, `30cm`, `70cm`, `100cm`, variant `raw` or `ob`.

## Three things a reader must know about this run

1. **Overbank is a no-op here.** The overbank variant removes pixels already wet in the near
   zero inflow reference scenario. Saint Thomas has no permanent channel in that scenario, so
   the `raw` and `ob` PNGs are byte identical. The control is kept for consistency with the
   sites that do have a fluvial library.
2. **Cycle 20260817.150000 is not Saint Thomas.** Its rasters are 308 by 271 cells on the
   Saint Michael window (AOC `Barbados_BB08_SaintMichael`, covered in full), while every other
   cycle is 275 by 252 on Saint Thomas. Its trigger summary also reads quiet, with a maximum
   unit streamflow of 0.9 against a trigger of 1.0. The viewer keeps the cycle, draws it on its
   own bounds and badges it, and the impact product excludes it. The audit is in
   `_build/stats/fim_window_audit.json`.
3. **Wet pixels are sparse and scattered.** At the peak cycle 1,409 of 69,300 cells carry any
   likelihood at 0.10 m. Use the Zoom to flooded area button rather than looking for a
   contiguous flood polygon.

## Local preview

Open `index.html` directly, or serve the folder:

    python -m http.server 8000

The basemap tiles need internet; everything else is local.

## Rebuilding for a new event

1. Run the FIM pipeline for the event (`tito_utils.fim_utils.pipeline_pf`).
2. Run `_build/scripts/03_fim_layers.py` to write the PNG layers and `cycles.js`.
3. Run `_build/scripts/09_fim_window_audit.py` to add per cycle bounds and the window audit.

## Basemap key

CARTO raster basemaps have required an API key since August 2026. The key issued to the
University of Iowa sits near the top of `assets/js/app.js` as `CARTO_KEY`, and the light basemap URL is
built from it:

    https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=CARTO_KEY

It is a browser side key, so it is visible in the source by design. CARTO restricts it to
`ahwalab.github.io` and `localhost`, and that restriction is what protects it. To rotate it,
replace the value in that one line, here and in the other two viewer repositories. CARTO and
OpenStreetMap attribution must stay visible on the map, and it is printed in the bottom right
corner of every map.

The satellite layer is Esri World Imagery and needs no key.

## Local preview

    python -m http.server 8000

Then open http://localhost:8000/. Only the basemap tiles need internet.

---

AHWA Laboratory, The University of Iowa. EWS-F project, funded by the WMO.
Training demonstration. Not an operational warning product.
