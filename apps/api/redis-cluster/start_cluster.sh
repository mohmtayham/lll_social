#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODES=(7001 7002 7003)

command -v redis-server >/dev/null 2>&1 || {
  echo "redis-server is required but was not found in PATH." >&2
  exit 1
}

command -v redis-cli >/dev/null 2>&1 || {
  echo "redis-cli is required but was not found in PATH." >&2
  exit 1
}

start_node() {
  local port="$1"
  local node_dir="$SCRIPT_DIR/$port"

  if redis-cli -p "$port" ping >/dev/null 2>&1; then
    echo "Redis node on port $port is already running."
    return 0
  fi

  echo "Starting Redis node on port $port..."
  (cd "$node_dir" && redis-server ./redis.conf) >/dev/null 2>&1 || true
}

for port in "${NODES[@]}"; do
  start_node "$port"
done

for _ in {1..20}; do
  if redis-cli -p 7001 ping >/dev/null 2>&1 && \
     redis-cli -p 7002 ping >/dev/null 2>&1 && \
     redis-cli -p 7003 ping >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! redis-cli -p 7001 cluster info >/dev/null 2>&1; then
  echo "Creating Redis cluster..."
  redis-cli --cluster create \
    127.0.0.1:7001 \
    127.0.0.1:7002 \
    127.0.0.1:7003 \
    --cluster-replicas 0 \
    --cluster-yes
else
  echo "Redis cluster is already available."
fi

echo "Redis cluster ready on 127.0.0.1:7001,7002,7003"