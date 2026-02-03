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
  const [isExpanded, setIsExpanded] = React.useState(false);

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'confirmed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'likely': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'uncertain': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'requires_investigation': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getIcon = (confidence) => {
    switch (confidence) {
      case 'requires_investigation': return Search;
      case 'uncertain': return AlertTriangle;
      default: return HelpCircle;
    }
  };

  const Icon = getIcon(node.confidence_level || 'uncertain');

  return (
    <motion.div
      style={style}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`${className} select-none`}
      onClick={() => onSelect(node)}
    >
      <div
        className={`
          relative group cursor-pointer transition-all duration-200
          ${isSelected ? 'ring-2 ring-cyan-500/50 ring-offset-2 ring-offset-slate-950' : ''}
        `}
      >
        {/* Main Node Container */}
        <div
          className={`
            relative border-2 border-dashed rounded-2xl p-4 min-w-[280px] max-w-[380px]
            bg-slate-900/80 backdrop-blur-sm
            hover:bg-slate-800/90 transition-all duration-300
            ${getConfidenceColor(node.confidence_level)}
            ${isSelected ? 'shadow-xl shadow-cyan-500/20' : 'shadow-lg shadow-black/20'}
            hover:shadow-xl hover:shadow-black/30
          `}
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              bg-gradient-to-br from-amber-400/20 to-orange-500/20
              border border-amber-400/30
            `}>
              <Icon className="w-5 h-5 text-amber-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-1 leading-tight">
                {node.label || 'Unknown Component'}
              </h3>
              <Badge variant="outline" className={`text-xs ${getConfidenceColor(node.confidence_level)}`}>
                {node.confidence_level || 'uncertain'}
              </Badge>
            </div>

            {/* Expand/Collapse Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {/* Basic Description */}
          <div className="text-xs text-slate-300 leading-relaxed mb-3 line-clamp-3">
            {node.details || 'Missing information in attack flow'}
          </div>

          {/* Expanded Content */}
          <motion.div
            initial={false}
            animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-4 pt-2 border-t border-white/10">
              {/* Possible Scenarios */}
              {node.possible_scenarios && (
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-medium text-yellow-400">Possible Scenarios</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {node.possible_scenarios}
                  </p>
                </div>
              )}

              {/* Investigation Suggestions */}
              {node.investigation_suggestions && (
                <div className="bg-blue-900/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-medium text-blue-400">Investigation Needed</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {node.investigation_suggestions}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit && onEdit(node);
                  }}
                  className="flex-1 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-xs font-medium text-cyan-400 transition-colors"
                >
                  Add Information
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle convert to confirmed action
                  }}
                  className="flex-1 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs font-medium text-emerald-400 transition-colors"
                >
                  Mark Confirmed
                </button>
              </div>
            </div>
          </motion.div>

          {/* Visual Indicator */}
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400/20 border-2 border-amber-400/40 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-amber-400">?</span>
          </div>
        </div>

        {/* Connecting Points */}
        <div className="absolute top-1/2 -left-2 w-4 h-4 bg-slate-700 border-2 border-amber-400/50 rounded-full transform -translate-y-1/2" />
        <div className="absolute top-1/2 -right-2 w-4 h-4 bg-slate-700 border-2 border-amber-400/50 rounded-full transform -translate-y-1/2" />
      </div>
    </motion.div>
  );
};

export default QuestionMarkNode;