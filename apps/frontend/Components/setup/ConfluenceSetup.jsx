import React, { useState, useEffect } from 'react';
import { AlertCircle, Key, ExternalLink, CheckCircle, Loader2 } from 'lucide-react';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';

export default function ConfluenceSetup() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    username: '',
    apiKey: '',
    baseUrl: ''
  });

  useEffect(() => {
    checkConfluenceAuth();
  }, []);

  const checkConfluenceAuth = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/confluence/auth');
      if (response.ok) {
        const data = await response.json();
        setIsConfigured(data.configured);
        if (data.configured) {
          setUsername(data.username);
        }
      }
    } catch (err) {
      console.error('Failed to check Confluence auth:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://localhost:3001/api/confluence/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to configure Confluence');
      }

      setSuccess('Confluence authentication configured successfully!');
      setIsConfigured(true);
      setUsername(formData.username);
      setShowForm(false);
      setFormData({ username: '', apiKey: '', baseUrl: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isConfigured && !showForm) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-emerald-400">Confluence Configured</span>
          <span className="text-xs text-slate-400 ml-auto">({username})</span>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          Update Credentials
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-cyan-400/10 border border-cyan-400/20 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-cyan-400/20 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-2">Confluence Integration</h3>
          <p className="text-sm text-slate-400 mb-4">
            Connect your Atlassian Confluence to fetch and analyze incident documentation.
          </p>

          {!showForm && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[#0a0e1a] border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-white">Setup Instructions</span>
                </div>
                <ol className="text-xs text-slate-400 space-y-2 ml-6 list-decimal">
                  <li>
                    Generate an API token from{' '}
                    <a
                      href="https://id.atlassian.com/manage-profile/security/api-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                    >
                      Atlassian Account Settings
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Enter your Confluence username (email address)</li>
                  <li>Paste the API token</li>
                  <li>Provide your Confluence base URL (e.g., https://yourcompany.atlassian.net/wiki)</li>
                </ol>
              </div>

              <Button
                onClick={() => setShowForm(true)}
                className="w-full"
              >
                Configure Confluence
              </Button>
            </div>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">Username (Email)</Label>
                <Input
                  id="username"
                  type="email"
                  placeholder="user@example.com"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  required
                  className="bg-[#0a0e1a] border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-white">API Token</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Your Atlassian API token"
                  value={formData.apiKey}
                  onChange={(e) => handleInputChange('apiKey', e.target.value)}
                  required
                  className="bg-[#0a0e1a] border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl" className="text-white">Confluence Base URL</Label>
                <Input
                  id="baseUrl"
                  type="url"
                  placeholder="https://yourcompany.atlassian.net/wiki"
                  value={formData.baseUrl}
                  onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                  required
                  className="bg-[#0a0e1a] border-white/10"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-400/10 border border-red-400/20">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
                  <p className="text-xs text-emerald-400">{success}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Save & Test Connection'
                  )}
                </Button>
                {isConfigured && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
