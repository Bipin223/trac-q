import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './globals.css'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import Login from './pages/Login.tsx'
import Landing from './pages/Landing.tsx'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { supabase } from './integrations/supabase/client.ts'
import ForgotPassword from './pages/ForgotPassword.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'
import ResetPasswordPage from './pages/ResetPassword.tsx'
import { ProfileProvider } from './contexts/ProfileContext'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
      <ProfileProvider>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme" attribute="class">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route 
                path="/dashboard/*" 
                element={
                  <ProtectedRoute>
                    <App />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </ProfileProvider>
    </SessionContextProvider>
  </React.StrictMode>,
)