import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Shield, Home, History, PlusCircle, Menu, X, User, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [username, setUsername] = React.useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const handleLogout = async () => {
    const sessionId = localStorage.getItem('session_id');
    
    if (sessionId) {
      try {
        await fetch('http://localhost:5001/api/auth/logout', {
          method: 'POST',
          headers: {
            'X-Session-ID': sessionId
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    localStorage.removeItem('session_id');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const navItems = [
    { name: 'Home', icon: Home, page: '' },
    { name: 'History', icon: History, page: 'History' },
    { name: 'Create Flow', icon: PlusCircle, page: 'CreateFlow' }
  ];

  // Don't show nav on FlowEditor page
  const hideNav = currentPageName === 'FlowEditor';

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0e1a]/90 backdrop-blur-xl">
        <div className="w-full px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('')} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#0a0e1a]" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                FlowViz
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'text-cyan-400 bg-cyan-400/10'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
              
              {/* User Info & Logout */}
              <div className="ml-4 flex items-center gap-3 pl-4 border-l border-white/10">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-slate-300">{username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-slate-400 p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/10 bg-[#0a0e1a]"
            >
              <div className="px-6 py-4 space-y-2">
                {navItems.map((item) => {
                  const isActive = currentPageName === item.page;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'text-cyan-400 bg-cyan-400/10'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
                
                {/* Mobile User Info */}
                <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5">
                    <User className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm text-slate-300">{username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}