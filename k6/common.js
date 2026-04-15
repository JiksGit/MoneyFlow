import http from 'k6/http'
import { check } from 'k6'

const BASE = __ENV.BASE_URL || 'http://localhost:8080'

export function register(username, password, email) {
  const res = http.post(`${BASE}/api/users/register`, JSON.stringify({ username, email, password }), {
    headers: { 'Content-Type': 'application/json' },
  })
  check(res, { 'register 201': (r) => r.status === 201 || r.status === 400 })
  return res.status === 201 ? res.json() : null
}

export function login(username, password) {
  const res = http.post(`${BASE}/api/users/login`, JSON.stringify({ username, password }), {
    headers: { 'Content-Type': 'application/json' },
  })
  check(res, { 'login 200': (r) => r.status === 200 })
  return res.json()
}

export function createAccount(token, initialBalance = 100000) {
  const res = http.post(`${BASE}/api/accounts`, JSON.stringify({ initialBalance }), {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })
  check(res, { 'create account 201': (r) => r.status === 201 || r.status === 409 })
  if (res.status === 201) return res.json()
  // Already exists — fetch it
  const get = http.get(`${BASE}/api/accounts/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return get.json()
}

export function transfer(token, fromAccountId, toAccountId, amount) {
  const res = http.post(`${BASE}/api/transfers`,
    JSON.stringify({ fromAccountId, toAccountId, amount }),
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
  )
  check(res, { 'transfer 202': (r) => r.status === 202 })
  return res.json()
}

export function setupUser(vuId) {
  const username = `k6user${vuId}`
  const password = 'Password123!'
  const email = `${username}@k6test.com`
  register(username, password, email)
  const tokens = login(username, password)
  if (!tokens || !tokens.accessToken) return null
  const account = createAccount(tokens.accessToken, 10_000_000)
  return { tokens, account }
}
