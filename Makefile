# MoneyFlow — 개발 명령어 모음
# 사용법: make <target>
# Windows: winget install GnuWin32.Make 또는 choco install make

.PHONY: help dev dev-watch prod down logs ps clean test-frontend typecheck k6-smoke k6-load k6-spike

# ── 기본 ──────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "MoneyFlow 개발 명령어"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  make dev          인프라만 실행 (Kafka, Redis, Postgres)"
	@echo "  make dev-watch    전체 스택 + 파일 감시 자동 재빌드"
	@echo "  make prod         전체 빌드 후 실행 (최초 1회)"
	@echo "  make down         전체 종료"
	@echo "  make logs         전체 로그 스트리밍"
	@echo "  make ps           컨테이너 상태 확인"
	@echo "  make clean        컨테이너 + 볼륨 전체 삭제"
	@echo ""
	@echo "  make logs s=transfer-service   특정 서비스 로그"
	@echo "  make restart s=account-service 특정 서비스만 재시작"
	@echo "  make rebuild s=frontend        특정 서비스만 재빌드"
	@echo ""
	@echo "  make typecheck    프론트엔드 타입 체크"
	@echo "  make k6-smoke     Smoke 부하 테스트"
	@echo "  make k6-load      Load 부하 테스트"
	@echo "  make k6-spike     Spike 부하 테스트"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""

# ── 실행 ──────────────────────────────────────────────────────────────────

# 인프라만 (개발 시 백엔드는 IDE에서 직접 실행)
dev:
	docker compose up -d zookeeper kafka redis postgres-user postgres-account \
	                      postgres-transfer postgres-ledger kafka-ui
	@echo ""
	@echo "✅ 인프라 실행 완료"
	@echo "   Kafka UI  : http://localhost:8090"
	@echo "   Redis     : localhost:6379"

# 전체 스택 + 파일 변경 감시 (핵심 개발 명령)
dev-watch:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --watch

# 전체 빌드 후 실행 (최초 구동 또는 CI 배포 후)
prod:
	docker compose up --build -d
	@echo ""
	@echo "✅ 전체 스택 실행 완료"
	@echo "   Frontend  : http://localhost:3000"
	@echo "   Gateway   : http://localhost:8080"
	@echo "   Grafana   : http://localhost:3001  (admin / admin123)"
	@echo "   Prometheus: http://localhost:9090"
	@echo "   Kafka UI  : http://localhost:8090"

# ── 종료 / 정리 ───────────────────────────────────────────────────────────
down:
	docker compose down

clean:
	docker compose down -v --remove-orphans
	@echo "⚠️  볼륨(DB 데이터 포함) 전체 삭제됨"

# ── 서비스 단위 조작 ──────────────────────────────────────────────────────
# 사용법: make logs s=transfer-service
logs:
ifdef s
	docker compose logs -f $(s)
else
	docker compose logs -f
endif

restart:
ifdef s
	docker compose restart $(s)
else
	@echo "사용법: make restart s=<서비스명>"
endif

# 특정 서비스만 재빌드 + 재시작
rebuild:
ifdef s
	docker compose up --build -d $(s)
else
	@echo "사용법: make rebuild s=<서비스명>"
endif

# 컨테이너 상태
ps:
	docker compose ps

# ── 프론트엔드 ────────────────────────────────────────────────────────────
typecheck:
	cd frontend && npm run typecheck

# ── K6 부하 테스트 ────────────────────────────────────────────────────────
k6-smoke:
	cd k6 && bash run-tests.sh smoke

k6-load:
	cd k6 && bash run-tests.sh load

k6-spike:
	cd k6 && bash run-tests.sh spike
