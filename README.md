# patient-profile-linkage

Interactive patient-profile views built on **synthetic** KEYNOTE-189-style raw data
(60 patients, pembrolizumab or placebo + pemetrexed + platinum, 2:1). No real trial data is used.

## Pages

| Page | What it shows |
|---|---|
| `docs/patient-lanes.html` | One line per patient. Domain layers (EX, AE, LB, TR, CM) can be peeled into lanes; semantic zoom reveals more detail as you zoom in; subset, sort, auto-detected data signals, and a 3D layered view (three.js). |
| `docs/event-cube.html` | The patient × domain × time cube. Collapse one dimension at a time, re-align time on an event, and drive the view from an agent panel. |

### Event cube views

- **Patient × Domain × Time**: full cube, each patient's domains peeled into lanes.
- **Patient × Time**: domains merged into one profile line per patient.
- **Patient × Domain**: time collapsed into a per-patient summary matrix (click a header to sort).
- **Domain × Time**: patients collapsed into the % of each arm per time window (click a cell to drill back into lanes).

Time can be aligned on randomization, first grade ≥3 AE, first immune-related AE, first AE of a chosen term,
confirmed partial response (PR or CR confirmed by a scan at least 28 days later), progression, or crossover.
Patients without the chosen event drop out of the view.

### Agent panel

Inside a Claude artifact viewer, the agent calls Claude with page tools:
`query_data` (filter / group / aggregate the flat SDTM-like tables DM, AE, LB, EX, TR, CM, SIG),
`set_view`, `show_patients` and `open_patient`. Opened as a plain HTML file, Claude is not available,
so the panel falls back to simple view commands such as "collapse time", "align on confirmed PR",
"sort by peak ALT" or "only placebo".

## Data

The generator (`src/*/p2_data.js` / `c0_data.js`) is seeded, so every load produces the same 60 patients.
It plants a few known issues for the signal engine to find: a potential Hy's law case, an AE starting after
death, a grade 3 immune-related AE with no steroid recorded, and a dosing gap over 6 weeks.

## Build

```bash
./build.sh   # assembles src/ parts into docs/patient-lanes.html and docs/event-cube.html
```

Open either file in a browser. The lanes page loads three.js from cdnjs for its 3D view.
