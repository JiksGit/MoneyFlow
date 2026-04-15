import api from './axios'

export interface Transaction {
  id: string
  transferId: string
  fromAccountId: string
  toAccountId: string
  amount: number
  status: string
  failureReason: string
  recordedAt: string
}

export interface TransactionPage {
  content: Transaction[]
  totalElements: number
  totalPages: number
  number: number
}

export const ledgerApi = {
  getByAccount: async (accountId: string, page = 0, size = 10): Promise<TransactionPage> => {
    const res = await api.get(`/ledger/account/${accountId}?page=${page}&size=${size}`)
    return res.data
  },
}
