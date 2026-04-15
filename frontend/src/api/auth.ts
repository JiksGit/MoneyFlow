import api from './axios'

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  userId: string
  username: string
  expiresIn: number
}

export const authApi = {
  login: async (username: string, password: string): Promise<TokenResponse> => {
    const res = await api.post('/users/login', { username, password })
    return res.data
  },

  register: async (username: string, email: string, password: string): Promise<TokenResponse> => {
    const res = await api.post('/users/register', { username, email, password })
    return res.data
  },

  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const res = await api.post('/users/refresh', { refreshToken })
    return res.data
  },

  me: async () => {
    const res = await api.get('/users/me')
    return res.data
  },
}
