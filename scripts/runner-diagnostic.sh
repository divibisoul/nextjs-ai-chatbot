#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${RUNNER_DIAGNOSTIC_DIR:-.diagnostics}"
mkdir -p "$OUT_DIR"
OUT_FILE="$OUT_DIR/runner-failure.json"

repo="${GITHUB_REPOSITORY:-unknown}"
run_id="${GITHUB_RUN_ID:-unknown}"
run_attempt="${GITHUB_RUN_ATTEMPT:-unknown}"
sha="${GITHUB_SHA:-unknown}"
ref="${GITHUB_REF:-unknown}"
now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
host="$(hostname 2>/dev/null || true)"
os_name="$(uname -s 2>/dev/null || true)"
os_release="$(uname -r 2>/dev/null || true)"

cat > "$OUT_FILE" <<EOF
{
  "timestamp": "${now}",
  "repository": "${repo}",
  "run_id": "${run_id}",
  "run_attempt": "${run_attempt}",
  "sha": "${sha}",
  "ref": "${ref}",
  "hostname": "${host}",
  "os": "${os_name}",
  "kernel": "${os_release}",
  "runner_name": "${RUNNER_NAME:-unknown}",
  "runner_os": "${RUNNER_OS:-unknown}",
  "runner_arch": "${RUNNER_ARCH:-unknown}",
  "runner_environment": "${RUNNER_ENVIRONMENT:-unknown}",
  "diagnosis": "runner state capture executed; workflow orchestration state must be inspected separately when no job steps are provisioned"
}
EOF

printf '%s\n' "Runner diagnostic written to $OUT_FILE"
cat "$OUT_FILE"

if [[ -n "${RUNNER_DIAGNOSTIC_WEBHOOK:-}" ]]; then
  curl --fail --silent --show-error --max-time 10 \
    -H 'Content-Type: application/json' \
    --data-binary "@$OUT_FILE" \
    "$RUNNER_DIAGNOSTIC_WEBHOOK"
fi
