import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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

  const handleRegenerate = async () => {
    if (!flow || !editedDescription) return;
    
    setIsRegenerating(true);
    try {
      // Generate new diagram with updated description using OpenAI
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
      diagram_data: flow.diagram_data,
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
    if (!canvasEl || flow?.flow_type === 'mitre_attack' || flow?.flow_type === 'timeline') return;

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
  }, [isPanning, addNodeMode, flow?.flow_type]);

  // Handle panning with click and drag on background
  const handleCanvasMouseDown = (e) => {
    if (addNodeMode && flow?.flow_type === 'network_map') {
      handleAddNode(e);
      return;
    }

    // Pan with left mouse button - check if clicking on empty space (not on SVG content)
    // ONLY allow panning for network_map, not for mitre_attack or timeline
    if (e.button === 0 && flow?.flow_type !== 'mitre_attack' && flow?.flow_type !== 'timeline') {
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

  const parsedDiagramData = flow?.diagram_data ? (
    typeof flow.diagram_data === 'string' ? JSON.parse(flow.diagram_data) : flow.diagram_data
  ) : null;

  // Use local diagram data if available, otherwise use parsed data
  const displayDiagramData = localDiagramData || parsedDiagramData;

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
    if (parsedDiagramData && history.length === 0) {
      setHistory([JSON.parse(JSON.stringify(parsedDiagramData))]);
      setHistoryIndex(0);
    }
  }, [parsedDiagramData]);

  // Update local diagram when flow changes
  React.useEffect(() => {
    if (parsedDiagramData) {
      setLocalDiagramData(parsedDiagramData);
    }
  }, [flow?.diagram_data]);

  const handleNodeUpdate = (updatedNode) => {
    if (!localDiagramData) return;

    const newDiagramData = { ...localDiagramData };

    // Update based on flow type
    if (flow.flow_type === 'network_map' && newDiagramData.nodes) {
      newDiagramData.nodes = newDiagramData.nodes.map(node =>
        node.id === updatedNode.id ? updatedNode : node
      );
    } else if (flow.flow_type === 'timeline' && newDiagramData.events) {
      newDiagramData.events = newDiagramData.events.map(event =>
        event.id === updatedNode.id ? updatedNode : event
      );
    } else if (flow.flow_type === 'mitre_attack' && newDiagramData.tactics) {
      newDiagramData.tactics = newDiagramData.tactics.map(tactic => ({
        ...tactic,
        techniques: tactic.techniques.map(technique =>
          technique.id === updatedNode.id ? { ...updatedNode, tacticName: tactic.name } : technique
        )
      }));
    }

    saveToHistory(newDiagramData);
    setLocalDiagramData(newDiagramData);
    setSelectedNode(updatedNode);

    // Save to database
    updateMutation.mutate({
      diagram_data: JSON.stringify(newDiagramData)
    });
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

    updateMutation.mutate({
      diagram_data: JSON.stringify(newDiagramData)
    });
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
    if (!addNodeMode || flow.flow_type !== 'network_map') return;
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

    updateMutation.mutate({
      diagram_data: JSON.stringify(newDiagramData)
    });
  };

  const handleDeleteNode = () => {
    if (!selectedNode || flow.flow_type !== 'network_map') return;
    if (!localDiagramData || !localDiagramData.nodes) return;

    const newDiagramData = { ...localDiagramData };
    newDiagramData.nodes = newDiagramData.nodes.filter(n => n.id !== selectedNode.id);
    newDiagramData.edges = (newDiagramData.edges || []).filter(
      e => e.from !== selectedNode.id && e.to !== selectedNode.id
    );

    saveToHistory(newDiagramData);
    setLocalDiagramData(newDiagramData);
    setSelectedNode(null);

    updateMutation.mutate({
      diagram_data: JSON.stringify(newDiagramData)
    });
  };

  const handleDeleteEdge = () => {
    if (!selectedEdge || flow.flow_type !== 'network_map') return;
    if (!localDiagramData || !localDiagramData.edges) return;

    const newDiagramData = { ...localDiagramData };
    newDiagramData.edges = newDiagramData.edges.filter(
      e => !(e.from === selectedEdge.from && e.to === selectedEdge.to)
    );

    saveToHistory(newDiagramData);
    setLocalDiagramData(newDiagramData);
    setSelectedEdge(null);

    updateMutation.mutate({
      diagram_data: JSON.stringify(newDiagramData)
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousState = JSON.parse(JSON.stringify(history[newIndex]));
      setLocalDiagramData(previousState);
      updateMutation.mutate({
        diagram_data: JSON.stringify(previousState)
      });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextState = JSON.parse(JSON.stringify(history[newIndex]));
      setLocalDiagramData(nextState);
      updateMutation.mutate({
        diagram_data: JSON.stringify(nextState)
      });
    }
  };

  const handleStartAddEdge = () => {
    if (!selectedNode || flow.flow_type !== 'network_map') return;
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
      updateMutation.mutate({
        diagram_data: JSON.stringify(newDiagramData)
      });
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

  const TypeIcon = flowTypeConfig[flow.flow_type]?.icon || Network;

  return (
    <div className="h-screen bg-[#0a0e1a] flex flex-col overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex-shrink-0 h-16 border-b border-white/10 bg-[#12182b]/80 backdrop-blur-xl flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('History')}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              title="Return to flow history"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          
          <div className="h-6 w-px bg-white/10" />
          
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-white">{flow.name}</h1>
            <Badge variant="outline" className={flowTypeConfig[flow.flow_type]?.color}>
              <TypeIcon className="w-3 h-3 mr-1.5" />
              {flowTypeConfig[flow.flow_type]?.label}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowIncidentPanel(!showIncidentPanel)}
            className="border-slate-600 text-slate-300 bg-slate-900/20 hover:bg-slate-700/40 hover:text-slate-100 hover:border-slate-500"
            title="Toggle incident panel visibility"
          >
            <FileText className="w-4 h-4 mr-2" />
            {showIncidentPanel ? 'Hide' : 'Show'} Incident
          </Button>

          {flow.flow_type === 'timeline' && (
            <>
              <div className="w-px h-6 bg-white/10" />
              <Button
                size="sm"
                onClick={() => setTimelineSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="border border-purple-500/30 text-purple-400 bg-transparent hover:bg-purple-500/20 hover:text-purple-300 hover:border-purple-500/50 active:bg-purple-500/30"
                title={`Sort timeline ${timelineSortOrder === 'asc' ? 'newest first' : 'oldest first'}`}
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                {timelineSortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
              </Button>
            </>
          )}

          {flow.flow_type === 'network_map' && !isEditMode && (
            <>
              <div className="w-px h-6 bg-white/10" />
              <Button
                size="sm"
                onClick={() => setAddNodeMode(!addNodeMode)}
                className={`transition-all ${
                  addNodeMode
                    ? 'bg-cyan-500 text-[#0a0e1a] border-cyan-500 hover:bg-cyan-400'
                    : 'border border-cyan-500/30 text-cyan-400 bg-transparent hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-500/50 active:bg-cyan-500/30'
                }`}
                title="Click on canvas to add a node"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Node
              </Button>
              <div className="w-px h-6 bg-white/10" />
              <Button
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className={`transition-all ${
                  historyIndex > 0
                    ? 'border border-slate-500/30 text-slate-300 bg-transparent hover:bg-slate-500/20 hover:text-white hover:border-slate-500/50'
                    : 'opacity-50 cursor-not-allowed border border-slate-500/30 text-slate-500'
                }`}
                title="Undo last action"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className={`transition-all ${
                  historyIndex < history.length - 1
                    ? 'border border-slate-500/30 text-slate-300 bg-transparent hover:bg-slate-500/20 hover:text-white hover:border-slate-500/50'
                    : 'opacity-50 cursor-not-allowed border border-slate-500/30 text-slate-500'
                }`}
                title="Redo last undone action"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </>
          )}

          {isEditMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                className="border-slate-600 text-slate-300 bg-slate-900/20 hover:bg-slate-700/50 hover:text-slate-100 hover:border-slate-500"
                title="Cancel editing"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="border-purple-500/50 text-purple-300 bg-purple-900/20 hover:bg-purple-700/40 hover:text-purple-200 hover:border-purple-400 disabled:opacity-50 disabled:text-slate-500 disabled:border-slate-500/30"
              >
                {isRegenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Regenerate
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="border-slate-600 text-slate-300 bg-slate-900/20 hover:bg-slate-700/50 hover:text-slate-100 hover:border-slate-500"
                title="Edit flow description"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="border-slate-600 text-slate-300 bg-slate-900/20 hover:bg-slate-700/50 hover:text-slate-100 hover:border-slate-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || isRegenerating}
            className="bg-cyan-500 text-[#0a0e1a] hover:bg-cyan-400"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saveSuccess ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

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
          data-flow-type={flow?.flow_type}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={{ 
            cursor: addNodeMode ? 'crosshair' : isPanning ? 'grabbing' : 'default', 
            userSelect: 'none', 
            pointerEvents: 'auto', 
            overflow: (flow?.flow_type === 'mitre_attack' || flow?.flow_type === 'timeline') ? 'auto' : 'hidden',
            scrollBehavior: 'smooth',
            backgroundColor: '#0a0e1a',
            backgroundImage: isFullscreen ? 'none' : "linear-gradient(rgba(0,212,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.08) 1px, transparent 1px)",
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0'
          }}
        >
          {/* Canvas */}
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
                  key={`diagram-${flowId}-${diagramKey}`}
                  diagramData={displayDiagramData}
                  flowType={flow.flow_type}
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

          {/* Canvas Controls - Hidden for mitre_attack and timeline */}
          {flow?.flow_type !== 'mitre_attack' && flow?.flow_type !== 'timeline' && (
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

          {/* Keyboard Shortcuts Help - Hidden for mitre_attack and timeline */}}
          {flow?.flow_type !== 'mitre_attack' && flow?.flow_type !== 'timeline' && (
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
            flowType={flow.flow_type}
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