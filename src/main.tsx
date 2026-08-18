import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { FinanceProvider } from './application/store'
import { ToastProvider } from './components/ToastProvider'
import { SuccessDialogProvider } from './components/SuccessDialog'
import './styles.css'
import './foundation-v4.css'
import './responsive.css'
import './operations.css'
import './expense.css'
import './ux-upgrades.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider><SuccessDialogProvider><FinanceProvider><App /></FinanceProvider></SuccessDialogProvider></ToastProvider>
  </React.StrictMode>,
)