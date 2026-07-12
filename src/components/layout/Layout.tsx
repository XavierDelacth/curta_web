import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Upload, Heart, User, Film, Shield, LogOut, Menu, X, ChevronDown, Radio } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';

const NAV_ITEMS = [
  { path: '/', label: 'Início', icon: Home },
  { path: '/pesquisa', label: 'Pesquisa', icon: Search },
  { path: '/upload', label: 'Upload', icon: Upload, auth: true },
  { path: '/favoritos', label: 'Favoritos', icon: Heart, auth: true },
  { path: '/live/criar', label: 'Live', icon: Radio, auth: true },
];

export function Layout() {
  const { user, isAuthenticated, role, logout } = useAuthStore();
  const { isDark, setMode, mode } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isAdmin = role === 'administrador';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-red flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold hidden sm:block">Curta</span>
          </Link>

          <nav className="hidden md:flex items-center justify-center gap-1">
            {NAV_ITEMS.map((item) => {
              if (item.auth && !isAuthenticated) return null;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-red/10 text-brand-red'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(isDark ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
              title={isDark ? 'Modo claro' : 'Modo escuro'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <div className="w-7 h-7 rounded-full bg-brand-red/20 flex items-center justify-center">
                    <span className="text-sm font-semibold text-brand-red">
                      {user?.nome?.charAt(0)?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{user?.nome}</span>
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 z-50 py-1">
                      <Link
                        to="/perfil"
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4" /> Perfil
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Shield className="w-4 h-4" /> Admin
                        </Link>
                      )}
                      <hr className="my-1 border-neutral-200 dark:border-neutral-700" />
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); navigate('/'); }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
                      >
                        <LogOut className="w-4 h-4" /> Sair
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-1.5 bg-brand-red text-white rounded-full text-sm font-semibold hover:bg-brand-red-dark transition-colors"
              >
                Entrar
              </Link>
            )}

            <button
              className="md:hidden p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 dark:border-neutral-700 py-2 px-4">
            {NAV_ITEMS.map((item) => {
              if (item.auth && !isAuthenticated) return null;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    active ? 'bg-brand-red/10 text-brand-red font-semibold' : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
