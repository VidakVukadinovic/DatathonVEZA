# Berlin (BVG): replication of the Madrid depot and grid model

This folder applies the Madrid model (`Madrid/data/madrid_model_clean.ipynb`) to the BVG bus network in Berlin, with the same logic, parameters, file formats and checks. Where Berlin lacks a Madrid input, a transparent replacement is used and labelled (V verified, D derived, P proxy, A assumption).

## Contents

The `Berlin/` folder has three components, like the other cities: `data/`, `outputs/` and the notebook.

| Path | What it is |
|---|---|
| `berlin_model.ipynb` | The model, executed (all checks PASS). Sections mirror the Madrid notebook. |
| `data/vbb_gtfs_bvg_bus_extract.zip` | GTFS extract (8 MB): BVG buses, reference day 24 Nov 2026. |
| `data/make_gtfs_extract.py` | Reduces the full VBB GTFS feed (~640 MB) to that extract. |
| `data/README.md` | This file: method, sources, open items. |
| `outputs/File_2.csv` | Lines: 215 BVG bus lines (same columns as Madrid). |
| `outputs/File_3.csv` | Depots: 8 depots, end state with Säntisstraße and Treptow (same columns as Madrid). |
| `outputs/File_4.csv` | Trajectory 2026-2035, S0 and S1. `n_cng` / `cng_t` are replaced by `n_diesel` / `diesel_m3` (Berlin runs diesel). |
| `outputs/berlin_file1.csv` | Berlin's File 1 row (same fields as `Helsinki/outputs/helsinki_file1.csv`). |
| `outputs/benchmark_berlin_madrid.csv` | Berlin next to Madrid's saved outputs. |
| `outputs/berlin_assumptions_register.csv` | Assumptions register (B01-B20). |
| `outputs/berlin_vehicles_by_minute.csv` | Vehicles in service by minute (same format as the Brussels/Helsinki profiles). |
| `outputs/berlin_must_haves.csv` | Team benchmark checklist (23 items): value, label and source URL per item (notebook section 10g). |
| `outputs/berlin_depots_benchmark.csv` | Per depot: position, e-bus places, charging points, charger power/type, published connection, chargers and kVA per bus. |
| `outputs/benchmark_berlin_madrid_brussels_helsinki.csv` | Berlin next to Madrid, Brussels and Helsinki on the team's benchmark definitions (notebook 10h); key findings in 10i. |
| `outputs/berlin_fleet_mix_by_year.csv` | Fleet by type, 2021-2025 (BVG Zahlenspiegel / BVG in Zahlen). |
| `outputs/fig_berlin_*.png` | Network energy map, depot diagnostic, depot load timeline, fleet transition, depots-and-lines map, fleet mix and e-bus pace, midday dip. |

## How to run

```
cd Berlin
jupyter nbconvert --to notebook --execute --inplace berlin_model.ipynb
```
Needs pandas, numpy, matplotlib. The extract is in the repo, so no download is needed. To use a newer feed: download the VBB GTFS from https://vbb.de/vbb-services/api-open-data/datensaetze/, unzip it, run `python data/make_gtfs_extract.py <unzipped folder> <YYYY-MM-DD>`, then update `REFERENCE_DATE` and the regression values in the notebook.

## What changes from Madrid, and why

| Madrid input | Berlin replacement | Label |
|---|---|---|
| EMT supply file for `peak_buses` | Peak concurrent trips per line in the GTFS + 5-min terminus layover (Helsinki method); 0/10/15 min tested | P |
| Vehicle-level fleet history | BVG in Zahlen 2025: 1,532 buses at 31 Dec 2025 (277 electric) | V |
| Passengers per bus for the articulated proxy | Line type (MetroBus, Express, 100/200/300) then size, until the 72.8% large-vehicle share of the BVG fleet is reached | P / A |
| Historical depot code per line | Capacity-constrained nearest depot; depot positions from GTFS depot stops | P |
| CNG consumption and factor | Diesel 0.37 / 0.50 l/km (federal e-bus evaluation, table 39); 3.236 kg CO2e/l (BVG's own factor) | V |
| Electricity factor (REE) | 0.344 kg/kWh, German mix 2025 (UBA) | V |
| Connection MW | 10 MVA (low, base) / 13 MVA (high) per depot (Senate report h19-2626); Indira-Gandhi-Straße 10 MW documented | V / P |
| La Elipa closed / reopening (cases A and B) | Case B = today's 6 depots; case A = 8 depots after Säntisstraße and Treptow open in 2027 | V / P |
| S0 from the 2021-2025 pace | BVG's published purchase plan to 2029, then a pace reaching 85% e-buses in 2035 (BVG target 80-90%) | V / A |

The brief's fixed parameters (1.30 / 1.85 kWh/km, 300 / 240 km, 100 kW, 7 h, 90%) are kept unchanged so that Berlin and Madrid are comparable.

## Key results (reference day 24 Nov 2026)

Benchmark findings (notebook 10i): Berlin runs Helsinki's daily km with 0.60x Madrid's peak buses (250 km per bus per day); at noon 82% of its peak buses are in service (Madrid 91%, Helsinki 67%, Brussels 64%), so like Madrid it depends on night and terminal charging; its range issue is the articulated fleet (6 lines over 300 km as standard, 17 as articulated); its pace (18% ZE vs Helsinki 52%) follows a yearly budget.


* 215 lines, 291,764 bus-km per day, 1,572 peak buses; 198 lines Depot, 17 Opportunity, 0 Not_feasible.
* 100% BEV: 510 MWh per night, 81 MW with managed charging (157 MW unmanaged).
* End state (8 depots, 10 MVA each): 4 Ready, 4 Upgrade, 0 Critical. Indira-Gandhi-Straße (1.33x), Cicerostraße (1.26x), Spandau (1.18x) and Säntisstraße (1.08x) need more power; at 13 MVA only Indira-Gandhi-Straße stays above its connection.
* Today's 6 depots (before the new depots open): 5 Upgrade and 1 Critical (Britz). The two new depots are what make the grid side workable.
* Midday dip: 82% of the morning-peak buses are still in service at 12:00 (flat daytime timetable).
* First e-bus lines (2019-22) sit near Indira-Gandhi-Straße (5 km vs 12 km median), not on shorter duties.
* S1 (100% by 2030): 76 kt CO2 avoided per year from 2030; S0 (BVG plan): 62 kt in 2035.

## Open data and APIs for Berlin

| Source | What it gives | Used here |
|---|---|---|
| VBB GTFS static (official, weekly): https://vbb.de/en/vbb-services/api-/-open-data/datasets | All lines, trips, stops, shapes for Berlin-Brandenburg | Yes: lines, trips, km, peak buses |
| VBB GTFS Realtime (official, CC-BY 4.0): https://production.gtfsrt.vbb.de/data | Live trip updates | No (not needed for a planning model) |
| VBB API (HAFAS, official, key on request): https://vbb.de/en/vbb-services/api-/-open-data | Journeys and departures | No |
| v6.bvg.transport.rest / v6.vbb.transport.rest (community, no key, 100 requests/min; code: github.com/derhuerst/bvg-rest) | REST wrapper of the BVG/VBB HAFAS API | No |

No API publishes the BVG fleet (vehicles by type and depot): fleet totals come from BVG's own reports (below).

## Main sources

* VBB GTFS, downloaded 2026-11-18: https://vbb.de/vbb-services/api-open-data/datensaetze/
* BVG in Zahlen 2025: https://www.bvg.de/dam/jcr:b7825abf-7399-4ead-bdd1-5d315d94808a/BVG-in-Zahlen-2025.pdf
* BVG Nachhaltigkeitsbericht 2025: https://www.bvg.de/dam/jcr:99b45b88-6814-4f3e-959d-6ef440adf229/BVG-Nachhaltigkeitsbericht-2025.pdf
* Senate report on grid allocation, h19-2626 (19 Jan 2026): https://www.parlament-berlin.de/adosservice/19/Haupt/vorgang/h19-2626-v.pdf
* Senate answer S19/22944 (depot capacities and conversion years, 1 Jul 2025): https://pardok.parlament-berlin.de/starweb/adis/citat/VT/19/SchrAnfr/S19-22944.pdf
* Federal e-bus funding evaluation (BMWK, Dec 2024; Berlin case pp. 298-306, consumption p. 206, diesel table 39): https://www.pwc.de/de/branchen-und-markte/oeffentlicher-sektor/begleituntersuchung-zur-foerderung-von-elektrobussen-im-oepnv.pdf
* NOW GmbH Zero Emission Bus brochure 2020 (Indira-Gandhi-Straße 10 MW): https://www.now-gmbh.de/wp-content/uploads/2020/09/now_broschuere_zero-emission-busse.pdf
* UBA electricity factor 2025: https://www.umweltbundesamt.de/themen/co2-emissionen-pro-kilowattstunde-strom-2025-nur
* Stromnetz Berlin allocation procedure: https://www.stromnetz.berlin/anschliessen/anschluss-mittel-hochspannung/repartierung/

## Open items

* Connection MW per depot: only Indira-Gandhi-Straße is documented. The outcome of Stromnetz Berlin's allocation round would replace the 10-13 MVA range.
* The line-to-depot allocation is a rule, not data (9 of 15 known Indira-Gandhi-Straße lines land there in case B).
* Depot positions for Cicerostraße, Müllerstraße, Säntisstraße and Treptow are nearest-stop proxies: check them on a map.
* Not published: depot battery storage, MW per depot except IGS, charger count at Treptow, charger kW at Britz/Cicerostraße.
* Berlin runs 68 night lines, so the real charging window may be shorter than 7 h (5-8 h shown in the notebook).
