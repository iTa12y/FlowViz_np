import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Shield, Home, History, PlusCircle, Menu, X, User, LogOut, Settings, Bell, Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [username, setUsername] = React.useState('');
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3001/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    localStorage.removeItem('username');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: Home, page: '' },
    { name: 'History', icon: History, page: 'History' },
    { name: 'Create Flow', icon: PlusCircle, page: 'CreateFlow' }
  ];

  // Don't show nav on FlowEditor page
  const hideNav = currentPageName === 'FlowEditor';

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Clean, professional navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 bg-slate-950/95 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/90">
        <div className="w-full px-6">
          <div className="flex items-center justify-between h-16">
            {/* Clean Logo Section */}
            <Link to={createPageUrl('')} className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-cyan-500/25 transition-all duration-300">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white">
                  FlowViz
                </span>
                <span className="text-xs text-slate-400 -mt-0.5">
                  Intelligence Platform
                </span>
              </div>
            </Link>

            {/* Clean Search Bar */}
            <div className="hidden lg:flex items-center max-w-md mx-8 flex-1">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search flows and incidents..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/30 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-200"
                />
              </div>
            </div>

            {/* Clean Navigation Items */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = currentPageName === item.page || (currentPageName === 'Home' && item.page === '');
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-cyan-400 bg-cyan-400/10'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : ''}`} />
                    {item.name}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-cyan-400/10 rounded-lg border border-cyan-400/20"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                );
              })}
              
              {/* Clean User Section */}
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-700">
                {/* Simple Notifications */}
                <button className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors group">
                  <Bell className="w-4 h-4 text-slate-400 group-hover:text-slate-300" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Clean User Profile */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="hidden lg:flex flex-col text-left">
                      <span className="text-sm font-medium text-slate-200">{username}</span>
                    </div>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl shadow-black/20 overflow-hidden"
                      >
                        <div className="p-3 border-b border-white/10">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white">{username}</div>
                            </div>
                          </div>
                        </div>
                        <div className="p-2">
                          <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                            <Settings className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-300">Settings</span>
                          </button>
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors text-slate-300"
                          >
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm">Sign out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </button>
          </div>

          {/* Enhanced Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="md:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-xl"
              >
                <div className="px-6 py-6 space-y-4">
                  {/* Mobile Search */}
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>

                  {/* Mobile Navigation */}
                  <div className="space-y-2">
                    {navItems.map((item) => {
                      const isActive = currentPageName === item.page || (currentPageName === 'Home' && item.page === '');
                      return (
                        <Link
                          key={item.page}
                          to={createPageUrl(item.page)}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 ${
                            isActive
                              ? 'text-cyan-400 bg-cyan-400/10 border border-cyan-400/20'
                              : 'text-slate-300 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <item.icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : ''}`} />
                          <span className="font-medium">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Mobile User Section */}
                  <div className="pt-6 border-t border-white/10 space-y-3">
                    <div className="flex items-center gap-4 px-4 py-3 bg-white/5 rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{username}</div>
                        <div className="text-xs text-slate-400">Security Analyst</div>
                      </div>
                    </div>
                    
                    <button className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                      <Settings className="w-5 h-5 text-slate-400" />
                      <span className="font-medium">Settings</span>
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Sign out</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Main Content with Enhanced Styling */}
      <main className="pt-20">
        <div className="relative">
          {/* Subtle background pattern */}
          <div className="fixed inset-0 pointer-events-none opacity-30">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
          </div>
          
          {/* Content */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </main>
      
      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setUserMenuOpen(false)} 
        />
      )}
    </div>
  );
}