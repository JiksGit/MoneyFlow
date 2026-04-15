import { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useToast } from './hooks/useToast'
import { useSse } from './hooks/useSse'
import Navbar from './components/Navbar'
import ToastContainer from './components/ToastContainer'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TransferPage from './pages/TransferPage'
import HistoryPage from './pages/HistoryPage'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AppShell() {
  const { user } = useAuth()
  const { toasts, addToast } = useToast()

  useSse(user?.userId, {
    'transfer.completed': (data: unknown) => {
      const d = data as { amount?: number }
      const amt = d?.amount
        ? new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(d.amount)
        : ''
      addToast(`송금 완료! ${amt}`, 'success')
    },
    'transfer.failed': (data: unknown) => {
      const d = data as { reason?: string }
      addToast(`송금 실패: ${d?.reason || '알 수 없는 오류'}`, 'error')
    },
  })

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/transfer" element={<ProtectedRoute><TransferPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer toasts={toasts} />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}
