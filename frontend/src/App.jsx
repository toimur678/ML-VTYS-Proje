import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { authHelpers } from './services/supabase'

// Pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Predictor from './pages/Predictor'
import Homes from './pages/Homes'
import History from './pages/History'

// Components
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const currentUser = await authHelpers.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600"></div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login setUser={setUser} />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register setUser={setUser} />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute user={user} />}>
          <Route element={<Layout user={user} setUser={setUser} />}>
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/predictor" element={<Predictor user={user} />} />
            <Route path="/homes" element={<Homes user={user} />} />
            <Route path="/history" element={<History user={user} />} />
          </Route>
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App
