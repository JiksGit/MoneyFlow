import { useEffect, useRef } from 'react'

type EventHandler = (data: unknown) => void

export function useSse(
  userId: string | undefined,
  handlers: Record<string, EventHandler>
) {
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!userId) return

    const stored = localStorage.getItem('moneyflow_user')
    if (!stored) return
    const { accessToken } = JSON.parse(stored)

    // EventSource doesn't support custom headers directly; pass token as query param
    const url = `/api/notifications/subscribe?token=${encodeURIComponent(accessToken)}`
    const es = new EventSource(url)
    esRef.current = es

    Object.entries(handlers).forEach(([eventName, handler]) => {
      es.addEventListener(eventName, (e: MessageEvent) => {
        try {
          handler(JSON.parse(e.data))
        } catch {
          handler(e.data)
        }
      })
    })

    es.onerror = () => {
      // Auto-reconnect is handled by EventSource
    }

    return () => {
      es.close()
      esRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])
}
