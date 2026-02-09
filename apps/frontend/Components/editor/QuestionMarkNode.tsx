import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, AlertTriangle, Search, Lightbulb, ChevronRight } from 'lucide-react';
import { Badge } from '@/Components/ui/badge';

const QuestionMarkNode = ({ 
  node, 
  isSelected, 
  onSelect, 
  onEdit, 
  style,
  className = ""
}) => {
  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'confirmed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'likely': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'uncertain': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'requires_investigation': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <motion.div
      style={style}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`${className} select-none pointer-events-none`}
    >
      <div
        className={`
          relative group cursor-pointer transition-all duration-200
          ${isSelected ? 'ring-2 ring-amber-500/50 ring-offset-2 ring-offset-slate-950' : ''}
        `}
      >
        {/* Main Node Container - Minimal design */}
        <div
          className={`
            relative border-2 border-dashed rounded-xl p-4 min-w-[180px] max-w-[200px]
            bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md
            hover:from-slate-800/95 hover:to-slate-700/95
            transition-all duration-300 ease-in-out
            ${getConfidenceColor(node.confidence_level)}
            ${isSelected ? 'shadow-2xl shadow-amber-500/40 scale-105 border-amber-400/60' : 'shadow-xl shadow-black/50 border-amber-500/30'}
            hover:shadow-2xl hover:shadow-amber-500/30 hover:scale-[1.03] hover:border-amber-400/50
            cursor-pointer
          `}
        >
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className={`
              w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
              bg-gradient-to-br from-amber-400/40 to-orange-500/40
              border-2 border-amber-400/50 shadow-lg shadow-amber-500/20
              transition-all duration-300
              group-hover:scale-110 group-hover:shadow-amber-500/40
            `}>
              <HelpCircle className="w-5 h-5 text-amber-200" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-white mb-0.5 leading-tight truncate">
                {node.label || 'Unknown Component'}
              </h3>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getConfidenceColor(node.confidence_level)}`}>
                {node.confidence_level || 'uncertain'}
              </Badge>
            </div>
          </div>

          {/* Minimal hint */}
          <div className="mt-2 text-[10px] text-amber-300/90 text-center font-medium tracking-wide">
            Click to investigate →
          </div>

          {/* Visual Indicator */}
          <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-amber-400/40 to-orange-500/40 border-2 border-amber-400/60 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse">
            <span className="text-xs font-black text-amber-200">?</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default QuestionMarkNode;