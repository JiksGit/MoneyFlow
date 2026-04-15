import api from './axios'

export interface Account {
  id: string
  userId: string
  balance: number
  createdAt: string
}

export const accountApi = {
  getMyAccount: async (): Promise<Account> => {
    const res = await api.get('/accounts/me')
    return res.data
  },

  createAccount: async (initialBalance = 0): Promise<Account> => {
    const res = await api.post('/accounts', { initialBalance })
    return res.data
  },

  deposit: async (amount: number): Promise<Account> => {
    const res = await api.post('/accounts/me/deposit', { amount })
    return res.data
  },
}
