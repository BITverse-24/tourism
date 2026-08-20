import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './tokens.css'
import './index.css'
import { AppProvider } from './hooks/useAppState'
import { WsProvider } from './ws/WsProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WsProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </WsProvider>
  </React.StrictMode>
)
