import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { StoreProvider } from './store'
import './styles.css'
createRoot(document.getElementById('root')).render(<AuthProvider><StoreProvider><App /></StoreProvider></AuthProvider>)
