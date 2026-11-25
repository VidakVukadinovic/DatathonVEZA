"""Build the VEZA BI dashboard (Deliverable 3) with Apache ECharts + MapLibre GL.
Reads Files 1-4 (+ supplementary S2/S3 CSVs) and writes ONE self-contained HTML with all data embedded.
Run:  python make_bi_echarts.py   (no extra packages needed: standard library only)
"""
import csv, json, os

# --- where the data is: works from build_scripts/ (submission layout) or from a bi/ folder that has outputs/ next to the script
HERE = os.path.dirname(os.path.abspath(__file__))
if os.environ.get('VEZA_BASE'): B = os.environ['VEZA_BASE']
elif os.path.isdir(os.path.join(HERE, 'outputs')): B = HERE
else: B = os.path.abspath(os.path.join(HERE, '..'))
OUT = os.path.join(HERE, 'VEZA_EMT_BI_Dashboard.html') if os.path.basename(HERE) == 'bi' else os.path.join(B, 'bi', 'VEZA_EMT_BI_Dashboard.html')

def num(v, key=None, keep_str=()):
    if key in keep_str: return v
    if v is None or v == '': return None
    try:
        f = float(v); return int(f) if f.is_integer() and '.' not in v and 'e' not in v.lower() else f
    except ValueError: return v
def read(name, keep_str=()):
    with open(os.path.join(B, 'outputs', name), encoding='utf-8') as fh:
        return [{k: num(v, k, keep_str) for k, v in r.items()} for r in csv.DictReader(fh)]

f1, f2, f3, f4 = read('File_1.csv'), read('File_2.csv', keep_str=('line_id',)), read('File_3.csv'), read('File_4.csv')
geo = json.load(open(os.path.join(B, 'outputs', 'bi_route_geometry.json'), encoding='utf-8'))   # {line_id: [[[lat, lon], ...], ...]}
s3 = [r for r in read('supp_s3_lifecycle_2026_2040.csv') if r['year'] <= 2038]; s2 = read('supp_s2_grid_paced.csv')
dr_rows = read('supp_s3_depot_ratio.csv'); idx = list(dr_rows[0].keys())[0]
dr = {'years': [int(r[idx]) for r in dr_rows], **{c: [r[c] for r in dr_rows] for c in dr_rows[0] if c != idx}}
cmp_rows = read('supp_scenario_comparison.csv'); cidx = list(cmp_rows[0].keys())[0]
cmp = {'rows': [r[cidx] for r in cmp_rows], 'cols': [c for c in cmp_rows[0] if c != cidx], 'vals': [[r[c] for c in cmp_rows[0] if c != cidx] for r in cmp_rows]}

geo_ll = {k: [[[round(p[1], 5), round(p[0], 5)] for p in part] for part in v] for k, v in geo.items()}   # -> [lon, lat]
SUPP = {'s3': s3, 's2': s2, 'dr': dr, 'cmp': cmp}
DATA = json.dumps({'f1': f1, 'f2': f2, 'f3': f3, 'f4': f4, 'geo': geo_ll, 'supp': SUPP}, ensure_ascii=False, separators=(',', ':'))

HTML = r"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>VEZA · EMT Madrid zero-emission bus transition — BI dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css">
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{--mad:#003da5;--mad-d:#002a73;--mad-l:#e8effb;--mad-xl:#f4f7fc;--ink:#0f1e3c;--muted:#5a6b85;--line:#dde4ef;--red:#c0392b;--amber:#f0a202;--green:#2e9e5b;--grey:#8796a5;--r:14px}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font-family:'Roboto',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--mad-xl);-webkit-font-smoothing:antialiased}
a{color:var(--mad)}
/* top bar + sticky nav */
.topbar{background:var(--mad-d);color:#cfe0ff;font-size:12px;padding:6px 32px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.nav{position:sticky;top:0;z-index:50;background:#fff;border-bottom:1px solid var(--line);box-shadow:0 2px 10px rgba(0,40,110,.06)}
.nav-in{max-width:1440px;margin:0 auto;display:flex;align-items:center;gap:22px;padding:0 32px;height:68px}
.brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:var(--ink);cursor:pointer;flex-shrink:0}
.brand-mark{width:38px;height:38px;border-radius:10px;background:var(--mad);color:#fff;display:grid;place-items:center;font-weight:800;font-size:15px;letter-spacing:.5px}
.brand b{display:block;font-size:15px;line-height:1.1}.brand span{font-size:11.5px;color:var(--muted)}
.links{display:flex;gap:4px;margin-left:auto;flex-wrap:wrap}
.links a{text-decoration:none;color:var(--ink);font-weight:600;font-size:14px;padding:9px 13px;border-radius:9px;display:flex;align-items:center;gap:7px}
.links a:hover{background:var(--mad-l);color:var(--mad)}
.links a.on{background:var(--mad);color:#fff}
.links small{font-weight:500;opacity:.7;font-size:11px}
/* pages */
main{max-width:1440px;margin:0 auto;padding:0 32px 40px}
.page{display:none;animation:fade .25s ease}.page.on{display:block}
@keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.crumb{font-size:12.5px;color:var(--muted);margin:22px 0 6px}.crumb a{text-decoration:none;cursor:pointer}
.ph{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:16px}
.ph h2{margin:0;font-size:28px;font-weight:800;letter-spacing:-.3px}.ph p{margin:6px 0 0;color:var(--muted);font-size:14px;max-width:820px;line-height:1.5}
.card{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:18px 20px;box-shadow:0 1px 2px rgba(15,30,60,.04)}
/* hero */
.hero{margin:0 -32px;border-radius:0 0 22px 22px;padding:56px 32px 70px;background:linear-gradient(120deg,var(--mad-d) 0%,var(--mad) 60%,#1f6feb 100%);color:#fff;position:relative;overflow:hidden}
.hero:after{content:'';position:absolute;right:-120px;top:-120px;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.14),rgba(255,255,255,0) 70%)}
.hero-in{max-width:1440px;margin:0 auto;position:relative;z-index:1}
.eyebrow{display:inline-block;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);padding:5px 12px;border-radius:30px;font-size:12.5px;font-weight:600;margin-bottom:16px}
.hero h1{font-size:46px;line-height:1.08;margin:0 0 14px;font-weight:800;letter-spacing:-1px;max-width:900px}
.hero p{font-size:17px;color:#d8e5ff;max-width:760px;line-height:1.55;margin:0 0 26px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.btn{border:0;cursor:pointer;font:inherit;font-weight:700;font-size:15px;padding:13px 22px;border-radius:11px;text-decoration:none;display:inline-flex;align-items:center;gap:8px}
.btn.pri{background:#fff;color:var(--mad)}.btn.sec{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.35)}
.btn:hover{transform:translateY(-1px)}
.verdict{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:-40px;position:relative;z-index:2}
.vcard{background:#fff;border-radius:var(--r);padding:18px 20px;box-shadow:0 8px 24px rgba(0,40,110,.10);border-top:5px solid var(--grey)}
.vcard .tag{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}
.vcard b{display:block;font-size:30px;font-weight:800;margin:2px 0 4px}.vcard span{font-size:13.5px;color:var(--muted);line-height:1.5}
.vcard.no{border-color:var(--red)}.vcard.no .tag{color:var(--red)}.vcard.mid{border-color:var(--amber)}.vcard.mid .tag{color:#b47a00}
.vcard.yes{border-color:var(--mad);background:var(--mad-l)}.vcard.yes .tag,.vcard.yes b{color:var(--mad)}
.sect-t{font-size:20px;font-weight:800;margin:34px 0 14px}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.tile{background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:20px;cursor:pointer;transition:.15s;text-decoration:none;color:var(--ink);display:flex;flex-direction:column;gap:8px}
.tile:hover{border-color:var(--mad);box-shadow:0 8px 22px rgba(0,61,165,.12);transform:translateY(-2px)}
.tile .ic{width:44px;height:44px;border-radius:11px;background:var(--mad-l);display:grid;place-items:center;font-size:22px}
.tile b{font-size:16px}.tile span{font-size:13px;color:var(--muted);line-height:1.45}.tile em{font-style:normal;color:var(--mad);font-weight:700;font-size:13px;margin-top:auto}
.figs{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
.fig{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px 16px}.fig b{display:block;font-size:24px;font-weight:800;color:var(--mad)}.fig span{font-size:12px;color:var(--muted)}
/* controls / charts */
.banner{background:#fff8e6;border:1px solid #f3dc9b;border-radius:11px;padding:11px 15px;font-size:13.5px;margin-bottom:14px;line-height:1.5}
.banner.blue{background:var(--mad-l);border-color:#c3d4f3}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.chart{height:380px;width:100%}.chart.tall{height:430px}
.slider{display:flex;align-items:center;gap:18px;background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:12px 18px;margin-bottom:14px;flex-wrap:wrap;position:sticky;top:76px;z-index:20;box-shadow:0 4px 14px rgba(0,40,110,.06)}
.slider input[type=range]{flex:1;min-width:260px;accent-color:var(--mad);height:6px}
.slider .yr{font-size:30px;font-weight:800;color:var(--mad);min-width:80px}
.ticks{display:flex;gap:6px;flex-wrap:wrap}.ticks button{border:1px solid var(--line);background:#fff;border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;color:var(--ink)}
.ticks button:hover{border-color:var(--mad);color:var(--mad)}
.kpis{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin-bottom:16px}
.kpi{background:#fff;border:1px solid var(--line);border-radius:12px;padding:11px 14px}
.kpi b{display:block;font-size:20px;font-weight:800}.kpi span{font-size:11.5px;color:var(--muted)}
.ctrl{margin:0 0 12px;font-size:13.5px;display:flex;gap:18px;flex-wrap:wrap;align-items:center}.ctrl label{cursor:pointer}
.seg{display:inline-flex;background:var(--mad-l);border-radius:10px;padding:3px}.seg label{padding:6px 12px;border-radius:8px;font-weight:600}.seg input{display:none}
.seg label:has(input:checked){background:var(--mad);color:#fff}
#map{height:660px;border-radius:var(--r);border:1px solid var(--line);position:relative;overflow:hidden}
.legend{position:absolute;left:12px;bottom:30px;z-index:2;background:#fff;padding:11px 13px;border-radius:11px;font-size:12px;line-height:1.6;box-shadow:0 4px 14px rgba(0,0,0,.15);max-width:240px}
.sw{display:inline-block;width:18px;height:4px;margin-right:7px;vertical-align:middle;border-radius:2px}
.dot{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:7px;vertical-align:middle}
.depot{border-radius:50%;cursor:pointer}
.dlabel{font:700 12.5px 'Inter',sans-serif;white-space:nowrap;background:rgba(255,255,255,.92);padding:2px 7px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.18);pointer-events:none;z-index:5}
.maplibregl-popup-content{font:12.5px/1.55 'Roboto',sans-serif;max-width:310px;border-radius:10px}
table{border-collapse:collapse;font-size:12.5px;width:100%}th,td{border-bottom:1px solid var(--line);padding:7px 9px;text-align:right}th:first-child,td:first-child{text-align:left}
th{background:var(--mad-l);color:var(--mad-d);position:sticky;top:0;cursor:pointer;font-weight:700}tr:hover td{background:var(--mad-xl)}
.tbl{max-height:440px;overflow:auto;border:1px solid var(--line);border-radius:12px;background:#fff}
.note{font-size:12.5px;color:var(--muted);margin-top:8px;line-height:1.55}
.pill{display:inline-block;padding:2px 8px;border-radius:9px;color:#fff;font-size:11px;font-weight:700}
.tl{list-style:none;padding:0;margin:0;font-size:13.5px}.tl li{padding:9px 0;border-bottom:1px dashed var(--line);display:flex;gap:12px}.tl b{color:var(--mad);min-width:78px;flex-shrink:0}
h1,h2,h3,.brand b,.vcard b,.fig b,.kpi b,.slider .yr,.tile b,.sect-t,.btn{font-family:'Inter','Roboto',sans-serif;letter-spacing:-.2px}
h3{margin:4px 0 10px;font-size:16px;font-weight:800}
footer{background:var(--mad-d);color:#b9ccf0;font-size:12.5px;padding:26px 32px;margin-top:30px}footer .in{max-width:1440px;margin:0 auto;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;line-height:1.6}
@media(max-width:1100px){.verdict,.tiles,.grid2{grid-template-columns:1fr}.figs,.kpis{grid-template-columns:repeat(2,1fr)}.hero h1{font-size:34px}.links small{display:none}}
</style></head><body>
<div class="topbar"><span>IE Sustainability Datathon 2026 · Kearney challenge · Team VEZA</span><span>Data: EMT Madrid open data, GTFS 6-Nov-2026 · Files 1–4</span></div>
<div class="nav"><div class="nav-in">
 <a class="brand" data-go="home"><div class="brand-mark">EMT</div><div><b>Madrid Zero-Emission Buses</b><span>Electrification dashboard</span></div></a>
 <div class="links">
  <a data-go="home">Home</a><a data-go="roadmap">Roadmap 2038</a><a data-go="map">Map <small>(i)(ii)</small></a><a data-go="benchmark">Benchmark <small>(iii)</small></a><a data-go="scenarios">Scenarios <small>(iv)</small></a><a data-go="data">Data</a>
 </div></div></div>

<main>
<div class="page on" id="p-home">
 <div class="hero"><div class="hero-in">
  <span class="eyebrow">EMT Madrid · 234 lines · 2,210 buses · 5 depots</span>
  <h1>A zero-emission bus fleet for Madrid, built on a plan the grid can follow</h1>
  <p>100 % by 2030 cannot be delivered. 2033 is possible only if everything goes right. We recommend a realistic path that reaches 100 % in 2038 without scrapping young buses.</p>
  <div class="btns"><a class="btn pri" data-go="roadmap">See the 2038 plan →</a><a class="btn sec" data-go="map">Explore lines &amp; depots</a></div>
 </div></div>
 <div class="verdict">
  <div class="vcard no"><div class="tag">S1 · mandatory stress test</div><b>2030 ✕</b><span>~420 e-buses/yr vs a record of 115 · +23 MW of grid with 3–10-year lead times · La Elipa only back in 2029 · €340 M peak year · 1,645 CNG buses scrapped early (€194 M)</span></div>
  <div class="vcard mid"><div class="tag">S2 · earliest credible</div><b>2033</b><span>Only if 300 e-buses/yr are delivered, the grid upgrades arrive on time and ~€220 M/yr is funded. Still €133 M of CNG written off.</span></div>
  <div class="vcard yes"><div class="tag">S3 · our recommendation</div><b>2038 ✓</b><span>No new CNG · 150 e-buses/yr from 2029 · CNG retired at ≈13 years · peak €145 M/yr · no depot over its grid limit with mitigations</span></div>
 </div>
 <div class="sect-t">Key figures</div>
 <div class="figs" id="figs"></div>
 <div class="sect-t">Explore the dashboard</div>
 <div class="tiles">
  <a class="tile" data-go="roadmap"><div class="ic">📈</div><b>Roadmap 2026–2038</b><span>Year-by-year plan with a slider: fleet, spending, CO₂ and depot grid stress.</span><em>Open →</em></a>
  <a class="tile" data-go="map"><div class="ic">🗺️</div><b>Lines &amp; depots</b><span>Views (i)+(ii): every route by electrification year or charging strategy, depot readiness.</span><em>Open →</em></a>
  <a class="tile" data-go="benchmark"><div class="ic">🇪🇺</div><b>European benchmark</b><span>View (iii): Madrid vs Brussels, London, Berlin and Helsinki.</span><em>Open →</em></a>
  <a class="tile" data-go="scenarios"><div class="ic">⚖️</div><b>Scenarios S0 vs S1</b><span>View (iv): the two File 4 paths for 2026–2035.</span><em>Open →</em></a>
 </div>
</div>

<div class="page" id="p-roadmap"><div class="crumb"><a data-go="home">Home</a> › Roadmap 2026–2038</div>
 <div class="ph"><div><h2>Roadmap 2026–2038: the recommended plan</h2><p>No new CNG bus, 150 e-buses a year from 2029, and every CNG bus retired at the end of its life. Drag the year to follow the plan.</p></div></div>
 <div class="banner blue"><b>Supplementary analysis, not part of Files 1–4.</b> Same engine, prices, energy, depot and grid functions as File 4, with the horizon extended to 2038 so the full CNG lifecycle is visible. Move the slider to follow the plan year by year.</div>
 <div class="slider"><span class="yr" id="ryl">2030</span><input type="range" id="ry" min="2026" max="2038" value="2030"><div class="ticks"><button data-y="2026">2026 start</button><button data-y="2029">2029 La Elipa</button><button data-y="2030">2030</button><button data-y="2033">2033 grid live</button><button data-y="2038">2038 100 %</button></div></div>
 <div class="kpis" id="rk"></div>
 <div class="grid2"><div class="card"><div id="e_paths" class="chart tall"></div></div><div class="card"><div id="e_dep_year" class="chart tall"></div></div></div>
 <div class="grid2"><div class="card"><div id="e_s3fleet" class="chart"></div></div><div class="card"><div id="e_dep_time" class="chart"></div></div></div>
 <div class="grid2"><div class="card"><h3>Scenario comparison (2026–2035 unless stated)</h3><div class="tbl" id="tb_cmp"></div></div>
 <div class="card"><h3>Charging mitigations, because infrastructure won't follow on its own</h3><ul class="tl">
  <li><b>2026–27</b> Smart (managed) charging at every depot; freeze CNG purchases; file grid applications for all four live depots in 2027, sized for 2038</li>
  <li><b>2028</b> Fuencarral pinch point (0.94×): cap per-bus charge power and hold new deliveries there</li>
  <li><b>2029</b> La Elipa reopens (20 MW, 318 places): lines rebalanced, Fuencarral falls to 0.69×</li>
  <li><b>2031</b> Sanchinarro: terminal chargers on its 6 long lines (≈15 % of energy) + day-charged battery (≈1 MW)</li>
  <li><b>2032–34</b> +5 MW each at Carabanchel, Fuencarral and Entrevías, and +4 MW at Sanchinarro (2032); Sanchinarro phase 2 +4 MW (2034)</li>
  <li><b>Buffer</b> La Elipa keeps ≈9.6 MW of headroom even in 2038</li>
  <li><b style="color:var(--red)">If late</b> Slow that depot's e-bus intake and keep its CNG buses a year longer; nothing is scrapped early</li></ul>
 <p class="note">Peers: London (smart charging; Southall 500 kVA + 1.2 MWh battery; 3–10-year grid lead times) · Berlin (line 200 terminal charging, 2×450 kW) · Brussels (moved 2030 to 2035; depot projects ~4 years) · Helsinki (ZE minimums in every tender). Mitigation sizes are planning assumptions (register A37–A39).</p></div></div>
 <p class="note">Sources: outputs/supp_s3_lifecycle_2026_2040.csv, supp_s3_depot_ratio.csv, supp_s2_grid_paced.csv, supp_scenario_comparison.csv; S0/S1 from File_4.csv. Capex is constant 2025 €, ex-VAT: buses + chargers + depot civil works + grid at €0.5 M/MW.</p>
</div>

<div class="page" id="p-map"><div class="crumb"><a data-go="home">Home</a> › Lines &amp; depots</div>
 <div class="ph"><div><h2>Lines &amp; depots</h2><p>Views (i) and (ii): all 234 EMT routes and the five depots, with readiness of each depot's grid connection.</p></div></div>
 <div class="banner">Brief view: lines are coloured by their <b>S1 electrification year (2026–2030, File 2)</b>. S1 is the mandatory stress test, not our recommendation. See the Roadmap tab for the 2038 plan.</div>
 <div class="ctrl"><b>Colour lines by:</b><label><input type="radio" name="mode" value="year" checked> S1 electrification year</label><label><input type="radio" name="mode" value="strategy"> charging strategy</label>
  <span><b>Show lines electrified by ≤</b> <input type="range" id="yr" min="2026" max="2030" value="2030"> <span id="yrl">2030</span></span>
  <label><input type="checkbox" id="spokes" checked> line → depot links</label></div>
 <div id="map"><div class="legend" id="legend"></div></div>
 <p class="note">Depot circle size ∝ buses_assigned (Σ peak_buses, active requirement; reserves not included). <b>Solid filled</b> circle = Evidenced connection; <b>white circle with a dashed ring</b> = Estimated (proxy). Green Ready · Amber Upgrade · Red Critical (Rule 4: managed MW vs connection; ≤1×, ≤1.5×, &gt;1.5×). La Elipa 20 MW is the planned ceiling of the new centre (closed since 2022, reopening ~2029). Hover a line or click a depot for its File 2 / File 3 values.</p>
</div>

<div class="page" id="p-benchmark"><div class="crumb"><a data-go="home">Home</a> › European benchmark</div>
 <div class="ph"><div><h2>Madrid vs European capitals</h2><p>View (iii): fleet, zero-emission share, intensity of use, energy and grid carbon, and published targets (File 1).</p></div></div><div class="grid2"><div class="card"><div id="e_ze" class="chart"></div></div><div class="card"><div id="e_km" class="chart"></div></div></div>
 <div class="grid2"><div class="card"><div id="e_en" class="chart"></div></div><div class="card"><div id="e_tgt" class="chart"></div></div></div>
 <div class="tbl" id="tb1"></div>
 <p class="note">ZE = battery-electric + hydrogen fuel cell only (hybrids, CNG and biomethane excluded). Madrid and Berlin have no official 100 % zero-tailpipe target (empty in File 1). Brussels is recomputed from GTFS in the notebook; London/Berlin daily km are proxies from official annual km; the Helsinki fleet is a proxy (600 ZE ÷ 52 %). Grid intensity: Madrid REE 2025 (fixed parameter), peers Ember 2025.</p></div>

<div class="page" id="p-scenarios"><div class="crumb"><a data-go="home">Home</a> › Scenarios</div>
 <div class="ph"><div><h2>Scenarios S0 vs S1, 2026–2035</h2><p>View (iv): the two scenarios required in File 4.</p></div></div><div class="banner">Brief view (iv): the two File 4 scenarios, 2026–2035. S1 = 100 % zero-emission by 31-Dec-2030 (mandatory stress test); S0 = plan-based continuation. Our recommended 2038 plan is in the Roadmap tab.</div>
 <div class="grid2"><div class="card"><div id="e_sh" class="chart"></div></div><div class="card"><div id="e_fl" class="chart"></div></div></div>
 <div class="grid2"><div class="card"><div id="e_co2" class="chart"></div></div><div class="card"><div id="e_cx" class="chart"></div></div></div>
 <p class="note">S0 = adjusted pace 70/115/95 e-buses per year (unadjusted 2021–25 pace = 77/yr). CO₂ = CNG tank-to-wheel + electricity generation (REE 2025, constant). Capex = buses + chargers + depot civil works + grid reinforcement, constant 2025 €, ex-VAT, undiscounted.</p></div>

<div class="page" id="p-data"><div class="crumb"><a data-go="home">Home</a> › Data</div>
 <div class="ph"><div><h2>Data tables</h2><p>Files 1–4 exactly as submitted. Click a column header to sort.</p></div></div><h3>File 3: depots</h3><div class="tbl" id="tb3"></div><h3>File 4: trajectories</h3><div class="tbl" id="tb4"></div><h3>File 2: lines (click a header to sort)</h3><div class="tbl" id="tb2"></div></div>
</main>
<footer><div class="in"><div><b style="color:#fff">Team VEZA</b> · IE Sustainability Datathon 2026 (Kearney challenge)<br>Independent student analysis, not an official publication of EMT or the City of Madrid.</div>
<div>Sources: EMT Madrid open data &amp; GTFS · REE 2025 · MITECO · STIB, TfL, BVG, HSL · Ember/OWID<br>Views (i)–(iv) = Files 1–4 exactly; Roadmap = supplementary notebook §7d–7d-ter.</div></div></footer>
<script>
const D = __DATA__;
const YC={2026:'#1a9850',2027:'#91cf60',2028:'#d9b300',2029:'#fc8d59',2030:'#d73027'};
const SC={Depot:'#8796a5',Opportunity:'#7b2cbf',Not_feasible:'#000000'};
const RC={Ready:'#2e9e5b',Upgrade:'#f0a202',Critical:'#c0392b'};
const PC={S0:'#8796a5',S1:'#c0392b',S2:'#f0a202',S3:'#003da5'};const MAD='#003da5';
const fmt=(v,d=0)=>v==null||Number.isNaN(v)?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
const BASE={textStyle:{fontFamily:"'Roboto',system-ui,sans-serif"},grid:{left:16,right:20,top:78,bottom:56,containLabel:true},tooltip:{trigger:'axis'},legend:{bottom:0,type:'plain',itemGap:14,itemWidth:18,textStyle:{fontSize:11.5}}};
const T=(t,s)=>({text:t,subtext:s||'',left:0,textStyle:{fontSize:15,fontWeight:700,fontFamily:"'Inter','Roboto',sans-serif",color:'#0f1e3c'},itemGap:6,subtextStyle:{fontSize:11.5,color:'#5a6b85',width:620,overflow:'truncate'}});
const charts={};
function axName(ax,i){if(!ax||!ax.name)return ax;return Object.assign({nameLocation:'middle',nameGap:i?44:48,nameRotate:i?-90:90,nameTextStyle:{color:'#5a6b85',fontSize:11.5}},ax);}
function mk(id,opt){const c=echarts.init(document.getElementById(id));const o=Object.assign({},BASE,opt);
 if(Array.isArray(o.yAxis)){o.yAxis=o.yAxis.map(axName);o.grid=Object.assign({},BASE.grid,{left:30,right:34},opt.grid||{});}
 if(o.legend&&o.legend.show!==false)o.legend=Object.assign({},BASE.legend,opt.legend||{});
 c.setOption(o);charts[id]=c;return c;}

// navigation (hash routing, back button works)
let mapReady=false;
const PAGES=['home','roadmap','map','benchmark','scenarios','data'];
function go(p){if(!PAGES.includes(p))p='home';document.querySelectorAll('.page').forEach(e=>e.classList.toggle('on',e.id==='p-'+p));
 document.querySelectorAll('.links a').forEach(a=>a.classList.toggle('on',a.dataset.go===p));
 if(location.hash!=='#'+p)history.replaceState(null,'','#'+p);window.scrollTo({top:0});
 setTimeout(()=>{Object.values(charts).forEach(c=>c.resize());if(p==='map'){if(!mapReady)initMap();else map.resize();}},30);}
document.addEventListener('click',e=>{const a=e.target.closest('[data-go]');if(a){e.preventDefault();history.pushState(null,'','#'+a.dataset.go);go(a.dataset.go);}});
window.addEventListener('popstate',()=>go(location.hash.slice(1)));
window.addEventListener('resize',()=>Object.values(charts).forEach(c=>c.resize()));

// ===================== ROADMAP (supplementary) =====================
const SP=D.supp, S3=SP.s3, YR=S3.map(r=>r.year);
const byYear=(arr,k)=>YR.map(y=>{const r=arr.find(x=>x.year===y);return r?r[k]:null;});
const f4=(s,k)=>D.f4.filter(r=>r.scenario===s);
const s1sh=YR.map(y=>{const r=D.f4.find(x=>x.scenario===1&&x.year===y);return r?r.ze_share_pct:100;});   // S1 stays 100 % after 2035
const s0sh=YR.map(y=>{const r=D.f4.find(x=>x.scenario===0&&x.year===y);return r?r.ze_share_pct:null;}); // S0 modelled to 2035 only
const s2sh=YR.map(y=>{const r=SP.s2.find(x=>x.year===y);return r?r.ze_share_pct:100;});
const pathsChart=mk('e_paths',{title:T('Zero-emission share of the fleet: four paths','S0/S1 from File 4 (to 2035) · S2/S3 supplementary'),
 tooltip:{trigger:'axis',valueFormatter:v=>v==null?'—':v.toFixed(1)+' %'},xAxis:{type:'category',data:YR},yAxis:{type:'value',max:100,axisLabel:{formatter:'{value} %'}},
 series:[{name:'S1: 2030 stress test',type:'line',data:s1sh,color:PC.S1,symbolSize:5},
  {name:'S2: earliest credible 2033',type:'line',data:s2sh,color:PC.S2,lineStyle:{type:'dashed'},symbolSize:5},
  {name:'S3: our plan, 2038',type:'line',data:byYear(S3,'ze_share_pct'),color:PC.S3,lineStyle:{width:4},symbolSize:7,
   endLabel:{show:true,formatter:'100 % in 2038',color:MAD,fontWeight:700,offset:[-96,-14]},
   markLine:{silent:true,symbol:'none',label:{formatter:'{b}',position:'end',color:'#0f1e3c',fontWeight:600},lineStyle:{color:'#14213d',type:'solid',width:1},data:[{name:'2030',xAxis:'2030'}]}},
  {name:'S0: plan-based (to 2035)',type:'line',data:s0sh,color:PC.S0,symbolSize:5}]});
mk('e_s3fleet',{title:T('S3: e-buses bought each year and CNG buses left','No new CNG bus is ever bought; the last CNG cohort (2023) retires in 2038'),
 xAxis:{type:'category',data:YR},yAxis:[{type:'value',name:'buses bought'},{type:'value',name:'CNG buses left',splitLine:{show:false}}],
 series:[{name:'New e-buses',type:'bar',stack:'a',data:byYear(S3,'ze_bought'),color:PC.S3},{name:'E-bus renewals',type:'bar',stack:'a',data:byYear(S3,'ze_renewal'),color:'#8fb0e8'},
  {name:'CNG buses left',type:'line',yAxisIndex:1,data:byYear(S3,'n_cng'),color:'#5b7083',symbolSize:5}]});
const DEP_ORDER=['Sanchinarro','Entrevías','Carabanchel','Fuencarral','La Elipa'];
const DCOL={'Carabanchel':'#1f77b4','Fuencarral':'#ff7f0e','La Elipa':'#2ca02c','Entrevías':'#d62728','Sanchinarro':'#9467bd'};
const depSeries=[];DEP_ORDER.forEach(d=>{depSeries.push({name:d,type:'line',data:SP.dr[d+' (mitigated)'],color:DCOL[d],symbolSize:4});
 if(d!=='La Elipa')depSeries.push({name:d+' (no action)',legendHoverLink:false,type:'line',data:SP.dr[d+' (no action)'],color:DCOL[d],lineStyle:{type:'dotted',width:1.2,opacity:.7},symbol:'none'});});
depSeries[0].markLine={silent:true,symbol:'none',lineStyle:{color:'#000',type:'dashed'},label:{formatter:'connection limit 1.0×',position:'insideStartTop',color:'#0f1e3c',backgroundColor:'rgba(255,255,255,.85)',padding:[2,4]},data:[{yAxis:1}]};
mk('e_dep_time',{title:T('S3 depot load ÷ grid connection over time','Solid = with mitigations · dotted = no action (all four live depots pass 1.0× in 2033)'),
 tooltip:{trigger:'axis',valueFormatter:v=>v==null?'closed':v.toFixed(2)+'×'},legend:{data:DEP_ORDER},
 xAxis:{type:'category',data:SP.dr.years.map(String)},yAxis:{type:'value',max:2.3,axisLabel:{formatter:'{value}×'}},series:depSeries});
const depYear=mk('e_dep_year',{title:T('','Managed night load ÷ connection per depot · 1.0× = limit'),tooltip:{trigger:'axis',valueFormatter:v=>v==null?'closed (reopens 2029)':v.toFixed(2)+'×'},
 xAxis:{type:'category',data:DEP_ORDER},yAxis:{type:'value',max:2.3,axisLabel:{formatter:'{value}×'}},series:[]});
// KPIs + slider
function setYear(y){document.getElementById('ryl').textContent=y;document.getElementById('ry').value=y;const r=S3.find(x=>x.year===y);const i=SP.dr.years.indexOf(y);
 const na=DEP_ORDER.map(d=>SP.dr[d+' (no action)'][i]),mi=DEP_ORDER.map(d=>SP.dr[d+' (mitigated)'][i]);
 const live=[0,1,2,3];const wNa=Math.max(...live.map(k=>na[k])),wMi=Math.max(...live.map(k=>mi[k]));
 const k=[[r.ze_share_pct.toFixed(1)+' %','zero-emission share (S3)'],[fmt(r.ze_bought+r.ze_renewal),'e-buses bought this year'],[fmt(r.n_bev),'battery-electric buses'],
  [fmt(r.n_cng),'CNG buses left'],['€'+fmt(r.capex_meur)+' M','capex this year'],[fmt(r.co2_avoided_t/1000,1)+' kt','CO₂ avoided this year'],
  [wNa.toFixed(2)+'× → '+wMi.toFixed(2)+'×','worst depot: no action → mitigated']];
 document.getElementById('rk').innerHTML=k.map(([b,s],j)=>`<div class="kpi"><b style="color:${j===6?(wMi>1?'#c0392b':'#2e9e5b'):'#14213d'}">${b}</b><span>${s}</span></div>`).join('');
 depYear.setOption({title:{text:`Depot grid stress in ${y} (S3)`},series:[
  {name:'No action',type:'bar',data:na.map(v=>({value:v,itemStyle:{color:v==null?'#ccc':(v>1.5?'#c0392b':v>1?'#f0a202':'#9fb3c8')}})),label:{show:true,position:'top',formatter:p=>p.value==null?'closed':p.value.toFixed(2)+'×',fontSize:10},
   markLine:{silent:true,symbol:'none',lineStyle:{color:'#000',type:'dashed'},label:{formatter:'limit 1.0×',position:'insideEndTop',color:'#0f1e3c'},data:[{yAxis:1}]}},
  {name:'With mitigations',type:'bar',data:mi,color:MAD,label:{show:true,position:'top',formatter:p=>p.value==null?'':p.value.toFixed(2)+'×',fontSize:10}}]});
 pathsChart.setOption({series:[{},{},{markLine:{data:[{name:String(y),xAxis:String(y)}]}},{}]});}
document.getElementById('ry').oninput=e=>setYear(+e.target.value);setYear(2030);
document.querySelectorAll('.ticks button').forEach(b=>b.onclick=()=>{document.getElementById('ry').value=b.dataset.y;setYear(+b.dataset.y);});
(function(){const h=document.getElementById('tb_cmp');let s='<table><thead><tr><th></th>'+SP.cmp.cols.map(c=>`<th>${c}</th>`).join('')+'</tr></thead><tbody>';
 SP.cmp.rows.forEach((r,i)=>{s+=`<tr><td>${r}</td>`+SP.cmp.vals[i].map(v=>`<td>${v==null?'—':fmt(v,Number.isInteger(v)?0:1)}</td>`).join('')+'</tr>';});h.innerHTML=s+'</tbody></table>';})();

// ===================== MAP (views i + ii) =====================
const F2=Object.fromEntries(D.f2.map(r=>[r.line_id,r]));const DEP=Object.fromEntries(D.f3.map(r=>[r.depot_name,r]));
let map;
function lineTip(r){return `<b>Line ${r.line_id}</b><br>${fmt(r.daily_km,1)} km/day · peak buses ${r.peak_buses}<br>${fmt(r.km_per_bus_day,1)} km/bus/day (${r.bus_type})<br>${fmt(r.energy_kwh_bus_day,0)} kWh/bus/day · <b>${r.charging_strategy}</b><br>Depot: ${r.depot_name} · priority #${r.priority_rank} · S1 year <b>${r.electrification_year}</b><br>CO₂ avoided ${fmt(r.co2_avoided_t_year)} t/yr`;}
function depTip(d){const ev=d.connection_evidence==='Evidenced',ratio=d.peak_mw_managed/d.connection_mw_estimate;
 return `<b>${d.depot_name}</b> <span class="pill" style="background:${RC[d.readiness_status]}">${d.readiness_status}</span><br>${d.n_lines_assigned} lines · ${d.buses_assigned} buses assigned (Σ peak)<br>Night energy ${fmt(d.night_energy_mwh,1)} MWh<br>Managed ${fmt(d.peak_mw_managed,2)} MW · unmanaged ${fmt(d.peak_mw_unmanaged,1)} MW<br>Connection ${fmt(d.connection_mw_estimate,2)} MW: <b>${d.connection_evidence}</b>${ev?'':' (proxy, not verified)'}<br>Managed / connection = ${ratio.toFixed(2)}× · conversion year ${d.conversion_year}`;}
function lineFeatures(){const mode=document.querySelector('input[name=mode]:checked').value;const feats=[],sp=[];
 Object.keys(D.geo).forEach(l=>{const r=F2[l];if(!r)return;const c=mode==='year'?YC[r.electrification_year]:SC[r.charging_strategy];
  const w=mode==='strategy'&&r.charging_strategy!=='Depot'?4:2.2;
  feats.push({type:'Feature',properties:{id:l,year:r.electrification_year,c,w},geometry:{type:'MultiLineString',coordinates:D.geo[l]}});
  const p=D.geo[l][0],m=p[Math.floor(p.length/2)],d=DEP[r.depot_name];
  sp.push({type:'Feature',properties:{year:r.electrification_year,c:RC[d.readiness_status]},geometry:{type:'LineString',coordinates:[m,[d.longitude,d.latitude]]}});});
 return [{type:'FeatureCollection',features:feats},{type:'FeatureCollection',features:sp}];}
function legend(){const mode=document.querySelector('input[name=mode]:checked').value;
 let h=mode==='year'?'<b>S1 electrification year</b><br>'+Object.entries(YC).map(([y,c])=>`<span class="sw" style="background:${c}"></span>${y} (${D.f2.filter(r=>r.electrification_year==y).length} lines)`).join('<br>')
  :'<b>Charging strategy</b><br>'+Object.entries(SC).map(([k,c])=>`<span class="sw" style="background:${c}"></span>${k} (${D.f2.filter(r=>r.charging_strategy==k).length})`).join('<br>');
 h+='<hr style="border:0;border-top:1px solid #ddd"><b>Depot readiness (indicative)</b><br>'+Object.entries(RC).map(([k,c])=>`<span class="dot" style="background:${c}"></span>${k}`).join('<br>')
  +'<br><span class="dot" style="background:#777"></span>filled = Evidenced connection<br><span class="dot" style="background:#fff;border:2px dashed #777"></span>white, dashed = Estimated (proxy)';
 document.getElementById('legend').innerHTML=h;}
function refresh(){if(!map||!map.getSource('lines'))return;const [fc,sp]=lineFeatures();map.getSource('lines').setData(fc);map.getSource('spokes').setData(sp);
 const y=+document.getElementById('yr').value;document.getElementById('yrl').textContent=y;const flt=['<=',['get','year'],y];
 map.setFilter('lines',flt);map.setFilter('spokes',flt);map.setLayoutProperty('spokes','visibility',document.getElementById('spokes').checked?'visible':'none');legend();}
function initMap(){mapReady=true;
 map=new maplibregl.Map({container:'map',center:[-3.685,40.425],zoom:11.2,
  style:'https://tiles.openfreemap.org/styles/positron',attributionControl:{compact:true}});
 const OSM={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm',paint:{'raster-saturation':-0.85,'raster-opacity':0.85}}]};
 let fell=false;map.on('error',e=>{if(!fell&&!map.isStyleLoaded()){fell=true;map.setStyle(OSM);}});
 map.addControl(new maplibregl.NavigationControl(),'top-right');
 map.on('load',()=>{const [fc,sp]=lineFeatures();
  map.addSource('spokes',{type:'geojson',data:sp});map.addLayer({id:'spokes',type:'line',source:'spokes',paint:{'line-color':['get','c'],'line-width':.7,'line-opacity':.45,'line-dasharray':[2,3]}});
  map.addSource('lines',{type:'geojson',data:fc});map.addLayer({id:'lines',type:'line',source:'lines',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['get','c'],'line-width':['get','w'],'line-opacity':.85}});
  const pop=new maplibregl.Popup({closeButton:false,closeOnClick:false});
  map.on('mousemove','lines',e=>{map.getCanvas().style.cursor='pointer';const r=F2[e.features[0].properties.id];pop.setLngLat(e.lngLat).setHTML(lineTip(r)).addTo(map);});
  map.on('mouseleave','lines',()=>{map.getCanvas().style.cursor='';pop.remove();});
  D.f3.forEach(d=>{const ev=d.connection_evidence==='Evidenced',c=RC[d.readiness_status],sz=Math.round(14+Math.sqrt(d.buses_assigned)*1.5);
   const el=document.createElement('div');el.className='depot';el.title=d.depot_name;
   el.style.cssText+=`width:${sz}px;height:${sz}px;background:${ev?c:'#fff'};opacity:.92;border:4px ${ev?'solid':'dashed'} ${c};box-shadow:0 0 0 2px #fff`;
   new maplibregl.Marker({element:el}).setLngLat([d.longitude,d.latitude]).setPopup(new maplibregl.Popup({offset:sz/2}).setHTML(depTip(d))).addTo(map);
   });
  const LPOS={Fuencarral:'right',Carabanchel:'right','Entrevías':'left',Sanchinarro:'left','La Elipa':'left'};
  D.f3.forEach(d=>{const sz=Math.round(14+Math.sqrt(d.buses_assigned)*1.5),side=LPOS[d.depot_name]||'left';
   const lb=document.createElement('div');lb.className='dlabel';lb.innerHTML=`${d.depot_name} <span style="color:${RC[d.readiness_status]}">${(d.peak_mw_managed/d.connection_mw_estimate).toFixed(2)}×</span>`;
   new maplibregl.Marker({element:lb,anchor:side,offset:[side==='left'?sz/2+6:-(sz/2+6),0]}).setLngLat([d.longitude,d.latitude]).addTo(map);});
  refresh();});}
document.querySelectorAll('input[name=mode],#spokes').forEach(e=>e.onchange=refresh);document.getElementById('yr').oninput=refresh;legend();

// ===================== BENCHMARK (view iii) =====================
const C=D.f1.map(r=>r.city),hl=(v,i)=>({value:v,itemStyle:{color:C[i]==='Madrid'?MAD:'#b8c4d6'}});
mk('e_ze',{title:T('Zero-emission share of fleet (BEV + H₂), end-2025','Hover for ZE buses and the published 100 % target year'),tooltip:{trigger:'item',formatter:p=>{const r=D.f1[p.dataIndex];return `<b>${r.city}</b>: ${r.ze_share_pct} %<br>${r.ze_fleet} of ${fmt(r.fleet_total)} buses (${r.fleet_data_year})<br>100 % ZE target: ${r.ze_target_year??'none published'}`;}},
 grid:{left:16,right:40,top:78,bottom:20,containLabel:true},xAxis:{type:'value',max:100,axisLabel:{formatter:'{value} %'}},yAxis:{type:'category',data:C,inverse:true},
 series:[{type:'bar',data:D.f1.map(r=>r.ze_share_pct).map(hl),label:{show:true,position:'right',formatter:'{c} %'}}],legend:{show:false}});
mk('e_km',{title:T('Intensity of use','Weekday bus-km per fleet bus · lines per 100 buses'),xAxis:{type:'category',data:C},yAxis:[{type:'value',name:'km/bus/day'},{type:'value',name:'lines/100 buses',splitLine:{show:false}}],
 series:[{name:'Weekday km per fleet bus',type:'bar',data:D.f1.map(r=>+(r.daily_bus_km/r.fleet_total).toFixed(1)).map(hl)},{name:'Lines per 100 buses',type:'line',yAxisIndex:1,data:D.f1.map(r=>+(100*r.n_bus_lines/r.fleet_total).toFixed(1)),color:'#f0a202'}]});
mk('e_en',{title:T('Energy to electrify the whole network vs grid carbon','Full-BEV MWh/day (1.30 kWh/km, log scale) · grid g CO₂/kWh 2025'),xAxis:{type:'category',data:C},
 yAxis:[{type:'log',name:'MWh/day'},{type:'value',name:'g CO₂/kWh',splitLine:{show:false}}],
 series:[{name:'Full-BEV energy MWh/day',type:'bar',data:D.f1.map(r=>+r.energy_full_bev_mwh_day.toFixed(0)).map(hl)},{name:'Grid g CO₂/kWh',type:'line',yAxisIndex:1,data:D.f1.map(r=>r.grid_co2_g_kwh),color:'#f0a202'}]});
mk('e_tgt',{title:T('Published 100 % zero-emission target year','No bar = no official 100 % zero-tailpipe target (Madrid, Berlin)'),tooltip:{trigger:'item'},grid:{left:16,right:40,top:78,bottom:20,containLabel:true},
 xAxis:{type:'value',min:2025,max:2040,interval:5},yAxis:{type:'category',data:C,inverse:true},
 series:[{type:'bar',data:D.f1.map((r,i)=>({value:r.ze_target_year,itemStyle:{color:'#5b7083'}})),label:{show:true,position:'right'}},
  {type:'scatter',symbol:'diamond',symbolSize:16,color:MAD,name:'VEZA recommendation for Madrid',data:[[2038,'Madrid']],label:{show:true,position:'left',distance:10,formatter:'Our plan: 2038 (supplementary)',color:MAD,fontWeight:700}}],legend:{show:false}});

// ===================== SCENARIOS (view iv) =====================
const Y=[...new Set(D.f4.map(r=>r.year))];const S=(s,k)=>D.f4.filter(r=>r.scenario===s).map(r=>r[k]);
const two=(k,f=1,d=1)=>[{name:'S0 plan-based',type:'line',data:S(0,k).map(v=>+(v*f).toFixed(d)),color:PC.S0},{name:'S1 100 % by 2030',type:'line',data:S(1,k).map(v=>+(v*f).toFixed(d)),color:PC.S1}];
mk('e_sh',{title:T('Zero-emission share of fleet (%)','File 4'),xAxis:{type:'category',data:Y},yAxis:{type:'value',max:100,axisLabel:{formatter:'{value} %'}},series:two('ze_share_pct')});
mk('e_fl',{title:T('Fleet composition at year-end','H₂ = 10 buses in both scenarios (not shown)'),xAxis:{type:'category',data:Y},yAxis:{type:'value'},
 series:[['S0 BEV',0,'n_bev','#5b7083'],['S0 CNG',0,'n_cng','#c9d1d9'],['S1 BEV',1,'n_bev','#c0392b'],['S1 CNG',1,'n_cng','#f3b7ae']].map(([n,s,k,c])=>({name:n,type:'bar',stack:'s'+s,data:S(s,k),color:c}))});
mk('e_co2',{title:T('CO₂ emitted and avoided (kt/yr)','Dashed = avoided vs a fleet frozen at the 2025 ZE share'),xAxis:{type:'category',data:Y},yAxis:{type:'value'},
 series:[...two('co2_t',1/1000),{name:'S0 avoided',type:'line',data:S(0,'co2_avoided_t').map(v=>+(v/1000).toFixed(1)),color:PC.S0,lineStyle:{type:'dashed'}},{name:'S1 avoided',type:'line',data:S(1,'co2_avoided_t').map(v=>+(v/1000).toFixed(1)),color:PC.S1,lineStyle:{type:'dashed'}}]});
mk('e_cx',{title:T('Capex (M€/yr)','Constant 2025 €, ex-VAT'),xAxis:{type:'category',data:Y},yAxis:{type:'value'},series:two('capex_meur',1,0).map(s=>Object.assign(s,{type:'bar'}))});

// ===================== TABLES =====================
function table(el,rows,cols,dec){const h=document.getElementById(el);let s='<table><thead><tr>'+cols.map(c=>`<th data-c="${c}">${c}</th>`).join('')+'</tr></thead><tbody>';
 rows.forEach(r=>{s+='<tr>'+cols.map(c=>{let v=r[c];if(typeof v==='number'&&!c.includes('year')&&c!=='priority_rank'&&c!=='scenario')v=fmt(v,dec[c]??(Number.isInteger(v)?0:2));
  if(c==='readiness_status')v=`<span class="pill" style="background:${RC[r[c]]}">${r[c]}</span>`;return `<td>${v??''}</td>`}).join('')+'</tr>'});h.innerHTML=s+'</tbody></table>';
 h.querySelectorAll('th').forEach(th=>th.onclick=()=>{const c=th.dataset.c;const asc=!(h._s===c&&h._a);h._s=c;h._a=asc;rows.sort((a,b)=>(a[c]>b[c]?1:-1)*(asc?1:-1));table(el,rows,cols,dec);});}
table('tb1',D.f1,['city','n_bus_lines','daily_bus_km','fleet_total','ze_fleet','ze_share_pct','ze_target_year','charging_model','energy_full_bev_mwh_day','grid_co2_g_kwh'],{});
table('tb3',D.f3,Object.keys(D.f3[0]),{latitude:5,longitude:5});table('tb4',D.f4,Object.keys(D.f4[0]),{});table('tb2',[...D.f2],Object.keys(D.f2[0]),{});
const mad=D.f1.find(r=>r.city==='Madrid'),tot=k=>D.f3.reduce((a,r)=>a+r[k],0);
[[fmt(D.f2.length),'EMT lines'],[fmt(mad.daily_bus_km),'in-service km per weekday'],[mad.ze_share_pct+' %','zero-emission fleet today'],[fmt(tot('peak_mw_managed'),1)+' MW','night charging need (100 % BEV)'],
 [fmt(tot('connection_mw_estimate'),1)+' MW','grid connection at depots'],['2038','100 % zero-emission (our plan)']]
 .forEach(([b,t])=>document.getElementById('figs').insertAdjacentHTML('beforeend',`<div class="fig"><b>${b}</b><span>${t}</span></div>`));
go(location.hash.slice(1)||'home');
</script></body></html>"""

out = OUT
open(out, 'w', encoding='utf-8').write(HTML.replace('__DATA__', DATA))
print('written', out, round(os.path.getsize(out) / 1e6, 2), 'MB')
