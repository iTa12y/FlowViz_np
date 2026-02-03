import React, { useState, useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { Calendar, Clock, Edit3, GripVertical, Check, X, AlertCircle, Shield, Zap, Target, Database, Eye, Search } from 'lucide-react';
import { Badge } from '@/Components/ui/badge';

const TimelineEvent = ({ 
  event, 
  index, 
  isSelected, 
  onSelect, 
  onUpdate, 
  onMove, 
  className = "",
  style
}) => {
  const [isEditingTimestamp, setIsEditingTimestamp] = useState(false);
  const [editedTimestamp, setEditedTimestamp] = useState(event.timestamp || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const dragControls = useDragControls();
  const eventRef = useRef(null);

  const getEventTypeIcon = (type) => {
    switch (type) {
      case 'initial_access': return Shield;
      case 'execution': return Zap;
      case 'persistence': return Database;
      case 'privilege_escalation': return Target;
      case 'lateral_movement': return Eye;
      case 'collection': return Search;
      case 'exfiltration': return Database;
      case 'impact': return AlertCircle;
      case 'question_mark': return AlertCircle;
      case 'investigation_step': return Search;
      default: return Clock;
    }
  };

  const getEventTypeColor = (type, confidence) => {
    if (type === 'question_mark' || confidence === 'requires_investigation') {
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
    switch (type) {
      case 'initial_access': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'execution': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'persistence': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'privilege_escalation': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      case 'lateral_movement': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'collection': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'exfiltration': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'impact': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'investigation_step': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getConfidenceIndicator = (confidence) => {
    switch (confidence) {
      case 'confirmed': return { color: 'bg-emerald-500', label: 'Confirmed' };
      case 'likely': return { color: 'bg-blue-500', label: 'Likely' };
      case 'uncertain': return { color: 'bg-amber-500', label: 'Uncertain' };
      case 'requires_investigation': return { color: 'bg-red-500', label: 'Needs Investigation' };
      default: return { color: 'bg-gray-500', label: 'Unknown' };
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp || 'Unknown time';
    }
  };

  const handleTimestampEdit = () => {
    if (isEditingTimestamp && editedTimestamp !== event.timestamp) {
      onUpdate({
        ...event,
        timestamp: editedTimestamp
      });
    }
    setIsEditingTimestamp(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleTimestampEdit();
    } else if (e.key === 'Escape') {
      setEditedTimestamp(event.timestamp || '');
      setIsEditingTimestamp(false);
    }
  };

  const handleDragStart = (event, info) => {
    onSelect(event);
  };

  const handleDragEnd = (event, info) => {
    if (onMove && (Math.abs(info.offset.y) > 10)) {
      // Calculate which position to move to based on drag direction
      const direction = info.offset.y > 0 ? 'down' : 'up';
      onMove(index, direction);
    }
  };

  const EventIcon = getEventTypeIcon(event.type);
  const eventColor = getEventTypeColor(event.type, event.confidence_level);
  const confidenceInfo = getConfidenceIndicator(event.confidence_level);

  return (
    <motion.div
      ref={eventRef}
      style={style}
      drag="y"
      dragControls={dragControls}
      dragElastic={0.1}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.05, zIndex: 1000 }}
      layout
      className={`${className} select-none cursor-pointer`}
      onClick={() => onSelect(event)}
    >
      <div
        className={`
          relative group transition-all duration-200
          ${isSelected ? 'ring-2 ring-cyan-500/50 ring-offset-2 ring-offset-slate-950' : ''}
        `}
      >
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-600 to-slate-800" />
        
        {/* Main Event Container */}
        <div className="relative flex items-start gap-4 p-4 ml-4">
          {/* Drag Handle */}
          <button
            className="absolute -left-6 top-1/2 transform -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab hover:bg-white/10 rounded"
            onPointerDown={(e) => dragControls.start(e)}
            title="Drag to reorder"
          >
            <GripVertical className="w-3 h-3 text-slate-500" />
          </button>

          {/* Timeline Dot with Icon */}
          <div className="relative flex-shrink-0">
            <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${eventColor}`}>
              <EventIcon className="w-5 h-5" />
            </div>
            
            {/* Confidence Indicator */}
            <div 
              className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${confidenceInfo.color}`}
              title={confidenceInfo.label}
            />
          </div>

          {/* Event Content */}
          <div className="flex-1 min-w-0">
            {/* Timestamp */}
            <div className="flex items-center gap-2 mb-2">
              {isEditingTimestamp ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedTimestamp}
                    onChange={(e) => setEditedTimestamp(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-300 min-w-[120px]"
                    placeholder="YYYY-MM-DD HH:MM:SS"
                    autoFocus
                  />
                  <button
                    onClick={handleTimestampEdit}
                    className="w-6 h-6 rounded bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-emerald-400" />
                  </button>
                  <button
                    onClick={() => {
                      setEditedTimestamp(event.timestamp || '');
                      setIsEditingTimestamp(false);
                    }}
                    className="w-6 h-6 rounded bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/timestamp">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span className="text-xs text-slate-400 font-mono">
                    {formatTimestamp(event.timestamp)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingTimestamp(true);
                    }}
                    className="w-4 h-4 rounded opacity-0 group-hover/timestamp:opacity-100 transition-opacity hover:bg-white/10 flex items-center justify-center"
                  >
                    <Edit3 className="w-2.5 h-2.5 text-slate-500" />
                  </button>
                </div>
              )}
            </div>

            {/* Event Title and Type */}
            <div className="flex items-start gap-2 mb-2">
              <h3 className="text-sm font-semibold text-white leading-tight flex-1">
                {event.title || 'Untitled Event'}
              </h3>
              <Badge variant="outline" className={`text-xs ${eventColor}`}>
                {event.type?.replace('_', ' ')}
              </Badge>
            </div>

            {/* Event Description */}
            <div className="text-xs text-slate-400 leading-relaxed mb-3">
              <div className={isExpanded ? '' : 'line-clamp-2'}>
                {event.description || 'No description available'}
              </div>
              {event.description && event.description.length > 100 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 mt-1"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>

            {/* Additional Fields for Question Marks */}
            {(event.type === 'question_mark' || event.confidence_level === 'requires_investigation') && (
              <motion.div
                initial={false}
                animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-2 border-t border-white/10">
                  {event.possible_scenarios && (
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <div className="text-xs font-medium text-amber-400 mb-1">Possible Scenarios:</div>
                      <div className="text-xs text-slate-400">{event.possible_scenarios}</div>
                    </div>
                  )}
                  {event.investigation_suggestions && (
                    <div className="bg-blue-900/20 rounded-lg p-2">
                      <div className="text-xs font-medium text-blue-400 mb-1">Investigation Needed:</div>
                      <div className="text-xs text-slate-400">{event.investigation_suggestions}</div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Confidence Level */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-500">Confidence:</span>
              <Badge variant="outline" className={`text-xs ${getConfidenceColor('', event.confidence_level)}`}>
                {event.confidence_level || 'unknown'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TimelineEvent;