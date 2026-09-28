#!/usr/bin/env bash
# Runs every migration, then the RLS tests, against a throwaway local
# Postgres cluster. Needs Postgres binaries (initdb/pg_ctl) on the machine;
# nothing here touches a real Supabase project.
set -euo pipefail
cd "$(dirname "$0")/.."

PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="$PG_BIN:$PATH"
DATA_DIR="$(mktemp -d)"
PORT="${PGTEST_PORT:-54329}"
if [ "$(id -u)" = "0" ]; then
  # initdb refuses to run as root; run the cluster as the postgres user.
  chown postgres "$DATA_DIR"
  AS_PG=(runuser -u postgres --)
else
  AS_PG=()
fi
cleanup() { "${AS_PG[@]}" pg_ctl -D "$DATA_DIR" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA_DIR"; }
trap cleanup EXIT

"${AS_PG[@]}" initdb -D "$DATA_DIR" -U postgres --auth=trust >/dev/null
"${AS_PG[@]}" pg_ctl -D "$DATA_DIR" -o "-p $PORT -k /tmp -c listen_addresses=''" -w start >/dev/null

PSQL=(psql -h /tmp -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -c "create database hub_test" >/dev/null
"${PSQL[@]}" -d hub_test -f supabase/tests/auth_stub.sql >/dev/null
for f in supabase/migrations/*.sql; do
  "${PSQL[@]}" -d hub_test -f "$f" >/dev/null
done
"${PSQL[@]}" -d hub_test -f supabase/tests/rls_test.sql
"${PSQL[@]}" -d hub_test -f supabase/tests/rls_modules_test.sql
echo "Database tests passed."
