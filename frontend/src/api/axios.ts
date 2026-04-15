import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach Authorization header from localStorage on every request
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('moneyflow_user')
  if (stored) {
    const { accessToken } = JSON.parse(stored)
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
  }
  return config
})

// On 401, clear stored user and redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('moneyflow_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
