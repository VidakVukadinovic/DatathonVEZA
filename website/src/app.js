/* ===== VEZA · Electrifying EMT Madrid — interactive layer =====
   Data: D.f1..f4 (Files 1-4), D.geo (route geometry, [lon,lat]), D.site (notebook exports). No figure is computed
   here that is not a direct read or a transparent arithmetic of those files (sums, ratios, rescaling by a control). */
(function () {
'use strict';
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt = (v, d = 0) => v == null || Number.isNaN(v) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const C = { bev: '#14b8a6', cng: '#c9a46a', h2: '#4d8cff', ready: '#2fa36b', upgrade: '#e8a417', critical: '#e0483e', mad: '#1d5fd6',
  S0: '#8b93a7', S1: '#e0483e', S2: '#e8a417', S3: '#14b8a6', grid: '#22304f', ink: '#dfe6f3', mute: '#7d8aa3' };
const RC = { Ready: C.ready, Upgrade: C.upgrade, Critical: C.critical };
const DEPOTS = ['Carabanchel', 'Fuencarral', 'La Elipa', 'Entrevías', 'Sanchinarro'];
const DCOL = { Carabanchel: '#4d8cff', Fuencarral: '#b07cff', 'La Elipa': '#14b8a6', 'Entrevías': '#ff8a65', Sanchinarro: '#f2c14e' };
const readiness = r => r <= 1 ? 'Ready' : r <= 1.5 ? 'Upgrade' : 'Critical';
const F3 = Object.fromEntries(D.f3.map(d => [d.depot_name, d]));
const F2 = Object.fromEntries(D.f2.map(r => [String(r.line_id), r]));
const EXTRA = Object.fromEntries(D.site.lines_extra.map(r => [String(r.line_id), r]));
const SC = D.site.scenarios, YEARS = Array.from({ length: 13 }, (_, i) => 2026 + i);
const state = { depot: null, scen: 'S3', year: 2030 };
const charts = [];
const EC_TEXT = { fontFamily: 'Roboto, sans-serif', color: C.ink };
function ec(id, light) { const c = echarts.init(document.getElementById(id), null, { renderer: 'canvas' }); c.__light = !!light; charts.push(c); return c; }
window.addEventListener('resize', () => { charts.forEach(c => c.resize()); drawGauges(); drawDots(true); });
const axisDark = { axisLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.mute, fontSize: 11 }, splitLine: { lineStyle: { color: '#182440' } }, axisTick: { show: false } };
const axisLight = { axisLine: { lineStyle: { color: '#cfc6b4' } }, axisLabel: { color: '#5a6274', fontSize: 11 }, splitLine: { lineStyle: { color: '#e6dfd1' } }, axisTick: { show: false } };
const tipDark = { backgroundColor: '#0f1830', borderColor: '#22304f', textStyle: { color: '#dfe6f3', fontSize: 12 } };

/* ---------- linked state ---------- */
const listeners = [];
function setDepot(d) { state.depot = state.depot === d ? null : d; listeners.forEach(f => f()); }

/* ---------- map helpers ---------- */
function darkify(map) {
  for (const l of map.getStyle().layers) {
    try {
      const id = l.id;
      if (l.type === 'background') map.setPaintProperty(id, 'background-color', '#0a1020');
      else if (l.type === 'fill') map.setPaintProperty(id, 'fill-color', /water/.test(id) ? '#0c1931' : /park|wood|grass|landcover/.test(id) ? '#0d1727' : '#0e1628');
      else if (l.type === 'line') { map.setPaintProperty(id, 'line-color', /water|river|stream/.test(id) ? '#0c1931' : /motorway|trunk|primary/.test(id) ? '#24314f' : '#18223a'); }
      else if (l.type === 'fill-extrusion') map.setLayoutProperty(id, 'visibility', 'none');
      else if (l.type === 'symbol') {
        if (/poi|shield|oneway|transit|aeroway/.test(id)) { map.setLayoutProperty(id, 'visibility', 'none'); continue; }
        map.setPaintProperty(id, 'text-color', /place/.test(id) ? '#8d9ab5' : '#56627e'); map.setPaintProperty(id, 'text-halo-color', '#0a1020');
      }
    } catch (e) { /* layer without that property */ }
  }
}
const OSM_DARK = { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
  layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0a1020' } }, { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -1, 'raster-brightness-max': 0.32, 'raster-contrast': 0.15, 'raster-opacity': 0.9 } }] };
function makeMap(container, opts, onReady) {
  const map = new maplibregl.Map(Object.assign({ container, style: 'https://tiles.openfreemap.org/styles/positron', center: [-3.69, 40.425], zoom: 10.9, attributionControl: { compact: true }, cooperativeGestures: false }, opts));
  let fell = false; map.on('error', () => { if (!fell && !map.isStyleLoaded()) { fell = true; map.setStyle(OSM_DARK); } });
  map.on('load', () => { if (!fell) darkify(map); onReady(map); });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.scrollZoom.disable(); map.on('click', () => map.scrollZoom.enable());
  return map;
}
function linesFC(colorFn, widthFn) {
  return { type: 'FeatureCollection', features: Object.keys(D.geo).filter(l => F2[l]).map(l => ({ type: 'Feature', properties: { id: l, depot: F2[l].depot_name, c: colorFn(F2[l]), w: widthFn ? widthFn(F2[l]) : 1.6, opp: F2[l].charging_strategy === 'Opportunity' ? 1 : 0 }, geometry: { type: 'MultiLineString', coordinates: D.geo[l] } })) };
}
function spokesFC() {
  return { type: 'FeatureCollection', features: Object.keys(D.geo).filter(l => F2[l]).map(l => { const p = D.geo[l][0], m = p[Math.floor(p.length / 2)], d = F3[F2[l].depot_name];
    return { type: 'Feature', properties: { depot: d.depot_name, c: DCOL[d.depot_name] }, geometry: { type: 'LineString', coordinates: [m, [d.longitude, d.latitude]] } }; }) };
}
function depotMarkers(map, onClick, withLabel = true) {
  const els = {};
  D.f3.forEach(d => {
    const ratio = d.peak_mw_managed / d.connection_mw_estimate, est = d.connection_evidence !== 'Evidenced', c = RC[d.readiness_status];
    const sz = Math.round(16 + Math.sqrt(d.buses_assigned) * 1.25);
    const el = document.createElement('div'); el.className = 'depot-m' + (est ? ' est' : '');
    el.style.cssText = `width:${sz}px;height:${sz}px;background-color:${c};border-color:${c};`;
    el.title = `${d.depot_name}: ${ratio.toFixed(2)}× · ${d.connection_evidence}`;
    el.addEventListener('click', e => { e.stopPropagation(); onClick(d.depot_name); });
    new maplibregl.Marker({ element: el }).setLngLat([d.longitude, d.latitude]).addTo(map); els[d.depot_name] = el;
    if (withLabel) {
      const side = ['Fuencarral', 'Carabanchel'].includes(d.depot_name) ? 'right' : 'left';
      const lb = document.createElement('div'); lb.className = 'depot-l'; lb.innerHTML = `${d.depot_name} <span style="color:${c}">${ratio.toFixed(2)}×</span>`;
      new maplibregl.Marker({ element: lb, anchor: side, offset: [side === 'left' ? sz / 2 + 8 : -(sz / 2 + 8), 0] }).setLngLat([d.longitude, d.latitude]).addTo(map);
    }
  });
  return els;
}

/* =========================================================
   01 · THE TRANSITION (hero map = visual signature)
   ========================================================= */
const tot = k => D.f3.reduce((a, d) => a + d[k], 0);
const deficitOf = d => d.connection_mw_estimate - d.peak_mw_managed;
const mad = D.f1.find(r => r.city === 'Madrid');
const SHORT = D.f3.reduce((a, d) => a + Math.max(0, -deficitOf(d)), 0);
$('#heroStats').innerHTML = [
  [fmt(mad.fleet_total), '', 'buses in the fleet baseline<br>31 Dec 2025'],
  [mad.ze_share_pct, '%', 'zero-emission today<br>452 BEV + 10 H₂'],
  [fmt(D.f2.length), '', 'EMT bus lines<br>GTFS, Tue 17 Nov 2026'],
  [fmt(tot('night_energy_mwh')), 'MWh', 'needed every night<br>if the fleet were 100 % BEV'],
  [fmt(tot('peak_mw_managed'), 1), 'MW', 'managed charging power<br>7 h window, 90 % efficiency'],
  [fmt(SHORT, 1), 'MW', 'grid shortfall across depots<br>vs ≈' + fmt(tot('connection_mw_estimate'), 1) + ' MW connected (est.)']
].map(([n, u, t], i) => `<div class="stat${i === 5 ? ' alert' : ''}"><div class="num">${n}<small>${u}</small></div><div class="t">${t}</div></div>`).join('');

function chipsHTML() { return DEPOTS.map(d => `<button class="chip" data-d="${d}"><i style="background:${RC[F3[d].readiness_status]}"></i>${d}</button>`).join(''); }
['#heroChips', '#lineChips'].forEach(s => { $(s).innerHTML = chipsHTML(); $$('.chip', $(s)).forEach(b => b.onclick = () => setDepot(b.dataset.d)); });
listeners.push(() => $$('.chip').forEach(b => b.classList.toggle('on', b.dataset.d === state.depot)));

function depCard() {
  const el = $('#depCard');
  if (!state.depot) {
    el.innerHTML = `<div class="label">Explore the five depots</div><p style="margin:0;color:#aab6cd;font-size:14.5px">Click a depot on the map. Each line is drawn in the colour of the depot its buses return to at night. Circle colour shows whether the depot's grid connection could carry a fully electric fleet.</p>
    <div class="grid">${D.f3.map(d => `<div class="kv" style="cursor:pointer" data-d="${d.depot_name}"><div class="num" style="color:${RC[d.readiness_status]}">${(d.peak_mw_managed / d.connection_mw_estimate).toFixed(2)}×</div><div class="t">${d.depot_name}</div></div>`).join('')}</div>`;
    $$('[data-d]', el).forEach(x => x.onclick = () => setDepot(x.dataset.d)); return;
  }
  const d = F3[state.depot], r = d.peak_mw_managed / d.connection_mw_estimate, def = deficitOf(d);
  el.innerHTML = `<h3>${d.depot_name} <span class="rd ${d.readiness_status}">${d.readiness_status} · ${r.toFixed(2)}×</span></h3>
   <span class="ev ${d.connection_evidence}">${d.connection_evidence} connection${d.connection_evidence === 'Estimated' ? ' (proxy, not a utility offer)' : ''}</span>
   <div class="grid">
    <div class="kv"><div class="num">${d.n_lines_assigned}</div><div class="t">lines assigned</div></div>
    <div class="kv"><div class="num">${fmt(d.buses_assigned)}</div><div class="t">buses assigned (Σ peak)</div></div>
    <div class="kv"><div class="num">${fmt(d.night_energy_mwh, 1)} <small style="font-size:13px">MWh</small></div><div class="t">overnight energy demand</div></div>
    <div class="kv"><div class="num">${fmt(d.peak_mw_managed, 1)} <small style="font-size:13px">MW</small></div><div class="t">managed charging power</div></div>
    <div class="kv"><div class="num">${fmt(d.connection_mw_estimate, 1)} <small style="font-size:13px">MW</small></div><div class="t">grid connection</div></div>
    <div class="kv"><div class="num">${fmt(d.peak_mw_unmanaged, 1)} <small style="font-size:13px">MW</small></div><div class="t">if every bus plugged in at once</div></div>
   </div>
   <div class="deficit ${def < 0 ? 'neg' : 'pos'}">${def < 0 ? `${fmt(-def, 1)} MW power deficit` : `${fmt(def, 1)} MW headroom`}${d.depot_name === 'La Elipa' ? ' · planned ceiling of the new centre, reopening ~2029' : ''}</div>`;
}
listeners.push(depCard); depCard();

let heroMap, heroEls = {};
heroMap = makeMap('heroMap', { center: [-3.69, 40.43], zoom: 11.05 }, map => {
  map.addSource('spokes', { type: 'geojson', data: spokesFC() });
  map.addLayer({ id: 'spokes', type: 'line', source: 'spokes', paint: { 'line-color': ['get', 'c'], 'line-width': 0.6, 'line-opacity': 0.18 } });
  map.addSource('lines', { type: 'geojson', data: linesFC(r => DCOL[r.depot_name]) });
  map.addLayer({ id: 'lines', type: 'line', source: 'lines', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': 1.5, 'line-opacity': 0.62 } });
  map.addLayer({ id: 'lines-hi', type: 'line', source: 'lines', filter: ['==', ['get', 'depot'], ''], layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': 2.8, 'line-opacity': 1 } });
  heroEls = depotMarkers(map, setDepot);
  const pop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
  map.on('mousemove', 'lines', e => { const r = F2[e.features[0].properties.id]; map.getCanvas().style.cursor = 'pointer';
    pop.setLngLat(e.lngLat).setHTML(`<b>Line ${r.line_id}</b> · ${r.depot_name}<br>${fmt(r.daily_km)} km/day · ${r.peak_buses} peak buses`).addTo(map); });
  map.on('mouseleave', 'lines', () => { map.getCanvas().style.cursor = ''; pop.remove(); });
  map.on('click', 'lines', e => { setDepot(F2[e.features[0].properties.id].depot_name); });
  heroSync();
});
function heroSync() {
  if (!heroMap || !heroMap.getLayer('lines')) return; const d = state.depot;
  heroMap.setFilter('lines-hi', ['==', ['get', 'depot'], d || '']);
  heroMap.setPaintProperty('lines', 'line-opacity', d ? 0.1 : 0.62);
  heroMap.setPaintProperty('spokes', 'line-opacity', d ? ['case', ['==', ['get', 'depot'], d], 0.55, 0.03] : 0.18);
  Object.entries(heroEls).forEach(([k, el]) => el.classList.toggle('sel', k === d));
  if (window.__noZoom) return;
  if (d) heroMap.easeTo({ center: [F3[d].longitude, F3[d].latitude], zoom: 11.6, duration: 900 }); else heroMap.easeTo({ center: [-3.69, 40.43], zoom: 11.05, duration: 900 });
}
listeners.push(heroSync);

/* =========================================================
   02 · DEPOT BOTTLENECK — custom SVG capacity columns
   ========================================================= */
const g2 = { win: 7, est: false, unm: false };
function depotCalc(win = 7, estMult = 1) {
  return D.f3.map(d => { const managed = d.night_energy_mwh / (win * 0.9), conn = d.connection_evidence === 'Estimated' ? d.connection_mw_estimate * estMult : d.connection_mw_estimate;
    return { d, name: d.depot_name, managed, conn, ratio: managed / conn, est: d.connection_evidence === 'Estimated', unm: d.peak_mw_unmanaged }; });
}
function drawGauges() {
  const svg = $('#gauges'); if (!svg) return; const W = 860, H = 520, top = 40, bot = 90, left = 46, colW = (W - left - 10) / 5;
  const rows = depotCalc(g2.win, g2.est ? 1.5 : 1);
  const max = Math.max(...rows.map(r => Math.max(r.managed, r.conn, g2.unm ? Math.min(r.unm, 60) : 0))) * 1.12;
  const y = v => top + (H - top - bot) * (1 - v / max), h = v => (H - top - bot) * v / max;
  let s = `<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#e7e0d2"/><line x1="0" y1="0" x2="0" y2="7" stroke="#a79f8f" stroke-width="2.4"/></pattern>
   <pattern id="hatchR" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fbe3e0"/><line x1="0" y1="0" x2="0" y2="6" stroke="#e0483e" stroke-width="2.6"/></pattern></defs>`;
  for (let t = 0; t <= max; t += 5) s += `<line x1="${left}" x2="${W}" y1="${y(t)}" y2="${y(t)}" stroke="#e3dccd" stroke-width="1"/><text x="${left - 8}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="#8a8f9c" font-family="Roboto">${t}</text>`;
  s += `<text x="${left - 8}" y="${top - 18}" text-anchor="end" font-size="11" fill="#8a8f9c" font-family="Inter" font-weight="700">MW</text>`;
  let shortT = 0;
  rows.forEach((r, i) => {
    const x0 = left + i * colW + colW * 0.14, cw = colW * 0.72, bx = x0 + cw * 0.3, bw = cw * 0.4, sel = state.depot === r.name, rd = readiness(r.ratio);
    const deficit = Math.max(0, r.managed - r.conn); shortT += deficit;
    s += `<g style="cursor:pointer" data-d="${r.name}">`;
    s += `<rect x="${x0 - 8}" y="${top - 30}" width="${cw + 16}" height="${H - top - bot + 82}" fill="${sel ? 'rgba(29,95,214,.06)' : 'transparent'}" stroke="${sel ? '#1d5fd6' : 'transparent'}" rx="4"/>`;
    if (g2.unm) s += `<rect x="${x0 + 2}" y="${y(Math.min(r.unm, max / 1.12))}" width="${cw - 4}" height="${h(Math.min(r.unm, max / 1.12))}" fill="none" stroke="#8a8f9c" stroke-dasharray="3 4"/><text x="${x0 + cw / 2}" y="${y(Math.min(r.unm, max / 1.12)) - 6}" text-anchor="middle" font-size="10.5" fill="#8a8f9c" font-family="Roboto">unmanaged ${fmt(r.unm, 0)} MW${r.unm > max / 1.12 ? ' ↑' : ''}</text>`;
    s += `<rect x="${x0}" y="${y(r.conn)}" width="${cw}" height="${h(r.conn)}" fill="${r.est ? 'url(#hatch)' : '#d9d1c1'}" stroke="#a79f8f" stroke-width="1" ${r.est ? 'stroke-dasharray="4 3"' : ''}/>`;
    s += `<line x1="${x0 - 4}" x2="${x0 + cw + 4}" y1="${y(r.conn)}" y2="${y(r.conn)}" stroke="#141a26" stroke-width="2"/>`;
    s += `<text x="${x0 + cw + 6}" y="${y(r.conn) + 4}" font-size="10.5" fill="#4a5468" font-family="Inter" font-weight="700">${fmt(r.conn, 1)}</text>`;
    const okH = Math.min(r.managed, r.conn);
    s += `<rect x="${bx}" y="${y(okH)}" width="${bw}" height="${h(okH)}" fill="#141a26"><animate attributeName="height" from="0" to="${h(okH)}" dur=".6s"/><animate attributeName="y" from="${y(0)}" to="${y(okH)}" dur=".6s"/></rect>`;
    if (deficit > 0) s += `<rect x="${bx}" y="${y(r.managed)}" width="${bw}" height="${h(deficit)}" fill="url(#hatchR)" stroke="#e0483e" stroke-width="1.5"/><text x="${bx + bw / 2}" y="${y(r.managed) + h(deficit) / 2 + 4}" text-anchor="middle" font-size="11" font-weight="800" fill="#b3261e" font-family="Inter">−${fmt(deficit, 1)}</text>`;
    else s += `<text x="${x0 + cw / 2}" y="${y(r.conn) + 18}" text-anchor="middle" font-size="11" font-weight="800" fill="#2f8a5d" font-family="Inter">+${fmt(r.conn - r.managed, 1)} spare</text>`;
    s += `<text x="${x0 + cw / 2}" y="${y(Math.max(r.managed, r.conn)) - 12}" text-anchor="middle" font-size="22" font-weight="900" fill="${RC[rd]}" font-family="Inter">${r.ratio.toFixed(2)}×</text>`;
    s += `<text x="${x0 + cw / 2}" y="${H - bot + 24}" text-anchor="middle" font-size="14" font-weight="800" fill="#141a26" font-family="Inter">${r.name}</text>`;
    s += `<text x="${x0 + cw / 2}" y="${H - bot + 42}" text-anchor="middle" font-size="11" fill="#4a5468" font-family="Roboto">${fmt(r.managed, 1)} MW needed · ${r.d.buses_assigned} buses</text>`;
    s += `<text x="${x0 + cw / 2}" y="${H - bot + 60}" text-anchor="middle" font-size="10.5" font-weight="700" fill="${r.est ? '#b07a00' : '#2f8a5d'}" font-family="Inter">${r.est ? '◌ ESTIMATED' : '● EVIDENCED'} · ${rd.toUpperCase()}</text>`;
    s += `</g>`;
  });
  svg.innerHTML = s; $$('g[data-d]', svg).forEach(g => g.onclick = () => setDepot(g.dataset.d));
  $('#shortBig').textContent = fmt(shortT, 1);
  $('#t2_mw').textContent = fmt(rows.reduce((a, r) => a + r.managed, 0), 1) + ' MW';
  const sel = $('#g_sel');
  if (!state.depot) { sel.innerHTML = `<div class="label">Tip</div><span class="muted" style="font-size:14px">Click a column, or a depot on the map above, to see its numbers. The selection follows you through the page.</span>`; }
  else { const r = rows.find(x => x.name === state.depot);
    sel.innerHTML = `<div class="label">${r.name} at these settings</div><div style="font:800 30px Inter;color:${RC[readiness(r.ratio)]}">${r.ratio.toFixed(2)}× · ${readiness(r.ratio)}</div>
     <div class="muted" style="font-size:14px">${fmt(r.managed, 1)} MW needed vs ${fmt(r.conn, 1)} MW connection (${r.est ? 'estimated proxy' : 'evidenced'}). ${r.managed > r.conn ? `Short by ${fmt(r.managed - r.conn, 1)} MW.` : `${fmt(r.conn - r.managed, 1)} MW spare.`}</div>`; }
}
$('#winH').oninput = e => { g2.win = +e.target.value; $('#winO').textContent = g2.win + ' h'; drawGauges(); };
$('#estUp').onchange = e => { g2.est = e.target.checked; drawGauges(); };
$('#showUnm').onchange = e => { g2.unm = e.target.checked; drawGauges(); };
$('#t2_mwh').textContent = fmt(tot('night_energy_mwh')) + ' MWh';
listeners.push(drawGauges); drawGauges();

/* =========================================================
   03 · NETWORK & LINES
   ========================================================= */
const ln = { mode: 'year', sel: null };
const YC = { 2026: '#22c55e', 2027: '#a3e635', 2028: '#facc15', 2029: '#fb923c', 2030: '#ef4444' };
const SCOL = { Depot: '#3b4a6b', Opportunity: '#ff4fd8', Not_feasible: '#ffffff' };
const maxRank = D.f2.length;
function prioCol(r) { const t = 1 - (r.priority_rank - 1) / (maxRank - 1); const a = [36, 52, 88], b = [20, 230, 200]; return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`; }
const lineColor = r => ln.mode === 'depot' ? DCOL[r.depot_name] : ln.mode === 'strategy' ? SCOL[r.charging_strategy] : ln.mode === 'priority' ? prioCol(r) : YC[r.electrification_year];
const lineWidth = r => r.charging_strategy === 'Opportunity' ? 3.2 : ln.mode === 'priority' ? 1 + 2.2 * (1 - (r.priority_rank - 1) / maxRank) : 1.4;
function lineLegend() {
  let h = '';
  if (ln.mode === 'depot') h = '<b>Lines by depot</b><br>' + DEPOTS.map(d => `<span class="sw" style="background:${DCOL[d]}"></span>${d} (${F3[d].n_lines_assigned})`).join('<br>');
  if (ln.mode === 'strategy') h = '<b>Charging strategy</b><br>' + `<span class="sw" style="background:${SCOL.Depot}"></span>Depot-feasible (228)<br><span class="sw" style="background:${SCOL.Opportunity};height:4px"></span>Opportunity charging (6)`;
  if (ln.mode === 'priority') h = '<b>Electrification priority</b><br><span class="sw" style="background:rgb(20,230,200);height:4px"></span>rank 1 (first)<br><span class="sw" style="background:rgb(36,52,88)"></span>rank 234 (last)<br><span style="color:#6f7d9b">thicker = earlier</span>';
  if (ln.mode === 'year') h = '<b>S1 electrification year</b> (File 2)<br>' + Object.entries(YC).map(([y, c]) => `<span class="sw" style="background:${c}"></span>${y} (${D.f2.filter(r => r.electrification_year == y).length})`).join('<br>');
  $('#lineLegend').innerHTML = h + '<br><span style="color:#6f7d9b">Pink labels: the 6 opportunity-charging lines</span>';
}
let lineMap;
lineMap = makeMap('lineMap', { center: [-3.69, 40.43], zoom: 10.8 }, map => {
  map.addSource('l', { type: 'geojson', data: linesFC(lineColor, lineWidth) });
  map.addLayer({ id: 'l', type: 'line', source: 'l', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': ['get', 'w'], 'line-opacity': 0.8 } });
  map.addLayer({ id: 'l-sel', type: 'line', source: 'l', filter: ['==', ['get', 'id'], ''], paint: { 'line-color': '#ffffff', 'line-width': 5, 'line-opacity': 0.95 } });
  depotMarkers(map, setDepot, false);
  D.f2.filter(r => r.charging_strategy === 'Opportunity').forEach(r => { const p = D.geo[r.line_id]; if (!p) return; const part = p[0], m = part[Math.floor(part.length * 0.7)];
    const el = document.createElement('div'); el.style.cssText = 'font:800 11px Inter;color:#0a1020;background:#ff4fd8;padding:1px 6px;border-radius:3px;cursor:pointer'; el.textContent = r.line_id;
    el.onclick = () => selectLine(r.line_id); new maplibregl.Marker({ element: el }).setLngLat(m).addTo(map); });
  const pop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
  map.on('mousemove', 'l', e => { const r = F2[e.features[0].properties.id]; map.getCanvas().style.cursor = 'pointer';
    pop.setLngLat(e.lngLat).setHTML(`<b>Line ${r.line_id}</b> · #${r.priority_rank} · ${r.charging_strategy}`).addTo(map); });
  map.on('mouseleave', 'l', () => { map.getCanvas().style.cursor = ''; pop.remove(); });
  map.on('click', 'l', e => selectLine(e.features[0].properties.id));
  lineSync();
});
function lineSync() {
  if (!lineMap || !lineMap.getSource('l')) return;
  lineMap.getSource('l').setData(linesFC(lineColor, lineWidth));
  lineMap.setPaintProperty('l', 'line-opacity', state.depot ? ['case', ['==', ['get', 'depot'], state.depot], 0.95, 0.07] : 0.8);
  lineMap.setFilter('l-sel', ['==', ['get', 'id'], ln.sel || '']); lineLegend();
}
listeners.push(lineSync);
$$('#lineMode button').forEach(b => b.onclick = () => { $$('#lineMode button').forEach(x => x.classList.toggle('on', x === b)); ln.mode = b.dataset.m; lineSync(); });
$('#lineList').innerHTML = D.f2.map(r => `<option value="${r.line_id}">`).join('');
$('#lineSearch').addEventListener('change', e => { const v = e.target.value.trim().toUpperCase(); if (F2[v]) selectLine(v); });
$('#lineSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { const v = e.target.value.trim().toUpperCase(); if (F2[v]) selectLine(v); } });
function selectLine(id) {
  ln.sel = id; const r = F2[id], x = EXTRA[id] || {};
  $('#lineSearch').value = id;
  $('#lineCard').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div class="label" style="margin:0">Line</div><div class="lid">${r.line_id}</div></div>
    <div style="text-align:right"><div class="label" style="margin:0">Priority</div><div style="font:900 30px Inter;color:var(--bev)">#${r.priority_rank}</div></div></div>
    <div style="margin-top:8px"><span class="chip" style="cursor:default;border-color:${r.charging_strategy === 'Opportunity' ? '#ff4fd8' : 'var(--night-line)'}">${r.charging_strategy === 'Opportunity' ? 'Opportunity charging' : 'Depot-feasible'}</span>
    <span class="chip" data-d="${r.depot_name}"><i style="background:${DCOL[r.depot_name]}"></i>${r.depot_name}</span></div>
    <table><tr><td>Daily kilometres</td><td>${fmt(r.daily_km, 1)} km</td></tr><tr><td>Peak buses</td><td>${r.peak_buses}</td></tr>
    <tr><td>Km per bus per day</td><td style="color:${r.km_per_bus_day > (r.bus_type === 'Articulated' ? 240 : 300) ? '#ff8a80' : '#fff'}">${fmt(r.km_per_bus_day, 1)} km</td></tr>
    <tr><td>Bus type (proxy)</td><td>${r.bus_type}</td></tr><tr><td>Energy per bus per day</td><td>${fmt(r.energy_kwh_bus_day)} kWh</td></tr>
    <tr><td>Passengers per day</td><td>${x.pax_day ? fmt(x.pax_day) : 'n/a'}</td></tr><tr><td>Priority score</td><td>${x.score != null ? x.score.toFixed(3) : '—'}</td></tr>
    <tr><td>CO₂ avoided when electric</td><td>${fmt(r.co2_avoided_t_year)} t/yr</td></tr><tr><td>S1 electrification year</td><td>${r.electrification_year}</td></tr></table>
    <p class="note">${r.charging_strategy === 'Opportunity' ? `Each bus runs ${fmt(r.km_per_bus_day)} km a day, beyond the assumed ${r.bus_type === 'Articulated' ? 240 : 300} km range: it needs a top-up at a terminal during the day.` : 'Each bus can complete its day on an overnight depot charge.'}</p>`;
  $$('[data-d]', $('#lineCard')).forEach(b => b.onclick = () => setDepot(b.dataset.d));
  if (lineMap && D.geo[id]) { const pts = D.geo[id].flat(); const lons = pts.map(p => p[0]), lats = pts.map(p => p[1]);
    lineMap.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 80, maxZoom: 13.5, duration: 900 }); }
  lineSync(); rangeChart.dispatchAction({ type: 'highlight', seriesIndex: 0, name: id });
}
$('#topList').innerHTML = [...D.f2].sort((a, b) => a.priority_rank - b.priority_rank).slice(0, 10).map(r => `<li data-l="${r.line_id}"><span><b style="color:#fff;font-family:Inter">${r.line_id}</b> · ${r.depot_name}</span><span style="color:var(--bev)">#${r.priority_rank}</span></li>`).join('');
$$('#topList li').forEach(li => li.onclick = () => selectLine(li.dataset.l));
const byKm = [...D.f2].sort((a, b) => b.km_per_bus_day - a.km_per_bus_day);
const rangeChart = ec('rangeChart');
rangeChart.setOption({ textStyle: EC_TEXT, grid: { left: 44, right: 70, top: 20, bottom: 26 }, tooltip: Object.assign({ trigger: 'item', formatter: p => `<b>Line ${p.name}</b><br>${fmt(p.value, 1)} km per bus per day<br>${F2[p.name].charging_strategy} · ${F2[p.name].depot_name}` }, tipDark),
  xAxis: Object.assign({ type: 'category', data: byKm.map(r => r.line_id), axisLabel: { show: false } }, { axisLine: axisDark.axisLine, axisTick: { show: false } }),
  yAxis: Object.assign({ type: 'value', name: 'km / bus / day', nameTextStyle: { color: C.mute } }, axisDark),
  series: [{ type: 'bar', barCategoryGap: '15%', data: byKm.map(r => ({ value: r.km_per_bus_day, name: r.line_id, itemStyle: { color: r.charging_strategy === 'Opportunity' ? '#ff4fd8' : r.bus_type === 'Articulated' ? '#4d8cff' : '#2b3a5c' } })),
    emphasis: { itemStyle: { color: '#fff' } },
    markLine: { silent: true, symbol: 'none', data: [{ yAxis: 300, label: { formatter: 'standard range 300 km', color: '#ff8a80', position: 'insideEndTop' }, lineStyle: { color: '#ff8a80', type: 'dashed' } }, { yAxis: 240, label: { formatter: 'articulated 240 km', color: '#8fb3ff', position: 'insideEndBottom' }, lineStyle: { color: '#4d8cff', type: 'dotted' } }] },
  }], graphic: [{ type: 'text', left: 70, top: 22, style: { text: '◀ 6 opportunity-charging lines: ' + byKm.filter(r => r.charging_strategy === 'Opportunity').map(r => r.line_id).join(', '), fill: '#ff4fd8', font: '700 12px Inter' } },
    { type: 'text', right: 76, bottom: 34, style: { text: 'blue = articulated (proxy)', fill: '#8fb3ff', font: '500 11px Roboto' } }] });
rangeChart.on('click', p => selectLine(p.name));
selectLine(byKm[0].line_id);

/* =========================================================
   04 · FOUR FUTURES
   ========================================================= */
const SDESC = { S0: ['Plan-based', 'Today’s pace continues', 'File 4'], S1: ['100 % by 2030', 'Mandatory stress test', 'File 4'], S2: ['Grid-paced · 2033', 'Earliest credible, if conditions met', 'Supplementary'], S3: ['Lifecycle · 2038', 'Our recommendation', 'Supplementary'] };
$('#scenSel').innerHTML = Object.keys(SDESC).map(k => `<button data-s="${k}" style="--c:${C[k]}"><em>${k} · ${SDESC[k][2]}</em><b>${SDESC[k][0]}</b><span>${SDESC[k][1]}</span></button>`).join('');
$$('#scenSel button').forEach(b => b.onclick = () => { state.scen = b.dataset.s; renderScen(true); });
const rowsOf = s => SC[s].rows;
const rowAt = (s, y) => { const rs = rowsOf(s); return rs.find(r => r.year === y) || rs[rs.length - 1]; };
const lastYear = s => rowsOf(s)[rowsOf(s).length - 1].year;
function summary(s) {
  const rs = rowsOf(s), upto = rs.filter(r => r.year <= 2035);
  const y100 = (rs.find(r => r.ze_share_pct >= 100) || {}).year;
  const gridMW = Object.values(SC[s].grid_add_mw).reduce((a, v) => a + v.slice(0, rs.length).reduce((x, y) => x + y, 0), 0);
  return { ze30: rowAt(s, 2030).ze_share_pct, ze35: rowAt(s, 2035).ze_share_pct, y100: y100 || (s === 'S0' ? 'after 2035' : '—'), peak: Math.max(...rs.map(r => r.capex_meur)),
    capex35: upto.reduce((a, r) => a + r.capex_meur, 0), co2: upto.reduce((a, r) => a + r.co2_avoided_t, 0) / 1e3, early: rs.reduce((a, r) => a + r.cng_early_retired, 0),
    stranded: SC[s].stranded_meur, cngBought: rs.reduce((a, r) => a + r.cng_bought, 0), gridMW, maxBuy: Math.max(...rs.map(r => r.ze_bought)) };
}
const SUM = Object.fromEntries(Object.keys(SC).map(s => [s, summary(s)]));
function metrics() {
  const m = SUM[state.scen], b = SUM.S3, rel = (v, bv, unit, inv) => state.scen === 'S3' || typeof v !== 'number' ? '' : `<div class="d" style="color:${(v > bv) !== !!inv ? '#ff8a80' : '#6fe0a6'}">${v > bv ? '+' : ''}${fmt(v - bv)}${unit} vs S3</div>`;
  const cells = [[m.ze30.toFixed(1) + ' %', 'zero-emission in 2030'], [m.ze35.toFixed(1) + ' %', 'zero-emission in 2035'], [m.y100, 'year fleet reaches 100 % ZE'],
    [fmt(m.maxBuy), 'most e-buses bought in one year', rel(m.maxBuy, b.maxBuy, '')], ['€' + fmt(m.peak) + ' M', 'peak annual capex', rel(m.peak, b.peak, ' M€')],
    ['€' + fmt(m.capex35) + ' M', 'capex 2026–35', rel(m.capex35, b.capex35, ' M€')], [fmt(m.co2) + ' kt', 'CO₂ avoided 2026–35', rel(m.co2, b.co2, ' kt', true)],
    [fmt(m.early), 'CNG buses retired before 15 years' + (state.scen === 'S3' ? ' (mostly at 13–14)' : ''), rel(m.early, b.early, '')], ['€' + fmt(m.stranded) + ' M', 'stranded CNG value', rel(m.stranded, b.stranded, ' M€')],
    [m.cngBought ? fmt(m.cngBought) : '0', 'new CNG buses bought', '']];
  $('#metrics').innerHTML = cells.map(([n, t, d]) => `<div class="metric"><div class="num">${n}</div><div class="t">${t}</div>${d || ''}</div>`).join('');
}
/* fleet unit chart */
const dotsCv = $('#fleetDots'); let dotAnim = { bev: 0, h2: 10, cng: 2200 }, dotTarget = { ...dotAnim }, dotRAF;
function drawDots(now) {
  const cv = dotsCv, w = cv.clientWidth, h = cv.clientHeight, dpr = window.devicePixelRatio || 1; if (!w) return;
  if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const N = 2210, cols = Math.ceil(Math.sqrt(N * w / h)), rows = Math.ceil(N / cols), gap = Math.min(w / cols, h / rows), r = gap * 0.36;
  const nb = Math.round(dotAnim.bev), nh = 10;
  for (let i = 0; i < N; i++) { const cx = (i % cols) * gap + gap / 2, cy = Math.floor(i / cols) * gap + gap / 2;
    ctx.fillStyle = i < nb ? C.bev : i < nb + nh ? C.h2 : '#7a6a4e'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill(); }
}
function animateDots(target) {
  dotTarget = target; cancelAnimationFrame(dotRAF); const from = dotAnim.bev, t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3); dotAnim.bev = from + (target.bev - from) * e; drawDots(); if (k < 1) dotRAF = requestAnimationFrame(step); };
  dotRAF = requestAnimationFrame(step);
}
const cShare = ec('c4share'), cFleet = ec('c4fleet'), cCapex = ec('c4capex'), cCo2 = ec('c4co2'), cHeat = ec('c4heat');
function renderScen(changed) {
  const s = state.scen, y = state.year, ly = lastYear(s), yy = Math.min(y, ly), r = rowAt(s, yy), rs = rowsOf(s);
  $$('#scenSel button').forEach(b => b.classList.toggle('on', b.dataset.s === s));
  $('#y4').textContent = y; $('#yr4').value = y;
  $('#y4note').innerHTML = y > ly ? `<span style="color:#ff8a80">${s} is modelled to ${ly} (File 4 horizon); showing ${ly}.</span>` : `${s}: ${fmt(r.n_bev + r.n_h2)} zero-emission buses, ${fmt(r.n_cng)} CNG`;
  $('#dotsCap').textContent = `${s} · end of ${yy} · ${r.ze_share_pct.toFixed(1)} % zero-emission · each dot is one bus`;
  animateDots({ bev: r.n_bev }); metrics();
  const yrs = YEARS.map(String), pad = (arr) => YEARS.map(yr => { const x = arr.find(q => q.year === yr); return x ? x : null; });
  cShare.setOption({ textStyle: EC_TEXT, animationDurationUpdate: 600, grid: { left: 44, right: 120, top: 18, bottom: 28 }, tooltip: Object.assign({ trigger: 'axis', valueFormatter: v => v == null ? '—' : v.toFixed(1) + ' %' }, tipDark),
    xAxis: Object.assign({ type: 'category', data: yrs, boundaryGap: false }, axisDark), yAxis: Object.assign({ type: 'value', max: 100, axisLabel: { color: C.mute, formatter: '{value}%' } }, { splitLine: axisDark.splitLine, axisLine: { show: false } }),
    series: Object.keys(SC).map(k => ({ name: k, type: 'line', smooth: 0.2, data: pad(rowsOf(k)).map(x => x ? x.ze_share_pct : null), symbol: 'circle', symbolSize: k === s ? 7 : 0, z: k === s ? 5 : 1,
      lineStyle: { width: k === s ? 4 : 1.5, color: C[k], opacity: k === s ? 1 : 0.35 }, itemStyle: { color: C[k] },
      endLabel: { show: true, formatter: `${k}`, color: C[k], fontWeight: 800, fontFamily: 'Inter', opacity: k === s ? 1 : 0.5 },
      markLine: k === s ? { silent: true, symbol: 'none', label: { formatter: String(y), color: '#fff', position: 'end' }, lineStyle: { color: '#fff', type: 'solid', opacity: .5 }, data: [{ xAxis: String(y) }] } : undefined })) }, true);
  const ry = rs.map(x => String(x.year));
  cFleet.setOption({ textStyle: EC_TEXT, grid: { left: 48, right: 14, top: 26, bottom: 46 }, legend: { bottom: 0, textStyle: { color: C.mute, fontSize: 11 }, itemWidth: 12 }, tooltip: Object.assign({ trigger: 'axis' }, tipDark),
    xAxis: Object.assign({ type: 'category', data: ry }, axisDark), yAxis: Object.assign({ type: 'value' }, axisDark),
    series: [{ name: 'E-buses bought', type: 'bar', stack: 'a', data: rs.map(x => x.ze_bought), itemStyle: { color: C.bev } },
      { name: 'New CNG bought', type: 'bar', stack: 'a', data: rs.map(x => x.cng_bought), itemStyle: { color: '#8f8573' } },
      { name: 'CNG retired', type: 'bar', stack: 'b', data: rs.map(x => -x.cng_retired), itemStyle: { color: C.cng, opacity: .55 } },
      { name: 'of which before 15 years', type: 'bar', stack: 'c', barGap: '-100%', data: rs.map(x => -x.cng_early_retired), itemStyle: { color: '#d9734e', opacity: .75 } }] }, true);
  let cum = 0;
  cCapex.setOption({ textStyle: EC_TEXT, grid: { left: 48, right: 50, top: 26, bottom: 46 }, legend: { bottom: 0, textStyle: { color: C.mute, fontSize: 11 }, itemWidth: 12 }, tooltip: Object.assign({ trigger: 'axis', valueFormatter: v => '€' + fmt(v) + ' M' }, tipDark),
    xAxis: Object.assign({ type: 'category', data: ry }, axisDark), yAxis: [Object.assign({ type: 'value', max: 360 }, axisDark), Object.assign({ type: 'value', max: 2000 }, axisDark, { splitLine: { show: false } })],
    series: [['E-buses', 'bus_ze_meur', C.bev], ['Chargers', 'chargers_meur', '#4d8cff'], ['Depot civil works', 'civil_meur', '#b07cff'], ['Grid', 'grid_meur', C.critical]].map(([n, k, c]) => ({ name: n, type: 'bar', stack: 'x', data: rs.map(x => +x[k].toFixed(1)), itemStyle: { color: c } }))
      .concat([{ name: 'CNG buses', type: 'bar', stack: 'x', data: rs.map(x => +(x.capex_meur - x.bus_ze_meur - x.chargers_meur - x.civil_meur - x.grid_meur).toFixed(1)), itemStyle: { color: '#8f8573' } },
        { name: 'Cumulative', type: 'line', yAxisIndex: 1, data: rs.map(x => +(cum += x.capex_meur).toFixed(0)), lineStyle: { color: '#fff', width: 2 }, itemStyle: { color: '#fff' }, symbolSize: 4 }]) }, true);
  let cav = 0;
  cCo2.setOption({ textStyle: EC_TEXT, grid: { left: 48, right: 50, top: 26, bottom: 46 }, legend: { bottom: 0, textStyle: { color: C.mute, fontSize: 11 }, itemWidth: 12 }, tooltip: Object.assign({ trigger: 'axis', valueFormatter: v => fmt(v, 1) + ' kt' }, tipDark),
    xAxis: Object.assign({ type: 'category', data: ry }, axisDark), yAxis: [Object.assign({ type: 'value', max: 140 }, axisDark), Object.assign({ type: 'value', max: 1000 }, axisDark, { splitLine: { show: false } })],
    series: [{ name: 'CO₂ emitted', type: 'line', data: rs.map(x => +(x.co2_t / 1e3).toFixed(1)), lineStyle: { color: '#c9a46a', width: 2.5 }, itemStyle: { color: '#c9a46a' }, areaStyle: { color: 'rgba(201,164,106,.12)' } },
      { name: 'Avoided this year', type: 'bar', data: rs.map(x => +(x.co2_avoided_t / 1e3).toFixed(1)), itemStyle: { color: C.bev, opacity: .7 } },
      { name: 'Cumulative avoided', type: 'line', yAxisIndex: 1, data: rs.map(x => +((cav += x.co2_avoided_t) / 1e3).toFixed(0)), lineStyle: { color: '#fff', width: 2, type: 'dashed' }, itemStyle: { color: '#fff' }, symbolSize: 4 }] }, true);
  const ratio = SC[s].ratio, hd = [];
  DEPOTS.forEach((d, j) => (ratio[d] || []).forEach((v, i) => hd.push([i, j, v == null ? '-' : +v.toFixed(2)])));
  cHeat.setOption({ textStyle: EC_TEXT, grid: { left: 92, right: 14, top: 10, bottom: 30 }, tooltip: Object.assign({ formatter: p => `${DEPOTS[p.value[1]]} ${ry[p.value[0]]}: ${p.value[2] === '-' ? 'closed' : p.value[2] + '×'}` }, tipDark),
    xAxis: Object.assign({ type: 'category', data: ry, splitArea: { show: false } }, axisDark), yAxis: Object.assign({ type: 'category', data: DEPOTS }, axisDark, { axisLabel: { color: (v) => state.depot === v ? '#fff' : C.mute, fontWeight: 600 } }),
    visualMap: { show: false, type: 'piecewise', pieces: [{ lte: 1, color: '#1f7a50' }, { gt: 1, lte: 1.5, color: '#b47f12' }, { gt: 1.5, color: '#b8382f' }] },
    series: [{ type: 'heatmap', data: hd, label: { show: true, color: '#fff', fontSize: 10, formatter: p => p.value[2] === '-' ? '–' : p.value[2].toFixed(1) }, itemStyle: { borderColor: '#0a1020', borderWidth: 2 } }] }, true);
}
$('#yr4').oninput = e => { state.year = +e.target.value; renderScen(); };
let play4; $('#play4').onclick = () => { if (play4) { clearInterval(play4); play4 = null; $('#play4').textContent = '▶'; return; }
  $('#play4').textContent = '❚❚'; if (state.year >= 2038) state.year = 2025; play4 = setInterval(() => { state.year++; renderScen(); if (state.year >= 2038) { clearInterval(play4); play4 = null; $('#play4').textContent = '▶'; } }, 900); };
listeners.push(() => renderScen());
renderScen(true);

/* =========================================================
   05 · ROADMAP S3
   ========================================================= */
const S3 = SC.S3, S3R = S3.rows; let rmY = 2030;
const MS = { 2026: 'No new CNG', 2029: 'La Elipa reopens', 2030: '≈ half ZE', 2032: 'Grid upgrades live', 2034: 'CNG wave peaks', 2038: '100 % ZE' };
const PH = y => y <= 2028 ? 'Phase 1 · Prepare and start scaling' : y <= 2032 ? 'Phase 2 · Scale on La Elipa' : y <= 2036 ? 'Phase 3 · Replace the ageing CNG cohorts' : 'Phase 4 · Close out the CNG fleet';
const tl = $('#timeline'); const pos = y => ((y - 2026) / 12 * 100);
tl.insertAdjacentHTML('beforeend', YEARS.map(y => `<div class="tl-year" data-y="${y}" style="left:${pos(y)}%"><i></i><span>${y}</span></div>`).join('') +
  Object.entries(MS).map(([y, t], i) => `<div class="tl-ms" style="left:${pos(+y)}%;top:${i % 2 ? 22 : 0}px">${t}</div>`).join(''));
$$('.tl-year', tl).forEach(el => el.onclick = () => { rmY = +el.dataset.y; renderRoadmap(); });
function renderRoadmap() {
  const r = S3R.find(x => x.year === rmY);
  $('#rmYear').textContent = rmY; $('#rmPhase').textContent = PH(rmY); $('#tlFill').style.width = pos(rmY) + '%';
  $$('.tl-year', tl).forEach(el => { el.classList.toggle('on', +el.dataset.y === rmY); el.classList.toggle('past', +el.dataset.y < rmY); });
  const tot2 = r.n_bev + r.n_h2 + r.n_cng;
  $('#rmBar').innerHTML = `<div style="width:${r.n_bev / tot2 * 100}%;background:${C.bev}">${r.n_bev / tot2 > .12 ? fmt(r.n_bev) + ' battery-electric' : ''}</div><div style="width:${r.n_h2 / tot2 * 100}%;background:${C.h2}"></div><div style="width:${r.n_cng / tot2 * 100}%;background:#a08a63">${r.n_cng / tot2 > .12 ? fmt(r.n_cng) + ' CNG' : ''}</div>`;
  const st = [[fmt(r.ze_bought), 'new e-buses'], [fmt(r.ze_renewal || 0), 'e-bus renewals'], [fmt(r.cng_retired), 'CNG buses retired'], [fmt(r.n_bev), 'battery-electric fleet'], [fmt(r.n_cng), 'CNG buses left'],
    [r.ze_share_pct.toFixed(1) + ' %', 'zero-emission share'], ['€' + fmt(r.capex_meur) + ' M', 'capex this year'], [fmt(r.co2_t / 1e3, 1) + ' kt', 'CO₂ emitted'], [fmt(r.co2_avoided_t / 1e3, 1) + ' kt', 'CO₂ avoided this year']];
  $('#rmStats').innerHTML = st.map(([n, t]) => `<div><div class="num">${n}</div><div class="t">${t}</div></div>`).join('');
  const i = rmY - 2026, M = 2.3;
  $('#rmMini').innerHTML = DEPOTS.map(d => { const na = S3.ratio[d][i], mi = S3.ratio_mitigated[d][i], sel = state.depot === d;
    return `<div class="g" data-d="${d}" style="cursor:pointer"><div class="bar" style="${sel ? 'outline:2px solid var(--mad)' : ''}"><div class="lim" style="bottom:${1 / M * 100}%"></div>
      <div class="na" style="height:${na == null ? 0 : Math.min(na, M) / M * 100}%"></div><div class="mi" style="height:${mi == null ? 0 : Math.min(mi, M) / M * 100}%;background:${mi == null ? '#ccc' : RC[readiness(mi)]}"></div></div>
      <b style="font-family:Inter">${d}</b><br><span class="muted">${na == null ? 'closed' : na.toFixed(2) + '× → ' + mi.toFixed(2) + '×'}</span></div>`; }).join('');
  $$('#rmMini [data-d]').forEach(g => g.onclick = () => setDepot(g.dataset.d));
  $$('#mitList li').forEach(li => li.classList.toggle('on', li.dataset.y.split(',').includes(String(rmY))));
}
listeners.push(renderRoadmap); renderRoadmap();
let play5; $('#play5').onclick = () => { if (play5) { clearInterval(play5); play5 = null; $('#play5').textContent = '▶'; return; }
  $('#play5').textContent = '❚❚'; if (rmY >= 2038) rmY = 2025; play5 = setInterval(() => { rmY++; renderRoadmap(); if (rmY >= 2038) { clearInterval(play5); play5 = null; $('#play5').textContent = '▶'; } }, 1000); };
const trade = ec('tradeoff', true);
trade.setOption({ textStyle: { fontFamily: 'Roboto', color: '#141a26' }, grid: { left: 60, right: 30, top: 20, bottom: 50 },
  tooltip: { formatter: p => `<b>${p.data.k}</b><br>Peak capex €${fmt(p.data.value[0])} M<br>CO₂ avoided 2026–35: ${fmt(p.data.value[1])} kt<br>Stranded CNG value €${fmt(p.data.value[2])} M` },
  xAxis: Object.assign({ type: 'value', name: 'Peak annual capex (M€)', nameLocation: 'middle', nameGap: 30, min: 100, max: 380, nameTextStyle: { color: '#5a6274' } }, axisLight),
  yAxis: Object.assign({ type: 'value', name: 'CO₂ avoided 2026–35 (kt)', nameLocation: 'middle', nameGap: 42, min: 200, max: 900, nameTextStyle: { color: '#5a6274' } }, axisLight),
  series: [{ type: 'scatter', data: Object.keys(SC).map(k => ({ k, value: [SUM[k].peak, SUM[k].co2, SUM[k].stranded], itemStyle: { color: C[k], opacity: .9 } })),
    symbolSize: v => 18 + Math.sqrt(v[2]) * 4.2, label: { show: true, formatter: p => `${p.data.k}${p.data.k === 'S3' ? ' · our plan' : ''}`, position: 'right', fontFamily: 'Inter', fontWeight: 800, color: '#141a26', distance: 12 } }] });

/* =========================================================
   06 · OTHER CITIES
   ========================================================= */
const cities = D.f1.map(r => r.city);
['#cityA', '#cityB'].forEach((s, i) => { $(s).innerHTML = cities.map(c => `<option${(i === 0 ? c === 'Madrid' : c === 'London') ? ' selected' : ''}>${c}</option>`).join(''); $(s).onchange = renderCities; });
function renderCities() {
  const a = D.f1.find(r => r.city === $('#cityA').value), b = D.f1.find(r => r.city === $('#cityB').value);
  const rows = [['Bus lines', 'n_bus_lines', 0], ['Weekday bus-km', 'daily_bus_km', 0], ['Fleet (buses)', 'fleet_total', 0], ['Zero-emission buses', 'ze_fleet', 0], ['ZE share of fleet', 'ze_share_pct', 1, '%'],
    ['Energy for a 100 % BEV network (MWh/day)', 'energy_full_bev_mwh_day', 0], ['Grid carbon intensity (g CO₂/kWh)', 'grid_co2_g_kwh', 1], ['Weekday km per bus', null, 0]];
  const val = (r, k) => k ? r[k] : r.daily_bus_km / r.fleet_total;
  $('#bfly').innerHTML = rows.map(([lbl, k, dp, u]) => { const va = val(a, k), vb = val(b, k), m = Math.max(va, vb) || 1;
    return `<div class="r"><div class="a"><span class="v">${fmt(va, dp)}${u || ''}</span><div class="bar" style="width:${va / m * 85}%;background:${a.city === 'Madrid' ? C.mad : '#5b6b8c'}"></div></div><div class="m">${lbl}</div>
     <div class="b"><div class="bar" style="width:${vb / m * 85}%;background:${b.city === 'Madrid' ? C.mad : C.bev}"></div><span class="v">${fmt(vb, dp)}${u || ''}</span></div></div>`; }).join('') +
    [['100 % ZE target year', a.ze_target_year || 'none published', b.ze_target_year || 'none published'], ['Charging model', a.charging_model, b.charging_model], ['Reference day · fleet date', `${a.reference_date} · ${a.fleet_data_year}`, `${b.reference_date} · ${b.fleet_data_year}`]]
      .map(([l, x, y]) => `<div class="r"><div class="a"><span class="v" style="min-width:0">${x}</span></div><div class="m">${l}</div><div class="b"><span class="v" style="min-width:0">${y}</span></div></div>`).join('');
}
renderCities();


/* =========================================================
   BRIEF VIEW (iv) — S0 vs S1, File 4 only
   ========================================================= */
(function () {
  const Y = [...new Set(D.f4.map(r => r.year))].map(String), S = (s, k, f = 1) => D.f4.filter(r => r.scenario === s).map(r => +(r[k] * f).toFixed(1));
  const base = { textStyle: EC_TEXT, grid: { left: 40, right: 10, top: 14, bottom: 66 }, legend: { bottom: 0, textStyle: { color: C.mute, fontSize: 10.5 }, itemWidth: 10, itemGap: 8, itemHeight: 8 }, tooltip: Object.assign({ trigger: 'axis' }, tipDark),
    xAxis: Object.assign({ type: 'category', data: Y }, axisDark, { axisLabel: { color: C.mute, fontSize: 10, interval: 1 } }) };
  ec('v4a').setOption(Object.assign({}, base, { yAxis: Object.assign({ type: 'value', max: 100 }, axisDark), series: [{ name: 'S0 plan-based', type: 'line', data: S(0, 'ze_share_pct'), color: C.S0, symbolSize: 4 }, { name: 'S1 100 % by 2030', type: 'line', data: S(1, 'ze_share_pct'), color: C.S1, symbolSize: 4 }] }));
  ec('v4b').setOption(Object.assign({}, base, { yAxis: Object.assign({ type: 'value' }, axisDark), series: [['S0 BEV', 0, 'n_bev', '#8b93a7'], ['S0 CNG', 0, 'n_cng', '#4a4436'], ['S1 BEV', 1, 'n_bev', C.S1], ['S1 CNG', 1, 'n_cng', '#6b3a36']].map(([n, s, k, c]) => ({ name: n, type: 'bar', stack: 's' + s, data: S(s, k), itemStyle: { color: c } })) }));
  ec('v4c').setOption(Object.assign({}, base, { yAxis: Object.assign({ type: 'value' }, axisDark), series: [{ name: 'S0', type: 'bar', data: S(0, 'capex_meur', 1), color: C.S0 }, { name: 'S1', type: 'bar', data: S(1, 'capex_meur', 1), color: C.S1 }] }));
  ec('v4d').setOption(Object.assign({}, base, { yAxis: Object.assign({ type: 'value' }, axisDark), series: [{ name: 'S0 emitted', type: 'line', data: S(0, 'co2_t', 1e-3), color: C.S0, symbol: 'none' }, { name: 'S1 emitted', type: 'line', data: S(1, 'co2_t', 1e-3), color: C.S1, symbol: 'none' },
    { name: 'S0 avoided', type: 'line', data: S(0, 'co2_avoided_t', 1e-3), color: C.S0, lineStyle: { type: 'dashed' }, symbol: 'none' }, { name: 'S1 avoided', type: 'line', data: S(1, 'co2_avoided_t', 1e-3), color: C.S1, lineStyle: { type: 'dashed' }, symbol: 'none' }] }));
})();
/* =========================================================
   BRIEF VIEW (iii) — all five cities, File 1
   ========================================================= */
(function () {
  const cs = D.f1.map(r => r.city), col = c => c === 'Madrid' ? C.mad : '#5b6b8c';
  const base = { textStyle: EC_TEXT, tooltip: Object.assign({ trigger: 'axis' }, tipDark) };
  ec('v3a').setOption(Object.assign({}, base, { grid: { left: 70, right: 54, top: 6, bottom: 20 }, xAxis: Object.assign({ type: 'value', max: 100 }, axisDark), yAxis: Object.assign({ type: 'category', data: cs, inverse: true }, axisDark),
    series: [{ type: 'bar', data: D.f1.map(r => ({ value: r.ze_share_pct, itemStyle: { color: col(r.city) } })), label: { show: true, position: 'right', color: '#dfe6f3', fontSize: 11, formatter: p => `${p.value}% (${D.f1[p.dataIndex].ze_target_year || 'no target'})` } }] }));
  ec('v3b').setOption(Object.assign({}, base, { grid: { left: 46, right: 50, top: 22, bottom: 40 }, legend: { bottom: 0, textStyle: { color: C.mute, fontSize: 10.5 }, itemWidth: 10 }, xAxis: Object.assign({ type: 'category', data: cs }, axisDark),
    yAxis: [Object.assign({ type: 'value', name: 'buses', nameTextStyle: { color: C.mute, fontSize: 10 } }, axisDark), Object.assign({ type: 'value', name: 'k km', nameTextStyle: { color: C.mute, fontSize: 10 } }, axisDark, { splitLine: { show: false } })],
    series: [{ name: 'Fleet', type: 'bar', data: D.f1.map(r => ({ value: r.fleet_total, itemStyle: { color: col(r.city) } })) }, { name: 'Weekday bus-km (k)', type: 'line', yAxisIndex: 1, data: D.f1.map(r => Math.round(r.daily_bus_km / 1000)), color: C.bev }] }));
  ec('v3c').setOption(Object.assign({}, base, { grid: { left: 46, right: 46, top: 22, bottom: 40 }, legend: { bottom: 0, textStyle: { color: C.mute, fontSize: 10.5 }, itemWidth: 10 }, xAxis: Object.assign({ type: 'category', data: cs }, axisDark),
    yAxis: [Object.assign({ type: 'log', name: 'MWh/d', nameTextStyle: { color: C.mute, fontSize: 10 } }, axisDark), Object.assign({ type: 'value', name: 'g/kWh', nameTextStyle: { color: C.mute, fontSize: 10 } }, axisDark, { splitLine: { show: false } })],
    series: [{ name: 'Full-BEV energy MWh/day', type: 'bar', data: D.f1.map(r => ({ value: Math.round(r.energy_full_bev_mwh_day), itemStyle: { color: col(r.city) } })) }, { name: 'Grid g CO₂/kWh', type: 'scatter', yAxisIndex: 1, symbolSize: 11, data: D.f1.map(r => r.grid_co2_g_kwh), color: C.cng }] }));
})();

/* =========================================================
   07 · SENSITIVITY LAB
   ========================================================= */
const PACES = Object.keys(D.site.sens.pace).map(Number).sort((a, b) => a - b);
const lab = { win: 7, est: 1, grid: 0.5, pace: 150, elipa: 2029 };
$('#sAlloc').innerHTML = D.site.sens_readiness.map((r, i) => `<option value="${i}">${r.allocation} · ${r['connection hypothesis']}</option>`).join('');
$('#sRule').innerHTML = D.site.sens_rule2.map((r, i) => `<option value="${i}">${r.case}</option>`).join('');
const labDep = ec('labDep'), labPace = ec('labPace'), labElipa = ec('labElipa');
function renderLab() {
  $('#sWin').textContent = lab.win + ' h'; $('#sEst').textContent = '×' + lab.est.toFixed(2); $('#sGrid').textContent = '€' + lab.grid.toFixed(2) + ' M/MW'; $('#sPace').textContent = lab.pace + ' /yr'; $('#sElipa').textContent = lab.elipa;
  const rows = depotCalc(lab.win, lab.est), short = rows.reduce((a, r) => a + Math.max(0, r.managed - r.conn), 0), crit = rows.filter(r => r.ratio > 1.5).length;
  const capexAt = s => rowsOf(s).filter(r => r.year <= 2035).reduce((a, r) => a + r.capex_meur - r.grid_meur + r.grid_meur * lab.grid / 0.5, 0);
  const P = D.site.sens.pace[lab.pace];
  $('#labOut1').innerHTML = [[fmt(rows.reduce((a, r) => a + r.managed, 0), 1) + ' MW', 'managed power, 100 % BEV'], [fmt(short, 1) + ' MW', 'shortfall summed over depots · ' + crit + ' Critical'],
    ['€' + fmt(capexAt('S1')) + ' M', 'S1 capex 2026–35 at this grid cost'], [P.year100 ? String(P.year100) : 'after 2040', `S3 reaches 100 % at ${lab.pace}/yr · peak €${P.peak_capex} M`]]
    .map(([n, t]) => `<div><div class="num">${n}</div><div class="t">${t}</div></div>`).join('');
  labDep.setOption({ textStyle: EC_TEXT, grid: { left: 34, right: 40, top: 24, bottom: 28 }, tooltip: Object.assign({ trigger: 'axis', valueFormatter: v => v.toFixed(2) + '×' }, tipDark),
    xAxis: Object.assign({ type: 'category', data: rows.map(r => r.name) }, axisDark), yAxis: Object.assign({ type: 'value', max: 3 }, axisDark),
    series: [{ type: 'bar', data: rows.map(r => ({ value: +r.ratio.toFixed(2), itemStyle: { color: RC[readiness(r.ratio)], decal: r.est ? { symbol: 'none', dashArrayX: [1, 0], dashArrayY: [2, 4], rotation: -0.785, color: 'rgba(255,255,255,.35)' } : null } })),
      label: { show: true, position: 'top', color: '#fff', fontWeight: 800, formatter: p => p.value.toFixed(2) + '×' },
      markLine: { silent: true, symbol: 'none', data: [{ yAxis: 1, label: { formatter: '1.0×', color: '#6fe0a6', position: 'end' }, lineStyle: { color: '#6fe0a6', type: 'dashed' } }, { yAxis: 1.5, label: { formatter: '1.5×', color: '#ff8a80', position: 'end' }, lineStyle: { color: '#ff8a80', type: 'dashed' } }] } }] }, true);
  labPace.setOption({ textStyle: EC_TEXT, grid: { left: 44, right: 14, top: 34, bottom: 46 }, legend: { bottom: 0, textStyle: { color: C.mute, fontSize: 11 }, itemWidth: 12 }, tooltip: Object.assign({ trigger: 'axis' }, tipDark),
    xAxis: Object.assign({ type: 'category', data: PACES.map(p => p + '/yr') }, axisDark), yAxis: Object.assign({ type: 'value', max: 200 }, axisDark),
    graphic: [{ type: 'text', left: 46, top: 4, style: { text: 'M€ · label = year S3 reaches 100 %', fill: '#7d8aa3', font: '500 11px Roboto' } }],
    series: [{ name: 'Peak annual capex', type: 'bar', data: PACES.map(p => ({ value: D.site.sens.pace[p].peak_capex, itemStyle: { color: p === lab.pace ? C.bev : '#2b3a5c' } })),
      label: { show: true, position: 'top', color: '#dfe6f3', fontSize: 10.5, fontWeight: 700, formatter: p => { const y = D.site.sens.pace[PACES[p.dataIndex]].year100; return y ? String(y) : '>2040'; } } },
      { name: 'Stranded CNG value', type: 'bar', data: PACES.map(p => ({ value: D.site.sens.pace[p].stranded, itemStyle: { color: p === lab.pace ? C.cng : '#4a4436' } })) }] }, true);
  const er = D.site.sens.elipa[lab.elipa].ratio, base = D.site.sens.elipa[2029].ratio, ys = YEARS.map(String);
  labElipa.setOption({ textStyle: EC_TEXT, grid: { left: 40, right: 14, top: 20, bottom: 46 }, legend: { bottom: 0, textStyle: { color: C.mute, fontSize: 11 }, itemWidth: 12 }, tooltip: Object.assign({ trigger: 'axis', valueFormatter: v => v == null ? 'closed' : v.toFixed(2) + '×' }, tipDark),
    xAxis: Object.assign({ type: 'category', data: ys }, axisDark), yAxis: Object.assign({ type: 'value', max: 1.6 }, axisDark),
    series: [{ name: `Fuencarral (opens ${lab.elipa})`, type: 'line', data: er.Fuencarral, lineStyle: { color: DCOL.Fuencarral, width: 3 }, itemStyle: { color: DCOL.Fuencarral },
      markLine: { silent: true, symbol: 'none', data: [{ yAxis: 1, label: { formatter: 'limit 1.0×', color: '#dfe6f3', position: 'insideEndTop' }, lineStyle: { color: '#dfe6f3', type: 'dashed' } }] } },
      { name: 'Fuencarral (opens 2029)', type: 'line', data: base.Fuencarral, lineStyle: { color: DCOL.Fuencarral, width: 1, type: 'dotted', opacity: .6 }, itemStyle: { color: DCOL.Fuencarral }, symbol: 'none' },
      { name: 'La Elipa', type: 'line', data: er['La Elipa'], lineStyle: { color: DCOL['La Elipa'], width: 3 }, itemStyle: { color: DCOL['La Elipa'] } }] }, true);
  const a = D.site.sens_readiness[+$('#sAlloc').value];
  $('#labAlloc').innerHTML = `<table class="reg" style="color:#dfe6f3"><tbody>${DEPOTS.map(d => { const v = a[d] || ''; const k = (v.split(' ')[0] || ''); return `<tr><td style="border-color:#22304f">${d}</td><td style="border-color:#22304f;text-align:right"><span class="rd ${k}">${v}</span></td></tr>`; }).join('')}
    <tr><td style="border-color:#22304f"><b>MW short</b></td><td style="border-color:#22304f;text-align:right"><b>${a['MW short']}</b></td></tr></tbody></table>`;
  const r2 = D.site.sens_rule2[+$('#sRule').value];
  $('#labRule').innerHTML = `<div style="font:800 26px Inter;color:#fff">${r2.lines_over_range} lines <span style="font-size:14px;color:#8d9ab5;font-weight:600">over range</span></div><div class="muted" style="font-size:13px">${r2.Opportunity} opportunity · ${r2.Not_feasible} not feasible${r2.peak_buses_on_those_lines ? ' · ' + fmt(r2.peak_buses_on_those_lines) + ' peak buses on them' : ''}</div>`;
}
$('#sWinR').oninput = e => { lab.win = +e.target.value; renderLab(); };
$('#sEstR').oninput = e => { lab.est = +e.target.value; renderLab(); };
$('#sGridR').oninput = e => { lab.grid = +e.target.value; renderLab(); };
$('#sPaceR').oninput = e => { lab.pace = PACES[+e.target.value]; renderLab(); };
$('#sElipaR').oninput = e => { lab.elipa = +e.target.value; renderLab(); };
$('#sAlloc').onchange = renderLab; $('#sRule').onchange = renderLab;
$('#sPaceR').max = PACES.length - 1; $('#sPaceR').value = PACES.indexOf(150);
renderLab();

/* =========================================================
   METHODS · register
   ========================================================= */
function renderReg(c) { $('#regBody').innerHTML = D.site.register.filter(r => c === 'all' || String(r.class).includes(c)).map(r => `<tr><td><b>${r.id}</b></td><td>${r.variable}</td><td>${r['value / range']}</td><td>${String(r.class).split('/').map(k => `<span class="cls ${k.trim()}">${k.trim()}</span>`).join('')}</td><td>${r['evidence / reason']}</td></tr>`).join(''); }
$$('#regF button').forEach(b => b.onclick = () => { $$('#regF button').forEach(x => x.classList.toggle('on', x === b)); renderReg(b.dataset.c); }); renderReg('all');

/* ---------- scroll: progress, active nav, reveal ---------- */
const links = $$('.navlinks a'), secs = links.map(a => $(a.getAttribute('href')));
window.addEventListener('scroll', () => { const h = document.documentElement; $('#progress').style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
  let cur = 0; secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < 140) cur = i; }); links.forEach((a, i) => a.classList.toggle('on', i === cur)); }, { passive: true });
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.15 });
$$('.fade').forEach(el => io.observe(el));
window.VEZA = { setDepot, selectLine, state, get heroMap() { return heroMap; }, get lineMap() { return lineMap; } };
const io2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { charts.forEach(c => c.resize()); drawDots(); } }), { threshold: 0.05 });
$$('section').forEach(s => io2.observe(s));
})();
