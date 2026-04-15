import api from './axios'

export interface Transfer {
  id: string
  status: string
  amount: number
  fromAccountId: string
  toAccountId: string
  failureReason: string
  createdAt: string
  updatedAt: string
}

export interface TransferPage {
  content: Transfer[]
  totalElements: number
  totalPages: number
  number: number
}

export const transferApi = {
  initiate: async (fromAccountId: string, toAccountId: string, amount: number): Promise<Transfer> => {
    const res = await api.post('/transfers', { fromAccountId, toAccountId, amount })
    return res.data
  },

  getTransfer: async (transferId: string): Promise<Transfer> => {
    const res = await api.get(`/transfers/${transferId}`)
    return res.data
  },

  getMyTransfers: async (page = 0, size = 10): Promise<TransferPage> => {
    const res = await api.get(`/transfers?page=${page}&size=${size}`)
    return res.data
  },
}
