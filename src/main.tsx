import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './globals.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Login from './pages/Login.tsx'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { supabase } from './integrations/supabase/client.ts'
import ForgotPassword from './pages/ForgotPassword.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'
import ResetPasswordPage from './pages/ResetPassword.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme" attribute="class">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </SessionContextProvider>
  </React.StrictMode>,
)