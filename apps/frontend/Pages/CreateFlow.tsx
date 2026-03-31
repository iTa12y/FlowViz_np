import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl, withApiBase, getFrontendEnvNumber, getFrontendEnvVar } from '@/utils';
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
  Book,
  Upload,
  File,
  CheckCircle2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/Components/ui/button';
import { Textarea } from '@/Components/ui/textarea';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/Components/ui/tabs';
import { cn } from '@/lib/utils';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

const CONFLUENCE_SPACE = getFrontendEnvVar('VITE_CONFLUENCE_SPACE', '');
const FILE_CONTENT_MIN_LENGTH = getFrontendEnvNumber('VITE_FILE_CONTENT_MIN_LENGTH', 20);
const FILE_CONTENT_MAX_LENGTH = getFrontendEnvNumber('VITE_FILE_CONTENT_MAX_LENGTH', 5000);

// Configure PDF.js worker - Set only once to avoid reinitializing
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  // Try jsDelivr CDN first (fast and reliable)
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  console.log('PDF.js worker configured:', pdfjsLib.GlobalWorkerOptions.workerSrc);
}


export default function CreateFlow() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [flowName, setFlowName] = useState('');
  const [incidentText, setIncidentText] = useState('');
  const [confluencePageName, setConfluencePageName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [error, setError] = useState('');
  const [inputMode, setInputMode] = useState('manual'); // 'manual', 'confluence', or 'file'
  const [selectedType, setSelectedType] = useState('network_map');
  
  // File upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileContent, setFileContent] = useState('');

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

  // File handling functions
  const handleFileRead = async (file: File) => {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    try {
      if (fileType === 'txt' || fileType === 'md') {
        // Plain text files
        const text = await file.text();
        setFileContent(text);
        console.log('Text file loaded:', { length: text.length, preview: text.substring(0, 100) });
      } else if (fileType === 'pdf') {
        // PDF files using pdfjs-dist
        setError(''); // Clear any previous errors
        
        try {
          const arrayBuffer = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          
          let fullText = '';
          // Extract text from all pages
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n\n';
          }
          
          if (!fullText.trim()) {
            setError('PDF appears to be empty or contains only images. Please try a different file.');
            setUploadedFile(null);
            return;
          }
          
          setFileContent(fullText.trim());
          console.log('PDF loaded:', { pages: pdf.numPages, length: fullText.trim().length, preview: fullText.substring(0, 100) });
        } catch (pdfError: any) {
          console.error('PDF parsing error details:', {
            message: pdfError.message,
            name: pdfError.name,
            workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc
          });
          
          if (pdfError.message && (pdfError.message.includes('worker') || pdfError.message.includes('fetch'))) {
            setError(
              'Unable to load PDF processing library. This may be due to:\n' +
              '• Network connectivity issues\n' +
              '• Browser blocking external scripts\n\n' +
              'Try: Convert your PDF to .txt or .docx format and upload again.'
            );
          } else if (pdfError.message && pdfError.message.includes('password')) {
            setError('This PDF is password-protected. Please unlock it and try again, or use a different file.');
          } else if (pdfError.message && pdfError.message.includes('Invalid PDF')) {
            setError('This file appears to be corrupted or is not a valid PDF. Please try a different file.');
          } else {
            setError(`Failed to read PDF: ${pdfError.message || 'Unknown error'}. Try converting to .txt or .docx format.`);
          }
          setUploadedFile(null);
          return;
        }
      } else if (fileType === 'docx') {
        // DOCX files using mammoth
        setError(''); // Clear any previous errors
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        if (!result.value.trim()) {
          setError('DOCX file appears to be empty. Please try a different file.');
          setUploadedFile(null);
          return;
        }
        
        setFileContent(result.value.trim());
        console.log('DOCX loaded:', { length: result.value.trim().length, preview: result.value.substring(0, 100) });
        
        // Log any warnings from mammoth
        if (result.messages.length > 0) {
          console.warn('Mammoth conversion warnings:', result.messages);
        }
      } else if (fileType === 'doc') {
        // DOC files (old Word format) - not well supported in browsers
        setError('Legacy .doc format is not supported. Please convert to .docx or save as .txt and try again.');
        setUploadedFile(null);
        return;
      } else {
        // Try to read as plain text for other formats
        const text = await file.text();
        if (!text.trim()) {
          setError('File appears to be empty or in an unsupported format.');
          setUploadedFile(null);
          return;
        }
        setFileContent(text.trim());
        console.log('File loaded as text:', { length: text.trim().length, preview: text.substring(0, 100) });
      }
    } catch (err) {
      console.error('File reading error:', err);
      setError(`Failed to read file: ${err.message || 'Unknown error'}. Please try a different file format.`);
      setUploadedFile(null);
    }
  };

  const handleFileSelect = async (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
    setError('');
    await handleFileRead(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileSelect(files[0]);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setFileContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fetch Confluence page content via API
  const fetchConfluencePage = async (pageName) => {
    try {
      const space = CONFLUENCE_SPACE;

      if (!space) {
        throw new Error('VITE_CONFLUENCE_SPACE is not configured');
      }
      
      const response = await fetch(
        `${withApiBase('/api/confluence/page')}?space=${encodeURIComponent(space)}&title=${encodeURIComponent(pageName)}`,
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
    } else if (inputMode === 'file') {
      if (!uploadedFile || !fileContent.trim()) {
        setError('Please upload a file with valid content');
        return;
      }
      if (fileContent.trim().length < FILE_CONTENT_MIN_LENGTH) {
        setError(`File content is too short. Please ensure the file contains at least ${FILE_CONTENT_MIN_LENGTH} characters of incident description.`);
        return;
      }
      if (fileContent.trim().length > FILE_CONTENT_MAX_LENGTH) {
        setError(`File content is too long. Please limit the content to ${FILE_CONTENT_MAX_LENGTH} characters or less.`);
        return;
      }
    }
    
    if (!flowName.trim()) {
      setError('Please enter a flow name');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress('Initializing...');
    setError('');

    try {
      // Get incident text based on input mode
      let finalIncidentText = incidentText;
      
      if (inputMode === 'confluence') {
        setGenerationProgress('Fetching Confluence page...');
        try {
          finalIncidentText = await fetchConfluencePage(confluencePageName);
        } catch (err) {
          setError(err.message || 'Failed to fetch Confluence page');
          setIsGenerating(false);
          setGenerationProgress('');
          return;
        }
      } else if (inputMode === 'file') {
        setGenerationProgress('Processing uploaded file...');
        finalIncidentText = fileContent;
      }

      // Generate all three flow types simultaneously
      setGenerationProgress('Generating all flow visualizations...');
      
      // Log for debugging
      console.log('Sending incident text:', {
        length: finalIncidentText.length,
        preview: finalIncidentText.substring(0, 100) + '...'
      });

      const response = await fetch(withApiBase('/api/incident/analyze-all'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ description: finalIncidentText })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to generate flows';
        throw new Error(errorMessage);
      }

      const { flows } = await response.json();
      setGenerationProgress('Saving analysis...');

      // Create the flow record with all three flows
      const flow = await IncidentFlowStorage.create({
        name: flowName,
        description: finalIncidentText,
        flow_type: 'multi', // Indicates this contains multiple flows
        flows: flows, // Store all three flows
        status: 'generated'
      });

      setGenerationProgress('Complete!');
      navigate(createPageUrl('FlowEditor') + `?id=${flow.id}`);
    } catch (err) {
      console.error('Error generating flows:', err);
      setError(err.message || 'Failed to generate flows. Please try again.');
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
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
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#0f1425] to-[#0a0e1a]">
      {/* Enhanced Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-16">
        {/* Modern Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-purple-500/10 border border-purple-400/30 text-purple-300 text-sm font-medium mb-8 shadow-lg shadow-purple-500/10"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent font-semibold">
              OpenAI GPT-4 · Multi-Language Support
            </span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight"
          >
            Create New{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Flow
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg max-w-3xl mx-auto leading-relaxed"
          >
            Transform your incident reports into comprehensive visualizations. 
            <span className="text-slate-300 font-medium"> Upload files, paste text, or connect to Confluence</span>
            {' '}—our AI generates Network Maps, Timelines, and MITRE ATT&CK diagrams automatically.
          </motion.p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Left Side - Input Section */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Flow Name Card */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl">
              <Label className="text-white font-semibold text-base mb-3 block">Flow Name</Label>
              <Input
                placeholder="e.g., Q1 2024 Ransomware Incident"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="bg-[#12182b]/80 border-white/20 text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/30 h-14 text-lg rounded-xl transition-all"
              />
            </div>

            {/* Input Mode Tabs Card */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl">
              <Tabs value={inputMode} onValueChange={setInputMode} className="w-full">
                <TabsList className="w-full bg-[#12182b]/60 border border-white/10 p-1.5 h-auto rounded-xl grid grid-cols-3 gap-2">
                  <TabsTrigger 
                    value="manual" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/30 rounded-lg py-3 transition-all"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    <span className="font-medium">Text</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="file" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 rounded-lg py-3 transition-all"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    <span className="font-medium">Upload</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="confluence" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 rounded-lg py-3 transition-all"
                  >
                    <Book className="w-4 h-4 mr-2" />
                    <span className="font-medium">Confluence</span>
                  </TabsTrigger>
                </TabsList>

                {/* Manual Text Input Tab */}
                <TabsContent value="manual" className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-white font-semibold text-base">Incident Description</Label>
                    <div className="flex items-center gap-2">
                      <select
                        value={sampleLanguage}
                        onChange={(e) => setSampleLanguage(e.target.value)}
                        className="text-xs bg-[#0a0e1a]/80 border border-white/20 text-slate-300 rounded-lg px-3 py-2 focus:border-cyan-400/50 focus:outline-none transition-all"
                      >
                        <option value="english">🇺🇸 English</option>
                        <option value="hebrew">🇮🇱 עברית</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 text-xs transition-all"
                        onClick={() => setIncidentText(sampleIncident)}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        Load Sample
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Paste your cyber incident description here in any language (English, עברית, etc.). Include details about initial access, lateral movement, affected systems, timeline, and IOCs..."
                    value={incidentText}
                    onChange={(e) => setIncidentText(e.target.value)}
                    className="min-h-[320px] bg-[#12182b]/80 border-white/20 text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/30 resize-none font-mono text-sm leading-relaxed rounded-xl transition-all"
                    dir="auto"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {incidentText.length} characters · {incidentText.split(/\s+/).filter(Boolean).length} words
                    </span>
                    {incidentText.length > 100 && (
                      <span className="text-cyan-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Ready to generate
                      </span>
                    )}
                  </div>
                </TabsContent>

                {/* File Upload Tab */}
                <TabsContent value="file" className="mt-6 space-y-4">
                  <Label className="text-white font-semibold text-base block mb-4">Upload Document</Label>
                  
                  {!uploadedFile ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300",
                        isDragging 
                          ? "border-purple-400 bg-purple-400/10 scale-[1.02]" 
                          : "border-white/20 bg-[#12182b]/40 hover:border-purple-400/50 hover:bg-purple-400/5"
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md,.pdf,.docx"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                      <motion.div
                        animate={{ y: isDragging ? -10 : 0 }}
                        className="flex flex-col items-center gap-4"
                      >
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center border border-purple-400/30">
                          <Upload className="w-10 h-10 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-lg mb-2">
                            {isDragging ? 'Drop your file here' : 'Drop files or click to browse'}
                          </p>
                          <p className="text-slate-400 text-sm">
                            Supports: TXT, MD, PDF, DOCX (Max 10MB)
                          </p>
                        </div>
                      </motion.div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-400/30 rounded-2xl p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <File className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-white font-semibold truncate">{uploadedFile.name}</p>
                              <div className="flex items-center gap-3 mt-1 text-sm">
                                <span className="text-slate-400">
                                  {(uploadedFile.size / 1024).toFixed(2)} KB
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className={cn(
                                  "font-medium",
                                  fileContent.trim().length < 20 ? "text-orange-400" :
                                  fileContent.trim().length > 5000 ? "text-red-400" :
                                  "text-cyan-400"
                                )}>
                                  {fileContent.trim().length} chars
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-400">
                                  {fileContent.split(/\s+/).filter(Boolean).length} words
                                </span>
                              </div>
                              {fileContent.trim().length < 20 && (
                                <p className="text-orange-400 text-xs mt-1">
                                  ⚠️ Content too short (minimum 20 characters)
                                </p>
                              )}
                              {fileContent.trim().length > 5000 && (
                                <p className="text-red-400 text-xs mt-1">
                                  ⚠️ Content too long (maximum 5000 characters)
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={removeFile}
                              className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="mt-4 p-4 bg-[#0a0e1a]/60 rounded-xl border border-white/10 max-h-48 overflow-y-auto">
                            <p className="text-slate-300 text-sm font-mono leading-relaxed whitespace-pre-wrap">
                              {fileContent.slice(0, 500)}
                              {fileContent.length > 500 && '...'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </TabsContent>

                {/* Confluence Tab */}
                <TabsContent value="confluence" className="mt-6 space-y-4">
                  <div className="space-y-3">
                    <Label className="text-white font-semibold text-base">Confluence Page Name</Label>
                    <Input
                      placeholder="e.g., INC-2024-001 Post-Mortem"
                      value={confluencePageName}
                      onChange={(e) => setConfluencePageName(e.target.value)}
                      className="bg-[#12182b]/80 border-white/20 text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/30 h-14 text-base rounded-xl transition-all"
                    />
                    <div className="flex items-start gap-2 p-4 bg-emerald-400/5 border border-emerald-400/20 rounded-xl">
                      <Book className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-300">
                        Enter the exact name of the Confluence page containing your incident report. 
                        Make sure you're authenticated with your Confluence workspace.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="bg-red-500/10 backdrop-blur-xl border border-red-400/30 rounded-2xl p-5 shadow-lg"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-300 text-sm font-medium">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right Side - Visualization Info & Generate */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Visualizations Card */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-cyan-400" />
                </div>
                <Label className="text-white font-semibold text-base">Generated Flows</Label>
              </div>
              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                All three visualization types will be generated simultaneously:
              </p>
              
              <div className="space-y-3">
                {flowTypes.map((type, index) => {
                  const colors = colorClasses[type.color];
                  return (
                    <motion.div
                      key={type.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className={cn(
                        "rounded-xl p-4 border-2 transition-all duration-300",
                        `${colors.border} ${colors.bg}`
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          `bg-gradient-to-br ${colors.gradient}`
                        )}>
                          <type.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white text-sm mb-1">
                            {type.name}
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={cn(
                "w-full h-16 font-bold text-lg rounded-2xl transition-all duration-300 shadow-2xl",
                "bg-gradient-to-r from-purple-600 via-purple-500 to-cyan-500",
                "hover:shadow-purple-500/50 hover:scale-[1.02]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              )}
            >
              {isGenerating ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <div className="flex flex-col items-start">
                    <span>Generating...</span>
                    {generationProgress && (
                      <span className="text-xs font-normal opacity-80">{generationProgress}</span>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  Generate All Flows
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            {/* Info Card */}
            <div className="bg-gradient-to-br from-cyan-500/5 to-purple-500/5 backdrop-blur-xl rounded-2xl p-5 border border-cyan-400/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Generation typically takes <span className="text-cyan-400 font-semibold">10-30 seconds</span>
                  </p>
                  {!isOpenAIConfigured() && (
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-xs text-orange-400">
                        ⚠️ Configure VITE_OPENAI_API_KEY in .env to enable generation
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}