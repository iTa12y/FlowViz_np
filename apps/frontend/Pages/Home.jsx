import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, Shield, Network, Clock, Target, Zap, Lock, Play, MoreVertical, Calendar, Eye, Edit3, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { IncidentFlowStorage } from '@/Components/services/apiStorage';

export default function Home() {
  // Fetch recent flows
  const { data: flows = [], isLoading } = useQuery({
    queryKey: ['flows'],
    queryFn: IncidentFlowStorage.getAll
  });

  const recentFlows = flows.slice(0, 3);
  const mostRecentFlow = recentFlows[0];

  const features = [
    {
      icon: Network,
      title: 'Network Mapping',
      description: 'Visualize attack paths across your infrastructure with interactive network diagrams.',
      color: 'cyan',
      stats: { total: flows.filter(f => f.type === 'network_map').length, recent: 'Last 7 days' }
    },
    {
      icon: Clock,
      title: 'Timeline Analysis',
      description: 'Reconstruct incident sequences with precise temporal visualization.',
      color: 'purple',
      stats: { total: flows.filter(f => f.type === 'timeline').length, recent: 'Last 7 days' }
    },
    {
      icon: Target,
      title: 'MITRE ATT&CK',
      description: 'Map incidents to the ATT&CK framework for standardized threat intelligence.',
      color: 'green',
      stats: { total: flows.filter(f => f.type === 'mitre_attack').length, recent: 'Last 7 days' }
    }
  ];

  const colorClasses = {
    cyan: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    green: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
  };

  const getFlowTypeIcon = (type) => {
    switch (type) {
      case 'network_map': return Network;
      case 'timeline': return Clock;
      case 'mitre_attack': return Target;
      default: return Shield;
    }
  };

  const getFlowTypeColor = (type) => {
    switch (type) {
      case 'network_map': return 'cyan';
      case 'timeline': return 'purple';
      case 'mitre_attack': return 'green';
      default: return 'cyan';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Enhanced animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] animate-pulse" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <div className="pt-12 pb-8 px-6">
          <div className="max-w-7xl mx-auto">
            {/* Quick Stats Bar */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center justify-between mb-8 p-4 bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl"
            >
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-slate-300">Total Flows: <span className="text-white font-semibold">{flows.length}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-slate-300">This Week: <span className="text-white font-semibold">{recentFlows.length}</span></span>
                </div>
              </div>
              <Link
                to={createPageUrl('History')}
                className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left Column - Hero Content */}
              <div>
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
                  className="text-5xl md:text-6xl font-bold text-white tracking-tight mb-6"
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
                  className="text-lg text-slate-400 mb-8 leading-relaxed"
                >
                  Convert complex cyber incident descriptions into clear, actionable 
                  attack flow diagrams. Supports multiple languages including Hebrew (עברית). 
                  Network maps, timelines, and MITRE ATT&CK visualizations powered by OpenAI GPT-4.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-col sm:flex-row items-start gap-4 mb-12"
                >
                  <Link
                    to={createPageUrl('CreateFlow')}
                    className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 font-semibold rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300"
                  >
                    Create New Flow
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    to={createPageUrl('History')}
                    className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-300"
                  >
                    View History
                  </Link>
                </motion.div>
              </div>

              {/* Right Column - Interactive Recent Flow */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="lg:sticky lg:top-8"
              >
                {mostRecentFlow ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-3xl blur-xl" />
                    <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Recent Flow</h3>
                        <div className="flex items-center gap-2">
                          <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                            <MoreVertical className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Flow Preview */}
                        <div className="group relative bg-slate-800/50 rounded-2xl p-4 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[getFlowTypeColor(mostRecentFlow.type)]}`}>
                              {React.createElement(getFlowTypeIcon(mostRecentFlow.type), { className: "w-6 h-6" })}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-white mb-1 line-clamp-1">
                                {mostRecentFlow.title || mostRecentFlow.name || 'Untitled Flow'}
                              </h4>
                              <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                                {mostRecentFlow.description?.substring(0, 120)}...
                              </p>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span>Type: {mostRecentFlow.type}</span>
                                <span>•</span>
                                <span>{new Date(mostRecentFlow.created_at || mostRecentFlow.timestamp).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Interactive Preview */}
                          <div className="mt-4 p-3 bg-slate-900/50 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 mb-3">
                              <Eye className="w-4 h-4 text-cyan-400" />
                              <span className="text-sm font-medium text-cyan-400">Quick Preview</span>
                            </div>
                            
                            {/* Simplified diagram representation */}
                            <div className="flex items-center justify-between py-2">
                              <div className="flex items-center gap-2">
                                {[1, 2, 3, 4].map((i) => (
                                  <div key={i} className={`w-2 h-2 rounded-full ${i <= 3 ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                                ))}
                              </div>
                              <span className="text-xs text-slate-400">
                                {mostRecentFlow.data?.nodes?.length || 0} components
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-4">
                            <Link
                              to={createPageUrl(`FlowEditor?id=${mostRecentFlow.id}`)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-xl text-cyan-400 text-sm font-medium transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                              Edit
                            </Link>
                            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-colors">
                              <Play className="w-4 h-4" />
                              View
                            </button>
                          </div>
                        </div>

                        {/* Recent Activity */}
                        {recentFlows.slice(1, 3).length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-3">Recent Activity</h4>
                            <div className="space-y-2">
                              {recentFlows.slice(1, 3).map((flow, index) => (
                                <Link
                                  key={flow.id}
                                  to={createPageUrl(`FlowEditor?id=${flow.id}`)}
                                  className="flex items-center gap-3 p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-xl transition-colors group"
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[getFlowTypeColor(flow.type)]}`}>
                                    {React.createElement(getFlowTypeIcon(flow.type), { className: "w-4 h-4" })}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-medium line-clamp-1">
                                      {flow.title || flow.name || 'Untitled'}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {new Date(flow.created_at || flow.timestamp).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Empty state
                  <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Flows Yet</h3>
                    <p className="text-slate-400 mb-6">Create your first incident flow to get started</p>
                    <Link
                      to={createPageUrl('CreateFlow')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 font-semibold rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300"
                    >
                      <Zap className="w-4 h-4" />
                      Create Flow
                    </Link>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="px-6 pb-20">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Comprehensive Incident Analysis
              </h2>
              <p className="text-lg text-slate-400 max-w-3xl mx-auto">
                Transform complex security incidents into clear, actionable intelligence with our suite of analysis tools
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="grid md:grid-cols-3 gap-8"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                  className="group relative"
                >
                  <div className="relative bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-slate-900/70 transition-all duration-300">
                    <div className={`w-16 h-16 rounded-2xl mb-6 flex items-center justify-center ${colorClasses[feature.color]}`}>
                      <feature.icon className="w-8 h-8" />
                    </div>
                    
                    <h3 className="text-xl font-semibold text-white mb-4">
                      {feature.title}
                    </h3>
                    
                    <p className="text-slate-400 leading-relaxed mb-6">
                      {feature.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{feature.stats.recent}</span>
                      <span className={`font-semibold ${feature.color === 'cyan' ? 'text-cyan-400' : feature.color === 'purple' ? 'text-purple-400' : 'text-emerald-400'}`}>
                        {feature.stats.total} flows
                      </span>
                    </div>
                    
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300" 
                         style={{background: `linear-gradient(135deg, ${feature.color === 'cyan' ? '#06b6d4' : feature.color === 'purple' ? '#8b5cf6' : '#10b981'}20, transparent)`}} />
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Call to Action */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="mt-20 text-center"
            >
              <div className="relative bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-12">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-emerald-500/10 rounded-3xl" />
                <div className="relative">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
                    Ready to Transform Your Incident Response?
                  </h2>
                  <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
                    Join security teams worldwide who trust FlowViz to turn complex incidents into clear, actionable intelligence
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                      to={createPageUrl('CreateFlow')}
                      className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 font-semibold rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300"
                    >
                      <Zap className="w-5 h-5" />
                      Start Creating
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                      to={createPageUrl('deployment-openshift')}
                      className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-300"
                    >
                      <Lock className="w-5 h-5" />
                      Deployment Guide
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}