# Paris benchmark (former RATP bus network)

Paris row of `File_1.csv` (Objective 2) and its evidence. Same layout as `Brussels/`.

## Files
- `paris_benchmark_full.ipynb`: executed notebook with all outputs saved. Sections: perimeter, reference day, network size, vehicles, energy, fleet and targets, depots and grid, emissions, benchmark, File 1 row, sources and assumptions, lessons for Madrid.
- `outputs/File_1_paris_row.csv`: the Paris row, with the exact File 1 columns, to append to the team's `File_1.csv`.
- `outputs/paris_perimeter_lines.csv`: the 290 lines in the perimeter and their contract lot.
- `outputs/paris_bus_lines.csv`: per line: trips, daily km, in-motion peak, share of km.
- `outputs/paris_energy_model.csv`: per line: estimated buses, km and kWh per bus per day, range screen.
- `outputs/paris_vehicles_in_service_by_minute.csv`, `paris_fleet_mix.csv`, `benchmark_madrid_vs_paris.csv`.
- `outputs/fig_*.png`: three charts.

## Data
- `data/IDFM-gtfs.zip`: IDFM GTFS Datahub, downloaded 2026-11-19 from
  https://prim.iledefrance-mobilites.fr/en/jeux-de-donnees/offre-horaires-tc-gtfs-idfm (ODbL).
  It is 113 MB, above GitHub's 100 MB limit, so commit it with Git LFS (as for `Brussels/data/netex-tec.zip`) or leave it out and keep the URL and download date. The feed covers only about 30 days ahead and is overwritten, so keep a copy.
- The notebook also reads `../Madrid/data/GTFS.zip`, `../Madrid/outputs/File_2.csv` and `File_4.csv`, and `../Brussels/outputs/` from the repo.

## Before submission
- Re-check that there was no strike or disruption on the reference day, Tue 24 Nov 2026. If there was one, set `PAR_REF = "20261201"` and re-run; all Tuesdays in the feed have the same timetable.
- The brief asks for a Colab-executed notebook: upload this folder and run all cells in Colab, then download the .ipynb.
