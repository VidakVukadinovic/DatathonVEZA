"""Export everything the VEZA website needs from the validated notebook engine (no new modelling).
Runs the executed notebook's code, then writes site_data.json."""
import os, json, sys, io, contextlib
import matplotlib; matplotlib.use('Agg')
os.chdir('/home/claude/final/notebooks')
G = {}
with contextlib.redirect_stdout(io.StringIO()):
    exec(open('/home/claude/nbfull.py').read(), G)
pd, np = G['pd'], G['np']
g = lambda k: G[k]

def rec(df): return json.loads(df.to_json(orient='records'))
def ratio_tbl(L, years):
    CONN = g('CONN'); out = {}
    for d in L.columns:
        vals = []
        for y in years:
            if y not in L.index: vals.append(None); continue
            c = CONN[d] if (d != 'La Elipa' or y >= g('LA_ELIPA_OPEN')) else np.nan
            v = L.loc[y, d] / c if c and not np.isnan(c) else None
            vals.append(None if v is None or np.isnan(v) else round(float(v), 3))
        out[d] = vals
    return out

def scen(name, s, e, c, L, add):
    t = s[['year', 'ze_bought', 'cng_bought', 'cng_retired', 'cng_early_retired', 'n_bev', 'n_h2', 'n_cng', 'ze_share_pct']].merge(
        c[['year', 'bus_ze_meur', 'chargers_meur', 'civil_meur', 'grid_meur', 'capex_meur']]).merge(e[['year', 'electricity_mwh', 'co2_t', 'co2_avoided_t']])
    if 'ze_renewal' in s: t['ze_renewal'] = s['ze_renewal'].values
    yrs = list(t.year)
    return {'name': name, 'rows': rec(t.round(3)), 'ratio': ratio_tbl(L, yrs),
            'load_mw': {d: [round(float(L.loc[y, d]), 2) if y in L.index else None for y in yrs] for d in L.columns},
            'grid_add_mw': {d: [round(float(add.loc[y, d]), 2) if y in add.index else 0 for y in yrs] for d in add.columns},
            'stranded_meur': round(float(s.life_years_lost.sum() * g('PRICE_CNG_STD') / 15 / 1e6), 1)}

S = {'S0': scen('S0 plan-based', g('s0'), g('e0'), g('c0'), g('L0'), g('add0')),
     'S1': scen('S1 100% by 2030', g('s1'), g('e1'), g('c1'), g('L1'), g('add1')),
     'S2': scen('S2 grid-paced', g('s2'), g('e2'), g('c2'), g('L2'), g('add2'))}

# S3 + sensitivity variants (same engine, horizon 2026-2040)
fleet_path, energy, conv, depot_load, grid_works, capex = (g(k) for k in ['fleet_path', 'energy', 'conversion_year_from_adds', 'depot_load', 'grid_works', 'capex'])
def run_s3(adds, elipa=2029):
    YB, RB, EB = G['YEARS'], G['ze_renew'], G['LA_ELIPA_OPEN']
    G['YEARS'] = list(range(2026, 2041)); G['LA_ELIPA_OPEN'] = elipa
    G['ze_renew'] = {y: sum(1 for f in G['ze_years'] if f + G['USEFUL_LIFE'] == y) for y in G['YEARS']}
    s = fleet_path(adds); e = energy(s, ((s.n_bev + s.n_h2) / s.fleet_total).values)
    L = depot_load(conv(s)); need, add = grid_works(L); c = capex(s, add)
    out = scen('S3', s, e, c, L, add)
    G['YEARS'], G['ze_renew'], G['LA_ELIPA_OPEN'] = YB, RB, EB
    rows = out['rows']; out['rows'] = [r for r in rows if r['year'] <= 2038]
    for k in ('ratio', 'load_mw', 'grid_add_mw'): out[k] = {d: v[:13] for d, v in out[k].items()}
    full100 = next((r['year'] for r in rows if r['ze_share_pct'] >= 100), None)
    out['year100'] = full100
    return out
base = {2026: 70, 2027: 115, 2028: 130, **{y: 150 for y in range(2029, 2038)}, 2038: 83}
S['S3'] = run_s3(base); S['S3']['name'] = 'S3 lifecycle'
def pace(p):
    adds, left, y = {2026: 70, 2027: 115, 2028: min(130, p)}, 1748 - 315, 2029
    while left > 0 and y <= 2040: adds[y] = min(p, left); left -= adds[y]; y += 1
    return adds
SENS = {'pace': {}, 'elipa': {}}
for p in (120, 135, 150, 165, 180, 200):
    r = run_s3(pace(p)); rows = r['rows']
    SENS['pace'][p] = {'year100': r['year100'], 'peak_capex': round(max(x['capex_meur'] for x in rows)), 'capex_26_35': round(sum(x['capex_meur'] for x in rows if x['year'] <= 2035)),
                       'ze2030': next(x['ze_share_pct'] for x in rows if x['year'] == 2030), 'co2_26_35_kt': round(sum(x['co2_avoided_t'] for x in rows if x['year'] <= 2035) / 1e3),
                       'stranded': r['stranded_meur'], 'max_ratio': max(max(v for v in vals if v is not None) for vals in r['ratio'].values())}
for el in (2029, 2030, 2031):
    r = run_s3(base, el); SENS['elipa'][el] = {'ratio': r['ratio']}

# mitigated S3 ratio (notebook 7d-ter) and supplementary tables
dr = pd.read_csv('../outputs/supp_s3_depot_ratio.csv', index_col=0)
S['S3']['ratio_mitigated'] = {c.replace(' (mitigated)', ''): [None if pd.isna(v) else float(v) for v in dr[c].loc[:2038]] for c in dr.columns if '(mitigated)' in c}
f2 = g('f2')
lines = f2[['line_id', 'pax_day', 'score']].copy(); lines['line_id'] = lines.line_id.astype(str)
OUT = {'scenarios': S, 'sens': SENS, 'lines_extra': rec(lines.round(4)),
       'sens_readiness': rec(pd.read_csv('../outputs/supp_sens_readiness.csv')), 'sens_rule2': rec(pd.read_csv('../outputs/supp_sens_rule2.csv')),
       'register': rec(pd.read_csv('../outputs/supp_assumptions_register.csv')), 'cmp': rec(pd.read_csv('../outputs/supp_scenario_comparison.csv')),
       'params': {'window_h': float(G.get('WINDOW_H', 7)), 'eff': 0.9, 'grid_eur_per_mw': g('GRID_EUR_PER_MW'), 'record_pace': 115,
                  'range_std': 300, 'range_art': 240}}
json.dump(OUT, open('/home/claude/site/site_data.json', 'w'), separators=(',', ':'), default=lambda o: None if o != o else o)
print('ok', {k: len(v['rows']) for k, v in S.items()}, SENS['pace'][150], S['S3']['year100'])
