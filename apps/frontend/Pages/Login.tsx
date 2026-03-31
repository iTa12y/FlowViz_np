import React, { useState, useEffect } from 'react';
import dotenv from 'dotenv'
import { useNavigate } from 'react-router-dom';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { withApiBase, getFrontendEnvVar } from '@/utils';
import { AlertCircle, Loader2, Shield, Eye, EyeOff, Lock, User, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const ALLOW_INSECURE_HOSTS = getFrontendEnvVar('VITE_ALLOW_INSECURE_HOSTS', 'localhost,127.0.0.1')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    apiToken: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [systemStatus, setSystemStatus] = useState({ checking: true, redis_connected: false, backend_connected: false });

  // Check system status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(withApiBase('/api/auth/status'), {
          credentials: 'include',
          
        });
        if (response.ok) {
          const data = await response.json();
          setSystemStatus({
            checking: false,
            redis_connected: data.redis_connected,
            backend_connected: true
          });
        } else {
          setSystemStatus({
            checking: false,
            redis_connected: false,
            backend_connected: true
          });
        }
      } catch (err) {
        setSystemStatus({
          checking: false,
          redis_connected: false,
          backend_connected: false
        });
      }
    };
    
    checkStatus();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Security check: Warn if not using HTTPS in production
    if (window.location.protocol !== 'https:' && !ALLOW_INSECURE_HOSTS.includes(window.location.hostname)) {
      setError('SECURITY WARNING: Credentials must be sent over HTTPS');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(withApiBase('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username,
          api_token: formData.apiToken
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Clear credentials from memory immediately
        setFormData({ username: '', apiToken: '' });
        
        // Session cookie is set by the server (HTTP-only)
        // Only store username for UI display
        localStorage.setItem('username', data.username);
        
        navigate('/');
      } else {
        // Check if it's a Redis connection error
        if (response.status === 503) {
          setError(
            `${data.error || 'Service unavailable'}\n\n` +
            `💡 Solution: Make sure Redis is running.\n` +
            `Windows: Install Redis via https://github.com/tporadowski/redis/releases\n` +
            `Mac/Linux: Run 'redis-server' in terminal`
          );
        } else {
          setError(data.error || 'Authentication failed');
        }
      }
    } catch (err) {
      setError('Failed to connect to authentication service. Check VITE_AUTH_API_URL or VITE_API_URL configuration.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden flex items-center justify-center">
      {/* Enhanced animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] animate-pulse" />
      </div>

      <div className="relative w-full max-w-md px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Enhanced Header */}
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
                <Shield className="w-10 h-10 text-white drop-shadow-sm" />
              </div>
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 opacity-20 blur-lg" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome to FlowViz
              </h1>
              <p className="text-lg text-slate-400">
                Secure Authentication Portal
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Connect with your Confluence credentials
              </p>
            </div>
          </div>

          {/* System Status Banner */}
          {!systemStatus.checking && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border p-4 ${
                !systemStatus.backend_connected
                  ? 'bg-red-500/10 border-red-500/30'
                  : !systemStatus.redis_connected
                  ? 'bg-orange-500/10 border-orange-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}
            >
              <div className="flex items-start gap-3">
                {!systemStatus.backend_connected ? (
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                ) : !systemStatus.redis_connected ? (
                  <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  {!systemStatus.backend_connected ? (
                    <>
                      <p className="text-red-400 font-semibold text-sm mb-1">Backend Server Offline</p>
                      <p className="text-red-300 text-xs">
                        Cannot connect to backend server. Check VITE_AUTH_API_URL or VITE_API_URL configuration.
                      </p>
                    </>
                  ) : !systemStatus.redis_connected ? (
                    <>
                      <p className="text-orange-400 font-semibold text-sm mb-1">Redis Not Connected</p>
                      <p className="text-orange-300 text-xs leading-relaxed">
                        Session storage unavailable. Install and start Redis:<br/>
                        <span className="font-mono bg-black/30 px-2 py-1 rounded mt-1 inline-block">redis-server</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-emerald-400 font-semibold text-sm mb-1">System Ready</p>
                      <p className="text-emerald-300 text-xs">
                        All services are online. You can log in securely.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Enhanced Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <div className="space-y-6">
                {/* Username Field */}
                <div className="space-y-3">
                  <Label htmlFor="username" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    Confluence Username
                  </Label>
                  <div className="relative">
                    <Input
                      id="username"
                      type="email"
                      placeholder="your.email@company.com"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      required
                      className="h-12 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 rounded-xl pl-4 pr-4 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* API Token Field */}
                <div className="space-y-3">
                  <Label htmlFor="apiToken" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-400" />
                    API Token
                  </Label>
                  <div className="relative">
                    <Input
                      id="apiToken"
                      type={showToken ? "text" : "password"}
                      placeholder="Your Atlassian API token"
                      value={formData.apiToken}
                      onChange={(e) => handleInputChange('apiToken', e.target.value)}
                      required
                      className="h-12 bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 rounded-xl pl-4 pr-12 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
                    >
                      {showToken ? 
                        <EyeOff className="w-4 h-4 text-slate-400" /> : 
                        <Eye className="w-4 h-4 text-slate-400" />
                      }
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    <a 
                      href="https://id.atlassian.com/manage-profile/security/api-tokens" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 underline"
                    >
                      Create an API token here
                    </a>
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
                  <span className="text-sm text-red-400 whitespace-pre-line leading-relaxed">{error}</span>
                </motion.div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !formData.username || !formData.apiToken}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-950 rounded-xl mt-8 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Secure Login
                    <ArrowRight className="w-5 h-5 ml-3" />
                  </>
                )}
              </Button>
            </div>

            {/* Security Notice */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
                <Shield className="w-4 h-4" />
                <span>End-to-end encrypted • Session expires in 1 hour</span>
              </div>
              {window.location.protocol !== 'https:' && !ALLOW_INSECURE_HOSTS.includes(window.location.hostname) && (
                <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>WARNING: Use HTTPS in production</span>
                </div>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
