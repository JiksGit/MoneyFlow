import { useEffect, useState } from 'react'
import { accountApi, Account } from '../api/account'
import { ledgerApi, Transaction } from '../api/ledger'

function fmt(n: number) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(s: string) {
  return new Date(s).toLocaleString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function HistoryPage() {
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    accountApi.getMyAccount().then(setAccount).catch(() => {})
  }, [])

  useEffect(() => {
    if (!account) return
    setLoading(true)
    ledgerApi.getByAccount(account.id, page, 10)
      .then((res) => {
        setTransactions(res.content)
        setTotalPages(res.totalPages)
      })
      .finally(() => setLoading(false))
  }, [account, page])

  if (!account) return (
    <div className="page-wrapper">
      <p style={{ color: 'var(--text-muted)' }}>계좌 정보를 불러오는 중...</p>
    </div>
  )

  return (
    <div className="page-wrapper">
      <h2 style={{ marginBottom: 20, fontSize: '1.4rem' }}>거래 내역</h2>

      <div className="card">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>불러오는 중...</p>
        ) : transactions.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>거래 내역이 없습니다.</p>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>일시</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>유형</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>상대방</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>금액</th>
                  <th style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isSent = tx.fromAccountId === account.id
                  const counterpart = isSent ? tx.toAccountId : tx.fromAccountId
                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px' }}>{fmtDate(tx.recordedAt)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ color: isSent ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                          {isSent ? '송금' : '수신'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <code style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {counterpart.slice(0, 8)}...
                        </code>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: isSent ? 'var(--danger)' : 'var(--success)' }}>
                        {isSent ? '-' : '+'}{fmt(tx.amount)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${tx.status}`}>{tx.status}</span>
                        {tx.failureReason && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 2 }}>
                            {tx.failureReason}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                <button
                  className="btn-secondary"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  style={{ padding: '6px 16px' }}
                >
                  이전
                </button>
                <span style={{ padding: '6px 12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {page + 1} / {totalPages}
                </span>
                <button
                  className="btn-secondary"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  style={{ padding: '6px 16px' }}
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
