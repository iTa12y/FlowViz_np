import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { AlertCircle, Loader2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    apiToken: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Security check: Warn if not using HTTPS in production
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setError('SECURITY WARNING: Credentials must be sent over HTTPS');
      setLoading(false);
      return;
    }

    const apiUrl = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5001';

    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
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
        
        // Store only session ID (never store API token)
        localStorage.setItem('session_id', data.session_id);
        localStorage.setItem('username', data.username);
        
        navigate('/');
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Failed to connect to authentication service');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] overflow-hidden flex items-center justify-center">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/20 mb-4">
              <Shield className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              FlowViz Login
            </h1>
            <p className="text-slate-400">
              Authenticate with your Confluence credentials
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6 rounded-xl bg-[#12182b] border border-white/10 p-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">
                  Confluence Username (Email)
                </Label>
                <Input
                  id="username"
                  type="email"
                  placeholder="user@example.com"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  required
                  className="bg-[#0a0e1a] border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiToken" className="text-white">
                  Confluence API Token
                </Label>
                <Input
                  id="apiToken"
                  type="password"
                  placeholder="Your Atlassian API token"
                  value={formData.apiToken}
                  onChange={(e) => handleInputChange('apiToken', e.target.value)}
                  required
                  className="bg-[#0a0e1a] border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/50"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-4 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 hover:from-cyan-500 hover:to-purple-500 text-[#0a0e1a]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Login
                </>
              )}
            </Button>

            <div className="space-y-2">
              <p className="text-xs text-center text-slate-500">
                Your credentials are encrypted and hashed server-side. Session expires in 1 hour.
              </p>
              {window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && (
                <p className="text-xs text-center text-amber-400">
                  ⚠️ WARNING: Use HTTPS in production to secure credentials
                </p>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
