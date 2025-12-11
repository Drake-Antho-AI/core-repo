import { Link, useLocation } from 'react-router-dom'
import { BarChart3, ListTodo, Plus } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isJobs = location.pathname === '/jobs'

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-teal to-accent-cyan flex items-center justify-center group-hover:scale-105 transition-transform">
              <BarChart3 className="w-6 h-6 text-navy-900" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-white">
                Reddit Sentiment
              </h1>
              <p className="text-xs text-white/50">by Drake-Antho AI</p>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <NavLink 
              to="/jobs" 
              icon={<ListTodo className="w-4 h-4" />} 
              label="Queue" 
              active={isJobs}
            />
            {!isHome && (
              <NavLink 
                to="/" 
                icon={<Plus className="w-4 h-4" />} 
                label="New Analysis" 
              />
            )}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-20 min-h-screen">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-white/30 text-sm">
        <p>Reddit Sentiment Analyzer &copy; 2025 Drake-Antho AI</p>
      </footer>
    </div>
  )
}

function NavLink({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        active 
          ? 'text-accent-teal bg-accent-teal/10' 
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  )
}

