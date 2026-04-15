# MoneyFlow — MSA 기반 개인 간 송금·정산 서비스

카카오페이/토스 스타일의 개인 간 송금 서비스를 **MSA + Saga 패턴**으로 구현한 프로젝트입니다.

## 아키텍처

```
[React Frontend :3000]
        │
[API Gateway :8080]  ← JWT 검증 + Redis Rate Limiting (10req/s/user)
   ┌────┼────┬──────────┬──────────┐
   │    │    │          │          │
[user] [account] [transfer] [ledger] [notification]
:8081  :8082    :8083      :8084    :8085
  │      │  ↕Kafka↕  │
  └──────┴──────────────────────────┘
              Apache Kafka :9092
```

## Saga 상태 흐름

```
INITIATED → DEBITED → CREDITED → COMPLETED
              │
              └─ DEBIT_FAILED → FAILED
                     │
              CREDITED_FAILED → COMPENSATING → COMPENSATED → FAILED
```

## 빠른 시작

### 전체 스택 실행
```bash
docker-compose up --build
```

### 서비스 URL
| 서비스           | URL                         |
|------------------|-----------------------------|
| React Frontend   | http://localhost:3000       |
| API Gateway      | http://localhost:8080       |
| Grafana          | http://localhost:3001       |
| Prometheus       | http://localhost:9090       |
| Kafka UI         | http://localhost:8090       |
| InfluxDB         | http://localhost:8086       |

Grafana 기본 계정: `admin` / `admin123`

## API 명세

### 인증 (user-service → /api/users)
```
POST /api/users/register  { username, email, password }   → 201 TokenResponse
POST /api/users/login     { username, password }          → 200 TokenResponse
POST /api/users/refresh   { refreshToken }                → 200 TokenResponse
GET  /api/users/me                                        → 200 UserInfo
```

### 계좌 (account-service → /api/accounts)
```
POST /api/accounts                 { initialBalance? }    → 201 Account
GET  /api/accounts/me                                     → 200 Account (잔액 Redis 캐시)
POST /api/accounts/me/deposit      { amount }             → 200 Account
GET  /api/accounts/:id                                    → 200 Account
```

### 송금 (transfer-service → /api/transfers)
```
POST /api/transfers   { fromAccountId, toAccountId, amount }  → 202 TransferSaga
GET  /api/transfers/:id                                       → 200 TransferSaga
GET  /api/transfers?page=0&size=10                            → 200 Page<TransferSaga>
```

### 원장 (ledger-service → /api/ledger)
```
GET /api/ledger/account/:accountId?page=0&size=10  → 200 Page<Transaction>
GET /api/ledger/:transferId                         → 200 Transaction
```

### 실시간 알림 (SSE)
```
GET /api/notifications/subscribe   → text/event-stream
```
이벤트 종류: `transfer.completed`, `transfer.failed`

## 부하 테스트

```bash
cd k6

# Smoke Test (5 VUs, 30s)
./run-tests.sh smoke

# Load Test (100 → 500 VUs 점진적)
./run-tests.sh load

# Spike Test (0 → 1000 VUs 순간 폭증)
./run-tests.sh spike

# 전체 실행
./run-tests.sh all
```

결과는 InfluxDB에 저장되며 Grafana `K6 부하 테스트 결과` 대시보드에서 확인합니다.

## 핵심 설계 포인트

| 항목 | 구현 방법 |
|------|-----------|
| 동시성 제어 | 낙관적 락 (`@Version`) + 충돌 시 3회 재시도 |
| 보상 트랜잭션 | Orchestration Saga (transfer-service가 오케스트레이터) |
| 멱등성 | transferId 기반 중복 이벤트 스킵 |
| Rate Limiting | Redis 슬라이딩 윈도우 (계정당 10req/s) |
| 트래픽 버퍼링 | 모든 서비스 간 통신을 Kafka 비동기 이벤트로 처리 |
| 잔액 캐시 | Redis TTL 30초 + 송금 완료 시 즉시 무효화 |
| DLT | 모든 Kafka Consumer에 Dead Letter Topic 설정 |
| 실시간 알림 | SSE (Server-Sent Events) |
