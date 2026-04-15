/**
 * Load Test — 점진적 부하 증가
 * 100명 → 500명 점진적 증가 후 안정화 → 감소
 * 목적: 정상 부하 하에서 Saga 처리 안정성 및 응답 시간 측정
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter, Trend, Rate } from 'k6/metrics'
import { setupUser, transfer } from './common.js'

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // 0 → 100 vus
    { duration: '3m', target: 300 },   // 100 → 300 vus
    { duration: '5m', target: 500 },   // 300 → 500 vus (peak)
    { duration: '3m', target: 500 },   // 500 vus 유지
    { duration: '2m', target: 0 },     // cool-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],        // 오류율 5% 미만
    http_req_duration: ['p(95)<3000'],     // P95 3초 미만
    http_req_duration: ['p(99)<5000'],     // P99 5초 미만
    saga_completed_rate: ['rate>0.90'],    // 90% 이상 완료
  },
  ext: {
    loadimpact: {
      projectID: 0,
      name: 'MoneyFlow Load Test',
    },
  },
}

const sagaCompletedRate = new Rate('saga_completed_rate')
const sagaFailedCount = new Counter('saga_failed_count')
const transferLatency = new Trend('transfer_e2e_latency_ms')

export function setup() {
  const users = []
  // 50명의 미리 생성된 사용자 풀
  for (let i = 0; i < 50; i++) {
    const u = setupUser(1000 + i)
    if (u) users.push(u)
  }
  console.log(`Setup complete: ${users.length} users created`)
  return users
}

export default function (users) {
  if (!users || users.length < 2) { sleep(2); return }

  const idx = __VU % users.length
  const sender = users[idx]
  const receiver = users[(idx + 1) % users.length]

  if (!sender?.tokens?.accessToken || !sender?.account?.id || !receiver?.account?.id) {
    sleep(2); return
  }

  const BASE = __ENV.BASE_URL || 'http://localhost:8080'

  // --- 1. 잔액 조회 (Redis 캐시 히트 테스트) ---
  const balanceRes = http.get(`${BASE}/api/accounts/me`, {
    headers: { Authorization: `Bearer ${sender.tokens.accessToken}` },
  })
  check(balanceRes, { 'balance 200': (r) => r.status === 200 })

  sleep(0.5)

  // --- 2. 송금 ---
  const start = Date.now()
  const txResult = transfer(sender.tokens.accessToken, sender.account.id, receiver.account.id, 10)
  if (!txResult?.id) { sleep(1); return }

  // --- 3. 상태 폴링 (최대 10초) ---
  let finalStatus = txResult.status
  for (let i = 0; i < 10 && !['COMPLETED', 'FAILED', 'COMPENSATED'].includes(finalStatus); i++) {
    sleep(1)
    const poll = http.get(`${BASE}/api/transfers/${txResult.id}`, {
      headers: { Authorization: `Bearer ${sender.tokens.accessToken}` },
    })
    if (poll.status === 200) finalStatus = poll.json().status
  }

  const latency = Date.now() - start
  transferLatency.add(latency)

  if (finalStatus === 'COMPLETED') {
    sagaCompletedRate.add(1)
  } else {
    sagaCompletedRate.add(0)
    sagaFailedCount.add(1)
  }

  sleep(1)
}
