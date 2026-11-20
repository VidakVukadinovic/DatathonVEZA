# All-cities benchmark: Madrid vs Brussels, London, Berlin, Helsinki, Paris

*IE Sustainability Datathon 2026 · Kearney: Zero-Emission Urban Bus Fleets · merged 20 Nov 2026*

One table per block of the team checklist (`claude/benchmark-city-checklist.md`). **Infrastructure first.** Every number comes from the city folder named in the source line under each table; "n/p" = not published (never estimated quietly).

| City | Operator | Owner of the work | Folder / notebook | Reference day |
|---|---|---|---|---|
| Madrid | EMT (municipal) | Vidak | `Madrid/madrid_network_maps_v2.ipynb`, `Madrid/data/madrid_model_clean.ipynb` | Tue 17 Nov 2026 |
| Brussels | STIB-MIVB (municipal) | Vidak | `Brussels/brussels_benchmark_full.ipynb` | Tue 24 Mar 2026 |
| London | TfL (private operators on tendered routes) | Vidak | `London/london_benchmark.ipynb` | no timetable used (fleet audit 31 Mar 2026) |
| Berlin | BVG (municipal) | branch `Berlin` | `Berlin/berlin_model.ipynb` (full Madrid model replicated) | Tue 24 Nov 2026 |
| Helsinki | HSL (procures; contracted operators) | branch `Helsinki` | `Helsinki/helsinki_benchmark.ipynb` | Tue 24 Nov 2026 |
| Paris | IDFM, former RATP network (11 tendered lots) | branch `karima` | `Paris/paris_benchmark_full.ipynb` | Tue 24 Nov 2026 |

---

## 1. Infrastructure: depots, grid, chargers (the core of the pitch)

| # | Item | Madrid | Brussels | London | Berlin | Helsinki | Paris |
|---|---|---|---|---|---|---|---|
| 1 | Depots | 5 (La Elipa closed since Mar 2022, reopens ~2029) | 5 | 76 garages | 6 today + 2 e-only depots from 2027 (Säntisstraße, Treptow); Rummelsburger Landstr. 2028 | n/p (operators' depots not in GTFS) | 25 "centres bus": 13 → electric, 12 → biomethane (10 electric done end 2025) |
| 2 | Buses per depot | ~400 (model 287–477); Fuencarral 764 today while La Elipa is shut | ~120–200 | ~91 median | 198–428 today; model 115–319 after the new depots | n/p | ~185 average (4,622 ÷ 25, derived) |
| 3 | Grid connection per depot (published) | Sanchinarro 8 MW + 5 MW backup; La Elipa substation ≤20 MW; Carabanchel, Fuencarral, Entrevías n/p | Jacques Brel 16 MVA | 0.5–10 MVA across 6 published sites | Indira-Gandhi-Str. 10 MW; others 10–13 MVA planning range. City grid rationed: 365 MVA allocated vs ~2,300 MVA requested (2025) | n/p | 10–15 MW per depot (RATP engineering study); Point-du-Jour connected at HV |
| 4 | kVA per e-bus (installed) | La Elipa ~63 per place; Sanchinarro ~70 (phase 1, 114 buses) but **~19 at full electrification** | ~95 | ~42 median (20–104) | IGS ~36 | n/p | n/p |
| 5 | Model need, 100% electric, managed charging | 10.4–17.4 MW per depot; **71 MW total** (204 MW unmanaged) | ~27 MW total (~4–8 MW per depot) | 2–5 MW per garage (IQR), max ~7 | 6.0–13.3 MW per depot; **81 MW total** (157 MW unmanaged) | n/a (no depot data) | network total only (per-depot allocation n/p) |
| 6 | Depot readiness (model) | 1 Ready · 2 Upgrade · **2 Critical** (Sanchinarro, Entrevías) | – | – | Today: 0 Ready · 5 Upgrade · 1 Critical → with the 2 new depots: **4 Ready · 4 Upgrade · 0 Critical** | – | – |
| 7 | Chargers per e-bus | Sanchinarro 114 pantographs; Carabanchel 320 points (230 pantograph + 90 plug); La Elipa 318 pantographs | – | Holloway 40 chargers for 57 e-buses (0.70) | IGS 133 plugs for 280 places (0.48); Säntisstr. 218 for 220 (0.99) | n/p | 605 points for 745 buses in 6 smart-charging depots (0.81); Point-du-Jour 90 chargers |
| 8 | Lead times | La Elipa: closed 2022 → rebuild tendered Jun 2026 (€134.3 M, ≤32 months) → ~2029 | Marly II ~4 years; target slipped 2030 → 2035 | 3–10 years for ~10 MVA connections; route 358 terminal charger slipped 18 months | New depots open Apr 2027; remaining conversions 2029–2035 (Spandau 2030, Lichtenberg 2033, Müllerstr. 2035) | – | Bus2025 programme ~2015–2025; up to 15 depots in works at once |
| 9 | Coping with a short grid | Smart charging + batteries planned at Sanchinarro | Heliox / INIT smart charging | Southall 500 kVA + 1.2 MWh battery for 25 e-buses; smart charging | Real-time load management (LLMS), rooftop PV, Mobility2Grid research; depot batteries n/p | Charging in daytime breaks (HSL) | Smart charging in 6 depots (745 buses), **−10% charging cost**; off-peak night charging (Enedis partnership) |
| 10 | Terminal / opportunity charging | Line 76 only today; model flags 6 lines, all Sanchinarro (203, 200, 164, 179, SE709, 88) | 5 lines (model 4, 7 in winter) | Route 358 (450 kW), 132 | Line 200 since 2020 (2 terminals × 2 × 450 kW); STELLA: up to 20 terminal chargers by end 2027; model 6 (standard) / 17 (articulated) | On some routes; 8 robust candidates (841, 731, 173Z, 739, 844, 711, 560, 530) | None found; model flags 1 line (350, airport) |

Sources: Madrid `outputs/File_3.csv`, `madrid_la_elipa_before_after.csv`, diario.madrid.es (Sanchinarro, La Elipa); Brussels and London notebooks and `London/outputs/three_city_comparison.csv`; Berlin `outputs/berlin_must_haves.csv`, `berlin_depots_benchmark.csv`, `File_3.csv` (Senate h19-2626, S19/22944, NOW 2020); Helsinki notebook §5b, §8; Paris notebook §6–7 (ratp.fr Bus2025, RATP 2025 report p. 17 and 24, Annales des Mines 2021).

---

## 2. Operations: sizing the energy

| # | Item | Madrid | Brussels | London | Berlin | Helsinki | Paris |
|---|---|---|---|---|---|---|---|
| 11 | Bus lines (weekday) | 234 | 51 | 527 routes | 215 | 390 | 290 |
| 12 | Peak vehicles in service | 1,937 (GTFS blocks) / 2,042 (EMT supply) | 616 | ~7,200 | 1,165 network peak (1,572 sum of line peaks) | 1,041–1,257 (proxy, 5–15 min layover) | 3,529 (estimated, validated on Madrid within 3.5%) |
| 13 | Daily bus-km | 339k | 92k | ~1.25 M | 292k | 290k | 510k |
| 14 | km per bus per day | ~175 | ~149 | 167 (median route) | 250 network; 177 median line | 278 network (upper bound); median route 100–120 | ~145 |
| 15 | Buses out at noon (% of peak) | **91%** | 64% | n/a | 82% | 67% | 87% |
| 16 | Energy at 100% electric (MWh/day) | 447 | 133 | – | 379 (510 with the brief's articulated 1.85 kWh/km) | 377 | 664 |
| 17 | Lines over a depot-charged battery | 6 | 4–7 | 11 of 527 | 6 (standard) / 17 (articulated) | 8 robust (25 upper bound) | 1 |

Sources: team benchmark tables `Berlin/outputs/benchmark_berlin_madrid_brussels_helsinki.csv`, `Helsinki/outputs/benchmark_helsinki_madrid_brussels.csv`, `Paris/outputs/benchmark_madrid_vs_paris.csv`; London notebook. Energy uses the brief's fixed 1.30 kWh/km unless stated.

**Method caveat:** only Madrid and Brussels have real GTFS blocks. Berlin and Helsinki count concurrent trips plus layover (lower bound on buses, so km per bus is an upper bound); Paris chains trips greedily. Compare ratios and profiles, not the last bus.

---

## 3. Fleet and transition pace

| # | Item | Madrid | Brussels | London | Berlin | Helsinki | Paris |
|---|---|---|---|---|---|---|---|
| 18 | Fleet | 2,210 (end 2025, File_4 baseline) | 850 | 8,982 (31 Mar 2026) | 1,532 (31 Dec 2025) | ~1,154 (derived 600 ÷ 52%) | ~4,622 (early 2026, rounded) |
| 19 | Mix | 462 ZE (452 BEV + 10 H₂), rest CNG | ~140 BEV, ~400 hybrid, rest diesel | 2,957 ZE, 3,668 hybrid, 2,357 diesel | 277 BEV, 1,255 diesel | 600 BEV | ~1,100 BEV + 22 H₂, 1,300 biomethane, 1,100 hybrid, 1,100 diesel |
| 20 | **Zero-emission share** | **20.9%** | 16.8% | 32.9% | 18.1% | **52.0%** | 24.3% |
| 21 | E-buses added per year | 56 · 50 · 90 · **116** (2021–24); 2025 pace ~165 | ~50 | electric share of new route contracts 27% (2021) → 60% (2026) | +30 · +107 · +1 · +89 · 0 · +1 · +49 (2019–25); plan +270 (2026–27), +150 (2028) | 10 (2018) → 600 (2025), **~85/yr** | ~1,100 BEV across the Bus2025 programme |
| 22 | 100% target year | 2030 (brief S1) | 2030 → **2035** (slipped) | 2030 only with extra funding, else **2034** | 80–90% e-buses by **2035** | **2035** (all public transport) | **none zero-emission**; "clean" 100% by 2029 with a 70% biomethane mix |
| 23 | Bridge technology | CNG (bought until 2023) | Hybrids, counted as diesel under the LEZ | Hybrids, no longer bought since 2021 | None (diesel → electric) | – | Biomethane + hybrid (not zero-emission) |
| 24 | Large buses | 3.9% articulated | ~330 of 850 articulated | mostly double-deck | 72.8% of peak buses articulated / double-deck | trunk lines 18 m | n/p |
| 25 | Grid CO₂ (g/kWh) | ~108 | – | – | 344 | 72.8 | 19.6 |

Sources: Madrid `File_4.csv`, EMT fleet history; Berlin `berlin_fleet_mix_by_year.csv`, `berlin_must_haves.csv` (BVG in Zahlen 2025, Nachhaltigkeitsbericht 2025); Helsinki `helsinki_sourced_fields.csv` (hsl.fi/en/hsl/electric-buses); Paris `paris_fleet_mix.csv` (ratp.fr Bus2025, RATP 2025 report, IDFM).

---

## 4. Governance and money

| # | Item | Madrid | Brussels | London | Berlin | Helsinki | Paris |
|---|---|---|---|---|---|---|---|
| 26 | Who owns depots, buses, chargers | EMT (municipal) | STIB (municipal) | Private operators via TfL tenders | BVG (municipal; some subcontracted lines) | Contracted operators; HSL procures | Contracted operators in 11 lots (RATP Cap, Keolis, Transdev, ATM) since Nov 2025–Nov 2026 |
| 27 | Transition lever | Fleet orders + depot rebuilds | Depot conversions | Propulsion written into each 7-year route tender | Annual Land budget + new e-only depots | **Minimum electric share of route-km in every tender** | Depot-by-depot conversion programme (Bus2025) |
| 28 | Costs | Sanchinarro €12.58 M; La Elipa €134.3 M | ~€1 bn programme | ~£25k grid per bus; Norwood £17 M | e-bus €571k–815k; Säntisstr. ~€190 M (220 buses); Treptow ~€120 M; all depots ~€1.3 bn; total €1.7–2.3 bn (2019–35) | n/p | n/p |
| 29 | Funding | EU CEF €4.69 M (Sanchinarro) | EIB | ZEBRA, TfL | ~50% BVG / ~40% federal / ~10% Land (320 articulated); €12.1 M federal for STELLA | n/p | n/p |

Berlin warning sign: in 2024 the Senate cut the e-bus budget from €33.1 M to €8 M, and net e-bus additions fell to **+1** that year.

---

## 5. What the six cities say together

1. **Range is not the barrier anywhere.** A bus covers ~145–175 km/day in Madrid, Brussels, London and Paris; only a handful of lines per city exceed a depot-charged battery (1–8 robust lines per city).
2. **The depot grid sets the pace in every city.** Paris sized electric depots at 10–15 MW, Berlin plans 10–13 MVA, Madrid's model needs 10–17 MW. Berlin could only get 365 of ~2,300 MVA requested; London waits 3–10 years for ~10 MVA.
3. **New e-only depots unlock the grid problem.** Berlin's two new depots move it from 1 Critical / 5 Upgrade to 0 Critical / 4 Upgrade. Madrid's La Elipa rebuild (≤20 MW) is the same move.
4. **Madrid has the least daytime charging slack.** 91% of buses are out at noon (Paris 87%, Berlin 82%, Helsinki 67%, Brussels 64%), so Madrid depends on night charging more than any peer.
5. **Madrid's depots are among the biggest.** ~400 buses each, like Berlin's largest; ~2× Paris's average and ~4× London's median garage. Every Madrid depot is in the 10 MVA+ class.
6. **Nobody has reached 100% by 2030.** Brussels slipped to 2035, London needs extra funding for 2030 (else 2034), Berlin targets 80–90% by 2035, Helsinki 2035, Paris has no zero-emission target at all.
7. **The fastest city wins on procurement, not technology.** Helsinki went 10 → 600 e-buses (52%) through a minimum electric share in every tender; London's contract share reached 60%. Berlin, on a yearly budget, swung between +107 and +1.
8. **Smart charging is proven at scale.** Paris: 605 chargers for 745 buses with 10% lower charging cost; Berlin IGS runs 0.48 chargers per e-bus.

## 6. Data caveats and open checks

- **Carabanchel grid:** Madrid `File_3.csv` labels Carabanchel 10 MW as "Evidenced", but the team recap says no public figure exists (the earlier 15 MW was Electra's car-charging hub). Re-label as "Estimated" or find the source.
- **Madrid fleet baseline:** 2,210 buses / 462 ZE at end 2025 (`File_4`, brief baseline) vs 2,149 / 462 in EMT's fleet history to Jun 2025. Use 2,210 in all cross-city tables.
- **Helsinki** fleet total is derived (600 ÷ 52%); replace with HSL Annual Report 2025.
- **Paris** fleet figures are rounded to the nearest 100; check the 24 Nov 2026 reference day for strikes.
- **Berlin** per-depot connections other than IGS are a 10–13 MVA range, not contracts.
- Reference days differ (Brussels in March, others in November); winter heating load is not modelled except Brussels.
