#!/bin/bash
# K6 부하 테스트 실행 스크립트
# InfluxDB v2에 결과 저장 → Grafana에서 시각화

INFLUX_URL="http://localhost:8086"
INFLUX_TOKEN="moneyflow-influxdb-token"
INFLUX_ORG="moneyflow"
INFLUX_BUCKET="k6"
BASE_URL="${BASE_URL:-http://localhost:8080}"

OUTPUT="experimental-prometheus-rw"
# InfluxDB v2 output
OUTPUT_CFG="K6_INFLUXDB_ORGANIZATION=${INFLUX_ORG} K6_INFLUXDB_BUCKET=${INFLUX_BUCKET} K6_INFLUXDB_TOKEN=${INFLUX_TOKEN}"

echo "================================================"
echo "  MoneyFlow K6 부하 테스트"
echo "  BASE_URL: ${BASE_URL}"
echo "  InfluxDB: ${INFLUX_URL}"
echo "================================================"

run_test() {
  local name=$1
  local file=$2
  echo ""
  echo ">>> [${name}] 시작..."
  eval "${OUTPUT_CFG}" k6 run \
    --out "influxdb=${INFLUX_URL}" \
    -e BASE_URL="${BASE_URL}" \
    "${file}"
  echo ">>> [${name}] 완료"
  echo ""
  sleep 5
}

case "${1}" in
  smoke)  run_test "Smoke Test"  smoke-test.js  ;;
  load)   run_test "Load Test"   load-test.js   ;;
  spike)  run_test "Spike Test"  spike-test.js  ;;
  all)
    run_test "Smoke Test"  smoke-test.js
    run_test "Load Test"   load-test.js
    run_test "Spike Test"  spike-test.js
    ;;
  *)
    echo "Usage: $0 [smoke|load|spike|all]"
    exit 1
    ;;
esac

echo "테스트 완료. Grafana에서 결과를 확인하세요: http://localhost:3001"
