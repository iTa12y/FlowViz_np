import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { IncidentFlowStorage } from '@/Components/services/localStorage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  Network, 
  Clock, 
  Target, 
  MoreVertical, 
  Eye, 
  Trash2, 
  Download,
  Plus,
  Calendar,
  ChevronDown,
  Loader2,
  X,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import { Badge } from '@/Components/ui/badge';


export default function History() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFlows, setSelectedFlows] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const queryClient = useQueryClient();

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ['incident-flows'],
    queryFn: () => IncidentFlowStorage.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (ids) => {
      if (Array.isArray(ids)) {
        return Promise.all(ids.map(id => IncidentFlowStorage.delete(id)));
      }
      return IncidentFlowStorage.delete(ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-flows'] });
      setSelectedFlows(new Set());
    },
  });

  const flowTypeConfig = {
    network_map: {
      icon: Network,
      label: 'Network Map',
      color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
    },
    timeline: {
      icon: Clock,
      label: 'Timeline',
      color: 'text-purple-400 bg-purple-400/10 border-purple-400/20'
    },
    mitre_attack: {
      icon: Target,
      label: 'MITRE ATT&CK',
      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    }
  };

  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-slate-400/10 text-slate-400 border-slate-400/20' },
    generated: { label: 'Generated', color: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20' },
    reviewed: { label: 'Reviewed', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
    archived: { label: 'Archived', color: 'bg-orange-400/10 text-orange-400 border-orange-400/20' }
  };

  const filteredFlows = flows.filter(flow => {
    const matchesSearch = flow.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         flow.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || flow.flow_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || flow.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleSelectFlow = (flowId) => {
    const newSelected = new Set(selectedFlows);
    if (newSelected.has(flowId)) {
      newSelected.delete(flowId);
      if (newSelected.size === 0) {
        setIsSelectionMode(false);
      }
    } else {
      newSelected.add(flowId);
      setIsSelectionMode(true);
    }
    setSelectedFlows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFlows.size === filteredFlows.length) {
      setSelectedFlows(new Set());
    } else {
      setSelectedFlows(new Set(filteredFlows.map(f => f.id)));
    }
  };

  const handleExportSelected = () => {
    const selectedFlowsArray = filteredFlows.filter(f => selectedFlows.has(f.id));
    const exportData = {
      flows: selectedFlowsArray.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        flow_type: f.flow_type,
        diagram_data: f.diagram_data,
        status: f.status,
        created_date: f.created_date
      })),
      exported_at: new Date().toISOString(),
      count: selectedFlowsArray.length
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flows_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteSelected = () => {
    setDeleteConfirmation({
      type: 'multiple',
      count: selectedFlows.size,
      onConfirm: () => {
        deleteMutation.mutate(Array.from(selectedFlows));
        setIsSelectionMode(false);
        setDeleteConfirmation(null);
      }
    });
  };

  const handleDeleteSingle = (flowId) => {
    setDeleteConfirmation({
      type: 'single',
      count: 1,
      onConfirm: () => {
        deleteMutation.mutate(flowId);
        setDeleteConfirmation(null);
      }
    });
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedFlows(new Set());
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Flow History</h1>
            <p className="text-slate-400">
              View and manage your previously generated incident flows
            </p>
          </div>
          <Link to={createPageUrl('CreateFlow')}>
            <Button className="bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#0a0e1a] font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
              <Plus className="w-4 h-4 mr-2" />
              New Flow
            </Button>
          </Link>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search flows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 bg-[#12182b] border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-cyan-400/20"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-48 bg-[#12182b] border-white/10 text-white">
              <Filter className="w-4 h-4 mr-2 text-slate-500" />
              <SelectValue placeholder="Flow Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a2038] border-white/10">
              <SelectItem value="all" className="text-white hover:bg-white/5">All Types</SelectItem>
              <SelectItem value="network_map" className="text-white hover:bg-white/5">Network Map</SelectItem>
              <SelectItem value="timeline" className="text-white hover:bg-white/5">Timeline</SelectItem>
              <SelectItem value="mitre_attack" className="text-white hover:bg-white/5">MITRE ATT&CK</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48 bg-[#12182b] border-white/10 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a2038] border-white/10">
              <SelectItem value="all" className="text-white hover:bg-white/5">All Status</SelectItem>
              <SelectItem value="draft" className="text-white hover:bg-white/5">Draft</SelectItem>
              <SelectItem value="generated" className="text-white hover:bg-white/5">Generated</SelectItem>
              <SelectItem value="reviewed" className="text-white hover:bg-white/5">Reviewed</SelectItem>
              <SelectItem value="archived" className="text-white hover:bg-white/5">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Selection Toolbar */}
        {selectedFlows.size > 0 && (
          <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-cyan-400/10 border border-cyan-400/30">
            <div className="flex items-center gap-3">
              <span className="text-white font-medium">{selectedFlows.size} selected</span>
              <button 
                onClick={() => {
                  setSelectedFlows(new Set());
                  setIsSelectionMode(false);
                }}
                className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Exit
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleExportSelected}
                className="bg-cyan-500/80 text-[#0a0e1a] hover:bg-cyan-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Export {selectedFlows.size}
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteSelected}
                disabled={deleteMutation.isPending}
                className="bg-red-500/80 text-white hover:bg-red-500"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete {selectedFlows.size}
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-white/10 bg-[#12182b]/80 backdrop-blur-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[#0a0e1a]/50 border-b border-white/5 text-sm font-medium text-slate-400">
            {isSelectionMode && (
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedFlows.size > 0 && selectedFlows.size === filteredFlows.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 cursor-pointer accent-cyan-400"
                />
              </div>
            )}
            <div className={isSelectionMode ? "col-span-4" : "col-span-5"}>Flow Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-1">Actions</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-white/5">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : filteredFlows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                  <Network className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No flows found</h3>
                <p className="text-slate-400 mb-6">
                  {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first incident flow to get started'}
                </p>
                {!searchQuery && typeFilter === 'all' && statusFilter === 'all' && (
                  <Link to={createPageUrl('CreateFlow')}>
                    <Button className="bg-cyan-500 text-[#0a0e1a] hover:bg-cyan-400">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Flow
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <AnimatePresence>
                {filteredFlows.map((flow, index) => {
                  const typeConfig = flowTypeConfig[flow.flow_type] || flowTypeConfig.network_map;
                  const TypeIcon = typeConfig.icon;
                  const status = statusConfig[flow.status] || statusConfig.draft;

                  return (
                    <motion.div
                      key={flow.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.03 }}
                      className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors group"
                    >
                      {isSelectionMode && (
                        <div className="col-span-1 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedFlows.has(flow.id)}
                            onChange={() => handleSelectFlow(flow.id)}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 cursor-pointer accent-cyan-400"
                          />
                        </div>
                      )}
                      <div className={isSelectionMode ? "col-span-4" : "col-span-5"}>
                        <Link 
                          to={createPageUrl('FlowEditor') + `?id=${flow.id}`}
                          className="block"
                        >
                          <h3 className="text-white font-medium group-hover:text-cyan-400 transition-colors truncate">
                            {flow.name}
                          </h3>
                          <p className="text-sm text-slate-500 truncate mt-0.5">
                            {flow.description?.substring(0, 60)}...
                          </p>
                        </Link>
                      </div>
                      
                      <div className="col-span-2">
                        <Badge variant="outline" className={`${typeConfig.color} border`}>
                          <TypeIcon className="w-3 h-3 mr-1.5" />
                          {typeConfig.label}
                        </Badge>
                      </div>
                      
                      <div className="col-span-2">
                        <Badge variant="outline" className={`${status.color} border`}>
                          {status.label}
                        </Badge>
                      </div>
                      
                      <div className="col-span-2 flex items-center gap-2 text-sm text-slate-400">
                        <Calendar className="w-4 h-4" />
                        {flow.created_date ? format(new Date(flow.created_date), 'MMM d, yyyy') : 'N/A'}
                      </div>
                      
                      <div className="col-span-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/5">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#1a2038] border-white/10">
                            <DropdownMenuItem 
                              className="text-white hover:bg-white/5 cursor-pointer"
                              onClick={() => handleSelectFlow(flow.id)}
                            >
                              {selectedFlows.has(flow.id) ? (
                                <>
                                  <Check className="w-4 h-4 mr-2 text-cyan-400" />
                                  Deselect
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Select
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-white hover:bg-white/5 cursor-pointer"
                              asChild
                            >
                              <Link to={createPageUrl('FlowEditor') + `?id=${flow.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-white hover:bg-white/5 cursor-pointer">
                              <Download className="w-4 h-4 mr-2" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-400 hover:bg-red-400/10 cursor-pointer"
                              onClick={() => handleDeleteSingle(flow.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Stats Footer */}
        {filteredFlows.length > 0 && (
          <div className="flex items-center justify-between mt-6 text-sm text-slate-500">
            <span>Showing {filteredFlows.length} of {flows.length} flows</span>
            <div className="flex items-center gap-6">
              <span>{flows.filter(f => f.flow_type === 'network_map').length} Network Maps</span>
              <span>{flows.filter(f => f.flow_type === 'timeline').length} Timelines</span>
              <span>{flows.filter(f => f.flow_type === 'mitre_attack').length} MITRE ATT&CK</span>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#1a2038] border border-white/10 rounded-xl p-6 max-w-sm mx-4 shadow-xl"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Delete Flow{deleteConfirmation.count > 1 ? 's' : ''}?</h3>
                <p className="text-slate-400 text-sm mb-6">
                  {deleteConfirmation.count > 1 
                    ? `You are about to delete ${deleteConfirmation.count} flows. This action cannot be undone.`
                    : 'You are about to delete this flow. This action cannot be undone.'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setDeleteConfirmation(null)}
                className="bg-slate-700 text-white hover:bg-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={deleteConfirmation.onConfirm}
                disabled={deleteMutation.isPending}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}