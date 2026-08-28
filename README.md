# Barbados_fim

FIM Results Viewer for the Saint Thomas pilot, Barbados. Interactive viewer for probabilistic
flood inundation maps produced with TITO and `tito_utils.fim_utils`.

**Live site:** https://ahwalab.github.io/Barbados_fim/

Companion products:
[flood potential](https://ahwalab.github.io/Barbados_warnings/) and
[impact based forecast](https://ahwalab.github.io/Barbados_IFB/).

## Dataset

Hindcast of 16 to 17 August 2026 for the FIM site `Barbados_SaintThomas` (BB11), store
`fim_store_BB11_SaintThomas_v1`: 48 hourly forecast cycles, 50 ensemble members each, of which
four cycles carry flood maps.

Each map is the likelihood that flood depth exceeds a chosen threshold, computed by matching
every ensemble member to a library of 200 pre-simulated flood scenarios for the parish and
counting members pixel by pixel. Barbados is a pluvial only site: members are matched by their
rainfall total over the area of concern, from the real RainyDay storm totals. There is no
fluvial library, so the fluvial and combined routines of the Guatemala product do not apply and
their buttons are disabled. Depth thresholds are 0.10, 0.30, 0.70 and 1.00 m.

## Layout

    index.html               the viewer, English
    assets/css/style.css     styles
    assets/js/app.js         viewer logic, plain JavaScript on Leaflet
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
   Saint Michael window (`Barbados_BB08_SaintMichael`, covered in full), while every other cycle
   is 275 by 252 on Saint Thomas. Its trigger summary also reads quiet, at 0.9 against a trigger
   of 1.0. The viewer keeps the cycle, draws it on its own bounds and badges it; the impact
   product excludes it.
3. **Wet pixels are sparse and scattered.** At the peak cycle 1,409 of 69,300 cells carry any
   likelihood at 0.10 m. Use the Zoom to flooded area button rather than looking for a
   contiguous flood polygon.

## Local preview

    python -m http.server 8000

Then open http://localhost:8000/. Only the basemap tiles need internet.

---

AHWA Laboratory, The University of Iowa. EWS-F project, funded by the WMO.
Hindcast demonstration for training. Not an operational warning product.
