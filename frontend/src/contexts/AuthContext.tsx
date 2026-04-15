import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/auth'

interface AuthUser {
  userId: string
  username: string
  accessToken: string
  refreshToken: string
}

interface AuthContextType {
  user: AuthUser | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('moneyflow_user')
    return stored ? JSON.parse(stored) : null
  })

  const saveUser = (u: AuthUser) => {
    setUser(u)
    localStorage.setItem('moneyflow_user', JSON.stringify(u))
  }

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('moneyflow_user')
  }, [])

  const login = async (username: string, password: string) => {
    const res = await authApi.login(username, password)
    saveUser({
      userId: res.userId,
      username: res.username,
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
    })
  }

  const register = async (username: string, email: string, password: string) => {
    const res = await authApi.register(username, email, password)
    saveUser({
      userId: res.userId,
      username: res.username,
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
    })
  }

  // Auto-refresh token before expiry (every 25 minutes)
  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      try {
        const res = await authApi.refresh(user.refreshToken)
        saveUser({ ...user, accessToken: res.accessToken, refreshToken: res.refreshToken })
      } catch {
        logout()
      }
    }, 25 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user, logout])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
