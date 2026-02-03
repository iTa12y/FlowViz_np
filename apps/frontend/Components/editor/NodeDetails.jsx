import React, { useState, useEffect } from 'react';
import { Monitor, Server, Shield, Database, Globe, User, Target, X, Info, AlertTriangle, Clock, Edit3, Save, XCircle } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';

// Helper function to detect if text contains Hebrew characters
const isHebrewText = (text) => {
  if (!text) return false;
  const hebrewRegex = /[\u0590-\u05FF]/;
  return hebrewRegex.test(text);
};

const nodeIcons = {
  endpoint: Monitor,
  workstation: Monitor,
  server: Server,
  domain_controller: Shield,
  database: Database,
  attacker: User,
  target: Target,
  external: Globe
};

const nodeColors = {
  endpoint: 'text-cyan-400',
  workstation: 'text-cyan-400',
  server: 'text-purple-400',
  domain_controller: 'text-emerald-400',
  database: 'text-amber-400',
  attacker: 'text-red-400',
  target: 'text-orange-400',
  external: 'text-rose-400'
};

export default function NodeDetails({ node, flowType, onClose, isEditMode, onNodeUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNode, setEditedNode] = useState(null);
  const [inlineEdit, setInlineEdit] = useState(false);
  const [inlineValue, setInlineValue] = useState('');

  useEffect(() => {
    if (node) {
      setEditedNode({ ...node });
      setInlineValue(node.label || '');
    }
  }, [node]);

  const handleSaveNode = () => {
    if (onNodeUpdate && editedNode) {
      onNodeUpdate(editedNode);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedNode({ ...node });
    setIsEditing(false);
  };
  if (!node) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center mb-4">
          <Info className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Select a Node</h3>
        <p className="text-sm text-slate-400">
          Click on any node in the diagram to view its details
        </p>
      </div>
    );
  }

  const Icon = nodeIcons[node.type] || Monitor;
  const iconColor = nodeColors[node.type] || 'text-slate-400';

  // For network map nodes
  if (flowType === 'network_map') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-semibold text-white">Node Details</h3>
          <div className="flex items-center gap-2">
            {isEditMode && !isEditing && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsEditing(true)}
                className="text-slate-400 hover:text-white"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isEditing ? (
            <>
              {/* Edit Form */}
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-400 text-sm">Node Label</Label>
                  <Input
                    value={editedNode?.label || ''}
                    onChange={(e) => setEditedNode({ ...editedNode, label: e.target.value })}
                    className="mt-1 bg-[#0a0e1a] border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label className="text-slate-400 text-sm">Description</Label>
                  <Textarea
                    value={editedNode?.details || ''}
                    onChange={(e) => setEditedNode({ ...editedNode, details: e.target.value })}
                    className="mt-1 bg-[#0a0e1a] border-white/10 text-white min-h-[100px]"
                  />
                </div>
              </div>

              {/* Edit Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                <Button
                  size="sm"
                  onClick={handleSaveNode}
                  className="flex-1 bg-cyan-500 text-[#0a0e1a] hover:bg-cyan-400"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="flex-1 border-white/10 text-slate-300"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Node Header */}
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center ${iconColor}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  {inlineEdit ? (
                    <input
                      type="text"
                      autoFocus
                      value={inlineValue}
                      onChange={(e) => setInlineValue(e.target.value)}
                      onBlur={() => {
                        if (inlineValue.trim()) {
                          setEditedNode({ ...editedNode, label: inlineValue });
                          onNodeUpdate({ ...editedNode, label: inlineValue });
                        }
                        setInlineEdit(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (inlineValue.trim()) {
                            setEditedNode({ ...editedNode, label: inlineValue });
                            onNodeUpdate({ ...editedNode, label: inlineValue });
                          }
                          setInlineEdit(false);
                        } else if (e.key === 'Escape') {
                          setInlineEdit(false);
                        }
                      }}
                      className="w-full text-lg font-semibold text-white bg-cyan-500/10 border border-cyan-500/50 rounded px-2 py-1 focus:outline-none focus:border-cyan-400"
                    />
                  ) : (
                    <h4 
                      onClick={() => isEditMode && setInlineEdit(true)}
                      className={`text-xl font-semibold text-white ${isEditMode ? 'cursor-text hover:bg-white/5 px-2 py-1 rounded transition-colors' : ''}`}
                      style={{ unicodeBidi: 'plaintext' }}
                    >
                      {node.label}
                    </h4>
                  )}
                  <Badge variant="outline" className="mt-2 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                    {node.type?.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Details - Always show in panel */}
              <div>
                <h5 className="text-sm font-medium text-slate-400 mb-2">Description</h5>
                {isEditMode && inlineEdit === 'details' ? (
                  <textarea
                    autoFocus
                    value={inlineValue}
                    onChange={(e) => setInlineValue(e.target.value)}
                    onBlur={() => {
                      setEditedNode({ ...editedNode, details: inlineValue });
                      onNodeUpdate({ ...editedNode, details: inlineValue });
                      setInlineEdit(false);
                    }}
                    className="w-full text-sm text-white bg-cyan-500/10 border border-cyan-500/50 rounded p-2 focus:outline-none focus:border-cyan-400 min-h-[60px]"
                  />
                ) : (
                  <p 
                    onClick={() => isEditMode && (() => { setInlineEdit('details'); setInlineValue(node.details || ''); })()}
                    className={`text-sm text-slate-300 leading-relaxed whitespace-pre-wrap ${isEditMode ? 'cursor-text hover:bg-white/5 px-2 py-1 rounded transition-colors' : ''}`}
                    style={{ unicodeBidi: 'plaintext' }}
                  >
                    {node.details || (isEditMode ? 'Click to add description...' : 'No description available')}
                  </p>
                )}
              </div>

              {/* Possible Scenarios - for question mark nodes */}
              {(node.type === 'question_mark' || node.confidence_level === 'requires_investigation') && (
                <div>
                  <h5 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Possible Attack Vectors
                  </h5>
                  <div className="p-4 rounded-lg bg-amber-400/10 border border-amber-400/20">
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
                      {node.possible_scenarios && node.possible_scenarios.trim() 
                        ? node.possible_scenarios 
                        : 'Regenerate the flow to see possible attack scenarios for this missing information.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Investigation Suggestions - for question mark nodes */}
              {(node.type === 'question_mark' || node.confidence_level === 'requires_investigation') && (
                <div>
                  <h5 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Investigation Steps
                  </h5>
                  <div className="p-4 rounded-lg bg-blue-400/10 border border-blue-400/20 overflow-x-auto">
                    <pre className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words font-mono overflow-wrap-anywhere" style={{ wordBreak: 'break-word' }}>
                      {node.investigation_suggestions && node.investigation_suggestions.trim()
                        ? node.investigation_suggestions 
                        : 'Regenerate the flow to see specific investigation steps with log paths, Event IDs, and forensic artifacts to check.'}
                    </pre>
                  </div>
                </div>
              )}

              {/* Node ID */}
              <div>
                <h5 className="text-sm font-medium text-slate-400 mb-2">Node ID</h5>
                <code className="text-xs text-slate-500 bg-slate-500/10 px-2 py-1 rounded font-mono break-all">
                  {node.id}
                </code>
              </div>

              {/* Threat Indicator */}
              {(node.type === 'attacker' || node.type === 'external') && (
                <div className="p-4 rounded-xl bg-red-400/10 border border-red-400/20">
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Threat Indicator</span>
                  </div>
                  <p className="text-sm text-slate-300">
                    This node represents a malicious actor or external threat source.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // For timeline events
  if (flowType === 'timeline') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-semibold text-white">Event Details</h3>
          <div className="flex items-center gap-2">
            {isEditMode && !isEditing && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsEditing(true)}
                className="text-slate-400 hover:text-white"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isEditing ? (
            <>
              {/* Edit Form */}
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-400 text-sm">Timestamp</Label>
                  <Input
                    value={editedNode?.timestamp || ''}
                    onChange={(e) => setEditedNode({ ...editedNode, timestamp: e.target.value })}
                    className="mt-1 bg-[#0a0e1a] border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label className="text-slate-400 text-sm">Title</Label>
                  <Input
                    value={editedNode?.title || ''}
                    onChange={(e) => setEditedNode({ ...editedNode, title: e.target.value })}
                    className="mt-1 bg-[#0a0e1a] border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label className="text-slate-400 text-sm">Description</Label>
                  <Textarea
                    value={editedNode?.description || ''}
                    onChange={(e) => setEditedNode({ ...editedNode, description: e.target.value })}
                    className="mt-1 bg-[#0a0e1a] border-white/10 text-white min-h-[100px]"
                  />
                </div>
              </div>

              {/* Edit Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                <Button
                  size="sm"
                  onClick={handleSaveNode}
                  className="flex-1 bg-cyan-500 text-[#0a0e1a] hover:bg-cyan-400"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="flex-1 border-white/10 text-slate-300"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Event Header */}
              <div>
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Clock className="w-4 h-4" />
                  {node.timestamp}
                </div>
                <h4 
                  className="text-xl font-semibold text-white"
                  style={{ unicodeBidi: 'plaintext' }}
                >
                  {node.title}
                </h4>
              </div>

              {/* Event Type */}
              <div>
                <h5 className="text-sm font-medium text-slate-400 mb-2">Event Type</h5>
                <Badge className="bg-purple-400/20 text-purple-400 border-purple-400/30">
                  {node.type?.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </div>

              {/* Description */}
              <div>
                <h5 className="text-sm font-medium text-slate-400 mb-2">Description</h5>
                <p 
                  className="text-sm text-slate-300 leading-relaxed"
                  style={{ unicodeBidi: 'plaintext' }}
                >
                  {node.description}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // For MITRE ATT&CK techniques
  if (flowType === 'mitre_attack') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-semibold text-white">Technique Details</h3>
          <div className="flex items-center gap-2">
            {isEditMode && !isEditing && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsEditing(true)}
                className="text-slate-400 hover:text-white"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isEditing ? (
            <>
              {/* Edit Form */}
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-400 text-sm">Technique Name</Label>
                  <Input
                    value={editedNode?.name || ''}
                    onChange={(e) => setEditedNode({ ...editedNode, name: e.target.value })}
                    className="mt-1 bg-[#0a0e1a] border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label className="text-slate-400 text-sm">Description</Label>
                  <Textarea
                    value={editedNode?.description || ''}
                    onChange={(e) => setEditedNode({ ...editedNode, description: e.target.value })}
                    className="mt-1 bg-[#0a0e1a] border-white/10 text-white min-h-[80px]"
                  />
                </div>

                <div>
                  <Label className="text-slate-400 text-sm">Observed Procedure</Label>
                  <Textarea
                    value={editedNode?.procedure || ''}
                    onChange={(e) => setEditedNode({ ...editedNode, procedure: e.target.value })}
                    className="mt-1 bg-[#0a0e1a] border-white/10 text-white min-h-[80px]"
                  />
                </div>
              </div>

              {/* Edit Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                <Button
                  size="sm"
                  onClick={handleSaveNode}
                  className="flex-1 bg-cyan-500 text-[#0a0e1a] hover:bg-cyan-400"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="flex-1 border-white/10 text-slate-300"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Technique Header */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <code className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                    {node.id}
                  </code>
                </div>
                <h4 
                  className="text-xl font-semibold text-white"
                  style={{ unicodeBidi: 'plaintext' }}
                >
                  {node.name}
                </h4>
              </div>

              {/* Tactic */}
              {node.tacticName && (
                <div>
                  <h5 className="text-sm font-medium text-slate-400 mb-2">Tactic</h5>
                  <Badge variant="outline" className="border-cyan-400/30 text-cyan-400">
                    {node.tacticName}
                  </Badge>
                </div>
              )}

              {/* Description */}
              {node.description && (
                <div>
                  <h5 className="text-sm font-medium text-slate-400 mb-2">Description</h5>
                  <p 
                    className="text-sm text-slate-300 leading-relaxed"
                    style={{ unicodeBidi: 'plaintext' }}
                  >
                    {node.description}
                  </p>
                </div>
              )}

              {/* Procedure */}
              {node.procedure && (
                <div>
                  <h5 className="text-sm font-medium text-slate-400 mb-2">Observed Procedure</h5>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p 
                      className="text-sm text-slate-300 leading-relaxed"
                      style={{ unicodeBidi: 'plaintext' }}
                    >
                      {node.procedure}
                    </p>
                  </div>
                </div>
              )}

              {/* MITRE Link */}
              <div>
                <a
                  href={`https://attack.mitre.org/techniques/${node.id?.replace('.', '/')}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  View on MITRE ATT&CK →
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}