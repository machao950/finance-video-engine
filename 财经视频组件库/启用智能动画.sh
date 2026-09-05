#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$ROOT/six-section-template"
SCRIPT_PATH="${1:-}"
OUT_DIR="${2:-}"

if [[ -z "$SCRIPT_PATH" ]]; then
  echo "用法: $0 /绝对路径/script.md [输出目录]" >&2
  exit 2
fi
SCRIPT_PATH="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)/$(basename "$SCRIPT_PATH")"
[[ -n "$OUT_DIR" ]] || OUT_DIR="$(dirname "$SCRIPT_PATH")"
OUT_DIR="$(cd "$OUT_DIR" && pwd)"

cd "$TEMPLATE"
npm install --no-audit --no-fund
node scripts/build-motion-plan.mjs "$SCRIPT_PATH" "$OUT_DIR"
node scripts/check-motion-plan.mjs "$OUT_DIR/motion-plan.json"

echo "智能动画路由完成。输出目录: $OUT_DIR"
