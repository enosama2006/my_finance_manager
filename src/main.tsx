import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { FinanceProvider } from './application/store'
import './styles.css'
import './foundation-v4.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FinanceProvider><App /></FinanceProvider>
  </React.StrictMode>,
)
