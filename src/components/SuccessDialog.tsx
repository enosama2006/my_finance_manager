import { CheckCircle2, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

interface PendingDialog {
  title: string
  message: string
  primaryLabel: string
  resolve: () => void
}

interface SuccessDialogContextValue {
  /** Show a blocking success dialog. Resolves when the user dismisses it. */
  show: (options: { title?: string; message: string; primaryLabel?: string }) => Promise<void>
}

const SuccessDialogContext = createContext<SuccessDialogContextValue | null>(null)

export function SuccessDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingDialog | null>(null)
  const primaryRef = useRef<HTMLButtonElement | null>(null)

  const show = useCallback((options: { title?: string; message: string; primaryLabel?: string }) => {
    return new Promise<void>(resolve => {
      setPending({
        title: options.title ?? 'تم بنجاح',
        message: options.message,
        primaryLabel: options.primaryLabel ?? 'متابعة الإدخال',
        resolve,
      })
    })
  }, [])

  const dismiss = () => {
    if (!pending) return
    const resolve = pending.resolve
    setPending(null)
    resolve()
  }

  useEffect(() => {
    if (!pending) return
    // Autofocus the primary button so Enter dismisses immediately for rapid data entry.
    const timer = window.setTimeout(() => primaryRef.current?.focus(), 20)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); dismiss() } }
    window.addEventListener('keydown', onKey)
    return () => { window.clearTimeout(timer); window.removeEventListener('keydown', onKey) }
  }, [pending])

  return <SuccessDialogContext.Provider value={{ show }}>
    {children}
    {pending && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) dismiss() }}>
      <section className="success-dialog" role="alertdialog" aria-modal="true" aria-labelledby="success-dialog-title">
        <button className="modal-close" onClick={dismiss} aria-label="إغلاق"><X size={18}/></button>
        <div className="success-dialog-icon"><CheckCircle2 size={44} strokeWidth={1.6}/></div>
        <h2 id="success-dialog-title">{pending.title}</h2>
        <p>{pending.message}</p>
        <button ref={primaryRef} className="primary wide success-dialog-primary" onClick={dismiss}>{pending.primaryLabel}</button>
      </section>
    </div>}
  </SuccessDialogContext.Provider>
}

export function useSuccessDialog() {
  const context = useContext(SuccessDialogContext)
  if (!context) throw new Error('useSuccessDialog must be used within SuccessDialogProvider')
  return context
}
