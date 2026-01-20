import React, { useState } from 'react';
import { Code, Server, Database, Shield, Copy, Check, ChevronDown, ChevronUp, ExternalLink, Terminal, Package, Container, Lock } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';

export default function DeploymentGuide() {
  const [expandedSection, setExpandedSection] = useState('overview');
  const [copiedCode, setCopiedCode] = useState('');

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const sections = [
    {
      id: 'overview',
      title: 'Overview',
      icon: Server,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            FlowViz is designed for deployment to your private OpenShift cluster with minimal external dependencies.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
              <h4 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                <Check className="w-4 h-4" />
                Fully Self-Contained
              </h4>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• localStorage for data</li>
                <li>• OpenAI for analysis</li>
                <li>• No Base44 backend needed</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-cyan-400/10 border border-cyan-400/20">
              <h4 className="text-cyan-400 font-semibold mb-2 flex items-center gap-2">
                <Container className="w-4 h-4" />
                Container Ready
              </h4>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Nginx static hosting</li>
                <li>• OpenShift compatible</li>
                <li>• Small footprint (~20MB)</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'dependencies',
      title: 'Base44 Dependencies to Replace',
      icon: Package,
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-orange-400/10 border border-orange-400/20">
            <h4 className="text-orange-400 font-semibold mb-3">Remaining Base44 Dependencies</h4>
            
            <div className="space-y-4">
              <div>
                <code className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                  createPageUrl from '@/utils'
                </code>
                <p className="text-sm text-slate-400 mt-2">
                  Base44's routing utility. Create a standalone version:
                </p>
                <div className="mt-2 relative">
                  <pre className="text-xs text-white bg-[#0a0e1a] border border-white/10 rounded p-3 overflow-x-auto">
{`// Create: src/utils/index.js
export function createPageUrl(pageName) {
  return \`/\${pageName}\`;
}`}</pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 text-slate-400 hover:text-white"
                    onClick={() => copyCode(`export function createPageUrl(pageName) {\n  return \`/\${pageName}\`;\n}`, 'utils')}
                  >
                    {copiedCode === 'utils' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              </div>

              <div>
                <code className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                  IncidentFlowStorage from '@/components/services/localStorage'
                </code>
                <p className="text-sm text-slate-400 mt-2">
                  ✅ Already standalone - uses browser localStorage, no backend needed.
                </p>
              </div>

              <div>
                <code className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                  Shadcn UI Components from '@/components/ui'
                </code>
                <p className="text-sm text-slate-400 mt-2">
                  ✅ Already standalone - copy the entire /components/ui folder.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'setup',
      title: 'Standalone Setup',
      icon: Terminal,
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="text-white font-semibold mb-2">1. Create New React Project</h4>
              <div className="relative">
                <pre className="text-xs text-white bg-[#0a0e1a] border border-white/10 rounded p-3 overflow-x-auto">
{`npm create vite@latest flowviz-standalone -- --template react
cd flowviz-standalone`}</pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 text-slate-400 hover:text-white"
                  onClick={() => copyCode('npm create vite@latest flowviz-standalone -- --template react\ncd flowviz-standalone', 'create')}
                >
                  {copiedCode === 'create' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2">2. Install Dependencies</h4>
              <div className="relative">
                <pre className="text-xs text-white bg-[#0a0e1a] border border-white/10 rounded p-3 overflow-x-auto">
{`npm install react-router-dom @tanstack/react-query \\
  framer-motion lucide-react openai date-fns \\
  clsx tailwind-merge class-variance-authority

npm install @radix-ui/react-dialog \\
  @radix-ui/react-dropdown-menu \\
  @radix-ui/react-select @radix-ui/react-tabs

npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p`}</pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 text-slate-400 hover:text-white"
                  onClick={() => copyCode('npm install react-router-dom @tanstack/react-query framer-motion lucide-react openai date-fns', 'deps')}
                >
                  {copiedCode === 'deps' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2">3. Copy Application Files</h4>
              <div className="text-sm text-slate-400 space-y-2">
                <p>Copy these folders from your Base44 app to the new project:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><code className="text-cyan-400">components/</code> - All UI and service components</li>
                  <li><code className="text-cyan-400">pages/</code> - Home, CreateFlow, History, FlowEditor</li>
                  <li><code className="text-cyan-400">Layout.js</code> - Navigation layout</li>
                  <li><code className="text-cyan-400">lib/utils.js</code> - Utility functions</li>
                </ul>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2">4. Create Routing</h4>
              <p className="text-sm text-slate-400 mb-2">Create <code className="text-cyan-400">src/App.jsx</code>:</p>
              <div className="relative">
                <pre className="text-xs text-white bg-[#0a0e1a] border border-white/10 rounded p-3 overflow-x-auto">
{`import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './Layout';
import Home from './pages/Home';
import CreateFlow from './pages/CreateFlow';
import FlowEditor from './pages/FlowEditor';
import History from './pages/History';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout currentPageName="Home"><Home /></Layout>} />
          <Route path="/CreateFlow" element={<Layout currentPageName="CreateFlow"><CreateFlow /></Layout>} />
          <Route path="/History" element={<Layout currentPageName="History"><History /></Layout>} />
          <Route path="/FlowEditor" element={<Layout currentPageName="FlowEditor"><FlowEditor /></Layout>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}`}</pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 text-slate-400 hover:text-white"
                  onClick={() => copyCode('// App.jsx code...', 'app')}
                >
                  {copiedCode === 'app' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2">5. Configure Environment</h4>
              <p className="text-sm text-slate-400 mb-2">Create <code className="text-cyan-400">.env</code> file:</p>
              <div className="relative">
                <pre className="text-xs text-white bg-[#0a0e1a] border border-white/10 rounded p-3">
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here</pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 text-slate-400 hover:text-white"
                  onClick={() => copyCode('VITE_OPENAI_API_KEY=sk-your-openai-api-key-here', 'env')}
                >
                  {copiedCode === 'env' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'docker',
      title: 'Docker & OpenShift',
      icon: Container,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-semibold mb-2">Dockerfile</h4>
            <div className="relative">
              <pre className="text-xs text-white bg-[#0a0e1a] border border-white/10 rounded p-3 overflow-x-auto">
{`# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`}</pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 text-slate-400 hover:text-white"
                onClick={() => copyCode('# Dockerfile content...', 'dockerfile')}
              >
                {copiedCode === 'dockerfile' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-2">Nginx Configuration</h4>
            <div className="relative">
              <pre className="text-xs text-white bg-[#0a0e1a] border border-white/10 rounded p-3 overflow-x-auto">
{`server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}`}</pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 text-slate-400 hover:text-white"
                onClick={() => copyCode('# nginx.conf content...', 'nginx')}
              >
                {copiedCode === 'nginx' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-2">Deploy to OpenShift</h4>
            <div className="relative">
              <pre className="text-xs text-white bg-[#0a0e1a] border border-white/10 rounded p-3 overflow-x-auto">
{`# Build and push
docker build -t your-registry/flowviz:latest .
docker push your-registry/flowviz:latest

# Deploy
oc new-app your-registry/flowviz:latest
oc expose svc/flowviz
oc set env deployment/flowviz VITE_OPENAI_API_KEY=sk-your-key

# Get route
oc get routes`}</pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 text-slate-400 hover:text-white"
                onClick={() => copyCode('docker build -t your-registry/flowviz:latest .', 'deploy')}
              >
                {copiedCode === 'deploy' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'security',
      title: 'Security & Production',
      icon: Lock,
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-red-400/10 border border-red-400/20">
            <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              ⚠️ OpenAI API Key Exposure
            </h4>
            <p className="text-sm text-slate-400 mb-3">
              Currently, the OpenAI API key is exposed in the browser (using <code className="text-red-400">dangerouslyAllowBrowser: true</code>).
            </p>
            <p className="text-sm text-white font-medium mb-2">Recommended Solution: Backend Proxy</p>
            <div className="text-sm text-slate-400 space-y-2">
              <p>Create a simple Node.js backend to proxy OpenAI requests:</p>
              <pre className="text-xs text-white bg-[#0a0e1a] rounded p-2 mt-2">
{`// backend/server.js
app.post('/api/analyze', async (req, res) => {
  const result = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: req.body.messages
  });
  res.json(result);
});`}</pre>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-semibold">Production Checklist</h4>
            <div className="space-y-2">
              {[
                'Set up backend proxy for OpenAI API',
                'Implement proper data persistence (PostgreSQL)',
                'Configure SSL/TLS certificates',
                'Set up monitoring and logging',
                'Enable authentication/authorization',
                'Configure resource limits in OpenShift',
                'Set up backup strategy',
                'Test security policies'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="w-4 h-4 rounded border border-white/20" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'storage',
      title: 'Data Storage Options',
      icon: Database,
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-cyan-400/10 border border-cyan-400/20">
            <h4 className="text-cyan-400 font-semibold mb-2">Current: Browser localStorage</h4>
            <div className="text-sm text-slate-400 space-y-2">
              <p>✅ Pros: Zero infrastructure, works offline, no backend needed</p>
              <p>❌ Cons: Data per browser, no collaboration, limited to ~5-10MB</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-semibold">Production Alternatives</h4>
            
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <h5 className="text-white font-medium mb-2">PostgreSQL Backend</h5>
              <p className="text-sm text-slate-400 mb-2">
                Replace <code className="text-cyan-400">localStorage.js</code> with API calls:
              </p>
              <pre className="text-xs bg-[#0a0e1a] rounded p-2">
{`const API_URL = '/api';

export const IncidentFlowStorage = {
  async list() {
    const res = await fetch(\`\${API_URL}/flows\`);
    return res.json();
  },
  async create(data) {
    const res = await fetch(\`\${API_URL}/flows\`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.json();
  }
};`}</pre>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <h5 className="text-white font-medium mb-2">SQLite (Single User)</h5>
              <p className="text-sm text-slate-400">
                Simple file-based database, perfect for single-user deployments or prototypes.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-purple-400/20 text-purple-400 border-purple-400/30">
            <Server className="w-3 h-3 mr-1.5" />
            Private Cluster Deployment
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-4">
            OpenShift Deployment Guide
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Deploy FlowViz to your private OpenShift cluster with full control over data and infrastructure
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((section) => {
            const isExpanded = expandedSection === section.id;
            const Icon = section.icon;

            return (
              <div
                key={section.id}
                className="rounded-xl border border-white/10 bg-[#12182b] overflow-hidden"
              >
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                  className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-cyan-400/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-white/10">
                    <div className="pt-6">
                      {section.content}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 p-6 rounded-xl bg-gradient-to-r from-purple-400/10 to-cyan-400/10 border border-purple-400/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-400/20 flex items-center justify-center flex-shrink-0">
              <ExternalLink className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">Need Help?</h3>
              <p className="text-sm text-slate-400 mb-4">
                For production deployment support, consider implementing a backend proxy for API key security
                and replacing localStorage with a proper database solution.
              </p>
              <div className="flex gap-3">
                <Badge variant="outline" className="border-cyan-400/30 text-cyan-400">
                  React 18+
                </Badge>
                <Badge variant="outline" className="border-emerald-400/30 text-emerald-400">
                  OpenShift 4.x
                </Badge>
                <Badge variant="outline" className="border-purple-400/30 text-purple-400">
                  OpenAI GPT-4
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}