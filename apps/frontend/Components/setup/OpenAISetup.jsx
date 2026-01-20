import React from 'react';
import { AlertCircle, Key, ExternalLink, CheckCircle } from 'lucide-react';
import { isOpenAIConfigured } from '@/Components/services/openai-callback';

export default function OpenAISetup() {
  const isConfigured = isOpenAIConfigured();

  if (isConfigured) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
        <CheckCircle className="w-4 h-4 text-emerald-400" />
        <span className="text-sm text-emerald-400">OpenAI Configured</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-orange-400/10 border border-orange-400/20 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-orange-400/20 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-orange-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-2">OpenAI API Key Required</h3>
          <p className="text-sm text-slate-400 mb-4">
            To generate incident flow diagrams, you need to configure your OpenAI API key.
          </p>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-[#0a0e1a] border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">Setup Instructions</span>
              </div>
              <ol className="text-xs text-slate-400 space-y-2 ml-6 list-decimal">
                <li>
                  Get your API key from{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                  >
                    platform.openai.com/api-keys
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Create a <code className="px-1 py-0.5 rounded bg-white/10 text-cyan-400">.env</code> file in your project root</li>
                <li>
                  Add: <code className="px-1 py-0.5 rounded bg-white/10 text-cyan-400">VITE_OPENAI_API_KEY=sk-your-key-here</code>
                </li>
                <li>Restart your development server</li>
              </ol>
            </div>

            <div className="p-3 rounded-lg bg-purple-400/10 border border-purple-400/20">
              <p className="text-xs text-purple-400">
                💡 <strong>Tip:</strong> For production, use a backend proxy to keep your API key secure. 
                The current setup uses <code className="px-1 py-0.5 rounded bg-purple-400/10">dangerouslyAllowBrowser: true</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}