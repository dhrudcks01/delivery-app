#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "" ] || [ "${2:-}" = "" ]; then
  echo "사용법: $0 <db_user> <db_name> [db_host=127.0.0.1] [db_port=3306]"
  echo "환경변수:"
  echo "  SERVICE_AREA_MASTER_MIN_TOTAL (기본 3000)"
  echo "  SERVICE_AREA_MASTER_MIN_CITY  (기본 17)"
  echo "  MYSQL_PWD (선택, 비밀번호)"
  exit 1
fi

DB_USER="$1"
DB_NAME="$2"
DB_HOST="${3:-127.0.0.1}"
DB_PORT="${4:-3306}"

MIN_TOTAL="${SERVICE_AREA_MASTER_MIN_TOTAL:-3000}"
MIN_CITY="${SERVICE_AREA_MASTER_MIN_CITY:-17}"

QUERY="SELECT COUNT(*) AS total_count, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active_count, COUNT(DISTINCT city) AS city_count, COUNT(DISTINCT CONCAT(city, '|', district)) AS district_count FROM service_area_master_dongs;"

RESULT="$(mysql -N -s -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" -e "$QUERY")"
TOTAL_COUNT="$(echo "$RESULT" | awk '{print $1}')"
ACTIVE_COUNT="$(echo "$RESULT" | awk '{print $2}')"
CITY_COUNT="$(echo "$RESULT" | awk '{print $3}')"
DISTRICT_COUNT="$(echo "$RESULT" | awk '{print $4}')"

echo "service_area_master_dongs 점검 결과"
echo "- total_count: $TOTAL_COUNT"
echo "- active_count: $ACTIVE_COUNT"
echo "- city_count: $CITY_COUNT"
echo "- district_count: $DISTRICT_COUNT"
echo "- threshold_total: $MIN_TOTAL"
echo "- threshold_city: $MIN_CITY"

FAILED=0
if [ "$TOTAL_COUNT" -lt "$MIN_TOTAL" ]; then
  echo "[FAIL] total_count가 최소 기준보다 작습니다."
  FAILED=1
fi
if [ "$CITY_COUNT" -lt "$MIN_CITY" ]; then
  echo "[FAIL] city_count가 최소 기준보다 작습니다."
  FAILED=1
fi

if [ "$FAILED" -eq 1 ]; then
  echo "조치: docs/dev/service-area-master-sync.md 절차로 전체 데이터 재적재를 수행하세요."
  exit 2
fi

echo "[PASS] 마스터 데이터 최소 기준을 충족합니다."
