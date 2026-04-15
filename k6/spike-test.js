/**
 * Spike Test — 순간 트래픽 폭증
 * 0 → 1000명 즉시 증가 → 유지 → 급격히 감소
 * 목적: Kafka 버퍼링 효과 검증 및 시스템 복원력 테스트
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter, Trend, Rate } from 'k6/metrics'
import { setupUser, transfer } from './common.js'

export const options = {
  stages: [
    { duration: '30s', target: 10 },     // warm-up
    { duration: '10s', target: 1000 },   // 폭증!
    { duration: '3m',  target: 1000 },   // 1000 vus 유지
    { duration: '10s', target: 10 },     // 급감
    { duration: '1m',  target: 10 },     // 복구 모니터링
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // Spike test는 일부 오류 허용
    http_req_failed: ['rate<0.15'],       // 오류율 15% 미만
    http_req_duration: ['p(95)<10000'],   // P95 10초 미만
    kafka_buffered_requests: ['count>0'], // Kafka 버퍼링 확인
  },
}

const kafkaBuffered = new Counter('kafka_buffered_requests')
const spikeCompletedRate = new Rate('spike_completed_rate')
const spikeDuration = new Trend('spike_transfer_duration_ms')

export function setup() {
  const users = []
  for (let i = 0; i < 100; i++) {
    const u = setupUser(5000 + i)
    if (u) users.push(u)
  }
  console.log(`Spike test setup: ${users.length} users`)
  return users
}

export default function (users) {
  if (!users || users.length < 2) { sleep(1); return }

  const idx = __VU % users.length
  const sender = users[idx]
  const receiver = users[(idx + 1) % users.length]

  if (!sender?.tokens?.accessToken || !sender?.account?.id || !receiver?.account?.id) {
    sleep(1); return
  }

  const BASE = __ENV.BASE_URL || 'http://localhost:8080'

  const start = Date.now()

  // 송금 요청 (202 Accepted — Kafka에 큐잉됨)
  const res = http.post(`${BASE}/api/transfers`,
    JSON.stringify({
      fromAccountId: sender.account.id,
      toAccountId: receiver.account.id,
      amount: 1,
    }),
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sender.tokens.accessToken}` } }
  )

  // 202 = 요청이 Kafka 큐에 들어감 (비동기 처리)
  const accepted = check(res, {
    'accepted 202': (r) => r.status === 202,
    'has transfer id': (r) => r.status === 202 && !!r.json().id,
  })

  if (accepted) {
    kafkaBuffered.add(1) // Kafka 버퍼링 카운트

    const txId = res.json().id

    // Spike 중에는 빠른 완료 확인만 (3회 폴링)
    let finalStatus = res.json().status
    for (let i = 0; i < 3 && !['COMPLETED', 'FAILED', 'COMPENSATED'].includes(finalStatus); i++) {
      sleep(2)
      const poll = http.get(`${BASE}/api/transfers/${txId}`, {
        headers: { Authorization: `Bearer ${sender.tokens.accessToken}` },
      })
      if (poll.status === 200) finalStatus = poll.json().status
    }

    const duration = Date.now() - start
    spikeDuration.add(duration)
    spikeCompletedRate.add(finalStatus === 'COMPLETED' ? 1 : 0)
  }

  sleep(0.5)
}
