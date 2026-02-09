import axios from 'axios';
import env  from './env.js'
 
class ConfluenceService {
  confluenceUrl: string;
  speculationMarkers: any;
  investigationPatterns: any;
  confidencePatterns: any;

  constructor() {
    this.confluenceUrl = env.CONFLUENCE_URL || '';
    if (!this.confluenceUrl) {
      throw new Error('CONFLUENCE_URL not configured in environment');
    }

    this.speculationMarkers = {
      english: [
        'maybe', 'possibly', 'could be', 'might have', 'we think', 'probably',
        'likely', 'appears to', 'seems to', 'suggests', 'indicates', 'potential',
        'presumably', 'supposedly', 'allegedly', 'it is believed', 'we assume',
        'hypothesis', 'theory', 'speculation', 'conjecture', 'suspected',
        'unclear', 'uncertain', 'unknown', 'unconfirmed', 'unverified'
      ],
      hebrew: [
        'יכול להיות', 'אולי', 'ייתכן', 'נראה כי', 'סביר להניח', 'כנראה',
        'יתכן ו', 'בסבירות גבוהה', 'ככל הנראה', 'לכאורה', 'לפי ההשערה',
        'ההשערה היא', 'אנו משערים', 'אנו חושדים', 'חשד', 'השערה', 'הנחה',
        'לא ברור', 'לא וודאי', 'לא אושר', 'לא מאומת', 'טרם אומת'
      ]
    };

    this.investigationPatterns = {
      english: [
        'we checked', 'we analyzed', 'we reviewed', 'we investigated', 'we found',
        'analysis shows', 'investigation revealed', 'examination of', 'review of',
        'log analysis', 'forensic analysis', 'we searched', 'we queried',
        'looking at the logs', 'examining the', 'upon review', 'our investigation'
      ],
      hebrew: [
        'בדקנו', 'ניתחנו', 'סקרנו', 'חקרנו', 'מצאנו', 'גילינו', 'התברר',
        'הניתוח מראה', 'החקירה גילתה', 'בדיקת', 'ניתוח של', 'סקירת',
        'ניתוח לוגים', 'ניתוח פורנזי', 'חיפוש', 'בעת בדיקת', 'מבדיקה עולה'
      ]
    };

    this.confidencePatterns = {
      high: {
        english: ['confirmed', 'verified', 'proven', 'established', 'clear evidence', 'definitive'],
        hebrew: ['אושר', 'אומת', 'הוכח', 'הוכחנו', 'ראיות ברורות', 'ודאי']
      },
      medium: {
        english: ['likely', 'appears', 'indicates', 'suggests', 'evidence shows'],
        hebrew: ['נראה', 'מצביע על', 'מעיד על', 'הראיות מצביעות', 'כנראה']
      },
      low: {
        english: ['possibly', 'might', 'could', 'potentially', 'maybe'],
        hebrew: ['יתכן', 'אולי', 'יכול להיות', 'פוטנציאל', 'ייתכן']
      }
    };
  }

  _createClient(username: string, apiToken: string) {
    if (!username || !apiToken) {
      return null;
    }
    
    const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');
    
    return axios.create({
      baseURL: this.confluenceUrl,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async validateCredentials(username: string, apiToken: string) {
    try {
      const client = this._createClient(username, apiToken);
      if (!client) return false;
      // Test credentials by fetching spaces (minimal request)
      await client.get('/rest/api/space?limit=1');
      return true;
    } catch (validationError: any) {
      return false;
    }
  }

  async getPageByTitle(username: string, apiToken: string, spaceKey: string, title: string) {
    try {
      const client = this._createClient(username, apiToken);
      if (!client) {
        return null;
      }
      
      const response = await client.get('/rest/api/content', {
        params: {
          spaceKey,
          title,
          expand: 'body.storage'
        }
      });
      
      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0];
      }
      
      return null;
    } catch (error: any) {
      console.error(`Error fetching page '${title}' in space '${spaceKey}': ${error.message}`);
      return null;
    }
  }

  async getPageCleanContentByTitle(username: string, apiToken: string, spaceKey: string, title: string) {
    try {
      const page = await this.getPageByTitle(username, apiToken, spaceKey, title);
      if (page && page.body && page.body.storage) {
        const rawContent = page.body.storage.value;
        return this._stripHtml(rawContent);
      }
      return null;
    } catch (error: any) {
      console.error(`Error fetching clean content for page '${title}' in space '${spaceKey}': ${error.message}`);
      return null;
    }
  }

  async getEnhancedPageAnalysis(username: string, apiToken: string, spaceKey: string, title: string) {
    try {
      const rawContent = await this.getPageCleanContentByTitle(username, apiToken, spaceKey, title);
      if (!rawContent) {
        return null;
      }

      return this._analyzeContentStructure(rawContent);
    } catch (error: any) {
      console.error(`Error analyzing page content: ${error.message}`);
      return null;
    }
  }

  _analyzeContentStructure(content: string) {
    const isHebrew = this._isPrimarylyHebrew(content);
    const lang = isHebrew ? 'hebrew' : 'english';
    const sentences = this._splitIntoSentences(content);

    const analysis: any = {
      language: lang,
      confirmed_attack_flow: [],
      speculation: [],
      investigation_steps: [],
      question_marks: [],
      confidence_analysis: {}
    };

    for (const sentence of sentences) {
      const sentenceAnalysis = this._analyzeSentence(sentence.trim(), lang);

      if (sentenceAnalysis.type === 'confirmed_attack') {
        analysis.confirmed_attack_flow.push({
          text: sentence,
          confidence: sentenceAnalysis.confidence,
          indicators: sentenceAnalysis.indicators
        });
      } else if (sentenceAnalysis.type === 'speculation') {
        analysis.speculation.push({
          text: sentence,
          speculation_markers: sentenceAnalysis.markers,
          confidence: sentenceAnalysis.confidence
        });
      } else if (sentenceAnalysis.type === 'investigation') {
        analysis.investigation_steps.push({
          text: sentence,
          investigation_markers: sentenceAnalysis.markers
        });
      } else if (sentenceAnalysis.type === 'question_mark') {
        analysis.question_marks.push({
          text: sentence,
          missing_info: sentenceAnalysis.missing_info,
          investigation_suggestions: sentenceAnalysis.suggestions
        });
      }
    }

    analysis.confidence_analysis = this._generateConfidenceSummary(analysis);

    return analysis;
  }

  _isPrimarylyHebrew(text: string) {
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    return (hebrewChars / Math.max(totalChars, 1)) > 0.3;
  }

  _splitIntoSentences(content: string) {
    // Split by common sentence endings
    let sentences = content.split(/[.!?։]\s+/);
    
    // Further split by line breaks for better granularity
    const result = [];
    for (const sentence of sentences) {
      if (sentence.includes('\n')) {
        result.push(...sentence.split('\n').map((s: string) => s.trim()).filter((s: string) => s));
      } else {
        result.push(sentence.trim());
      }
    }
    
    // Filter very short sentences
    return result.filter(s => s.length > 10);
  }

  _analyzeSentence(sentence: string, lang: string) {
    const sentenceLower = sentence.toLowerCase();

    // Check for speculation markers
    const speculationMarkers = [];
    for (const marker of this.speculationMarkers[lang]) {
      if (sentenceLower.includes(marker.toLowerCase())) {
        speculationMarkers.push(marker);
      }
    }

    // Check for investigation markers
    const investigationMarkers = [];
    for (const marker of this.investigationPatterns[lang]) {
      if (sentenceLower.includes(marker.toLowerCase())) {
        investigationMarkers.push(marker);
      }
    }

    // Determine confidence level
    const confidence = this._assessConfidence(sentence, lang);

    // Classify sentence type
    if (speculationMarkers.length > 0) {
      return {
        type: 'speculation',
        markers: speculationMarkers,
        confidence
      };
    } else if (investigationMarkers.length > 0) {
      return {
        type: 'investigation',
        markers: investigationMarkers,
        confidence
      };
    } else if (confidence === 'uncertain' || sentenceLower.includes('unknown') || sentenceLower.includes('unclear')) {
      return {
        type: 'question_mark',
        missing_info: this._extractMissingInfo(sentence),
        suggestions: this._generateInvestigationSuggestions(sentence),
        confidence
      };
    } else {
      return {
        type: 'confirmed_attack',
        confidence,
        indicators: this._extractTechnicalIndicators(sentence)
      };
    }
  }

  _assessConfidence(sentence: string, lang: string) {
    const sentenceLower = sentence.toLowerCase();

    // Check high confidence patterns
    for (const pattern of this.confidencePatterns.high[lang]) {
      if (sentenceLower.includes(pattern.toLowerCase())) {
        return 'confirmed';
      }
    }

    // Check medium confidence patterns
    for (const pattern of this.confidencePatterns.medium[lang]) {
      if (sentenceLower.includes(pattern.toLowerCase())) {
        return 'likely';
      }
    }

    // Check low confidence patterns
    for (const pattern of this.confidencePatterns.low[lang]) {
      if (sentenceLower.includes(pattern.toLowerCase())) {
        return 'uncertain';
      }
    }

    // Default assessment based on language patterns
    if (['not', 'no', 'לא', 'אין'].some(word => sentenceLower.includes(word))) {
      return 'uncertain';
    }

    return 'likely'; // Default for statements without explicit confidence markers
  }

  _extractMissingInfo(sentence: string) {
    const missingPatterns = [
      'need to check', 'unclear', 'unknown', 'unconfirmed', 'not verified',
      'צריך לבדוק', 'לא ברור', 'לא ידוע', 'לא אושר', 'לא מאומת'
    ];

    for (const pattern of missingPatterns) {
      if (sentence.toLowerCase().includes(pattern.toLowerCase())) {
        return `Missing: Information about ${pattern}`;
      }
    }

    return 'Missing: Additional verification needed';
  }

  _generateInvestigationSuggestions(sentence: string) {
    const suggestions = [];
    const sentenceLower = sentence.toLowerCase();

    // Analyze what type of investigation might be needed
    if (['ip', 'address', 'host', 'server'].some(term => sentenceLower.includes(term))) {
      suggestions.push('Check network logs for IP/host activity');
    }

    if (['file', 'hash', 'malware'].some(term => sentenceLower.includes(term))) {
      suggestions.push('Verify file hashes and malware signatures');
    }

    if (['user', 'account', 'login'].some(term => sentenceLower.includes(term))) {
      suggestions.push('Review authentication logs and user activity');
    }

    if (['time', 'when', 'timestamp'].some(term => sentenceLower.includes(term))) {
      suggestions.push('Confirm exact timestamps from logs');
    }

    if (suggestions.length === 0) {
      suggestions.push('Gather additional evidence to confirm this information');
    }

    return suggestions.join('; ');
  }

  _extractTechnicalIndicators(sentence: string) {
    const indicators = [];

    // IP addresses
    const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    const ips = sentence.match(ipPattern) || [];
    indicators.push(...ips.map(ip => ({ type: 'ip', value: ip })));

    // Domains
    const domainPattern = /\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\b/g;
    const domains = sentence.match(domainPattern) || [];
    indicators.push(...domains.map(domain => ({ type: 'domain', value: domain })));

    // File hashes (MD5, SHA1, SHA256)
    const hashPattern = /\b[a-fA-F0-9]{32,64}\b/g;
    const hashes = sentence.match(hashPattern) || [];
    indicators.push(...hashes.map(hash => ({ type: 'hash', value: hash })));

    // CVEs
    const cvePattern = /CVE-\d{4}-\d{4,7}/gi;
    const cves = sentence.match(cvePattern) || [];
    indicators.push(...cves.map(cve => ({ type: 'cve', value: cve })));

    return indicators;
  }

  _generateConfidenceSummary(analysis: any) {
    const totalStatements = 
      analysis.confirmed_attack_flow.length +
      analysis.speculation.length +
      analysis.investigation_steps.length +
      analysis.question_marks.length;

    if (totalStatements === 0) {
      return { overall_confidence: 'unknown', reliability_score: 0 };
    }

    const confirmedCount = analysis.confirmed_attack_flow.length;
    const speculationCount = analysis.speculation.length;
    const questionCount = analysis.question_marks.length;

    const confirmedRatio = confirmedCount / totalStatements;
    const speculationRatio = speculationCount / totalStatements;

    let overallConfidence;
    let reliabilityScore;

    if (confirmedRatio > 0.7) {
      overallConfidence = 'high';
      reliabilityScore = 85 + (confirmedRatio - 0.7) * 50;
    } else if (confirmedRatio > 0.4) {
      overallConfidence = 'medium';
      reliabilityScore = 50 + confirmedRatio * 50;
    } else {
      overallConfidence = 'low';
      reliabilityScore = confirmedRatio * 50;
    }

    return {
      overall_confidence: overallConfidence,
      reliability_score: Math.min(Math.floor(reliabilityScore), 100),
      confirmed_statements: confirmedCount,
      speculation_statements: speculationCount,
      investigation_statements: analysis.investigation_steps.length,
      question_marks: questionCount,
      total_statements: totalStatements
    };
  }

  _stripHtml(htmlContent: string) {
    // Remove comments
    htmlContent = htmlContent.replace(/<!--.*?-->/gs, '');
    
    // Remove scripts and styles
    htmlContent = htmlContent.replace(/<script[^>]*?>.*?<\/script>/gis, '');
    htmlContent = htmlContent.replace(/<style[^>]*?>.*?<\/style>/gis, '');
    
    // Replace breaks and paragraphs with newlines
    htmlContent = htmlContent.replace(/<br\s*\/?>/gi, '\n');
    htmlContent = htmlContent.replace(/<\/p>/gi, '\n\n');
    htmlContent = htmlContent.replace(/<\/div>/gi, '\n');
    htmlContent = htmlContent.replace(/<\/h[1-6]>/gi, '\n\n');
    
    // Remove all remaining HTML tags
    htmlContent = htmlContent.replace(/<[^>]+>/g, '');
    
    // Decode HTML entities
    htmlContent = this._decodeHtmlEntities(htmlContent);
    
    // Clean up whitespace
    htmlContent = htmlContent.replace(/\n\s*\n\s*\n+/g, '\n\n'); // Multiple newlines to double
    htmlContent = htmlContent.replace(/ +/g, ' '); // Multiple spaces to single
    htmlContent = htmlContent.trim();
    
    return htmlContent;
  }

  _decodeHtmlEntities(text: string) {
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&nbsp;': ' '
    } as Record<string, string>;
    
    return text.replace(/&[^;]+;/g, match => entities[match] || match);
  }
}

export default ConfluenceService;
