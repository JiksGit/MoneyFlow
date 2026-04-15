import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <h1>MoneyFlow</h1>
      {user && (
        <div className="nav-links">
          <NavLink to="/" end>대시보드</NavLink>
          <NavLink to="/transfer">송금</NavLink>
          <NavLink to="/history">거래내역</NavLink>
          <span style={{ color: 'rgba(255,255,255,0.6)', padding: '6px 8px', fontSize: '0.85rem' }}>
            {user.username}
          </span>
          <button
            onClick={handleLogout}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '6px 14px', fontSize: '0.85rem' }}
          >
            로그아웃
          </button>
        </div>
      )}
    </nav>
  )
}
