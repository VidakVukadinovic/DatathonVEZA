"""Build the VEZA website: ONE self-contained HTML (all data embedded).
Inputs : ../bi/outputs/File_1-4.csv + bi_route_geometry.json (the submitted files)
         data/site_data.json (scenario trajectories S0-S3, sensitivities, register — exported from the notebook engine)
         src/template.html, src/styles.css, src/app.js
Output : VEZA_Electrifying_EMT_Madrid.html      Run: python build_site.py   (standard library only)"""
import csv, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
OUTS = os.environ.get('VEZA_OUTPUTS') or next(p for p in [os.path.join(HERE, '..', 'bi', 'outputs'), os.path.join(HERE, '..', 'outputs')] if os.path.isdir(p))

def num(v, k, keep=()):
    if k in keep: return v
    if v in (None, ''): return None
    try: f = float(v); return int(f) if f.is_integer() and '.' not in v else f
    except ValueError: return v
def read(n, keep=()):
    with open(os.path.join(OUTS, n), encoding='utf-8') as fh: return [{k: num(v, k, keep) for k, v in r.items()} for r in csv.DictReader(fh)]

geo = json.load(open(os.path.join(OUTS, 'bi_route_geometry.json'), encoding='utf-8'))
DATA = {'f1': read('File_1.csv'), 'f2': read('File_2.csv', keep=('line_id',)), 'f3': read('File_3.csv'), 'f4': read('File_4.csv'),
        'geo': {k: [[[round(p[1], 5), round(p[0], 5)] for p in part] for part in v] for k, v in geo.items()},
        'site': json.load(open(os.path.join(HERE, 'data', 'site_data.json'), encoding='utf-8'))}
src = lambda n: open(os.path.join(HERE, 'src', n), encoding='utf-8').read()
html = (src('template.html').replace('/*__CSS__*/', src('styles.css')).replace('/*__JS__*/', src('app.js'))
        .replace('__DATA__', json.dumps(DATA, ensure_ascii=False, separators=(',', ':'))))
out = os.path.join(HERE, 'VEZA_Electrifying_EMT_Madrid.html'); open(out, 'w', encoding='utf-8').write(html)
print('written', out, round(os.path.getsize(out) / 1e6, 2), 'MB')
