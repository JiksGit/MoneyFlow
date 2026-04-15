/**
 * Smoke Test — 정상 동작 확인
 * vus=5, duration=30s
 * 목적: 기본 송금 흐름이 오류 없이 동작하는지 검증
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter, Trend } from 'k6/metrics'
import { setupUser, transfer } from './common.js'

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],          // 오류율 1% 미만
    http_req_duration: ['p(95)<2000'],        // P95 2초 미만
    transfer_success: ['count>0'],
  },
}

const transferSuccess = new Counter('transfer_success')
const transferDuration = new Trend('transfer_duration_ms')

// VU당 한 번만 실행 (setup)
const users = []

export function setup() {
  const results = []
  for (let i = 0; i < 10; i++) {
    const u = setupUser(i)
    if (u) results.push(u)
  }
  return results
}

export default function (users) {
  if (!users || users.length < 2) return

  const sender = users[__VU % users.length]
  const receiver = users[(__VU + 1) % users.length]

  if (!sender?.tokens?.accessToken || !sender?.account?.id || !receiver?.account?.id) {
    sleep(1)
    return
  }

  const start = Date.now()
  const result = transfer(
    sender.tokens.accessToken,
    sender.account.id,
    receiver.account.id,
    100
  )
  const duration = Date.now() - start
  transferDuration.add(duration)

  if (result && result.id) {
    transferSuccess.add(1)

    // Poll for completion (max 5s)
    let status = result.status
    for (let i = 0; i < 5 && !['COMPLETED', 'FAILED', 'COMPENSATED'].includes(status); i++) {
      sleep(1)
      const poll = http.get(`${__ENV.BASE_URL || 'http://localhost:8080'}/api/transfers/${result.id}`, {
        headers: { Authorization: `Bearer ${sender.tokens.accessToken}` },
      })
      if (poll.status === 200) status = poll.json().status
    }

    check({ status }, {
      'transfer completed or failed': (s) => ['COMPLETED', 'FAILED', 'COMPENSATED'].includes(s.status),
    })
  }

  sleep(1)
}
