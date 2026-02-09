import React, { useState } from 'react';
import { Network, Clock, Target } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/Components/ui/tabs';
import DiagramCanvas from './DiagramCanvas';
import { motion } from 'framer-motion';

export default function IncidentAnalysis({ 
  flows,
  selectedNode, 
  onNodeSelect, 
  onNodeUpdate,
  zoomLevel,
  timelineSortOrder,
  svgRef,
  isPromptRTL
}) {
  const [activeTab, setActiveTab] = useState('network_map');

  const flowTabs = [
    {
      id: 'network_map',
      name: 'Network Map',
      icon: Network,
      color: 'cyan',
      description: 'Attack paths and infrastructure'
    },
    {
      id: 'timeline',
      name: 'Attack Timeline',
      icon: Clock,
      color: 'purple',
      description: 'Chronological event sequence'
    },
    {
      id: 'mitre_attack',
      name: 'MITRE ATT&CK',
      icon: Target,
      color: 'emerald',
      description: 'Tactics and techniques mapping'
    }
  ];

  const colorClasses = {
    cyan: {
      border: 'border-cyan-400',
      bg: 'bg-cyan-400/10',
      text: 'text-cyan-400',
      ring: 'ring-cyan-400/30'
    },
    purple: {
      border: 'border-purple-400',
      bg: 'bg-purple-400/10',
      text: 'text-purple-400',
      ring: 'ring-purple-400/30'
    },
    emerald: {
      border: 'border-emerald-400',
      bg: 'bg-emerald-400/10',
      text: 'text-emerald-400',
      ring: 'ring-emerald-400/30'
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Tab Bar */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="max-w-[1800px] mx-auto px-6">
            <TabsList className="h-14 bg-transparent border-0 w-full justify-start gap-1">
              {flowTabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                const colors = colorClasses[tab.color];

                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={`
                      relative h-full px-6 rounded-t-lg border-b-2 transition-all duration-200
                      data-[state=inactive]:border-transparent data-[state=inactive]:bg-transparent
                      data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-slate-300
                      data-[state=inactive]:hover:bg-slate-800/50
                      data-[state=active]:border-b-2 data-[state=active]:${colors.border}
                      data-[state=active]:${colors.text} data-[state=active]:bg-slate-900
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <TabIcon className="w-4 h-4" />
                      <div className="flex flex-col items-start">
                        <span className="font-semibold text-sm">{tab.name}</span>
                        <span className={`text-xs ${isActive ? 'opacity-70' : 'opacity-50'}`}>
                          {tab.description}
                        </span>
                      </div>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} className="h-full">
          {flowTabs.map((tab) => {
            const flowData = flows[tab.id];
            
            return (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="h-full m-0 focus-visible:outline-none focus-visible:ring-0"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {flowData ? (
                    <DiagramCanvas
                      diagramData={flowData}
                      flowType={tab.id}
                      selectedNode={selectedNode}
                      onNodeSelect={onNodeSelect}
                      onNodeUpdate={onNodeUpdate}
                      svgRef={svgRef}
                      zoomLevel={zoomLevel}
                      isPromptRTL={isPromptRTL}
                      timelineSortOrder={timelineSortOrder}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                          <tab.icon className="w-8 h-8 text-slate-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          No {tab.name} Data
                        </h3>
                        <p className="text-sm text-slate-400">
                          This flow type hasn't been generated yet
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
