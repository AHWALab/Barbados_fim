# FIM Results Viewer: Barbados

Interactive viewers for probabilistic flood inundation maps produced with TITO and
`tito_utils.fim_utils`, for two demonstration cases.

**Live site:** https://ahwalab.github.io/Barbados_fim/

| Case | Folder | Products |
|---|---|---|
| Hurricane Tomas, 29 to 30 October 2010 | `tomas2010/` | one cycle, 30 Oct 00:00 UTC, all eleven parishes triggered, eleven parish products and an island mosaic |
| Hindcast of 16 to 17 August 2026 | `aug2026/` | 48 hourly cycles for the Saint Thomas pilot, 4 with products |

Companion products:
[flood potential](https://ahwalab.github.io/Barbados_warnings/) and
[impact based forecast](https://ahwalab.github.io/Barbados_IFB/).

## What the viewers show

Each map is the likelihood that flood depth exceeds a chosen threshold, computed by matching
every ensemble member to a library of 200 pre-simulated flood scenarios for the parish and
counting members pixel by pixel. Barbados is a **pluvial only** site: members are matched by
their rainfall total over the parish, taken from the real RainyDay storm totals. There is no
fluvial library, so the fluvial and combined routines of the Guatemala product do not apply and
their buttons are disabled. Depth thresholds are 0.10, 0.30, 0.70 and 1.00 m.

The Tomas page selects a product, the whole island or one parish, instead of a cycle. The island
view is a mosaic of the eleven parish products, each clipped to its own parish so that no cell is
drawn from a neighbour's library. The parish views show the full product window, buffer included.

## Repository layout

    index.html                   portal, one card per case
    assets/css/style.css         styles, shared by the three Barbados viewers
    assets/js/app.js             the August 2026 application, cycles
    assets/js/app_parishes.js    the Tomas application, parishes
    assets/vendor/               Leaflet 1.9.4, vendored
    aug2026/data/cycles.js       cycle list, per cycle statistics, window audit, area of concern
    aug2026/layers/<cycle>/P_<threshold>_<variant>.png
    tomas2010/data/cycles.js     parish list, per parish statistics, island statistics, parish polygons
    tomas2010/layers/20101030.000000/<Parish>_P_<threshold>_raw.png, and Island_P_<threshold>_raw.png

## Things a reader must know

1. **Overbank is a no-op here.** The overbank variant removes pixels already wet in the near
   zero inflow reference scenario. Barbados has no permanent channel in that scenario, so the
   `raw` and `ob` products are byte identical. The August 2026 page keeps the control for
   consistency with the sites that do have a fluvial library; the Tomas page does not offer it.
2. **Tomas passes the trigger everywhere.** Maximum unit streamflow over the parishes runs from
   18 to 28.6 m3/s per km2 against a trigger of 1.0, in every parish with all 50 members. Member
   rain totals of 120 to 380 mm match 27 to 35 distinct library storms per parish.
3. **August 2026 cycle 20260817.150000 is not Saint Thomas.** Its rasters are on the Saint
   Michael window. The viewer keeps the cycle, draws it on its own bounds and badges it.

## Reported impacts, Tomas

The Tomas page carries a "Reported impacts" layer: six mapped records and an island summary
compiled from the SIDS Flash Flood Compendium (FFC, DesInventar and Groundsource sheets), the
NHC tropical cyclone report, CDEMA situation reports and press reports, with the sources linked
in every popup. Categories: flooding (Drill Hall Beach, Saint Philip parish, the Trinity Animal
Clinic at Woodbourne), wind damage (Saint Peter, Wildey) and the Grantley Adams observation
(294 mm, gust 91 knots). Tomas hit Barbados mostly through wind, and the compendium itself notes
that surge, flash flooding and wind damage are not separated in the reports, so the flood record
is thin; parish and district level records sit at the centroid with a dashed circle. The table is
`tomas2010/data/impacts_tomas2010.csv` (also GeoJSON), the layer code `assets/js/impacts.js`, the
payload `tomas2010/data/impacts.js`. The August 2026 hindcast has no documented impacts.

## Basemap key

CARTO raster basemaps have required an API key since August 2026. The key issued to the
University of Iowa sits near the top of both application files as `CARTO_KEY`, and the light basemap URL is
built from it:

    https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=CARTO_KEY

It is a browser side key, so it is visible in the source by design. CARTO restricts it to
`ahwalab.github.io` and `localhost`, and that restriction is what protects it. To rotate it,
replace the value in that one line, here and in the other two viewer repositories. CARTO and
OpenStreetMap attribution must stay visible on the map, and it is printed in the bottom right
corner of every map.

## Local preview

    python -m http.server 8000

Then open http://localhost:8000/. Only the basemap tiles need internet.

---

AHWA Laboratory, The University of Iowa. EWS-F project, funded by the WMO.
Training demonstration. Not an operational warning product.
