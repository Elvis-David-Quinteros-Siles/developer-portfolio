#!/usr/bin/env sh
# Smoke test end-to-end contra el stack levantado (docker compose up -d).
# Uso: ./scripts/smoke-test.sh [base_url]   (default http://localhost)
set -eu

BASE="${1:-http://localhost}"
fail=0

check() {
  desc="$1"; url="$2"; expected="${3:-200}"
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url") || code=000
  if [ "$code" = "$expected" ]; then
    echo "  OK   [$code] $desc"
  else
    echo "  FAIL [$code≠$expected] $desc  ($url)"
    fail=1
  fi
}

echo "Smoke test → $BASE"
check "Edge health"            "$BASE/nginx-health"
check "SPA index"              "$BASE/"
check "REST profile"           "$BASE/api/v1/profile"
check "REST projects"          "$BASE/api/v1/projects"
check "REST skills"            "$BASE/api/v1/skills"
check "REST experience"        "$BASE/api/v1/experience"
check "REST architecture"      "$BASE/api/v1/architecture"
check "REST certifications"    "$BASE/api/v1/certifications"
check "Swagger UI"             "$BASE/api/v1/docs"
check "OpenAPI spec"           "$BASE/api/v1/openapi.yaml"
check "Admin sin JWT → 401"    "$BASE/api/v1/admin/contact-messages" 401

gql=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ posts(first: 1) { edges { node { title } } } }"}') || gql=000
[ "$gql" = "200" ] && echo "  OK   [200] GraphQL posts" || { echo "  FAIL [$gql] GraphQL posts"; fail=1; }

contact=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/contact" \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke Test","email":"smoke@example.com","subject":"Smoke","message":"Mensaje de prueba del smoke test end to end."}') || contact=000
case "$contact" in
  202) echo "  OK   [202] POST contact (flujo Go→Django→PG→Celery)";;
  429) echo "  OK   [429] POST contact rate-limited (límite activo)";;
  *)   echo "  FAIL [$contact] POST contact"; fail=1;;
esac

[ "$fail" = 0 ] && echo "Resultado: TODO OK" || { echo "Resultado: FALLOS"; exit 1; }
