"""Reduce the full VBB GTFS feed to the BVG bus extract used by berlin_model.ipynb.

The full feed (~640 MB unzipped, stop_times.txt alone ~400 MB) is too large for the repository.
Download it from https://vbb.de/vbb-services/api-open-data/datensaetze/ (GTFS), unzip it, then run:

    python make_gtfs_extract.py <path/to/unzipped/gtfs> [reference_date YYYY-MM-DD]

Kept: agency 796 (Berliner Verkehrsbetriebe), route_type 700 (bus); all their trips, calendar and
calendar_dates; stop_times and shapes only for the trips active on the reference day; the stops they
use plus the stops at the bus depots. Output: vbb_gtfs_bvg_bus_extract.zip (next to this script)
"""
import sys, os, zipfile
import pandas as pd

G = sys.argv[1] if len(sys.argv) > 1 else 'gtfs'
REF = pd.Timestamp(sys.argv[2] if len(sys.argv) > 2 else '2026-11-24')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vbb_gtfs_bvg_bus_extract.zip')
rd = lambda f, **k: pd.read_csv(os.path.join(G, f), dtype=str, **k)

routes = rd('routes.txt'); routes = routes[(routes.agency_id == '796') & (routes.route_type == '700')]
trips = rd('trips.txt'); trips = trips[trips.route_id.isin(routes.route_id)]
cal = rd('calendar.txt'); cal = cal[cal.service_id.isin(trips.service_id)]
cd = rd('calendar_dates.txt'); cd = cd[cd.service_id.isin(trips.service_id)]

ds, dw = REF.strftime('%Y%m%d'), REF.day_name().lower()
active = set(cal[(cal[dw] == '1') & (cal.start_date <= ds) & (cal.end_date >= ds)].service_id)
e = cd[cd.date == ds]
active = (active | set(e[e.exception_type == '1'].service_id)) - set(e[e.exception_type == '2'].service_id)
ref_trips = set(trips[trips.service_id.isin(active)].trip_id)
print('Reference day', REF.date(), '| BVG bus trips active:', len(ref_trips))

st = pd.concat(ch[ch.trip_id.isin(ref_trips)] for ch in rd('stop_times.txt', chunksize=4_000_000))
need = set(trips[trips.trip_id.isin(ref_trips)].shape_id)
sh = pd.concat(ch[ch.shape_id.isin(need)] for ch in rd('shapes.txt', chunksize=5_000_000))
stops = rd('stops.txt')
depot_like = stops.stop_name.str.contains('Betriebshof|Omnibushof|Säntisstr|Köpenicker Landstr|Westfälische Str|U Seestr', na=False)
stops = stops[stops.stop_id.isin(st.stop_id) | depot_like]
agency = rd('agency.txt'); agency = agency[agency.agency_id == '796']

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for name, df in [('agency', agency), ('routes', routes), ('trips', trips), ('calendar', cal), ('calendar_dates', cd),
                     ('stop_times', st), ('shapes', sh), ('stops', stops)]:
        z.writestr(name + '.txt', df.to_csv(index=False)); print(f'{name:15s} {len(df):>9,} rows')
    z.writestr('README.txt', f'Extract of the VBB GTFS feed for BVG buses, reference day {REF.date()}. Built by make_gtfs_extract.py.\n'
               'Source: https://vbb.de/vbb-services/api-open-data/datensaetze/ (feed downloaded 2026-11-18, valid 2026-11-18 to 2027-12-11).\n')
print('Written', OUT, f'({os.path.getsize(OUT) / 1e6:.1f} MB)')
