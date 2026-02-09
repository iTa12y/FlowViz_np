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
  onDragStart,
  onDragEnd,
  onDragMove,
  isDragging = false,
  containerRef,
  className = "",
  style
}) => {
  const [isEditingTimestamp, setIsEditingTimestamp] = useState(false);
  const [editedTimestamp, setEditedTimestamp] = useState(event?.timestamp || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActuallyDragging, setIsActuallyDragging] = useState(false);
  const dragControls = useDragControls();
  const eventRef = useRef(null);
  const dragStartTimeRef = useRef(null);
  const dragDistanceRef = useRef(0);

  // Prevent invalid events from rendering
  if (!event || !event.id) {
    console.warn('Invalid event data:', event);
    return null;
  }

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
      try {
        onUpdate({
          ...event,
          timestamp: editedTimestamp
        });
      } catch (error) {
        console.error('Error updating timestamp:', error);
      }
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

  const handleDragStart = React.useCallback((event) => {
    event.stopPropagation();
    dragStartTimeRef.current = Date.now();
    dragDistanceRef.current = 0;
    setIsActuallyDragging(false);
    if (onDragStart) {
      onDragStart(index);
    }
  }, [index, onDragStart]);

  const handleDragEnd = React.useCallback(() => {
    const wasDragging = isActuallyDragging;
    setIsActuallyDragging(false);
    dragStartTimeRef.current = null;
    dragDistanceRef.current = 0;
    
    if (onDragEnd) {
      onDragEnd();
    }
    
    // Return whether this was an actual drag (used to prevent click)
    return wasDragging;
  }, [onDragEnd, isActuallyDragging]);

  const handleDrag = React.useCallback((event, info) => {
    // Track drag distance to determine if this is a real drag vs just a click
    if (info && info.offset) {
      const distance = Math.abs(info.offset.y);
      dragDistanceRef.current = Math.max(dragDistanceRef.current, distance);
      
      // Consider it a drag if moved more than 5px
      if (distance > 5) {
        setIsActuallyDragging(true);
      }
    }
    
    if (onDragMove && info) {
      onDragMove(info);
    }
  }, [onDragMove]);

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
      dragConstraints={{ top: -2000, bottom: 2000 }}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      animate={!isDragging ? { x: 0, y: 0 } : undefined}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      whileDrag={{ 
        scale: 1.05,
        zIndex: 1000,
        boxShadow: "0 20px 40px rgba(6, 182, 212, 0.4)",
        cursor: "grabbing",
        opacity: 0.9
      }}
      className={`${className} select-none cursor-grab active:cursor-grabbing`}
      onClick={(e) => {
        // Only trigger selection if we're not dragging
        // Check if this was a quick click vs a drag operation
        const timeSinceDragStart = dragStartTimeRef.current ? Date.now() - dragStartTimeRef.current : 1000;
        const wasDragging = isActuallyDragging || dragDistanceRef.current > 5;
        
        if (!wasDragging && timeSinceDragStart < 500) {
          onSelect(event);
        } else if (!isActuallyDragging && timeSinceDragStart >= 500) {
          // It's been a while since drag started, safe to select
          onSelect(event);
        }
      }}
      data-timeline-event
      data-event-id={event.id}
    >
      <div
        className={`
          relative group transition-all duration-200 ease-out
          bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50
          hover:border-slate-700/70 hover:bg-slate-900/70
          ${isSelected ? 'ring-2 ring-cyan-500/50 border-cyan-500/30' : ''}
          ${isDragging ? 'shadow-2xl shadow-cyan-500/30 ring-2 ring-cyan-400/40 border-cyan-400/50 bg-slate-800/60' : ''}
        `}
        onPointerDown={(e) => {
          // Only allow drag from the drag handle area or if clicking directly on the card
          dragControls.start(e);
        }}
      >
        {/* Main Event Container */}
        <div className="relative flex items-start gap-6 p-6">
          {/* Drag Handle */}
          <div
            className="absolute -left-8 top-1/2 transform -translate-y-1/2 w-6 h-12 flex items-center justify-center opacity-50 group-hover:opacity-100 transition-all duration-200 cursor-grab active:cursor-grabbing hover:bg-cyan-500/10 rounded-lg"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
          </div>

          {/* Timeline Dot with Icon */}
          <div className="relative flex-shrink-0 z-20">
            {/* Connection to main timeline */}
            <div className="absolute -left-8 top-1/2 w-6 h-0.5 bg-slate-600"></div>
            
            <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center shadow-lg ${eventColor} transition-all duration-200 group-hover:scale-105`}>
              <EventIcon className="w-6 h-6" />
            </div>
            
            {/* Confidence Indicator */}
            <div 
              className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 ${confidenceInfo.color} flex items-center justify-center shadow-md`}
              title={confidenceInfo.label}
            >
              <div className="w-2 h-2 bg-white rounded-full opacity-80"></div>
            </div>
          </div>

          {/* Event Content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Timestamp */}
            <div className="flex items-center gap-3">
              {isEditingTimestamp ? (
                <div className="flex items-center gap-3 w-full">
                  <input
                    type="text"
                    value={editedTimestamp}
                    onChange={(e) => setEditedTimestamp(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="text-sm bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-300 flex-1 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    placeholder="YYYY-MM-DD HH:MM:SS"
                    autoFocus
                  />
                  <button
                    onClick={handleTimestampEdit}
                    className="w-8 h-8 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center transition-colors"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                  </button>
                  <button
                    onClick={() => {
                      setEditedTimestamp(event.timestamp || '');
                      setIsEditingTimestamp(false);
                    }}
                    className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 group/timestamp w-full">
                  <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="text-sm text-slate-300 font-mono bg-slate-800/50 px-3 py-1 rounded-lg">
                    {formatTimestamp(event.timestamp)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingTimestamp(true);
                    }}
                    className="w-6 h-6 rounded-lg opacity-50 group-hover/timestamp:opacity-100 transition-all hover:bg-white/10 flex items-center justify-center"
                    aria-label="Edit timestamp"
                    title="Edit timestamp"
                  >
                    <Edit3 className="w-3 h-3 text-slate-500" />
                  </button>
                </div>
              )}
            </div>

            {/* Event Title and Type */}
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-semibold text-white leading-tight flex-1">
                {event.title || 'Untitled Event'}
              </h3>
              <Badge variant="outline" className={`text-sm font-medium ${eventColor} whitespace-nowrap`}>
                {(event.type || 'unknown').replace('_', ' ')}
              </Badge>
            </div>

            {/* Event Description */}
            <div className="text-sm text-slate-300 leading-relaxed">
              <div className={isExpanded ? '' : 'line-clamp-3'}>
                {event.description || 'No description available'}
              </div>
              {event.description && event.description.length > 150 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 mt-2 text-xs font-medium transition-colors"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? 'Show less description' : 'Show more description'}
                >
                  {isExpanded ? '← Show less' : 'Show more →'}
                </button>
              )}
            </div>

            {/* Additional Fields for Question Marks */}
            {(event.type === 'question_mark' || event.confidence_level === 'requires_investigation') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 pt-4 border-t border-amber-500/20"
              >
                {event.possible_scenarios && (
                  <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 hover:bg-amber-900/30 transition-colors">
                    <div className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Possible Scenarios
                    </div>
                    <div className="text-sm text-slate-300 leading-relaxed">{event.possible_scenarios}</div>
                  </div>
                )}
                {event.investigation_suggestions && (
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 hover:bg-blue-900/30 transition-colors">
                    <div className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Investigation Needed
                    </div>
                    <div className="text-sm text-slate-300 leading-relaxed">{event.investigation_suggestions}</div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Confidence Level and Metadata */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Confidence:</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${confidenceInfo.color}`}></div>
                  <Badge variant="outline" className={`text-sm ${getEventTypeColor('', event.confidence_level)}`}>
                    {confidenceInfo.label}
                  </Badge>
                </div>
              </div>
              
              {/* Event Index - only visible on hover */}
              <div className="text-xs text-slate-500/0 group-hover:text-slate-500/100 transition-colors">
                Event #{index + 1}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TimelineEvent;