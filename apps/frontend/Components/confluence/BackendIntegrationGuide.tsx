import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Button } from '@/Components/ui/button';

export default function BackendIntegrationGuide() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);

  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const backendFunctionCode = `// functions/confluence.js
export async function getPageContent({ page_name }) {
  // Get Confluence credentials from secrets
  const confluenceUrl = process.env.CONFLUENCE_URL; // e.g., https://your-domain.atlassian.net
  const username = process.env.CONFLUENCE_EMAIL;
  const apiToken = process.env.CONFLUENCE_API_TOKEN;

  // Search for the page
  const searchUrl = \`\${confluenceUrl}/wiki/rest/api/content?title=\${encodeURIComponent(page_name)}&expand=body.storage\`;
  
  const response = await fetch(searchUrl, {
    headers: {
      'Authorization': 'Basic ' + btoa(\`\${username}:\${apiToken}\`),
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Confluence page');
  }

  const data = await response.json();
  
  if (data.results.length === 0) {
    throw new Error(\`Page "\${page_name}" not found\`);
  }

  // Extract text content from HTML
  const htmlContent = data.results[0].body.storage.value;
  const textContent = htmlContent.replace(/<[^>]*>/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim();

  return {
    content: textContent,
    url: \`\${confluenceUrl}/wiki\${data.results[0]._links.webui}\`,
    title: data.results[0].title,
    lastModified: data.results[0].version.when
  };
}`;

  const frontendCode = `// In CreateFlow.jsx, replace the fetchConfluencePage function:

const fetchConfluencePage = async (pageName) => {
  const result = await base44.functions.confluence.getPageContent({ 
    page_name: pageName 
  });
  return result.content;
};`;

  const secretsConfig = [
    { name: 'CONFLUENCE_URL', description: 'Your Confluence instance URL (e.g., https://your-domain.atlassian.net)' },
    { name: 'CONFLUENCE_EMAIL', description: 'Your Confluence account email' },
    { name: 'CONFLUENCE_API_TOKEN', description: 'Confluence API token (generate from Atlassian account settings)' }
  ];

  return (
    <div className="rounded-xl bg-[#1a2038] border border-white/10 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center">
            <Code className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-left">
            <h3 className="text-white font-semibold">Backend Integration Guide</h3>
            <p className="text-sm text-slate-400">
              Step-by-step setup for Confluence integration
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {/* Step 1: Enable Backend Functions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-400/20 text-cyan-400 flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <h4 className="text-white font-medium">Enable Backend Functions</h4>
                </div>
                <p className="text-sm text-slate-400 ml-8">
                  Go to your app's settings in the dashboard and enable backend functions. 
                  This allows you to create server-side functions that can securely access external APIs.
                </p>
              </div>

              {/* Step 2: Configure Secrets */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-purple-400/20 text-purple-400 flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <h4 className="text-white font-medium">Configure Secrets</h4>
                </div>
                <div className="ml-8 space-y-3">
                  <p className="text-sm text-slate-400">
                    Add these secrets to your app (Settings → Secrets):
                  </p>
                  <div className="space-y-2">
                    {secretsConfig.map((secret) => (
                      <div key={secret.name} className="p-3 rounded-lg bg-[#12182b] border border-white/10">
                        <code className="text-xs text-emerald-400">{secret.name}</code>
                        <p className="text-xs text-slate-500 mt-1">{secret.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 3: Create Backend Function */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-400/20 text-emerald-400 flex items-center justify-center text-sm font-semibold">
                      3
                    </div>
                    <h4 className="text-white font-medium">Create Backend Function</h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(backendFunctionCode, 'backend')}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedSection === 'backend' ? (
                      <>
                        <Check className="w-3 h-3 mr-1.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="ml-8">
                  <p className="text-sm text-slate-400 mb-3">
                    Create a new file <code className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-400">functions/confluence.js</code>:
                  </p>
                  <pre className="p-4 rounded-lg bg-[#0a0e1a] border border-white/10 overflow-x-auto text-xs text-slate-300 leading-relaxed">
                    {backendFunctionCode}
                  </pre>
                </div>
              </div>

              {/* Step 4: Update Frontend */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center text-sm font-semibold">
                      4
                    </div>
                    <h4 className="text-white font-medium">Update Frontend Code</h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(frontendCode, 'frontend')}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedSection === 'frontend' ? (
                      <>
                        <Check className="w-3 h-3 mr-1.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="ml-8">
                  <p className="text-sm text-slate-400 mb-3">
                    Replace the placeholder function in CreateFlow.jsx:
                  </p>
                  <pre className="p-4 rounded-lg bg-[#0a0e1a] border border-white/10 overflow-x-auto text-xs text-slate-300 leading-relaxed">
                    {frontendCode}
                  </pre>
                </div>
              </div>

              {/* API Token Guide */}
              <div className="p-4 rounded-xl bg-cyan-400/10 border border-cyan-400/20">
                <h5 className="text-sm font-medium text-cyan-400 mb-2">
                  📝 How to Generate Confluence API Token
                </h5>
                <ol className="text-xs text-slate-300 space-y-1.5 ml-4 list-decimal">
                  <li>Go to <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">id.atlassian.com/manage-profile/security/api-tokens</a></li>
                  <li>Click "Create API token"</li>
                  <li>Give it a label (e.g., "FlowViz Integration")</li>
                  <li>Copy the token and add it to your app's secrets</li>
                </ol>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}