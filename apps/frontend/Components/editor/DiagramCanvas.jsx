import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Server, Shield, Database, Globe, User, Target, Wifi, HardDrive, Lock, Trash2, HelpCircle } from 'lucide-react';
import TimelineEvent from './TimelineEvent';
import QuestionMarkNode from './QuestionMarkNode';

// Helper function to detect if text is primarily Hebrew
const isHebrewText = (text) => {
  if (!text) return false;
  const hebrewRegex = /[\u0590-\u05FF]/g;
  const hebrewMatches = text.match(hebrewRegex) || [];
  const hebrewPercentage = (hebrewMatches.length / text.length) * 100;
  // Consider it Hebrew text if more than 30% is Hebrew characters
  return hebrewPercentage > 30;
};

const nodeIcons = {
  endpoint: Monitor,
  workstation: Monitor,
  server: Server,
  domain_controller: Shield,
  database: Database,
  attacker: User,
  target: Target,
  firewall: Lock,
  external: Globe,
  network: Wifi,
  storage: HardDrive,
  question_mark: HelpCircle,
  investigation_step: Monitor
};

const nodeColors = {
  endpoint: { bg: 'bg-cyan-400/20', border: 'border-cyan-400', text: 'text-cyan-400' },
  workstation: { bg: 'bg-cyan-400/20', border: 'border-cyan-400', text: 'text-cyan-400' },
  server: { bg: 'bg-purple-400/20', border: 'border-purple-400', text: 'text-purple-400' },
  domain_controller: { bg: 'bg-emerald-400/20', border: 'border-emerald-400', text: 'text-emerald-400' },
  database: { bg: 'bg-amber-400/20', border: 'border-amber-400', text: 'text-amber-400' },
  attacker: { bg: 'bg-red-400/20', border: 'border-red-400', text: 'text-red-400' },
  target: { bg: 'bg-orange-400/20', border: 'border-orange-400', text: 'text-orange-400' },
  firewall: { bg: 'bg-slate-400/20', border: 'border-slate-400', text: 'text-slate-400' },
  external: { bg: 'bg-rose-400/20', border: 'border-rose-400', text: 'text-rose-400' },
  question_mark: { bg: 'bg-amber-400/20', border: 'border-amber-400', text: 'text-amber-400' },
  investigation_step: { bg: 'bg-blue-400/20', border: 'border-blue-400', text: 'text-blue-400' },
  network: { bg: 'bg-blue-400/20', border: 'border-blue-400', text: 'text-blue-400' },
  storage: { bg: 'bg-indigo-400/20', border: 'border-indigo-400', text: 'text-indigo-400' },
  text_block: { bg: 'bg-white/10', border: 'border-white/30', text: 'text-white' }
};

export default function DiagramCanvas({ 
  diagramData, 
  flowType, 
  selectedNode, 
  onNodeSelect, 
  onNodeUpdate,
  svgRef: externalSvgRef, 
  zoomLevel = 100, 
  isPromptRTL = false, 
  addEdgeMode = false, 
  edgeFromNode = null, 
  onCompleteEdge = null, 
  editingEdgeLabel = null, 
  onEditEdgeLabel = null, 
  timelineSortOrder = 'asc', 
  selectedEdge = null, 
  onEdgeSelect = null, 
  onDeleteNode = null, 
  onDeleteEdge = null 
}) {
  const [positions, setPositions] = useState({});
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragEdgeStart, setDragEdgeStart] = useState(null);
  const [dragEdgeEnd, setDragEdgeEnd] = useState(null);
  const [hoveredConnectorNode, setHoveredConnectorNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [resizingNode, setResizingNode] = useState(null);
  const [resizeDirection, setResizeDirection] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);
  const [resizeInitialSize, setResizeInitialSize] = useState(null);
  const [resizeInitialPos, setResizeInitialPos] = useState(null);
  const [nodeSizes, setNodeSizes] = useState({});
  const internalSvgRef = React.useRef(null);
  const svgRef = externalSvgRef || internalSvgRef;
  const [canvasSize, setCanvasSize] = useState({ width: 1600, height: 900 });

  useEffect(() => {
    if (diagramData && flowType === 'network_map' && diagramData.nodes) {
      setPositions(prev => {
        const nodes = diagramData.nodes;
        const edges = diagramData.edges || [];

        // Only calculate positions for new nodes, preserve existing ones
        const newPositions = { ...prev };
        const nodesWithoutPos = nodes.filter(n => !newPositions[n.id]);

        if (nodesWithoutPos.length === 0) {
          // All nodes already have positions, don't recalculate
          return prev;
        }

        if (nodesWithoutPos.length === nodes.length) {
          // First load, calculate all positions using hierarchical layout
          const incoming = {};
          const outgoing = {};
          nodes.forEach(n => { incoming[n.id] = []; outgoing[n.id] = []; });
          edges.forEach(e => {
            if (incoming[e.to]) incoming[e.to].push(e.from);
            if (outgoing[e.from]) outgoing[e.from].push(e.to);
          });

          const roots = [];
          nodes.forEach(n => {
            if (n.type === 'attacker') roots.push(n.id);
          });
          nodes.forEach(n => {
            if (incoming[n.id].length === 0 && !roots.includes(n.id)) roots.push(n.id);
          });

          const level = {};
          const visited = new Set();
          const queue = [];
          roots.forEach(r => { level[r] = 0; visited.add(r); queue.push(r); });

          while (queue.length) {
            const cur = queue.shift();
            const curLevel = level[cur];
            (outgoing[cur] || []).forEach(nei => {
              if (!visited.has(nei)) {
                level[nei] = curLevel + 1;
                visited.add(nei);
                queue.push(nei);
              } else {
                level[nei] = Math.min(level[nei], curLevel + 1);
              }
            });
          }

          let maxLevel = Object.values(level).length ? Math.max(...Object.values(level)) : 0;
          nodes.forEach(n => {
            if (!(n.id in level)) {
              maxLevel += 1;
              level[n.id] = maxLevel;
            }
          });

          const groups = {};
          Object.entries(level).forEach(([nodeId, lv]) => {
            groups[lv] = groups[lv] || [];
            groups[lv].push(nodeId);
          });

          const xStart = 400;
          const yStart = 300;
          const xSpacing = 600;
          const ySpacing = 300;

          const levels = Object.keys(groups).map(k => parseInt(k, 10)).sort((a,b) => a-b);
          levels.forEach(lv => {
            const colNodes = groups[lv];
            colNodes.sort((a,b) => ((outgoing[b].length + incoming[b].length) - (outgoing[a].length + incoming[a].length)));
            const colIndex = levels.indexOf(lv);
            const colX = xStart + colIndex * xSpacing;
            
            // Calculate vertical distribution with centering
            const numNodes = colNodes.length;
            const totalHeight = (numNodes - 1) * ySpacing;
            const centerY = yStart + 800; // Increased center point for better distribution
            const startY = centerY - totalHeight / 2;
            
            colNodes.forEach((nodeId, i) => {
              const colY = startY + i * ySpacing;
              newPositions[nodeId] = { x: colX, y: colY };
            });
          });

          // Apply collision detection based on bounding boxes
          const iterations = 25; // Number of separation iterations (increased)
          const DEFAULT_RADIUS = 48; // Account for outer glow/stroke

          const getNodeById = (id) => nodes.find(n => n.id === id);
          const getBounds = (id) => {
            const node = getNodeById(id);
            const pos = newPositions[id];
            if (!node || !pos) return { left: 0, right: 0, top: 0, bottom: 0 };
            if (node.type === 'text_block') {
              const size = nodeSizes[id] || { width: 200, height: 70 };
              const halfW = size.width / 2;
              const halfH = size.height / 2;
              const pad = 16; // margin around text block
              return {
                left: pos.x - halfW - pad,
                right: pos.x + halfW + pad,
                top: pos.y - halfH - pad,
                bottom: pos.y + halfH + pad
              };
            }
            // Circle bounds for regular nodes
            return {
              left: pos.x - DEFAULT_RADIUS,
              right: pos.x + DEFAULT_RADIUS,
              top: pos.y - DEFAULT_RADIUS,
              bottom: pos.y + DEFAULT_RADIUS
            };
          };

          for (let iter = 0; iter < iterations; iter++) {
            let changed = false;
            const nodeIds = Object.keys(newPositions);
            for (let i = 0; i < nodeIds.length; i++) {
              for (let j = i + 1; j < nodeIds.length; j++) {
                const id1 = nodeIds[i];
                const id2 = nodeIds[j];
                const b1 = getBounds(id1);
                const b2 = getBounds(id2);

                const overlapX = Math.max(0, Math.min(b1.right, b2.right) - Math.max(b1.left, b2.left));
                const overlapY = Math.max(0, Math.min(b1.bottom, b2.bottom) - Math.max(b1.top, b2.top));

                // If overlapping, push apart along the axis of greater overlap
                if (overlapX > 0 && overlapY > 0) {
                  const pos1 = newPositions[id1];
                  const pos2 = newPositions[id2];
                  const dx = pos2.x - pos1.x;
                  const dy = pos2.y - pos1.y;

                  // Resolve along axis of larger overlap to prevent jitter
                  if (overlapX > overlapY) {
                    const push = overlapX / 2 + 20; // add larger gap
                    const direction = dx >= 0 ? 1 : -1;
                    newPositions[id1] = { x: pos1.x - direction * push, y: pos1.y };
                    newPositions[id2] = { x: pos2.x + direction * push, y: pos2.y };
                    changed = true;
                  } else {
                    const push = overlapY / 2 + 20;
                    const direction = dy >= 0 ? 1 : -1;
                    newPositions[id1] = { x: pos1.x, y: pos1.y - direction * push };
                    newPositions[id2] = { x: pos2.x, y: pos2.y + direction * push };
                    changed = true;
                  }
                }
              }
            }
            if (!changed) break; // early exit when there are no overlaps
          }
        } else {
          // Add new nodes near first existing node
          const existingPos = Object.values(newPositions)[0];
          if (existingPos) {
            nodesWithoutPos.forEach((node, idx) => {
              newPositions[node.id] = {
                x: existingPos.x + (Math.random() - 0.5) * 150,
                y: existingPos.y + 150 + idx * 60
              };
            });
          }
        }
        return newPositions;
      });
    }
  }, [diagramData, flowType]);

  // compute canvas size from positions so SVG has proper width/height
  React.useEffect(() => {
    const vals = Object.values(positions || {});
    if (!vals.length) {
      // Default to large size even with no nodes
      setCanvasSize({ width: 5000, height: 4000 });
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    vals.forEach(p => {
      if (!p) return;
      minX = Math.min(minX, p.x - 200);
      minY = Math.min(minY, p.y - 200);
      maxX = Math.max(maxX, p.x + 200);
      maxY = Math.max(maxY, p.y + 200);
    });
    
    // Calculate size with generous padding
    const width = Math.max(5000, Math.ceil(maxX - minX + 800));
    const height = Math.max(4000, Math.ceil(maxY - minY + 800));
    
    setCanvasSize({ width, height });
  }, [positions]);

  const handleMouseDown = (nodeId, e) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if we're starting an edge drag (Shift + click)
    if (e.shiftKey) {
      const pos = positions[nodeId];
      if (pos) {
        setDragEdgeStart(nodeId);
        setDragEdgeEnd(pos);
      }
    } else {
      setDraggingNode(nodeId);
    }
  };

  const handleMouseMove = React.useCallback((e) => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scale = (zoomLevel || 100) / 100;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Handle edge drag visualization (priority)
    if (dragEdgeStart) {
      e.preventDefault();
      e.stopPropagation();
      setDragEdgeEnd({ x, y });
      return;
    }

    // Handle text block resizing
    if (resizingNode && resizeStart && resizeInitialSize && resizeInitialPos) {
      e.preventDefault();
      e.stopPropagation();
      const deltaX = x - resizeStart.x;
      const deltaY = y - resizeStart.y;
      
      let newWidth = resizeInitialSize.width;
      let newHeight = resizeInitialSize.height;
      let newPosX = resizeInitialPos.x;
      let newPosY = resizeInitialPos.y;
      
      // Calculate new size based on resize direction
      if (resizeDirection.includes('e')) {
        newWidth = Math.max(100, resizeInitialSize.width + deltaX);
      }
      if (resizeDirection.includes('w')) {
        newWidth = Math.max(100, resizeInitialSize.width - deltaX);
        if (newWidth > 100) {
          newPosX = resizeInitialPos.x + deltaX;
        }
      }
      if (resizeDirection.includes('s')) {
        newHeight = Math.max(50, resizeInitialSize.height + deltaY);
      }
      if (resizeDirection.includes('n')) {
        newHeight = Math.max(50, resizeInitialSize.height - deltaY);
        if (newHeight > 50) {
          newPosY = resizeInitialPos.y + deltaY;
        }
      }
      
      setNodeSizes(prev => ({
        ...prev,
        [resizingNode]: { width: newWidth, height: newHeight }
      }));
      
      setPositions(prev => ({
        ...prev,
        [resizingNode]: { x: newPosX, y: newPosY }
      }));
      return;
    }

    // Handle node dragging
    if (draggingNode) {
      e.preventDefault();
      e.stopPropagation();
      setCanvasSize(prevSize => {
        let newW = prevSize.width;
        let newH = prevSize.height;
        if (x + 220 > prevSize.width - 50) { newW = x + 270; }
        if (y + 160 > prevSize.height - 50) { newH = y + 210; }
        if (newW !== prevSize.width || newH !== prevSize.height) { return { width: newW, height: newH }; }
        return prevSize;
      });

      setPositions(prev => ({
        ...prev,
        [draggingNode]: { x, y }
      }));
    }
  }, [svgRef, zoomLevel, dragEdgeStart, draggingNode, resizingNode, resizeStart, resizeInitialSize, resizeInitialPos, resizeDirection]);

  const handleMouseUp = React.useCallback((e) => {
    if (resizingNode) {
      e.preventDefault();
      e.stopPropagation();
      setResizingNode(null);
      setResizeDirection(null);
      setResizeStart(null);
      setResizeInitialSize(null);
      setResizeInitialPos(null);
      return;
    }
    if (draggingNode) {
      e.preventDefault();
      e.stopPropagation();
      setDraggingNode(null);
    }
    // If we were dragging an edge, check if hovering over a node at this position
    if (dragEdgeStart) {
      e.preventDefault();
      e.stopPropagation();
      // Try to find which node the mouse is currently over
      if (svgRef.current && positions) {
        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const scale = (zoomLevel || 100) / 100;
        // Get mouse position in SVG coordinate space
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        
        // Check if mouse is over any node (radius ~35px, accounting for scale)
        const hitRadius = 40 / scale;
        for (const [nodeId, pos] of Object.entries(positions)) {
          if (nodeId !== dragEdgeStart) {
            const dx = x - pos.x;
            const dy = y - pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < hitRadius) {
              // Found a target node, complete the edge
              if (onCompleteEdge) {
                // Pass both source and target, or just target if callback only expects one param
                onCompleteEdge(nodeId, dragEdgeStart);
              }
              break;
            }
          }
        }
      }
      setDragEdgeStart(null);
      setDragEdgeEnd(null);
    }
  }, [svgRef, zoomLevel, dragEdgeStart, positions, onCompleteEdge]);

  const handleNodeMouseUp = (nodeId) => {
    // Don't do anything here - let the global mouseup handler deal with edge completion
    // This node-level handler is just to prevent propagation if needed
  };

  const handleEscapeKey = (e) => {
    if (e.key === 'Escape') {
      // Cancel any ongoing drag or edge creation
      setDraggingNode(null);
      setDragEdgeStart(null);
      setDragEdgeEnd(null);
    }
  };

  React.useEffect(() => {
    // Add global event listeners for any dragging or edge creation
    const addListeners = () => {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('keydown', handleEscapeKey);
    };

    const removeListeners = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleEscapeKey);
    };

    // Always keep listeners attached for responsiveness
    addListeners();
    return removeListeners;
  }, [handleMouseMove, handleMouseUp]);

  if (!diagramData) {
    
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        No diagram data available
      </div>
    );
  }

  // Network Map Visualization
  if (flowType === 'network_map' && diagramData.nodes) {
    return (
      <svg 
        ref={svgRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ minHeight: '600px', cursor: draggingNode ? 'grabbing' : 'grab', display: 'block', overflow: 'visible' }}
      >
        {/* SVG background removed - use page-level grid from FlowEditor to avoid pattern distortion when scaling */}

        {/* Edges */}
        {diagramData.edges?.map((edge, index) => {
          const fromPos = positions[edge.from];
          const toPos = positions[edge.to];
          if (!fromPos || !toPos) return null;

          const midX = (fromPos.x + toPos.x) / 2;
          const midY = (fromPos.y + toPos.y) / 2;

          const isEdgeSelected = selectedEdge?.from === edge.from && selectedEdge?.to === edge.to;

          return (
            <g 
              key={`edge-${edge.from}-${edge.to}`}
              onMouseEnter={() => setHoveredEdge(`${edge.from}-${edge.to}`)}
              onMouseLeave={() => setHoveredEdge(null)}
            >
              {/* Invisible thick line for easier hovering */}
              <line
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke="transparent"
                strokeWidth="20"
                style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEdgeSelect) {
                    onEdgeSelect({ from: edge.from, to: edge.to });
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onEdgeSelect) {
                    onEdgeSelect({ from: edge.from, to: edge.to });
                  }
                }}
              />
              {/* Visible thin line */}
              <line
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke={isEdgeSelected ? "rgba(0,212,255,0.8)" : "rgba(0,212,255,0.3)"}
                strokeWidth={isEdgeSelected ? "3" : "2"}
                strokeDasharray="5,5"
                style={{ cursor: 'pointer', pointerEvents: 'none' }}
              />
              {/* Animated dot on edge */}
              <circle r="4" fill="#00d4ff">
                <animateMotion
                  dur={`${2 + index * 0.5}s`}
                  repeatCount="indefinite"
                  path={`M${fromPos.x},${fromPos.y} L${toPos.x},${toPos.y}`}
                />
              </circle>
              {/* Edge label (wrapped + tooltip) - click to edit */}
              {edge.label && (
                <foreignObject
                  x={midX - 110}
                  y={midY - 32}
                  width="220"
                  height="64"
                  style={{ pointerEvents: 'auto' }}
                  onMouseEnter={() => setHoveredEdge(`${edge.from}-${edge.to}`)}
                  onMouseLeave={() => setHoveredEdge(null)}
                >
                  <div
                    title={edge.label}
                    dir={isHebrewText(edge.label) ? 'rtl' : 'ltr'}
                    style={{
                      width: '220px',
                      height: '64px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      backgroundColor: 'rgba(10, 14, 26, 0.95)',
                      border: '1.5px solid rgba(0, 212, 255, 0.4)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#cbd5e1',
                      overflow: 'visible',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      padding: '6px 30px 6px 10px',
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 4px 12px rgba(0, 212, 255, 0.1)',
                      unicodeBidi: 'plaintext',
                      textAlign: isHebrewText(edge.label) ? 'right' : 'center',
                      direction: isHebrewText(edge.label) ? 'rtl' : 'ltr',
                      userSelect: 'none',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEdgeSelect) {
                        onEdgeSelect({ from: edge.from, to: edge.to });
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (onEditEdgeLabel) {
                        onEditEdgeLabel({ from: edge.from, to: edge.to });
                      }
                    }}
                  >
                    <span>{edge.label}</span>
                    {/* Delete icon - appears on hover */}
                    {hoveredEdge === `${edge.from}-${edge.to}` && onDeleteEdge && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEdgeSelect) {
                            onEdgeSelect({ from: edge.from, to: edge.to });
                          }
                          setTimeout(() => {
                            if (onDeleteEdge) {
                              onDeleteEdge();
                            }
                          }, 0);
                        }}
                        title="Remove connection"
                        style={{
                          position: 'absolute',
                          right: '4px',
                          top: '4px',
                          width: '22px',
                          height: '22px',
                          background: 'rgba(30, 41, 59, 0.95)',
                          border: '1.5px solid rgba(239, 68, 68, 0.6)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          backdropFilter: 'blur(10px)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                          zIndex: 1000
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 1)';
                          e.currentTarget.style.transform = 'scale(1.08)';
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.6)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(30, 41, 59, 0.95)';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)';
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.5)';
                        }}
                      >
                        <Trash2 style={{ width: '12px', height: '12px', color: '#ef4444', strokeWidth: 2.5 }} />
                      </button>
                    )}
                  </div>
                </foreignObject>
              )}

            </g>
          );
        })}

        {/* Dragging edge preview */}
        {dragEdgeStart && dragEdgeEnd && (
          <line
            x1={positions[dragEdgeStart]?.x || 0}
            y1={positions[dragEdgeStart]?.y || 0}
            x2={dragEdgeEnd.x}
            y2={dragEdgeEnd.y}
            stroke="#00d4ff"
            strokeWidth="3"
            opacity="0.8"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Nodes */}
        {diagramData.nodes?.map((node) => {
          const pos = positions[node.id];
          if (!pos) return null;

          const colors = nodeColors[node.type] || nodeColors.endpoint;
          const Icon = nodeIcons[node.type] || Monitor;
          const isSelected = selectedNode?.id === node.id;
          const isTextBlock = node.type === 'text_block';
          const isQuestionMark = node.type === 'question_mark' || node.confidence_level === 'requires_investigation';

          // Question mark node rendering using QuestionMarkNode component
          if (isQuestionMark) {
            return (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ cursor: draggingNode === node.id ? 'grabbing' : 'grab' }}
                onMouseDown={(e) => handleMouseDown(node.id, e)}
                onClick={() => {
                  if (addEdgeMode && edgeFromNode && edgeFromNode !== node.id && onCompleteEdge) {
                    onCompleteEdge(node.id, edgeFromNode);
                  } else if (!addEdgeMode && !dragEdgeStart) {
                    onNodeSelect(node);
                  }
                }}
              >
                {/* Large invisible background circle for size */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="100"
                  fill="rgba(251, 191, 36, 0.05)"
                  stroke="none"
                />

                {/* Selection ring */}
                {isSelected && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="105"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="3"
                    strokeDasharray="8 4"
                    style={{ pointerEvents: 'none' }}
                  >
                    <animate
                      attributeName="r"
                      values="105;110;105"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                <foreignObject
                  x={pos.x - 90}
                  y={pos.y - 40}
                  width="180"
                  height="80"
                  style={{ overflow: 'visible', pointerEvents: 'none' }}
                >
                  <QuestionMarkNode
                    node={node}
                    isSelected={isSelected}
                    onSelect={() => {}}
                    onEdit={onNodeUpdate}
                  />
                </foreignObject>

                {/* Edge connector dots */}
                <circle
                  cx={pos.x + 140}
                  cy={pos.y}
                  r="5"
                  fill="#fbbf24"
                  opacity={hoveredConnectorNode === `${node.id}-right` || dragEdgeStart === node.id ? '0.8' : '0'}
                  style={{ cursor: 'crosshair', transition: 'opacity 0.2s', pointerEvents: 'auto' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragEdgeStart(node.id);
                    setDragEdgeEnd(pos);
                  }}
                  onMouseEnter={() => setHoveredConnectorNode(`${node.id}-right`)}
                  onMouseLeave={() => {
                    if (dragEdgeStart !== node.id) {
                      setHoveredConnectorNode(null);
                    }
                  }}
                />
                <circle
                  cx={pos.x - 140}
                  cy={pos.y}
                  r="5"
                  fill="#fbbf24"
                  opacity={hoveredConnectorNode === `${node.id}-left` || dragEdgeStart === node.id ? '0.8' : '0'}
                  style={{ cursor: 'crosshair', transition: 'opacity 0.2s', pointerEvents: 'auto' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragEdgeStart(node.id);
                    setDragEdgeEnd(pos);
                  }}
                  onMouseEnter={() => setHoveredConnectorNode(`${node.id}-left`)}
                  onMouseLeave={() => {
                    if (dragEdgeStart !== node.id) {
                      setHoveredConnectorNode(null);
                    }
                  }}
                />
              </motion.g>
            );
          }

          // Text block rendering
          if (isTextBlock) {
            const size = nodeSizes[node.id] || { width: 200, height: 70 };
            const halfW = size.width / 2;
            const halfH = size.height / 2;
            
            return (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ cursor: resizingNode === node.id ? 'nwse-resize' : draggingNode === node.id ? 'grabbing' : 'grab', pointerEvents: 'all' }}
                onMouseDown={(e) => {
                  // Check if clicking on resize handle
                  if (e.target.classList?.contains('resize-handle') || e.target.closest('.resize-handle')) {
                    return;
                  }
                  handleMouseDown(node.id, e);
                }}
                onMouseDownCapture={(e) => {
                  // Capture phase: start dragging unless on a resize or connector control
                  const target = e.target;
                  if (target.classList?.contains('resize-handle') || target.closest?.('.resize-handle')) {
                    return;
                  }
                  if (target.classList?.contains('edge-connector')) {
                    return;
                  }
                  // Only start drag if not already resizing
                  if (!resizingNode) {
                    handleMouseDown(node.id, e);
                  }
                }}
                onPointerDown={(e) => {
                  // Support touch/pen pointer events
                  const target = e.target;
                  if (target.classList?.contains('resize-handle') || target.closest?.('.resize-handle')) {
                    return;
                  }
                  if (target.classList?.contains('edge-connector')) {
                    return;
                  }
                  if (!resizingNode) {
                    handleMouseDown(node.id, e);
                  }
                }}
                onClick={() => {
                  if (addEdgeMode && edgeFromNode && edgeFromNode !== node.id && onCompleteEdge) {
                    onCompleteEdge(node.id, edgeFromNode);
                  } else if (!addEdgeMode && !dragEdgeStart && !resizingNode) {
                    onNodeSelect(node);
                  }
                }}
              >
                {/* Background rect with better visual design */}
                <rect
                  x={pos.x - halfW}
                  y={pos.y - halfH}
                  width={size.width}
                  height={size.height}
                  fill="rgba(100,149,237,0.08)"
                  stroke="rgba(100,149,237,0.4)"
                  strokeWidth="2"
                  rx="10"
                  style={{ 
                    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
                    backdropFilter: 'blur(8px)',
                    cursor: draggingNode === node.id ? 'grabbing' : 'grab',
                    pointerEvents: 'auto'
                  }}
                />
                
                {/* Selection ring for text block */}
                {isSelected && (
                  <rect
                    x={pos.x - halfW - 8}
                    y={pos.y - halfH - 8}
                    width={size.width + 16}
                    height={size.height + 16}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="3"
                    rx="12"
                    style={{ pointerEvents: 'none' }}
                  >
                    <animate
                      attributeName="stroke-opacity"
                      values="0.5;1;0.5"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </rect>
                )}
                
                {/* Edge connector dots */}
                <circle
                  cx={pos.x + halfW}
                  cy={pos.y}
                  r="5"
                  fill="#00d4ff"
                  opacity={hoveredConnectorNode === `${node.id}-right` || dragEdgeStart === node.id ? '0.8' : '0'}
                  className="edge-connector"
                  style={{ cursor: 'crosshair', transition: 'opacity 0.2s', pointerEvents: 'auto' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragEdgeStart(node.id);
                    setDragEdgeEnd(pos);
                  }}
                  onMouseEnter={() => setHoveredConnectorNode(`${node.id}-right`)}
                  onMouseLeave={() => dragEdgeStart !== node.id && setHoveredConnectorNode(null)}
                />
                <circle
                  cx={pos.x - halfW}
                  cy={pos.y}
                  r="5"
                  fill="#00d4ff"
                  opacity={hoveredConnectorNode === `${node.id}-left` || dragEdgeStart === node.id ? '0.8' : '0'}
                  className="edge-connector"
                  style={{ cursor: 'crosshair', transition: 'opacity 0.2s', pointerEvents: 'auto' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragEdgeStart(node.id);
                    setDragEdgeEnd(pos);
                  }}
                  onMouseEnter={() => setHoveredConnectorNode(`${node.id}-left`)}
                  onMouseLeave={() => dragEdgeStart !== node.id && setHoveredConnectorNode(null)}
                />
                <circle
                  cx={pos.x}
                  cy={pos.y + halfH}
                  r="5"
                  fill="#00d4ff"
                  opacity={hoveredConnectorNode === `${node.id}-bottom` || dragEdgeStart === node.id ? '0.8' : '0'}
                  className="edge-connector"
                  style={{ cursor: 'crosshair', transition: 'opacity 0.2s', pointerEvents: 'auto' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragEdgeStart(node.id);
                    setDragEdgeEnd(pos);
                  }}
                  onMouseEnter={() => setHoveredConnectorNode(`${node.id}-bottom`)}
                  onMouseLeave={() => dragEdgeStart !== node.id && setHoveredConnectorNode(null)}
                />
                <circle
                  cx={pos.x}
                  cy={pos.y - halfH}
                  r="5"
                  fill="#00d4ff"
                  opacity={hoveredConnectorNode === `${node.id}-top` || dragEdgeStart === node.id ? '0.8' : '0'}
                  className="edge-connector"
                  style={{ cursor: 'crosshair', transition: 'opacity 0.2s', pointerEvents: 'auto' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragEdgeStart(node.id);
                    setDragEdgeEnd(pos);
                  }}
                  onMouseEnter={() => setHoveredConnectorNode(`${node.id}-top`)}
                  onMouseLeave={() => dragEdgeStart !== node.id && setHoveredConnectorNode(null)}
                />
                
                {/* Text content */}
                <foreignObject
                  x={pos.x - halfW + 5}
                  y={pos.y - halfH + 5}
                  width={size.width - 10}
                  height={size.height - 10}
                  style={{ pointerEvents: 'none' }}
                >
                  <div 
                    className="flex items-center justify-center h-full text-white text-sm font-medium text-center px-2"
                    style={{
                      direction: isHebrewText(node.name || node.label) ? 'rtl' : 'ltr',
                      lineHeight: '1.3',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}
                  >
                    {node.name || node.label || 'Text Block'}
                  </div>
                </foreignObject>
                
                {/* Resize handles (8 directions) */}
                {isSelected && (
                  <>
                    {/* Corner handles */}
                    <g
                      className="resize-handle"
                      style={{ cursor: 'nwse-resize' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const svg = svgRef.current;
                        const rect = svg.getBoundingClientRect();
                        const scale = (zoomLevel || 100) / 100;
                        const x = (e.clientX - rect.left) / scale;
                        const y = (e.clientY - rect.top) / scale;
                        const currentSize = nodeSizes[node.id] || { width: 200, height: 70 };
                        setResizingNode(node.id);
                        setResizeDirection('se');
                        setResizeStart({ x, y });
                        setResizeInitialSize(currentSize);
                        setResizeInitialPos({ x: pos.x, y: pos.y });
                      }}
                    >
                      <circle
                        cx={pos.x + halfW}
                        cy={pos.y + halfH}
                        r="10"
                        fill="#00d4ff"
                        opacity="0.9"
                      />
                    </g>
                    <g
                      className="resize-handle"
                      style={{ cursor: 'nesw-resize' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const svg = svgRef.current;
                        const rect = svg.getBoundingClientRect();
                        const scale = (zoomLevel || 100) / 100;
                        const x = (e.clientX - rect.left) / scale;
                        const y = (e.clientY - rect.top) / scale;
                        const currentSize = nodeSizes[node.id] || { width: 200, height: 70 };
                        setResizingNode(node.id);
                        setResizeDirection('sw');
                        setResizeStart({ x, y });
                        setResizeInitialSize(currentSize);
                        setResizeInitialPos({ x: pos.x, y: pos.y });
                      }}
                    >
                      <circle
                        cx={pos.x - halfW}
                        cy={pos.y + halfH}
                        r="10"
                        fill="#00d4ff"
                        opacity="0.9"
                      />
                    </g>
                    <g
                      className="resize-handle"
                      style={{ cursor: 'nwse-resize' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const svg = svgRef.current;
                        const rect = svg.getBoundingClientRect();
                        const scale = (zoomLevel || 100) / 100;
                        const x = (e.clientX - rect.left) / scale;
                        const y = (e.clientY - rect.top) / scale;
                        const currentSize = nodeSizes[node.id] || { width: 200, height: 70 };
                        setResizingNode(node.id);
                        setResizeDirection('nw');
                        setResizeStart({ x, y });
                        setResizeInitialSize(currentSize);
                        setResizeInitialPos({ x: pos.x, y: pos.y });
                      }}
                    >
                      <circle
                        cx={pos.x - halfW}
                        cy={pos.y - halfH}
                        r="10"
                        fill="#00d4ff"
                        opacity="0.9"
                      />
                    </g>
                    <g
                      className="resize-handle"
                      style={{ cursor: 'nesw-resize' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const svg = svgRef.current;
                        const rect = svg.getBoundingClientRect();
                        const scale = (zoomLevel || 100) / 100;
                        const x = (e.clientX - rect.left) / scale;
                        const y = (e.clientY - rect.top) / scale;
                        const currentSize = nodeSizes[node.id] || { width: 200, height: 70 };
                        setResizingNode(node.id);
                        setResizeDirection('ne');
                        setResizeStart({ x, y });
                        setResizeInitialSize(currentSize);
                        setResizeInitialPos({ x: pos.x, y: pos.y });
                      }}
                    >
                      <circle
                        cx={pos.x + halfW}
                        cy={pos.y - halfH}
                        r="10"
                        fill="#00d4ff"
                        opacity="0.9"
                      />
                    </g>
                    
                    {/* Edge handles */}
                    <g
                      className="resize-handle"
                      style={{ cursor: 'ew-resize' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const svg = svgRef.current;
                        const rect = svg.getBoundingClientRect();
                        const scale = (zoomLevel || 100) / 100;
                        const x = (e.clientX - rect.left) / scale;
                        const y = (e.clientY - rect.top) / scale;
                        const currentSize = nodeSizes[node.id] || { width: 200, height: 70 };
                        setResizingNode(node.id);
                        setResizeDirection('e');
                        setResizeStart({ x, y });
                        setResizeInitialSize(currentSize);
                        setResizeInitialPos({ x: pos.x, y: pos.y });
                      }}
                    >
                      <rect
                        x={pos.x + halfW - 3}
                        y={pos.y - 15}
                        width="6"
                        height="30"
                        fill="#00d4ff"
                        opacity="0.8"
                        rx="3"
                      />
                    </g>
                    <g
                      className="resize-handle"
                      style={{ cursor: 'ew-resize' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const svg = svgRef.current;
                        const rect = svg.getBoundingClientRect();
                        const scale = (zoomLevel || 100) / 100;
                        const x = (e.clientX - rect.left) / scale;
                        const y = (e.clientY - rect.top) / scale;
                        const currentSize = nodeSizes[node.id] || { width: 200, height: 70 };
                        setResizingNode(node.id);
                        setResizeDirection('w');
                        setResizeStart({ x, y });
                        setResizeInitialSize(currentSize);
                        setResizeInitialPos({ x: pos.x, y: pos.y });
                      }}
                    >
                      <rect
                        x={pos.x - halfW - 3}
                        y={pos.y - 15}
                        width="6"
                        height="30"
                        fill="#00d4ff"
                        opacity="0.8"
                        rx="3"
                      />
                    </g>
                    <g
                      className="resize-handle"
                      style={{ cursor: 'ns-resize' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const svg = svgRef.current;
                        const rect = svg.getBoundingClientRect();
                        const scale = (zoomLevel || 100) / 100;
                        const x = (e.clientX - rect.left) / scale;
                        const y = (e.clientY - rect.top) / scale;
                        const currentSize = nodeSizes[node.id] || { width: 200, height: 70 };
                        setResizingNode(node.id);
                        setResizeDirection('s');
                        setResizeStart({ x, y });
                        setResizeInitialSize(currentSize);
                        setResizeInitialPos({ x: pos.x, y: pos.y });
                      }}
                    >
                      <rect
                        x={pos.x - 15}
                        y={pos.y + halfH - 3}
                        width="30"
                        height="6"
                        fill="#00d4ff"
                        opacity="0.8"
                        rx="3"
                      />
                    </g>
                    <g
                      className="resize-handle"
                      style={{ cursor: 'ns-resize' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const svg = svgRef.current;
                        const rect = svg.getBoundingClientRect();
                        const scale = (zoomLevel || 100) / 100;
                        const x = (e.clientX - rect.left) / scale;
                        const y = (e.clientY - rect.top) / scale;
                        const currentSize = nodeSizes[node.id] || { width: 200, height: 70 };
                        setResizingNode(node.id);
                        setResizeDirection('n');
                        setResizeStart({ x, y });
                        setResizeInitialSize(currentSize);
                        setResizeInitialPos({ x: pos.x, y: pos.y });
                      }}
                    >
                      <rect
                        x={pos.x - 15}
                        y={pos.y - halfH - 3}
                        width="30"
                        height="6"
                        fill="#00d4ff"
                        opacity="0.8"
                        rx="3"
                      />
                    </g>
                  </>
                )}
                
                {/* Delete button for text blocks */}
                {isSelected && onDeleteNode && (
                  <g
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNode(node.id);
                    }}
                  >
                    <circle cx={pos.x + halfW} cy={pos.y - halfH} r="12" fill="#f87171" />
                    <foreignObject x={pos.x + halfW - 6} y={pos.y - halfH - 6} width="12" height="12">
                      <Trash2 className="w-3 h-3 text-white" />
                    </foreignObject>
                  </g>
                )}
                
                {/* Dragging capture overlay - MUST be last to capture all events */}
                {!isSelected && (
                  <rect
                    x={pos.x - halfW}
                    y={pos.y - halfH}
                    width={size.width}
                    height={size.height}
                    fill="transparent"
                    style={{ 
                      cursor: draggingNode === node.id ? 'grabbing' : 'grab',
                      pointerEvents: 'all'
                    }}
                    onMouseDown={(e) => {
                      // Delegate to the shared handler to start dragging
                      handleMouseDown(node.id, e);
                    }}
                  />
                )}
              </motion.g>
            );
          }

          return (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ cursor: dragEdgeStart ? 'grabbing' : 'grab' }}
              onMouseDown={(e) => handleMouseDown(node.id, e)}
              onClick={() => {
                // Check if we're in edge creation mode but DON'T allow edge to self
                if (addEdgeMode && edgeFromNode && edgeFromNode !== node.id && onCompleteEdge) {
                  onCompleteEdge(node.id, edgeFromNode);
                } else if (!addEdgeMode && !dragEdgeStart) {
                  // Only select node if not in any dragging mode
                  onNodeSelect(node);
                }
              }}
            >
              {/* Selection ring */}
              {isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="48"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="3"
                  style={{ pointerEvents: 'none' }}
                >
                  <animate
                    attributeName="r"
                    values="48;52;48"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              
              {/* Outer glow */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="38"
                fill="none"
                stroke={node.type === 'attacker' ? '#ef4444' : 
                        node.type === 'target' ? '#f59e0b' :
                        node.type === 'server' ? '#8b5cf6' :
                        node.type === 'domain_controller' ? '#10b981' :
                        '#06b6d4'}
                strokeWidth="8"
                opacity="0.2"
                style={{ pointerEvents: 'none' }}
              />
              
              {/* Node background */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="35"
                className={colors.bg}
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{ 
                  fill: node.type === 'attacker' ? 'rgba(239,68,68,0.25)' : 
                        node.type === 'target' ? 'rgba(245,158,11,0.25)' :
                        node.type === 'server' ? 'rgba(139,92,246,0.25)' :
                        node.type === 'domain_controller' ? 'rgba(16,185,129,0.25)' :
                        'rgba(6,182,212,0.25)',
                  stroke: node.type === 'attacker' ? '#ef4444' : 
                          node.type === 'target' ? '#f59e0b' :
                          node.type === 'server' ? '#8b5cf6' :
                          node.type === 'domain_controller' ? '#10b981' :
                          '#06b6d4',
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))'
                }}
              />

              {/* Edge connector dots for draw.io style edges */}
              <circle
                cx={pos.x + 40}
                cy={pos.y}
                r="6"
                fill="#60a5fa"
                opacity={hoveredConnectorNode === `${node.id}-right` || dragEdgeStart === node.id ? '1' : '0'}
                style={{ cursor: 'crosshair', transition: 'all 0.2s', pointerEvents: 'auto', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragEdgeStart(node.id);
                  setDragEdgeEnd(pos);
                }}
                onMouseEnter={() => {
                  setHoveredConnectorNode(`${node.id}-right`);
                }}
                onMouseLeave={() => {
                  if (dragEdgeStart !== node.id) {
                    setHoveredConnectorNode(null);
                  }
                }}
              />
              <circle
                cx={pos.x - 40}
                cy={pos.y}
                r="5"
                fill="#00d4ff"
                opacity={hoveredConnectorNode === `${node.id}-left` || dragEdgeStart === node.id ? '0.8' : '0'}
                style={{ cursor: 'crosshair', transition: 'opacity 0.2s', pointerEvents: 'auto' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragEdgeStart(node.id);
                  setDragEdgeEnd(pos);
                }}
                onMouseEnter={() => {
                  setHoveredConnectorNode(`${node.id}-left`);
                }}
                onMouseLeave={() => {
                  if (dragEdgeStart !== node.id) {
                    setHoveredConnectorNode(null);
                  }
                }}
              />
              
              {/* Icon */}
              <foreignObject x={pos.x - 12} y={pos.y - 12} width="24" height="24">
                <Icon 
                  className="w-6 h-6"
                  style={{ 
                    color: node.type === 'attacker' ? '#f87171' : 
                           node.type === 'target' ? '#fb923c' :
                           node.type === 'server' ? '#a78bfa' :
                           node.type === 'domain_controller' ? '#34d399' :
                           '#22d3ee'
                  }}
                />
              </foreignObject>

              {/* Label */}
              <foreignObject
                x={pos.x - 100}
                y={pos.y + 40}
                width="200"
                height="56"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div
                  title={node.label}
                  dir={isHebrewText(node.label) ? 'rtl' : 'ltr'}
                  style={{
                    width: '200px',
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    backgroundColor: 'rgba(10, 14, 26, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'white',
                    overflow: 'visible',
                    textOverflow: 'clip',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    padding: isHebrewText(node.label) ? '6px 30px 6px 8px' : '6px 30px 6px 8px',
                    lineHeight: '1.1',
                    unicodeBidi: 'plaintext',
                    textAlign: isHebrewText(node.label) ? 'right' : 'left',
                    direction: isHebrewText(node.label) ? 'rtl' : 'ltr'
                  }}
                >
                  <span>{node.label}</span>
                  {/* Delete icon - appears on hover */}
                  {hoveredNode === node.id && onDeleteNode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteNode && onNodeSelect) {
                          onNodeSelect(node);
                          setTimeout(() => onDeleteNode(), 0);
                        }
                      }}
                      title="Remove node"
                      style={{
                        position: 'absolute',
                        right: '4px',
                        top: '4px',
                        width: '22px',
                        height: '22px',
                        background: 'rgba(30, 41, 59, 0.95)',
                        border: '1.5px solid rgba(239, 68, 68, 0.6)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                        zIndex: 1000
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 1)';
                        e.currentTarget.style.transform = 'scale(1.08)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.6)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(30, 41, 59, 0.95)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)';
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.5)';
                      }}
                    >
                      <Trash2 style={{ width: '12px', height: '12px', color: '#ef4444', strokeWidth: 2.5 }} />
                    </button>
                  )}
                </div>
              </foreignObject>
            </motion.g>
          );
        })}
      </svg>
    );
  }

  // Timeline Visualization with Drag and Drop
  if (flowType === 'timeline' && diagramData.events) {
    // Sort events based on timelineSortOrder
    const [timelineEvents, setTimelineEvents] = useState([]);

    useEffect(() => {
      const sortedEvents = [...diagramData.events].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timelineSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      });
      setTimelineEvents(sortedEvents);
    }, [diagramData.events, timelineSortOrder]);

    const handleEventMove = (fromIndex, direction) => {
      const newEvents = [...timelineEvents];
      const toIndex = direction === 'down' ? fromIndex + 1 : fromIndex - 1;
      
      if (toIndex >= 0 && toIndex < newEvents.length) {
        [newEvents[fromIndex], newEvents[toIndex]] = [newEvents[toIndex], newEvents[fromIndex]];
        setTimelineEvents(newEvents);
        
        // Update the parent with new order
        if (onNodeUpdate) {
          onNodeUpdate({ events: newEvents });
        }
      }
    };

    const handleEventUpdate = (updatedEvent) => {
      const newEvents = timelineEvents.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      );
      setTimelineEvents(newEvents);
      
      if (onNodeUpdate) {
        onNodeUpdate(updatedEvent);
      }
    };

    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="relative">
          {/* Enhanced Timeline Header */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Attack Timeline</h2>
            <p className="text-slate-400 text-sm">Drag events to reorder • Click timestamps to edit</p>
          </div>

          {/* Timeline Events */}
          <div className="space-y-6">
            {timelineEvents.map((event, index) => (
              <TimelineEvent
                key={event.id}
                event={event}
                index={index}
                isSelected={selectedNode?.id === event.id}
                onSelect={onNodeSelect}
                onUpdate={handleEventUpdate}
                onMove={handleEventMove}
              />
            ))}
          </div>

          {/* Timeline completion indicator */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-xl border border-white/10">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm text-slate-400">Timeline Complete</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MITRE ATT&CK Visualization
  if (flowType === 'mitre_attack' && diagramData.tactics) {
    const tacticColors = {
      bg: [
        'bg-red-500/20', 'bg-orange-500/20', 'bg-amber-500/20', 'bg-yellow-500/20',
        'bg-lime-500/20', 'bg-green-500/20', 'bg-cyan-500/20', 'bg-blue-500/20',
        'bg-indigo-500/20', 'bg-purple-500/20', 'bg-pink-500/20', 'bg-rose-500/20'
      ],
      border: [
        'border-red-500', 'border-orange-500', 'border-amber-500', 'border-yellow-500',
        'border-lime-500', 'border-green-500', 'border-cyan-500', 'border-blue-500',
        'border-indigo-500', 'border-purple-500', 'border-pink-500', 'border-rose-500'
      ],
      text: [
        'text-red-400', 'text-orange-400', 'text-amber-400', 'text-yellow-400',
        'text-lime-400', 'text-green-400', 'text-cyan-400', 'text-blue-400',
        'text-indigo-400', 'text-purple-400', 'text-pink-400', 'text-rose-400'
      ]
    };

    return (
      <div className="p-8 h-full overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">MITRE ATT&CK Framework</h2>
          <p className="text-slate-400 text-sm">Tactics and techniques identified in this attack</p>
        </div>

        <div className="grid grid-cols-1 overflow-x-hidden lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {diagramData.tactics.map((tactic, tacticIndex) => {
            const bgColor = tacticColors.bg[tacticIndex % tacticColors.bg.length];
            const borderColor = tacticColors.border[tacticIndex % tacticColors.border.length];
            const textColor = tacticColors.text[tacticIndex % tacticColors.text.length];

            return (
              <motion.div
                key={tactic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: tacticIndex * 0.08 }}
                className={`rounded-xl border-2 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-current ${bgColor} ${borderColor}`}
                dir={isPromptRTL ? 'rtl' : 'ltr'}
                style={{ direction: isPromptRTL ? 'rtl' : 'ltr' }}
              >
                {/* Tactic Header */}
                <div className={`p-5 border-b border-white/20 ${textColor}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div style={{ textAlign: isPromptRTL ? 'right' : 'left', direction: isPromptRTL ? 'rtl' : 'ltr' }}>
                      <span className="text-xs font-mono opacity-70">{tactic.id}</span>
                      <h3 className={`text-lg font-bold mt-2 ${textColor}`} style={{ unicodeBidi: 'plaintext', direction: isPromptRTL ? 'rtl' : 'ltr' }}>{tactic.name}</h3>
                      {tactic.timestamp && (
                        <div className="text-xs text-slate-400 mt-2 flex items-center gap-1" style={{ justifyContent: isPromptRTL ? 'flex-end' : 'flex-start', direction: isPromptRTL ? 'rtl' : 'ltr' }}>
                          <span>⏰</span>
                          <span>{tactic.timestamp}</span>
                        </div>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium bg-white/10 ${textColor} whitespace-nowrap`} style={{ direction: isPromptRTL ? 'rtl' : 'ltr' }}>
                      {tactic.techniques?.length || 0} techniques
                    </div>
                  </div>
                </div>

                {/* Techniques List */}
                <div className="p-4 space-y-2 max-h-96 overflow-y-auto" style={{ direction: isPromptRTL ? 'rtl' : 'ltr', textAlign: isPromptRTL ? 'right' : 'left' }}>
                  {tactic.techniques && tactic.techniques.length > 0 ? (
                    tactic.techniques.map((technique) => {
                      const isSelected = selectedNode?.id === technique.id;

                      return (
                        <motion.div
                          key={technique.id}
                          whileHover={{ x: isPromptRTL ? -4 : 4 }}
                          onClick={() => onNodeSelect({ ...technique, tacticName: tactic.name })}
                          className={`p-3 rounded-lg cursor-pointer transition-all border ${
                            isSelected
                              ? `bg-white/20 border-white/40 ${textColor}`
                              : `bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300`
                          }`}
                          style={{ direction: isPromptRTL ? 'rtl' : 'ltr', textAlign: isPromptRTL ? 'right' : 'left' }}
                        >
                          <div className="text-xs font-mono opacity-60 mb-1" style={{ unicodeBidi: 'plaintext' }}>{technique.id}</div>
                          <div className="text-sm font-semibold text-white leading-tight" style={{ unicodeBidi: 'plaintext' }}>{technique.name}</div>
                          {technique.description && (
                            <div className="text-xs text-slate-400 mt-2 line-clamp-2" style={{ unicodeBidi: 'plaintext' }}>
                              {technique.description}
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-slate-400 italic py-4 text-center">
                      No techniques identified
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Summary Section */}
        {diagramData.tactics && diagramData.tactics.length > 0 && (
          <div className="mt-8 p-6 rounded-xl bg-slate-500/10 border border-slate-400/20">
            <h4 className="text-white font-semibold mb-3">Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-slate-400">Total Tactics</div>
                <div className="text-2xl font-bold text-cyan-400">{diagramData.tactics.length}</div>
              </div>
              <div>
                <div className="text-slate-400">Total Techniques</div>
                <div className="text-2xl font-bold text-purple-400">
                  {diagramData.tactics.reduce((sum, t) => sum + (t.techniques?.length || 0), 0)}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Coverage</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {Math.round((diagramData.tactics.filter(t => t.techniques?.length > 0).length / diagramData.tactics.length) * 100)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-slate-500">
      Unsupported visualization type
    </div>
  );
}