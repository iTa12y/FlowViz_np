import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, Shield, Network, Clock, Target, Zap, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const features = [
    {
      icon: Network,
      title: 'Network Mapping',
      description: 'Visualize attack paths across your infrastructure with interactive network diagrams.',
      color: 'cyan'
    },
    {
      icon: Clock,
      title: 'Timeline Analysis',
      description: 'Reconstruct incident sequences with precise temporal visualization.',
      color: 'purple'
    },
    {
      icon: Target,
      title: 'MITRE ATT&CK',
      description: 'Map incidents to the ATT&CK framework for standardized threat intelligence.',
      color: 'green'
    }
  ];

  const colorClasses = {
    cyan: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    green: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] overflow-hidden">
      {/* Animated background grid */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              OpenAI-Powered · Multi-Language Support
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6"
          >
            Transform Incidents
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Into Visual Intelligence
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12"
          >
            Convert complex cyber incident descriptions into clear, actionable 
            attack flow diagrams. Supports multiple languages including Hebrew (עברית). 
            Network maps, timelines, and MITRE ATT&CK visualizations powered by OpenAI GPT-4.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to={createPageUrl('CreateFlow')}
              className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#0a0e1a] font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300"
            >
              Create New Flow
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to={createPageUrl('History')}
              className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-300"
            >
              View History
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Abstract Network Visualization */}
      <div className="relative py-20 p-70">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full"
        >
          <div className="relative rounded-2xl border border-white/10 bg-[#12182b]/80 backdrop-blur-xl p-8 overflow-hidden">
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />
            
            {/* Network nodes visualization */}
            <svg className="w-full h-64 md:h-80"  viewBox="0 0 800 300">
              {/* Connection lines */}
              <g stroke="url(#lineGradient)" strokeWidth="1" fill="none" opacity="0.6">
                <line x1="100" y1="150" x2="250" y2="80" />
                <line x1="100" y1="150" x2="250" y2="220" />
                <line x1="250" y1="80" x2="400" y2="150" />
                <line x1="250" y1="220" x2="400" y2="150" />
                <line x1="400" y1="150" x2="550" y2="80" />
                <line x1="400" y1="150" x2="550" y2="220" />
                <line x1="550" y1="80" x2="700" y2="150" />
                <line x1="550" y1="220" x2="700" y2="150" />
              </g>

              {/* Animated pulses on lines */}
              <g>
                <circle r="4" fill="#00d4ff">
                  <animateMotion dur="3s" repeatCount="indefinite" path="M100,150 L250,80 L400,150" />
                </circle>
                <circle r="4" fill="#8b5cf6">
                  <animateMotion dur="4s" repeatCount="indefinite" path="M100,150 L250,220 L400,150 L550,80 L700,150" />
                </circle>
                <circle r="4" fill="#10b981">
                  <animateMotion dur="3.5s" repeatCount="indefinite" path="M400,150 L550,220 L700,150" />
                </circle>
              </g>

              {/* Nodes */}
              <g>
                {/* Attacker */}
                <circle cx="100" cy="150" r="20" fill="#12182b" stroke="#ef4444" strokeWidth="2" />
                <circle cx="100" cy="150" r="8" fill="#ef4444" />
                
                {/* Endpoints */}
                <rect x="230" y="60" width="40" height="40" rx="4" fill="#12182b" stroke="#00d4ff" strokeWidth="2" />
                <rect x="230" y="200" width="40" height="40" rx="4" fill="#12182b" stroke="#00d4ff" strokeWidth="2" />
                
                {/* Server */}
                <rect x="375" y="125" width="50" height="50" rx="6" fill="#12182b" stroke="#8b5cf6" strokeWidth="2" />
                <line x1="385" y1="145" x2="415" y2="145" stroke="#8b5cf6" strokeWidth="2" />
                <line x1="385" y1="155" x2="415" y2="155" stroke="#8b5cf6" strokeWidth="2" />
                <line x1="385" y1="165" x2="415" y2="165" stroke="#8b5cf6" strokeWidth="2" />
                
                {/* Domain Controller */}
                <polygon points="550,60 575,80 575,120 550,100 525,120 525,80" fill="#12182b" stroke="#10b981" strokeWidth="2" />
                <rect x="530" y="200" width="40" height="40" rx="4" fill="#12182b" stroke="#10b981" strokeWidth="2" />
                
                {/* Target */}
                <circle cx="700" cy="150" r="24" fill="#12182b" stroke="#f59e0b" strokeWidth="2" />
                <circle cx="700" cy="150" r="16" fill="transparent" stroke="#f59e0b" strokeWidth="1" />
                <circle cx="700" cy="150" r="8" fill="transparent" stroke="#f59e0b" strokeWidth="1" />
                <circle cx="700" cy="150" r="3" fill="#f59e0b" />
              </g>

              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00d4ff" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>

            {/* Labels */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs text-slate-500">
              <span>Initial Access</span>
              <span>Lateral Movement</span>
              <span>Privilege Escalation</span>
              <span>Data Exfiltration</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="relative py-20 px-6">
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Three Ways to Visualize
            </h2>
            <p className="text-slate-400 w-full">
              Choose the visualization that best fits your analysis needs
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative p-8 rounded-xl bg-[#12182b]/60 border border-white/5 hover:border-white/10 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-xl border flex items-center justify-center mb-6 ${colorClasses[feature.color]}`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust indicators */}
      <div className="relative py-16 px-6 border-t border-white/5">
        <div className="w-full">
          <div className="flex flex-wrap items-center justify-center gap-8 text-slate-500">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm">SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              <span className="text-sm">End-to-End Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="text-sm">Real-time Processing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}