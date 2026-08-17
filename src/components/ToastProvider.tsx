import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; type: ToastType; message: string }
interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const push = useCallback((type: ToastType, message: string) => {
    const id = ++idRef.current
    setItems(current => [...current, { id, type, message }])
    window.setTimeout(() => setItems(current => current.filter(item => item.id !== id)), 3600)
  }, [])

  const remove = (id: number) => setItems(current => current.filter(item => item.id !== id))
  const value: ToastContextValue = {
    success: message => push('success', message),
    error: message => push('error', message),
    info: message => push('info', message),
  }

  return <ToastContext.Provider value={value}>
    {children}
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {items.map(item => <div key={item.id} className={`toast-item ${item.type}`}>
        <span className="toast-icon">{item.type === 'success' ? <CheckCircle2 size={19} /> : <CircleAlert size={19} />}</span>
        <span>{item.message}</span>
        <button onClick={() => remove(item.id)} aria-label="إغلاق"><X size={15} /></button>
      </div>)}
    </div>
  </ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
