import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl, withApiBase } from '@/utils';
import { IncidentFlowStorage } from '@/Components/services/apiStorage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyzeIncident } from '@/Components/services/openai-callback';
import {
  Save,
  Download,
  RefreshCw,
  ChevronLeft,
  FileText,
  Network,
  Clock,
  Target,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  Check,
  Edit3,
  X,
  Trash2,
  Plus,
  ArrowRight,
  Info,
  ArrowUpDown,
  Undo,
  Redo
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Textarea } from '@/Components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import DiagramCanvas from '@/Components/editor/DiagramCanvas';
import NodeDetails from '@/Components/editor/NodeDetails';


const NODE_TYPES = [
  { id: 'endpoint', label: 'Endpoint', color: 'bg-cyan-400/20 border-cyan-400 text-cyan-400' },
  { id: 'server', label: 'Server', color: 'bg-purple-400/20 border-purple-400 text-purple-400' },
  { id: 'domain_controller', label: 'Domain Controller', color: 'bg-emerald-400/20 border-emerald-400 text-emerald-400' },
  { id: 'database', label: 'Database', color: 'bg-amber-400/20 border-amber-400 text-amber-400' },
  { id: 'attacker', label: 'Attacker', color: 'bg-red-400/20 border-red-400 text-red-400' },
  { id: 'target', label: 'Target', color: 'bg-orange-400/20 border-orange-400 text-orange-400' },
  { id: 'firewall', label: 'Firewall', color: 'bg-slate-400/20 border-slate-400 text-slate-400' },
  { id: 'external', label: 'External', color: 'bg-rose-400/20 border-rose-400 text-rose-400' },
  { id: 'question_mark', label: 'Missing Info', color: 'bg-amber-400/20 border-amber-400 text-amber-400' },
  { id: 'investigation_step', label: 'Investigation', color: 'bg-blue-400/20 border-blue-400 text-blue-400' },
  { id: 'text_block', label: 'Text Block', color: 'bg-white/10 border-white/30 text-white' },
];

export default function FlowEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const flowId = urlParams.get('id');
  const queryClient = useQueryClient();

  const [selectedNode, setSelectedNode] = useState(null);
  const [showIncidentPanel, setShowIncidentPanel] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [diagramKey, setDiagramKey] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [addNodeMode, setAddNodeMode] = useState(false);
  const [addEdgeMode, setAddEdgeMode] = useState(false);
  const [edgeFromNode, setEdgeFromNode] = useState(null);
  const [pendingNodePos, setPendingNodePos] = useState(null);
  const [showNodeSelector, setShowNodeSelector] = useState(false);
  const [editingEdgeLabel, setEditingEdgeLabel] = useState(null);
  const [edgeLabelText, setEdgeLabelText] = useState('');
  const [timelineSortOrder, setTimelineSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeFlowType, setActiveFlowType] = useState('network_map');
  const canvasRef = React.useRef(null);
  const scrollRef = React.useRef(null);
  const prevZoomRef = React.useRef(zoomLevel);
  const svgRef = React.useRef(null);
  const innerWrapRef = React.useRef(null);
  const panStartRef = React.useRef(null);

  const { data: flow, isLoading } = useQuery({
    queryKey: ['flow', flowId],
    queryFn: async () => {
      return IncidentFlowStorage.getById(flowId);
    },
    enabled: !!flowId
  });

  // Initialize edited description when flow loads
  React.useEffect(() => {
    if (flow?.description) {
      setEditedDescription(flow.description);
    }
  }, [flow?.description]);

  const updateMutation = useMutation({
    mutationFn: (data) => IncidentFlowStorage.update(flowId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flow', flowId] });
    }
  });

  // Check if this is a multi-flow (must be before handleRegenerate uses it)
  const isMultiFlow = flow?.flow_type === 'multi' || flow?.flows;
  
  // Get the current effective flow type (for features and UI)
  const currentFlowType = isMultiFlow ? activeFlowType : flow?.flow_type;

  const handleRegenerate = async () => {
    if (!flow || !editedDescription) return;
    
    setIsRegenerating(true);
    try {
      
      if (isMultiFlow) {
        // Regenerate all three flow types
        const response = await fetch(withApiBase('/api/incident/analyze-all'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ description: editedDescription })
        });

        if (!response.ok) {
          throw new Error('Failed to regenerate flows');
        }

        const { flows } = await response.json();

        // Update the flow with all regenerated flows
        await updateMutation.mutateAsync({
          description: editedDescription,
          flows: flows,
          status: 'generated'
        });
      } else {
        // Original single-flow regeneration
        const result = await analyzeIncident({
          description: editedDescription,
          flowType: flow.flow_type
        });

        // Parse the result to extract nodes
        let parsedData = {};
        try {
          parsedData = JSON.parse(result.result);
        } catch (e) {
          console.error('Failed to parse diagram data:', e);
          parsedData = {};
        }

        // Update the flow with new diagram and description
        await updateMutation.mutateAsync({
          description: editedDescription,
          diagram_data: result.result,
          nodes: parsedData.nodes || [],
          status: 'generated'
        });
      }

      // Force diagram remount with new key to recalculate positions
      setDiagramKey(prev => prev + 1);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Regeneration failed:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = { status: 'reviewed' };
      
      // If description was edited, save it
      if (editedDescription !== flow.description) {
        updates.description = editedDescription;
      }
      
      await updateMutation.mutateAsync(updates);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setIsEditMode(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedDescription(flow.description);
    setIsEditMode(false);
  };

  const handleExport = () => {
    if (!flow) return;
    
    const exportData = {
      name: flow.name,
      description: flow.description,
      flow_type: flow.flow_type,
      ...(isMultiFlow ? { flows: flow.flows } : { diagram_data: flow.diagram_data }),
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${flow.name?.replace(/\s+/g, '_')}_flow.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50));
  };

  const handleFullscreen = () => {
    if (!canvasRef.current) return;
    
    if (!isFullscreen) {
      if (canvasRef.current.requestFullscreen) {
        canvasRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if (canvasRef.current.webkitRequestFullscreen) {
        canvasRef.current.webkitRequestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle mouse wheel zoom - standard scroll wheel (no Ctrl needed)
  // DISABLED for mitre_attack and timeline types
  React.useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl || currentFlowType === 'mitre_attack' || currentFlowType === 'timeline') return;

    const handleWheel = (e) => {
      // Don't zoom if we're panning or doing other interactions
      if (isPanning || addNodeMode) return;
      
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -5 : 5;
      setZoomLevel(prev => Math.max(50, Math.min(200, prev + delta)));
    };

    canvasEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvasEl.removeEventListener('wheel', handleWheel);
  }, [isPanning, addNodeMode, currentFlowType]);

  // Handle panning with click and drag on background
  const handleCanvasMouseDown = (e) => {
    if (addNodeMode && currentFlowType === 'network_map') {
      handleAddNode(e);
      return;
    }

    // Pan with left mouse button - check if clicking on empty space (not on SVG content)
    // ONLY allow panning for network_map, not for mitre_attack or timeline
    if (e.button === 0 && currentFlowType !== 'mitre_attack' && currentFlowType !== 'timeline') {
      // Allow panning if we click on scrollRef or canvasRef itself (empty area)
      const isOnEmptySpace = e.target === scrollRef.current || 
                             e.target === canvasRef.current ||
                             (e.target.tagName && e.target.tagName.toLowerCase() === 'svg');
      
      if (isOnEmptySpace) {
        e.preventDefault();
        e.stopPropagation();
        setIsPanning(true);
        panStartRef.current = { 
          x: e.clientX, 
          y: e.clientY, 
          offsetX: panOffset.x, 
          offsetY: panOffset.y
        };
      }
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isPanning && panStartRef.current) {
      e.preventDefault();
      e.stopPropagation();
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      
      // No bounds - endless roaming space
      setPanOffset({
        x: panStartRef.current.offsetX + dx,
        y: panStartRef.current.offsetY + dy
      });
    }
  };

  const handleCanvasMouseUp = (e) => {
    if (isPanning) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsPanning(false);
    panStartRef.current = null;
    setAddEdgeMode(false);
    setEdgeFromNode(null);
  };

  // Handle escape key to cancel modes
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Escape') {
        setAddNodeMode(false);
        setAddEdgeMode(false);
        setEdgeFromNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Center diagram on load / when diagram data changes

  const flowTypeConfig = {
    network_map: { icon: Network, label: 'Network Map', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
    timeline: { icon: Clock, label: 'Timeline', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
    mitre_attack: { icon: Target, label: 'MITRE ATT&CK', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' }
  };

  const [localDiagramData, setLocalDiagramData] = useState(null);

  const parsedDiagramData = React.useMemo(() => {
    if (!flow) return null;
    
    // Check if this is a multi-flow
    const isMulti = flow.flow_type === 'multi' || flow.flows;
    
    if (isMulti && flow.flows) {
      // Multi-flow: get the data for the active flow type
      const activeFlowData = flow.flows[activeFlowType];
      if (!activeFlowData) return null;
      return typeof activeFlowData === 'string' ? JSON.parse(activeFlowData) : activeFlowData;
    } else if (flow.diagram_data) {
      // Single flow: use diagram_data
      return typeof flow.diagram_data === 'string' ? JSON.parse(flow.diagram_data) : flow.diagram_data;
    }
    return null;
  }, [flow, activeFlowType]);

  // Use local diagram data if available, otherwise use parsed data
  const displayDiagramData = localDiagramData || parsedDiagramData;

  // Helper function to save diagram data (handles both multi-flow and single-flow)
  const saveDiagramData = (newDiagramData) => {
    if (isMultiFlow) {
      const updatedFlows = {
        ...flow.flows,
        [activeFlowType]: JSON.stringify(newDiagramData)
      };
      return { flows: updatedFlows };
    } else {
      return { diagram_data: JSON.stringify(newDiagramData) };
    }
  };

  // Save current state to history
  const saveToHistory = (newDiagramData) => {
    setHistory(prev => {
      // Remove any future states if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new state
      newHistory.push(JSON.parse(JSON.stringify(newDiagramData)));
      // Limit history to last 20 states
      if (newHistory.length > 20) {
        newHistory.shift();
        setHistoryIndex(prev => prev); // Keep index at same relative position
        return newHistory;
      }
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  };

  // Initialize history when diagram data loads
  React.useEffect(() => {
    if (parsedDiagramData) {
      setHistory([JSON.parse(JSON.stringify(parsedDiagramData))]);
      setHistoryIndex(0);
    }
  }, [parsedDiagramData, activeFlowType]);

  // Update local diagram when flow changes
  React.useEffect(() => {
    if (parsedDiagramData) {
      setLocalDiagramData(parsedDiagramData);
    }
  }, [parsedDiagramData]);

  const handleNodeUpdate = (updatedNode) => {
    if (!localDiagramData) return;

    const newDiagramData = { ...localDiagramData };

    // Update based on current flow type
    if (currentFlowType === 'network_map' && newDiagramData.nodes) {
      newDiagramData.nodes = newDiagramData.nodes.map(node =>
        node.id === updatedNode.id ? updatedNode : node
      );
    } else if (currentFlowType === 'timeline' && newDiagramData.events) {
      // Handle reorder: { events: [...] } replaces entire array
      if (Array.isArray(updatedNode?.events)) {
        newDiagramData.events = updatedNode.events;
      } else if (updatedNode?.id) {
        // Single event update (e.g. timestamp edit)
        newDiagramData.events = newDiagramData.events.map(event =>
          event.id === updatedNode.id ? { ...event, ...updatedNode } : event
        );
      }
    } else if (currentFlowType === 'mitre_attack' && newDiagramData.tactics) {
      newDiagramData.tactics = newDiagramData.tactics.map(tactic => ({
        ...tactic,
        techniques: tactic.techniques.map(technique =>
          technique.id === updatedNode.id ? { ...updatedNode, tacticName: tactic.name } : technique
        )
      }));
    }

    saveToHistory(newDiagramData);
    setLocalDiagramData(newDiagramData);
    // Only update selectedNode for single-node updates, not for reorder
    if (updatedNode?.id && !Array.isArray(updatedNode?.events)) {
      setSelectedNode(updatedNode);
    }

    // Save to database
    updateMutation.mutate(saveDiagramData(newDiagramData));
  };

  const handleUpdateEdgeLabel = (fromNodeId, toNodeId, newLabel) => {
    if (!localDiagramData || !localDiagramData.edges) return;

    const newDiagramData = { ...localDiagramData };
    newDiagramData.edges = newDiagramData.edges.map(edge =>
      edge.from === fromNodeId && edge.to === toNodeId
        ? { ...edge, label: newLabel }
        : edge
    );

    saveToHistory(newDiagramData);
    setLocalDiagramData(newDiagramData);
    setEditingEdgeLabel(null);
    setEdgeLabelText('');

    updateMutation.mutate(saveDiagramData(newDiagramData));
  };

  const handleStartEditEdgeLabel = (edgeInfo) => {
    // edgeInfo is now an object with { from, to } instead of a string
    if (localDiagramData && localDiagramData.edges) {
      const edge = localDiagramData.edges.find(e => e.from === edgeInfo.from && e.to === edgeInfo.to);
      if (edge) {
        setEdgeLabelText(edge.label || 'connection');
        // Store as object instead of string
        setEditingEdgeLabel(edgeInfo);
      }
    }
  };

  const handleAddNode = (e) => {
    if (!addNodeMode || currentFlowType !== 'network_map') return;
    if (!localDiagramData || !localDiagramData.nodes) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const scale = (zoomLevel || 100) / 100;
    // Account for pan offset in mouse position calculation
    const x = (e.clientX - rect.left) / scale - (panOffset.x / scale);
    const y = (e.clientY - rect.top) / scale - (panOffset.y / scale);

    // Store the position and show the node type selector
    setPendingNodePos({ x, y });
    setShowNodeSelector(true);
  };

  const handleCreateNodeWithType = (nodeType) => {
    if (!pendingNodePos || !localDiagramData || !localDiagramData.nodes) return;

    const newNodeId = `node_${Date.now()}`;
    const newNode = {
      id: newNodeId,
      label: nodeType.label,
      type: nodeType.id,
      details: '',
      x: pendingNodePos.x,
      y: pendingNodePos.y
    };

    const newDiagramData = { ...localDiagramData };
    newDiagramData.nodes = [...newDiagramData.nodes, newNode];

    saveToHistory(newDiagramData);
    setLocalDiagramData(newDiagramData);
    setSelectedNode(newNode);
    setShowNodeSelector(false);
    setPendingNodePos(null);

    updateMutation.mutate(saveDiagramData(newDiagramData));
  };

  const handleDeleteNode = () => {
    if (!selectedNode || currentFlowType !== 'network_map') return;
    if (!localDiagramData || !localDiagramData.nodes) return;

    const newDiagramData = { ...localDiagramData };
    newDiagramData.nodes = newDiagramData.nodes.filter(n => n.id !== selectedNode.id);
    newDiagramData.edges = (newDiagramData.edges || []).filter(
      e => e.from !== selectedNode.id && e.to !== selectedNode.id
    );

    saveToHistory(newDiagramData);
    setLocalDiagramData(newDiagramData);
    setSelectedNode(null);

    updateMutation.mutate(saveDiagramData(newDiagramData));
  };

  const handleDeleteEdge = () => {
    if (!selectedEdge || currentFlowType !== 'network_map') return;
    if (!localDiagramData || !localDiagramData.edges) return;

    const newDiagramData = { ...localDiagramData };
    newDiagramData.edges = newDiagramData.edges.filter(
      e => !(e.from === selectedEdge.from && e.to === selectedEdge.to)
    );

    saveToHistory(newDiagramData);
    setLocalDiagramData(newDiagramData);
    setSelectedEdge(null);

    updateMutation.mutate(saveDiagramData(newDiagramData));
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousState = JSON.parse(JSON.stringify(history[newIndex]));
      setLocalDiagramData(previousState);
      updateMutation.mutate(saveDiagramData(previousState));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextState = JSON.parse(JSON.stringify(history[newIndex]));
      setLocalDiagramData(nextState);
      updateMutation.mutate(saveDiagramData(nextState));
    }
  };

  const handleStartAddEdge = () => {
    if (!selectedNode || currentFlowType !== 'network_map') return;
    setEdgeFromNode(selectedNode.id);
    setAddEdgeMode(true);
  };

  const handleCompleteEdge = (targetNodeId, sourceNodeId = null) => {
    // Get source node ID - could be from addEdgeMode button, connector dot drag, or explicit param
    const finalSourceNodeId = sourceNodeId || edgeFromNode;
    
    // Validation: need a source node and target must be different
    if (!finalSourceNodeId || finalSourceNodeId === targetNodeId) {
      setAddEdgeMode(false);
      setEdgeFromNode(null);
      return;
    }

    if (!localDiagramData || !localDiagramData.edges) {
      setAddEdgeMode(false);
      setEdgeFromNode(null);
      return;
    }

    const newDiagramData = { ...localDiagramData };
    
    // Check if edge already exists (don't allow duplicate edges in same direction)
    const edgeExists = newDiagramData.edges.some(
      e => e.from === finalSourceNodeId && e.to === targetNodeId
    );

    if (!edgeExists) {
      newDiagramData.edges = [
        ...newDiagramData.edges,
        {
          from: finalSourceNodeId,
          to: targetNodeId,
          label: 'connection'
        }
      ];

      saveToHistory(newDiagramData);
      setLocalDiagramData(newDiagramData);
      updateMutation.mutate(saveDiagramData(newDiagramData));
    }

    setAddEdgeMode(false);
    setEdgeFromNode(null);
  };

  // Keyboard handler for Escape key - must be before early returns
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setAddNodeMode(false);
        setPendingNodePos(null);
        setShowNodeSelector(false);
      }
    };
    if (addNodeMode || showNodeSelector) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [addNodeMode, showNodeSelector]);

  // Detect if flow description is primarily Hebrew
  const isFlowDescriptionHebrew = React.useMemo(() => {
    if (!flow?.description) return false;
    const hebrewRegex = /[\u0590-\u05FF]/g;
    const hebrewMatches = flow.description.match(hebrewRegex) || [];
    const hebrewPercentage = (hebrewMatches.length / flow.description.length) * 100;
    return hebrewPercentage > 30; // More lenient threshold for prompt language detection
  }, [flow?.description]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          <span className="text-slate-400">Loading flow...</span>
        </div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Flow not found</h2>
          <Link to={createPageUrl('History')}>
            <Button className="bg-cyan-500 text-[#0a0e1a]">
              Back to History
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const TypeIcon = flowTypeConfig[currentFlowType]?.icon || Network;

  return (
    <div className="h-screen bg-[#0a0e1a] flex flex-col overflow-hidden">
      {/* Modern Top Navigation Bar */}
      <div className="flex-shrink-0 h-18 border-b border-slate-700/30 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-2xl flex items-center justify-between px-8 shadow-lg shadow-black/20">
        {/* Left Section - Navigation & Title */}
        <div className="flex items-center gap-6">
          <Link to={createPageUrl('History')}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-400 hover:text-white hover:bg-slate-700/50 gap-1 rounded-xl transition-all duration-200"
                title="Return to flow history"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="font-medium">Back</span>
              </Button>
            </motion.div>
          </Link>
          
          <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-600 to-transparent" />
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <h1 className="text-base font-bold text-white tracking-tight">{flow.name}</h1>
              {!isMultiFlow && (
                <Badge variant="outline" className={`${flowTypeConfig[currentFlowType]?.color} border-0 font-medium px-2.5 py-1`}>
                  <TypeIcon className="w-3.5 h-3.5 mr-1.5" />
                  {flowTypeConfig[currentFlowType]?.label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right Section - Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Incident Panel Toggle */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIncidentPanel(!showIncidentPanel)}
              className="border-slate-600/50 text-slate-300 bg-slate-800/30 hover:bg-slate-700/50 hover:text-white hover:border-slate-500 rounded-lg gap-2 transition-all duration-200"
              title="Toggle incident panel visibility"
            >
              <FileText className="w-4 h-4" />
              <span className="font-medium">{showIncidentPanel ? 'Hide' : 'Show'} Incident</span>
            </Button>
          </motion.div>

          {/* Timeline Sort Controls */}
          {currentFlowType === 'timeline' && (
            <>
              <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-600 to-transparent mx-1" />
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="sm"
                  onClick={() => setTimelineSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="border border-purple-500/40 text-purple-300 bg-purple-900/20 hover:bg-purple-500/30 hover:text-purple-200 hover:border-purple-400/60 rounded-lg gap-2 transition-all duration-200"
                  title={`Currently sorted ${timelineSortOrder === 'asc' ? 'oldest to newest' : 'newest to oldest'}. Click to reverse.`}
                  aria-label={`Sort order: ${timelineSortOrder === 'asc' ? 'Ascending' : 'Descending'}. Click to toggle.`}
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="text-xs font-medium">
                    {timelineSortOrder === 'asc' ? 'Oldest → Newest' : 'Newest → Oldest'}
                  </span>
                </Button>
              </motion.div>
            </>
          )}

          {/* Network Map Controls */}
          {currentFlowType === 'network_map' && !isEditMode && (
            <>
              <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-600 to-transparent mx-1" />
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="sm"
                  onClick={() => setAddNodeMode(!addNodeMode)}
                  className={`rounded-lg gap-2 transition-all duration-200 font-medium ${
                    addNodeMode
                      ? 'bg-cyan-500 text-slate-900 border-cyan-400 hover:bg-cyan-400 shadow-lg shadow-cyan-500/25'
                      : 'border border-cyan-500/40 text-cyan-300 bg-cyan-900/20 hover:bg-cyan-500/30 hover:text-cyan-200 hover:border-cyan-400/60'
                  }`}
                  title="Click on canvas to add a node"
                >
                  <Plus className="w-4 h-4" />
                  Add Node
                </Button>
              </motion.div>
              
              <div className="flex items-center gap-1.5 ml-1">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="sm"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className={`rounded-lg w-9 h-9 p-0 transition-all duration-200 ${
                      historyIndex > 0
                        ? 'border border-slate-600/50 text-slate-300 bg-slate-800/30 hover:bg-slate-700/50 hover:text-white hover:border-slate-500'
                        : 'opacity-40 cursor-not-allowed border border-slate-700/30 text-slate-600 bg-slate-800/20'
                    }`}
                    title="Undo last action"
                  >
                    <Undo className="w-4 h-4" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="sm"
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className={`rounded-lg w-9 h-9 p-0 transition-all duration-200 ${
                      historyIndex < history.length - 1
                        ? 'border border-slate-600/50 text-slate-300 bg-slate-800/30 hover:bg-slate-700/50 hover:text-white hover:border-slate-500'
                        : 'opacity-40 cursor-not-allowed border border-slate-700/30 text-slate-600 bg-slate-800/20'
                    }`}
                    title="Redo last undone action"
                  >
                    <Redo className="w-4 h-4" />
                  </Button>
                </motion.div>
              </div>
            </>
          )}

          {/* Edit Mode Actions */}
          {isEditMode ? (
            <>
              <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-600 to-transparent mx-1" />
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="border-slate-600/50 text-slate-300 bg-slate-800/30 hover:bg-slate-700/50 hover:text-white hover:border-slate-500 rounded-lg gap-2 transition-all duration-200"
                  title="Cancel editing"
                >
                  <X className="w-4 h-4" />
                  <span className="font-medium">Cancel</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="border border-purple-500/50 text-purple-300 bg-purple-900/30 hover:bg-purple-700/50 hover:text-purple-200 hover:border-purple-400 disabled:opacity-40 disabled:text-slate-500 disabled:border-slate-600/30 rounded-lg gap-2 transition-all duration-200"
                >
                  {isRegenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span className="font-medium">Regenerate</span>
                </Button>
              </motion.div>
            </>
          ) : (
            <>
              <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-600 to-transparent mx-1" />
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditMode(true)}
                  className="border-slate-600/50 text-slate-300 bg-slate-800/30 hover:bg-slate-700/50 hover:text-white hover:border-slate-500 rounded-lg gap-2 transition-all duration-200"
                  title="Edit flow description"
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="font-medium">Edit</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="border-slate-600/50 text-slate-300 bg-slate-800/30 hover:bg-slate-700/50 hover:text-white hover:border-slate-500 rounded-lg gap-2 transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  <span className="font-medium">Export</span>
                </Button>
              </motion.div>
            </>
          )}

          {/* Save Button - Primary Action */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isRegenerating}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-900 hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg gap-2 font-semibold shadow-lg shadow-cyan-500/25 transition-all duration-200 px-5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Flow Type Tabs - Only shown for multi-flow */}
      {isMultiFlow && (
        <div className="flex-shrink-0 border-b border-white/10 bg-[#12182b]/60 px-6">
          <Tabs value={activeFlowType} onValueChange={setActiveFlowType} className="w-full">
            <TabsList className="bg-transparent border-0 h-12">
              <TabsTrigger 
                value="network_map" 
                className="data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-400 rounded-none"
              >
                <Network className="w-4 h-4 mr-2" />
                Network Map
              </TabsTrigger>
              <TabsTrigger 
                value="timeline" 
                className="data-[state=active]:bg-purple-400/20 data-[state=active]:text-purple-400 data-[state=active]:border-b-2 data-[state=active]:border-purple-400 rounded-none"
              >
                <Clock className="w-4 h-4 mr-2" />
                Timeline
              </TabsTrigger>
              <TabsTrigger 
                value="mitre_attack" 
                className="data-[state=active]:bg-emerald-400/20 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 rounded-none"
              >
                <Target className="w-4 h-4 mr-2" />
                MITRE ATT&CK
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Incident Panel */}
        <AnimatePresence>
          {showIncidentPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 border-r border-white/10 bg-[#12182b]/60 overflow-hidden z-20 pointer-events-auto"
            >
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    Incident Description
                  </h3>
                  {isEditMode && (
                    <Badge variant="outline" className="bg-purple-400/10 text-purple-400 border-purple-400/30 text-xs">
                      Editing
                    </Badge>
                  )}
                </div>
                {isEditMode ? (
                  <div className="flex-1 p-4 flex flex-col min-h-0 overflow-hidden">
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className="flex-1 min-h-0 max-h-full bg-[#0a0e1a] border-white/10 text-white text-sm leading-relaxed resize-none font-mono focus:border-purple-400/50 focus:ring-purple-400/20 overflow-y-scroll"
                      placeholder="Edit incident description..."
                      dir="auto"
                    />
                    <div className="mt-3 flex-shrink-0 space-y-2">
                      <Button
                        onClick={handleRegenerate}
                        disabled={isRegenerating || editedDescription === flow.description}
                        className="w-full bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        size="sm"
                      >
                        {isRegenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Regenerate Diagram
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-slate-500 text-center">
                        {editedDescription.length} characters
                      </p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="flex-1 p-4">
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap" dir="auto">
                      {flow.description}
                    </p>
                  </ScrollArea>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Diagram Canvas */}
        <div 
          className="flex-1 relative z-0 pointer-events-auto" 
          ref={canvasRef}
          data-flow-type={currentFlowType}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={{ 
            cursor: addNodeMode ? 'crosshair' : isPanning ? 'grabbing' : 'default', 
            userSelect: 'none', 
            pointerEvents: 'auto', 
            overflow: (currentFlowType === 'mitre_attack' || currentFlowType === 'timeline') ? 'auto' : 'hidden',
            scrollBehavior: 'smooth',
            backgroundColor: '#0a0e1a',
            backgroundImage: isFullscreen ? 'none' : "linear-gradient(rgba(0,212,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.08) 1px, transparent 1px)",
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0'
          }}
        >
          {/* Canvas */}
          {currentFlowType === 'network_map' ? (
            // Network map needs zoom and pan transforms
            <div 
              ref={scrollRef} 
              className="absolute inset-0" 
              style={{ 
                userSelect: 'none',
                overflow: 'visible',
                transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                transition: isPanning ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              <div
                ref={innerWrapRef}
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top left',
                  transformBox: 'fill-box',
                  width: 'auto',
                  height: 'auto',
                  position: 'relative',
                  overflow: 'visible'
                }}
              >
                <DiagramCanvas
                    key={`diagram-${flowId}-${activeFlowType}-${diagramKey}`}
                    diagramData={displayDiagramData}
                    flowType={currentFlowType}
                    selectedNode={selectedNode}
                    onNodeSelect={setSelectedNode}
                    onNodeUpdate={handleNodeUpdate}
                    svgRef={svgRef}
                    zoomLevel={zoomLevel}
                    isPromptRTL={isFlowDescriptionHebrew}
                    addEdgeMode={addEdgeMode}
                    edgeFromNode={edgeFromNode}
                    onCompleteEdge={handleCompleteEdge}
                    editingEdgeLabel={editingEdgeLabel}
                    onEditEdgeLabel={handleStartEditEdgeLabel}
                    timelineSortOrder={timelineSortOrder}
                    selectedEdge={selectedEdge}
                    onEdgeSelect={setSelectedEdge}
                    onDeleteNode={handleDeleteNode}
                    onDeleteEdge={handleDeleteEdge}
                  />
              </div>
            </div>
          ) : (
            // Timeline and MITRE ATT&CK don't need transforms
            <div className="w-full h-full">
              <DiagramCanvas
                  key={`diagram-${flowId}-${activeFlowType}-${diagramKey}`}
                  diagramData={displayDiagramData}
                  flowType={currentFlowType}
                  selectedNode={selectedNode}
                  onNodeSelect={setSelectedNode}
                  onNodeUpdate={handleNodeUpdate}
                  svgRef={svgRef}
                  zoomLevel={zoomLevel}
                  isPromptRTL={isFlowDescriptionHebrew}
                  addEdgeMode={addEdgeMode}
                  edgeFromNode={edgeFromNode}
                  onCompleteEdge={handleCompleteEdge}
                  editingEdgeLabel={editingEdgeLabel}
                  onEditEdgeLabel={handleStartEditEdgeLabel}
                  timelineSortOrder={timelineSortOrder}
                  selectedEdge={selectedEdge}
                  onEdgeSelect={setSelectedEdge}
                  onDeleteNode={handleDeleteNode}
                  onDeleteEdge={handleDeleteEdge}
                />
            </div>
          )}

          {/* Canvas Controls - Hidden for mitre_attack and timeline */}
          {currentFlowType !== 'mitre_attack' && currentFlowType !== 'timeline' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-xl bg-[#12182b]/90 backdrop-blur-xl border border-white/10">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
              className="text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-50"
              title="Zoom out (Scroll wheel down)"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-400 px-2 min-w-[40px] text-center font-mono">{zoomLevel}%</span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
              className="text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-50"
              title="Zoom in (Scroll wheel up)"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-white/10" />
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white hover:bg-white/5"
              title="Drag canvas to pan • Scroll to zoom • Click to select"
            >
              <Info className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleFullscreen}
              className={`${isFullscreen ? 'text-cyan-400 bg-cyan-400/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
          )}

          {/* Keyboard Shortcuts Help - Hidden for mitre_attack and timeline */}
          {currentFlowType !== 'mitre_attack' && currentFlowType !== 'timeline' && (
          <div className="absolute bottom-20 right-6 rounded-xl bg-[#12182b]/90 backdrop-blur-xl border border-white/10 transition-all duration-300 group hover:p-4 p-2 max-w-xs">
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide group-hover:mb-3 transition-all">
              Shortcuts
            </h4>
            <div className="space-y-2 text-xs max-h-0 opacity-0 overflow-hidden group-hover:max-h-96 group-hover:opacity-100 group-hover:mt-3 transition-all duration-300">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Drag background</span>
                <span className="text-slate-300">Pan canvas</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Scroll wheel</span>
                <span className="text-slate-300">Zoom in/out</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Drag node edges</span>
                <span className="text-slate-300">Create connection</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Shift + Click node</span>
                <span className="text-slate-300">Start/end edge</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Double-click edge</span>
                <span className="text-slate-300">Edit label text</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Escape</span>
                <span className="text-slate-300">Cancel modes</span>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Node Details Panel */}
        <div className="w-80 flex-shrink-0 border-l border-white/10 bg-[#12182b]/60 z-10">
          <NodeDetails
            node={selectedNode}
            flowType={currentFlowType}
            onClose={() => setSelectedNode(null)}
            isEditMode={isEditMode}
            onNodeUpdate={handleNodeUpdate}
          />
        </div>
      </div>

      {/* Edge Label Editor Modal */}
      {editingEdgeLabel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#12182b] border border-white/10 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
          >
            <h2 className="text-xl font-bold text-white mb-4">Edit Connection Label</h2>
            <input
              type="text"
              value={edgeLabelText}
              onChange={(e) => setEdgeLabelText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUpdateEdgeLabel(editingEdgeLabel.from, editingEdgeLabel.to, edgeLabelText || 'connection');
                } else if (e.key === 'Escape') {
                  setEditingEdgeLabel(null);
                }
              }}
              autoFocus
              className="w-full bg-[#0a0e1a] border border-cyan-500/30 rounded px-3 py-2 text-white mb-4 focus:outline-none focus:border-cyan-400"
              placeholder="Enter connection label..."
            />
            <div className="flex gap-3">
              <Button
                className="flex-1 !bg-cyan-500 !text-[#0a0e1a] hover:!bg-cyan-400"
                onClick={() => {
                  handleUpdateEdgeLabel(editingEdgeLabel.from, editingEdgeLabel.to, edgeLabelText || 'connection');
                }}
              >
                Save
              </Button>
              <Button
                variant="outline"
                className="flex-1 !border-slate-500/30 !text-slate-400 hover:!bg-slate-400/10"
                onClick={() => setEditingEdgeLabel(null)}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Node Mode Indicator */}
      {addNodeMode && !showNodeSelector && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 px-4 py-3 rounded-lg backdrop-blur-sm text-center z-40"
        >
          <p className="text-sm font-semibold">Click on the canvas to add a node</p>
          <p className="text-xs text-cyan-300/70 mt-1">Press ESC to cancel</p>
        </motion.div>
      )}
      {showNodeSelector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#12182b] border border-white/10 rounded-xl p-6 max-w-2xl w-full mx-4 shadow-xl"
          >
            <h2 className="text-xl font-bold text-white mb-4">Select Node Type & Color</h2>
            <p className="text-sm text-slate-400 mb-6">Choose how you want to represent this node:</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {NODE_TYPES.map((nodeType) => (
                <button
                  key={nodeType.id}
                  onClick={() => handleCreateNodeWithType(nodeType)}
                  className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${nodeType.color} hover:shadow-lg`}
                >
                  <div className="text-sm font-semibold">{nodeType.label}</div>
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full border-slate-500/30 text-slate-400 hover:bg-slate-400/10"
              onClick={() => {
                setShowNodeSelector(false);
                setPendingNodePos(null);
              }}
            >
              Cancel
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}