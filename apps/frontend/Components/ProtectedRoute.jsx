import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const sessionId = localStorage.getItem('session_id');
      
      if (!sessionId) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5001/api/auth/verify', {
        headers: {
          'X-Session-ID': sessionId
        }
      });

      const data = await response.json();
      
      if (response.ok && data.valid) {
        setIsAuthenticated(true);
        localStorage.setItem('username', data.username);
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem('session_id');
        localStorage.removeItem('username');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      localStorage.removeItem('session_id');
      localStorage.removeItem('username');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
