#!/usr/bin/env bash

set -euo pipefail

host_address=""
frontend_port=8081
backend_port=8003

usage() {
  echo "Usage: $0 --host-address <LAN_IP>"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host-address)
      host_address="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$host_address" ]]; then
  echo "--host-address is required." >&2
  usage >&2
  exit 2
fi

backend_base="http://${host_address}:${backend_port}"
frontend_base="http://${host_address}:${frontend_port}"

assert_ok() {
  local message="$1"
  shift
  if ! "$@"; then
    echo "Check failed: $message" >&2
    exit 1
  fi
  echo "[ok] $message"
}

assert_ok "frontend port $frontend_port is listening" \
  lsof -nP -iTCP:"$frontend_port" -sTCP:LISTEN
assert_ok "$backend_base/api/races is reachable" \
  curl --fail --silent --show-error --output /dev/null "$backend_base/api/races?limit=1"
assert_ok "horse stats endpoint is available on analysis backend" \
  bash -c "curl --fail --silent --show-error '$backend_base/api/stats/horses' | grep -q '\"leaderboard\"'"
assert_ok "source stats endpoint is available on analysis backend" \
  bash -c "curl --fail --silent --show-error '$backend_base/api/stats/tipsters' | grep -q '\"leaderboard\"'"

containers="$(docker ps --format '{{.Names}}')"
grep -qx 'pmub_analysis_api' <<<"$containers" || { echo "Check failed: pmub_analysis_api container is running" >&2; exit 1; }
echo "[ok] pmub_analysis_api container is running"
grep -qx 'pmub_analysis_mongo' <<<"$containers" || { echo "Check failed: pmub_analysis_mongo container is running" >&2; exit 1; }
echo "[ok] pmub_analysis_mongo container is running"

container_env="$(docker inspect pmub_analysis_api --format '{{range .Config.Env}}{{println .}}{{end}}')"
grep -qx 'APP_PRODUCT=analysis' <<<"$container_env" || { echo "Check failed: backend APP_PRODUCT is analysis" >&2; exit 1; }
echo "[ok] backend APP_PRODUCT is analysis"
grep -Eq '^APP_ENV=analysis' <<<"$container_env" || { echo "Check failed: backend APP_ENV is analysis" >&2; exit 1; }
echo "[ok] backend APP_ENV is analysis"
grep -Eq '^DB_NAME=.*analysis' <<<"$container_env" || { echo "Check failed: backend DB_NAME is analysis-specific" >&2; exit 1; }
echo "[ok] backend DB_NAME is analysis-specific"

echo
echo "Analysis dev environment is ready:"
echo "Frontend: $frontend_base"
echo "Backend:  $backend_base"
