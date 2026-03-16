#!/usr/bin/env bash
set -euo pipefail

echo "=== Quality Gates ==="

echo ""
echo "--- TypeCheck ---"
npm run typecheck

echo ""
echo "--- Tests ---"
npm run test

echo ""
echo "--- Format Check ---"
npm run format:check

echo ""
echo "=== All quality gates passed ==="
