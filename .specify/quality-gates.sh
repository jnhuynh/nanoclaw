#!/usr/bin/env bash
# SPECKIT_DEFAULT_QUALITY_GATE
#
# Quality Gates Configuration
# ──────────────────────────────────────────────────────────────
# Add your project's quality gate commands below.
# These commands run after each implementation step to verify code quality.
#
# Examples:
#   npm test && npm run lint
#   pytest && ruff check .
#   cargo test && cargo clippy
#   shellcheck *.sh
#
# This file is sourced by the pipeline and Ralph loop scripts.
# It must exit 0 for quality gates to pass.
# ──────────────────────────────────────────────────────────────

echo "ERROR: Quality gates not configured."
echo "Edit .specify/quality-gates.sh with your project's quality gate commands."
exit 1
