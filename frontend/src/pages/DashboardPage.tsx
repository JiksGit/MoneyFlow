import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { accountApi, Account } from '../api/account'
import { transferApi, Transfer } from '../api/transfer'
import { useAuth } from '../contexts/AuthContext'

function fmt(n: number) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [account, setAccount] = useState<Account | null>(null)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loadingAccount, setLoadingAccount] = useState(true)
  const [noAccount, setNoAccount] = useState(false)
  const [depositAmt, setDepositAmt] = useState('')
  const [depositing, setDepositing] = useState(false)

  const loadAccount = async () => {
    try {
      const a = await accountApi.getMyAccount()
      setAccount(a)
      setNoAccount(false)
    } catch {
      setNoAccount(true)
    } finally {
      setLoadingAccount(false)
    }
  }

  const loadTransfers = async () => {
    try {
      const p = await transferApi.getMyTransfers(0, 5)
      setTransfers(p.content)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadAccount()
    loadTransfers()
  }, [])

  const createAccount = async () => {
    await accountApi.createAccount(0)
    loadAccount()
  }

  const doDeposit = async () => {
    const amt = parseFloat(depositAmt)
    if (!amt || amt <= 0) return
    setDepositing(true)
    try {
      await accountApi.deposit(amt)
      setDepositAmt('')
      loadAccount()
    } finally { setDepositing(false) }
  }

  return (
    <div className="page-wrapper">
      <h2 style={{ marginBottom: 20, fontSize: '1.4rem' }}>안녕하세요, {user?.username}님</h2>

      {loadingAccount ? (
        <p style={{ color: 'var(--text-muted)' }}>계좌 정보를 불러오는 중...</p>
      ) : noAccount ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>등록된 계좌가 없습니다.</p>
          <button className="btn-primary" onClick={createAccount}>계좌 만들기</button>
        </div>
      ) : account && (
        <>
          {/* Balance card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary), #7c3aed)', color: '#fff', marginBottom: 20 }}>
            <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: 8 }}>잔액</p>
            <p style={{ fontSize: '2.4rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
              {fmt(account.balance)}
            </p>
            <p style={{ opacity: 0.7, fontSize: '0.8rem', marginTop: 8 }}>계좌 ID: {account.id}</p>
          </div>

          {/* Quick deposit */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 14, fontSize: '1rem' }}>충전</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="number" placeholder="충전 금액" min={1}
                value={depositAmt}
                onChange={(e) => setDepositAmt(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn-primary" onClick={doDeposit} disabled={depositing} style={{ whiteSpace: 'nowrap' }}>
                {depositing ? '처리 중' : '충전하기'}
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <Link to="/transfer" style={{ flex: 1 }}>
              <button className="btn-primary" style={{ width: '100%', padding: '14px' }}>송금하기</button>
            </Link>
            <Link to="/history" style={{ flex: 1 }}>
              <button className="btn-secondary" style={{ width: '100%', padding: '14px' }}>거래내역</button>
            </Link>
          </div>

          {/* Recent transfers */}
          <div className="card">
            <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>최근 거래 5건</h3>
            {transfers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>거래 내역이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {transfers.map((t) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        {t.fromAccountId === account.id ? `→ ${t.toAccountId.slice(0, 8)}...` : `← ${t.fromAccountId.slice(0, 8)}...`}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(t.createdAt)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: t.fromAccountId === account.id ? 'var(--danger)' : 'var(--success)' }}>
                        {t.fromAccountId === account.id ? '-' : '+'}{fmt(t.amount)}
                      </div>
                      <span className={`badge ${t.status}`}>{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
