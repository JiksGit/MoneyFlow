import { useState, useEffect, FormEvent } from 'react'
import { accountApi, Account } from '../api/account'
import { transferApi, Transfer } from '../api/transfer'

function fmt(n: number) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(n)
}

const STATUS_LABEL: Record<string, string> = {
  INITIATED: '처리 시작',
  DEBIT_REQUESTED: '출금 요청 중',
  DEBITED: '출금 완료',
  CREDIT_REQUESTED: '입금 요청 중',
  CREDITED: '입금 완료',
  COMPLETED: '송금 완료',
  COMPENSATING: '보상 처리 중',
  COMPENSATED: '보상 완료',
  FAILED: '송금 실패',
}

export default function TransferPage() {
  const [account, setAccount] = useState<Account | null>(null)
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [transfer, setTransfer] = useState<Transfer | null>(null)
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    accountApi.getMyAccount().then(setAccount).catch(() => {})
  }, [])

  // Poll transfer status until terminal state
  useEffect(() => {
    if (!transfer || !polling) return
    const terminal = ['COMPLETED', 'FAILED', 'COMPENSATED']
    if (terminal.includes(transfer.status)) { setPolling(false); return }

    const timer = setTimeout(async () => {
      try {
        const updated = await transferApi.getTransfer(transfer.id)
        setTransfer(updated)
      } catch { /* ignore */ }
    }, 1500)

    return () => clearTimeout(timer)
  }, [transfer, polling])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!account) return
    setError('')
    const amt = parseFloat(amount)
    if (!toAccountId.trim() || !amt || amt <= 0) {
      setError('수신 계좌 ID와 금액을 입력해주세요.')
      return
    }
    if (toAccountId === account.id) {
      setError('본인 계좌로는 송금할 수 없습니다.')
      return
    }

    setSubmitting(true)
    setTransfer(null)
    try {
      const t = await transferApi.initiate(account.id, toAccountId, amt)
      setTransfer(t)
      setPolling(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg || '송금 요청 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setTransfer(null)
    setToAccountId('')
    setAmount('')
    setError('')
    setPolling(false)
  }

  return (
    <div className="page-wrapper">
      <h2 style={{ marginBottom: 20, fontSize: '1.4rem' }}>송금하기</h2>

      {account && (
        <div style={{ background: '#ede9fe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>내 계좌 잔액: </span>
          <strong style={{ color: 'var(--primary)' }}>{fmt(account.balance)}</strong>
          <span style={{ color: 'var(--text-muted)', marginLeft: 12, fontSize: '0.8rem' }}>ID: {account.id}</span>
        </div>
      )}

      {!transfer ? (
        <div className="card">
          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                수신 계좌 ID
              </label>
              <input
                type="text"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                송금 금액
              </label>
              <input
                type="number"
                placeholder="0"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '14px' }}>
              {submitting ? '요청 중...' : '송금하기'}
            </button>
          </form>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 20 }}>
            {/* Status icon */}
            {transfer.status === 'COMPLETED' && (
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            )}
            {transfer.status === 'FAILED' && (
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>❌</div>
            )}
            {!['COMPLETED', 'FAILED', 'COMPENSATED'].includes(transfer.status) && (
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>⏳</div>
            )}

            <h3 style={{ fontSize: '1.3rem', marginBottom: 8 }}>
              {STATUS_LABEL[transfer.status] || transfer.status}
            </h3>
            <span className={`badge ${transfer.status}`}>{transfer.status}</span>
          </div>

          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '16px', textAlign: 'left', fontSize: '0.9rem', lineHeight: 2 }}>
            <div><strong>송금 ID:</strong> <code style={{ fontSize: '0.8rem' }}>{transfer.id}</code></div>
            <div><strong>금액:</strong> {fmt(transfer.amount)}</div>
            <div><strong>수신 계좌:</strong> {transfer.toAccountId}</div>
            {transfer.failureReason && (
              <div style={{ color: 'var(--danger)' }}><strong>실패 사유:</strong> {transfer.failureReason}</div>
            )}
          </div>

          {polling && (
            <p style={{ color: 'var(--text-muted)', marginTop: 16, fontSize: '0.85rem' }}>
              처리 상태를 확인하는 중...
            </p>
          )}

          {/* Saga progress bar */}
          <div style={{ marginTop: 20 }}>
            <SagaProgress status={transfer.status} />
          </div>

          {!polling && (
            <button className="btn-secondary" onClick={reset} style={{ marginTop: 20 }}>
              새 송금
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const SAGA_STEPS = ['INITIATED', 'DEBITED', 'CREDITED', 'COMPLETED']

function SagaProgress({ status }: { status: string }) {
  const isFailed = ['FAILED', 'COMPENSATING', 'COMPENSATED'].includes(status)
  const currentIdx = isFailed ? -1 : SAGA_STEPS.indexOf(status)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, fontSize: '0.75rem' }}>
      {SAGA_STEPS.map((step, i) => {
        const done = !isFailed && SAGA_STEPS.indexOf(status) >= i
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: done ? 'var(--success)' : isFailed ? '#d1d5db' : '#e5e7eb',
              color: done ? '#fff' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.8rem',
            }}>
              {done ? '✓' : i + 1}
            </div>
            {i < SAGA_STEPS.length - 1 && (
              <div style={{ width: 40, height: 2, background: done ? 'var(--success)' : '#e5e7eb' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
