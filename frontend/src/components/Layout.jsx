import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Zap, BarChart3, Clock, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { authHelpers } from '../services/supabase'

const Layout = ({ user, setUser }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Predictor', href: '/predictor', icon: Zap },
    { name: 'My Homes', href: '/homes', icon: BarChart3 },
    { name: 'History', href: '/history', icon: Clock },
  ]

  const handleLogout = async () => {
    try {
      await authHelpers.signOut()
      setUser(null)
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col relative bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Main Desktop Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* Full Screen Container */}
        <div className="w-full h-full flex flex-col animate-fade-in">
          {/* Top Navigation Bar */}
          <div className="h-14 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 flex items-center justify-between px-6 shrink-0 select-none sticky top-0 z-40">
            {/* Navigation Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => navigate(-1)} 
                  className="p-1.5 rounded-md hover:bg-slate-200/50 text-slate-500 hover:text-slate-800 transition-all duration-200"
                  title="Go Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => navigate(1)} 
                  className="p-1.5 rounded-md hover:bg-slate-200/50 text-slate-500 hover:text-slate-800 transition-all duration-200"
                  title="Go Forward"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Page Title */}
            <div className="flex items-center space-x-2 text-slate-600 text-sm font-semibold absolute left-1/2 transform -translate-x-1/2">
              {navigation.find(n => n.href === location.pathname)?.icon && (
                <div className="opacity-50">
                  {(() => {
                    const Icon = navigation.find(n => n.href === location.pathname)?.icon
                    return <Icon className="w-4 h-4" />
                  })()}
                </div>
              )}
              <span>{navigation.find(n => n.href === location.pathname)?.name || 'EnergyAI'}</span>
            </div>

            <div className="w-24"></div> {/* Spacer for centering */}
          </div>

          {/* Window Content - Full Screen with Smooth Scroll */}
          <div className="flex-1 overflow-y-auto bg-transparent px-6 py-6 scroll-smooth scrollbar-hide">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </div>
        </div>
      </main>

      {/* Dock */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white/20 backdrop-blur-2xl border border-white/20 rounded-2xl p-2.5 flex items-end space-x-3 shadow-2xl ring-1 ring-white/20">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group relative p-3 rounded-2xl transition-all duration-300 ease-out hover:-translate-y-4 hover:scale-110 hover:mx-2 ${
                  isActive ? 'bg-white/40 shadow-inner' : 'hover:bg-white/30'
                }`}
              >
                <div className={`w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-all duration-300 ${
                  isActive 
                    ? 'from-blue-500 to-blue-600 text-white shadow-blue-500/30' 
                    : 'from-slate-100 to-slate-200 text-slate-600 group-hover:from-white group-hover:to-slate-100'
                }`}>
                  <Icon className="w-7 h-7" />
                </div>
                {isActive && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-slate-800/60 rounded-full"></div>
                )}
                
                {/* Tooltip */}
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur-md text-white text-xs font-medium py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-xl translate-y-2 group-hover:translate-y-0">
                  {item.name}
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800/90"></div>
                </div>
              </Link>
            )
          })}
          
          <div className="w-px h-12 bg-white/20 mx-1"></div>

          <button
            onClick={handleLogout}
            className="group relative p-3 rounded-2xl transition-all duration-300 ease-out hover:-translate-y-4 hover:scale-110 hover:mx-2 hover:bg-white/30"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30">
              <LogOut className="w-7 h-7 pl-1" />
            </div>
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur-md text-white text-xs font-medium py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-xl translate-y-2 group-hover:translate-y-0">
              Logout
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800/90"></div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Layout
