#!/usr/bin/env bash

set -euo pipefail

host_address=""
frontend_port=8081
backend_port=8003
admin_port=5179
restart_frontend=false
skip_frontend=false

usage() {
  echo "Usage: $0 --host-address <LAN_IP> [--restart-frontend] [--skip-frontend]"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host-address)
      host_address="${2:-}"
      shift 2
      ;;
    --restart-frontend)
      restart_frontend=true
      shift
      ;;
    --skip-frontend)
      skip_frontend=true
      shift
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

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
backend_env="$repo_root/backend/.env"
frontend_dir="$repo_root/frontend"
frontend_log="${TMPDIR:-/tmp}/pmub-analysis-frontend.log"
frontend_pid_file="${TMPDIR:-/tmp}/pmub-analysis-frontend.pid"

if [[ ! -f "$backend_env" ]]; then
  echo "Missing $backend_env. Create it from backend/.env.analysis.example and restore secrets securely." >&2
  exit 1
fi

docker info --format '{{.ServerVersion}}' >/dev/null

export CORS_ORIGINS="http://localhost:${frontend_port},http://${host_address}:${frontend_port},http://localhost:${admin_port},http://${host_address}:${admin_port}"

docker compose \
  --env-file "$backend_env" \
  -f "$repo_root/docker-compose.analysis.yml" \
  up -d --build

if [[ "$skip_frontend" == false ]]; then
  listener_pid="$(lsof -tiTCP:"$frontend_port" -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"
  if [[ -n "$listener_pid" ]]; then
    if [[ "$restart_frontend" == true ]]; then
      kill "$listener_pid"
      for _ in {1..20}; do
        if ! kill -0 "$listener_pid" 2>/dev/null; then
          break
        fi
        sleep 0.25
      done
    else
      echo "Frontend port $frontend_port is already in use by PID $listener_pid. Re-run with --restart-frontend." >&2
      exit 1
    fi
  fi

  (
    cd "$frontend_dir"
    EXPO_PUBLIC_BACKEND_URL="http://${host_address}:${backend_port}" \
    EXPO_PUBLIC_ADMIN_WEB_URL="http://${host_address}:${admin_port}" \
    EXPO_PUBLIC_APP_ENV=analysis-local \
    EXPO_PUBLIC_APP_PRODUCT=analysis \
    EXPO_PUBLIC_BETA_ACCESS_REQUIRED=false \
      nohup corepack yarn expo start --web --port "$frontend_port" --clear \
      >"$frontend_log" 2>&1 &
    echo $! >"$frontend_pid_file"
  )

  frontend_pid="$(cat "$frontend_pid_file")"
  frontend_ready=false
  for _ in {1..120}; do
    if lsof -tiTCP:"$frontend_port" -sTCP:LISTEN >/dev/null 2>&1; then
      frontend_ready=true
      break
    fi
    if ! kill -0 "$frontend_pid" 2>/dev/null; then
      echo "Expo exited before frontend port $frontend_port became ready. Review $frontend_log." >&2
      tail -n 40 "$frontend_log" >&2 || true
      exit 1
    fi
    sleep 0.5
  done

  if [[ "$frontend_ready" == false ]]; then
    echo "Timed out waiting for frontend port $frontend_port. Review $frontend_log." >&2
    tail -n 40 "$frontend_log" >&2 || true
    exit 1
  fi
fi

echo "Analysis backend: http://${host_address}:${backend_port}"
echo "Analysis frontend: http://${host_address}:${frontend_port}"
echo "Frontend logs: $frontend_log"
echo "Run scripts/check-analysis-dev.sh --host-address $host_address to verify the environment."
