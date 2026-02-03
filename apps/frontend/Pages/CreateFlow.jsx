import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { IncidentFlowStorage } from '@/Components/services/apiStorage';
import { analyzeIncident, isOpenAIConfigured } from '@/Components/services/openai-callback';
import { 
  Network, 
  Clock, 
  Target, 
  Wand2, 
  FileText,
  AlertCircle,
  ChevronRight,
  Loader2,
  Sparkles,
  ExternalLink,
  Book
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/Components/ui/button';
import { Textarea } from '@/Components/ui/textarea';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/Components/ui/tabs';
import { cn } from '@/lib/utils';
import OpenAISetup from '@/Components/setup/OpenAISetup';

export default function CreateFlow() {
  const navigate = useNavigate();
  const [flowName, setFlowName] = useState('');
  const [incidentText, setIncidentText] = useState('');
  const [confluencePageName, setConfluencePageName] = useState('');
  const [selectedType, setSelectedType] = useState('network_map');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [inputMode, setInputMode] = useState('manual'); // 'manual' or 'confluence'

  const flowTypes = [
    {
      id: 'network_map',
      name: 'Network Map',
      description: 'Visualize attack paths across infrastructure with nodes and connections',
      icon: Network,
      color: 'cyan',
      example: 'Shows lateral movement, compromised hosts, and network topology'
    },
    {
      id: 'timeline',
      name: 'Timeline',
      description: 'Chronological sequence of events during the incident',
      icon: Clock,
      color: 'purple',
      example: 'Displays temporal progression of attack phases'
    },
    {
      id: 'mitre_attack',
      name: 'MITRE ATT&CK',
      description: 'Map tactics and techniques to the ATT&CK framework',
      icon: Target,
      color: 'green',
      example: 'Categorizes behaviors into standardized threat taxonomy'
    }
  ];

  const colorClasses = {
    cyan: {
      border: 'border-cyan-400/40',
      bg: 'bg-cyan-400/10',
      text: 'text-cyan-400',
      ring: 'ring-cyan-400/30',
      gradient: 'from-cyan-400 to-cyan-500'
    },
    purple: {
      border: 'border-purple-400/40',
      bg: 'bg-purple-400/10',
      text: 'text-purple-400',
      ring: 'ring-purple-400/30',
      gradient: 'from-purple-400 to-purple-500'
    },
    green: {
      border: 'border-emerald-400/40',
      bg: 'bg-emerald-400/10',
      text: 'text-emerald-400',
      ring: 'ring-emerald-400/30',
      gradient: 'from-emerald-400 to-emerald-500'
    }
  };

  // Fetch Confluence page content via API
  const fetchConfluencePage = async (pageName) => {
    try {
      const space = 'MFS'; // Your Confluence space key
      
      const response = await fetch(
        `http://localhost:3001/api/confluence/page?space=${encodeURIComponent(space)}&title=${encodeURIComponent(pageName)}`,
        {
          credentials: 'include' // Send cookies with request
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch Confluence page');
      }
      
      const data = await response.json();
      return data.content;
    } catch (err) {
      throw new Error(`Confluence error: ${err.message}`);
    }
  };

  const handleGenerate = async () => {
    // Check OpenAI configuration
    if (!isOpenAIConfigured()) {
      setError('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
      return;
    }

    // Validate inputs based on mode
    if (inputMode === 'manual') {
      if (!incidentText.trim()) {
        setError('Please enter an incident description');
        return;
      }
    } else if (inputMode === 'confluence') {
      if (!confluencePageName.trim()) {
        setError('Please enter a Confluence page name');
        return;
      }
    }
    
    if (!flowName.trim()) {
      setError('Please enter a flow name');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      // Get incident text based on input mode
      let finalIncidentText = incidentText;
      
      if (inputMode === 'confluence') {
        try {
          finalIncidentText = await fetchConfluencePage(confluencePageName);
        } catch (err) {
          setError(err.message || 'Failed to fetch Confluence page');
          setIsGenerating(false);
          return;
        }
      }

      // Generate diagram using OpenAI
      const result = await analyzeIncident({
        description: finalIncidentText,
        flowType: selectedType
      });

      // Create the flow record
      const flow = await IncidentFlowStorage.create({
        name: flowName,
        description: finalIncidentText,
        flow_type: selectedType,
        diagram_data: result.result,
        nodes: result.nodes || [],
        status: 'generated'
      });

      navigate(createPageUrl('FlowEditor') + `?id=${flow.id}`);
    } catch (err) {
      console.error('Error generating flow:', err);
      setError('Failed to generate flow. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const sampleIncidentEnglish = `On March 15, 2024, at 09:23 UTC, our SOC detected suspicious PowerShell execution on workstation WS-FIN-042. 

Initial access was gained through a phishing email with a malicious Excel macro. The attacker established persistence using a scheduled task and escalated privileges by exploiting CVE-2023-28252.

Lateral movement was observed to the file server FS-CORP-01 using stolen credentials from memory. The attacker then moved to domain controller DC-MAIN-01 using a pass-the-hash attack.

Data exfiltration was detected at 14:47 UTC when 2.3GB of sensitive financial data was transferred to an external IP (185.234.xxx.xxx) via HTTPS.`;

  const sampleIncidentHebrew = `ב-15 במרץ 2024, בשעה 09:23 UTC, צוות ה-SOC שלנו זיהה הרצת PowerShell חשודה על תחנת עבודה WS-FIN-042.

גישה ראשונית הושגה באמצעות דוא"ל פישינג עם מאקרו Excel זדוני. התוקף הקים התמדה באמצעות משימה מתוזמנת והעלה הרשאות על ידי ניצול CVE-2023-28252.

תנועה רוחבית נצפתה אל שרת הקבצים FS-CORP-01 באמצעות אישורים גנובים מהזיכרון. התוקף עבר לבקר התחום DC-MAIN-01 באמצעות מתקפת pass-the-hash.

הוצאת מידע זוהתה בשעה 14:47 UTC כאשר 2.3GB של נתונים פיננסיים רגישים הועברו לכתובת IP חיצונית (185.234.xxx.xxx) באמצעות HTTPS.`;

  const [sampleLanguage, setSampleLanguage] = useState('english');
  const sampleIncident = sampleLanguage === 'hebrew' ? sampleIncidentHebrew : sampleIncidentEnglish;

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-400/10 border border-purple-400/20 text-purple-400 text-sm font-medium mb-6"
          >
            <Sparkles className="w-4 h-4" />
            OpenAI GPT-4 · Multi-Language
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold text-white mb-4"
          >
            Create New Flow
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 max-w-xl mx-auto"
          >
            Paste your incident description in any language (English, Hebrew, etc.) and select a visualization type. 
            OpenAI GPT-4 will generate a detailed attack flow diagram.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Main Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* Flow Name */}
            <div className="space-y-2">
              <Label className="text-white font-medium">Flow Name</Label>
              <Input
                placeholder="e.g., Q1 2024 Ransomware Incident"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="bg-[#12182b] border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-cyan-400/20 h-12"
              />
            </div>

            {/* Input Mode Tabs */}
            <Tabs value={inputMode} onValueChange={setInputMode} className="w-full">
              <TabsList className="w-full bg-[#12182b] border border-white/10">
                <TabsTrigger 
                  value="manual" 
                  className="flex-1 data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-400"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Manual Input
                </TabsTrigger>
                <TabsTrigger 
                  value="confluence" 
                  className="flex-1 data-[state=active]:bg-purple-400/20 data-[state=active]:text-purple-400"
                >
                  <Book className="w-4 h-4 mr-2" />
                  Confluence Page
                </TabsTrigger>
              </TabsList>

              {/* Manual Input Tab */}
              <TabsContent value="manual" className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-white font-medium">Incident Description</Label>
                  <div className="flex items-center gap-2">
                    <select
                      value={sampleLanguage}
                      onChange={(e) => setSampleLanguage(e.target.value)}
                      className="text-xs bg-[#0a0e1a] border border-white/10 text-slate-400 rounded px-2 py-1"
                    >
                      <option value="english">English</option>
                      <option value="hebrew">עברית</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white text-xs"
                      onClick={() => setIncidentText(sampleIncident)}
                    >
                      <FileText className="w-3 h-3 mr-1.5" />
                      Load Sample
                    </Button>
                  </div>
                </div>
                <Textarea
                  placeholder="Paste your cyber incident description here in any language (English, עברית, etc.). Include details about initial access, lateral movement, affected systems, timeline, and IOCs..."
                  value={incidentText}
                  onChange={(e) => setIncidentText(e.target.value)}
                  className="min-h-[280px] bg-[#12182b] border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-cyan-400/20 resize-none font-mono text-sm leading-relaxed"
                  dir="auto"
                />
                <p className="text-xs text-slate-500">
                  {incidentText.length} characters · {incidentText.split(/\s+/).filter(Boolean).length} words
                </p>
              </TabsContent>

              {/* Confluence Input Tab */}
              <TabsContent value="confluence" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-white font-medium">Confluence Page Name</Label>
                  <Input
                    placeholder="e.g., INC-2024-001 Post-Mortem"
                    value={confluencePageName}
                    onChange={(e) => setConfluencePageName(e.target.value)}
                    className="bg-[#12182b] border-white/10 text-white placeholder:text-slate-500 focus:border-purple-400/50 focus:ring-purple-400/20 h-12"
                  />
                  <p className="text-xs text-slate-400">
                    Enter the exact name of the Confluence page containing the incident report
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-4 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}
          </motion.div>

          {/* Flow Type Selector */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Setup Components */}
            <div className="space-y-4">
              <OpenAISetup />
            </div>

            {/* Visualization Type */}
            <div className="space-y-2">
              <Label className="text-white font-medium">Visualization Type</Label>
              <div className="space-y-3">
                {flowTypes.map((type) => {
                const colors = colorClasses[type.color];
                const isSelected = selectedType === type.id;

                return (
                  <motion.button
                    key={type.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedType(type.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
                      isSelected
                        ? `${colors.border} ${colors.bg} ring-2 ${colors.ring}`
                        : "border-white/10 bg-[#12182b] hover:border-white/20"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        isSelected ? colors.bg : "bg-white/5"
                      )}>
                        <type.icon className={cn(
                          "w-5 h-5",
                          isSelected ? colors.text : "text-slate-400"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={cn(
                          "font-semibold",
                          isSelected ? "text-white" : "text-slate-300"
                        )}>
                          {type.name}
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {type.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center",
                          colors.bg
                        )}>
                          <div className={cn(
                            "w-2 h-2 rounded-full bg-gradient-to-r",
                            colors.gradient
                          )} />
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={cn(
                "w-full h-14 text-[#0a0e1a] font-semibold text-base mt-6 transition-all",
                "bg-gradient-to-r",
                colorClasses[flowTypes.find(t => t.id === selectedType)?.color || 'cyan'].gradient,
                "hover:shadow-lg",
                selectedType === 'network_map' && "hover:shadow-cyan-500/25",
                selectedType === 'timeline' && "hover:shadow-purple-500/25",
                selectedType === 'mitre_attack' && "hover:shadow-emerald-500/25"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing Incident...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  Generate Flow
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <div className="space-y-2">
              <p className="text-xs text-slate-500 text-center">
                Generation typically takes 10-30 seconds
              </p>
              {!isOpenAIConfigured() && (
                <div className="p-3 rounded-lg bg-orange-400/10 border border-orange-400/20">
                  <p className="text-xs text-orange-400 text-center">
                    ⚠️ Add VITE_OPENAI_API_KEY to .env file to enable generation
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}