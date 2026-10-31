#!/usr/bin/env bash
# Assemble each page from its parts into a standalone HTML file under docs/.
set -euo pipefail
cd "$(dirname "$0")"
wrap(){ printf '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>\n'; cat; printf '\n</body></html>\n'; }
{ cat src/lanes/p1_head.html; echo '<script>'; cat src/lanes/p2_data.js src/lanes/p3_lanes.js src/lanes/p4_app.js; echo '</script>'; } | wrap > docs/patient-lanes.html
{ cat src/cube/c1_base.html src/cube/c1_extra.html; echo '<script>'; cat src/cube/c0_data.js src/cube/c2_cube.js src/cube/c3_lanes.js src/cube/c4_views.js src/cube/c5_agent.js src/cube/c6_app.js; echo '</script>'; } | wrap > docs/event-cube.html
echo "Built docs/patient-lanes.html and docs/event-cube.html"
