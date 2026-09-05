#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE="$ROOT/tests/fixtures/mixed"

rm -f "$FIXTURE/motion-plan.json" "$FIXTURE/motion-plan.md" "$FIXTURE/animation-preflight.md"
"$ROOT/启用智能动画.sh" "$FIXTURE/script.md" "$FIXTURE"

node - "$FIXTURE/motion-plan.json" <<'NODE'
const fs = require('fs');
const plan = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const grammars = new Set(plan.cues.map(c => c.grammar));
for (const expected of ['fund-flow', 'cashflow-waterfall', 'risk-path', 'motion-canvas-shot', 'tutorial-state-machine']) {
  if (!grammars.has(expected)) throw new Error(`缺少预期路由: ${expected}`);
}
if (new Set(plan.cues.map(c => c.section)).size < 3) throw new Error('Hero没有跨3章');
NODE

first="$(shasum -a 256 "$FIXTURE/motion-plan.json" | awk '{print $1}')"
node "$ROOT/six-section-template/scripts/build-motion-plan.mjs" "$FIXTURE/script.md" "$FIXTURE" >/dev/null
second="$(shasum -a 256 "$FIXTURE/motion-plan.json" | awk '{print $1}')"
[[ "$first" = "$second" ]] || { echo '重复运行结果不确定' >&2; exit 1; }

tmp="$(mktemp -d)"
cp "$FIXTURE/script.md" "$tmp/script.md"
if node "$ROOT/six-section-template/scripts/build-motion-plan.mjs" "$tmp/script.md" "$tmp" >/dev/null \
  && node "$ROOT/six-section-template/scripts/check-motion-plan.mjs" "$tmp/motion-plan.json" >/dev/null 2>&1; then
  echo '缺少product-facts.md时未阻断' >&2
  exit 1
fi
rm -rf "$tmp"
echo '智能动画路由测试通过'
