from atlassian import Confluence
from dotenv import load_dotenv
import os
import re
from html import unescape
from typing import Optional, Dict, Any, Tuple

load_dotenv()

class ConfluenceService:
    def __init__(self):
        self.confluence_url = os.getenv('CONFLUENCE_URL')
        if not self.confluence_url:
            raise ValueError("CONFLUENCE_URL not configured in environment")
        
        # Speculation markers for different languages
        self.speculation_markers = {
            'english': [
                'maybe', 'possibly', 'could be', 'might have', 'we think', 'probably', 
                'likely', 'appears to', 'seems to', 'suggests', 'indicates', 'potential',
                'presumably', 'supposedly', 'allegedly', 'it is believed', 'we assume',
                'hypothesis', 'theory', 'speculation', 'conjecture', 'suspected',
                'unclear', 'uncertain', 'unknown', 'unconfirmed', 'unverified'
            ],
            'hebrew': [
                'יכול להיות', 'אולי', 'ייתכן', 'נראה כי', 'סביר להניח', 'כנראה',
                'יתכן ו', 'בסבירות גבוהה', 'ככל הנראה', 'לכאורה', 'לפי ההשערה',
                'ההשערה היא', 'אנו משערים', 'אנו חושדים', 'חשד', 'השערה', 'הנחה',
                'לא ברור', 'לא וודאי', 'לא אושר', 'לא מאומת', 'טרם אומת'
            ]
        }
        
        # Patterns for investigation activities
        self.investigation_patterns = {
            'english': [
                'we checked', 'we analyzed', 'we reviewed', 'we investigated', 'we found',
                'analysis shows', 'investigation revealed', 'examination of', 'review of',
                'log analysis', 'forensic analysis', 'we searched', 'we queried',
                'looking at the logs', 'examining the', 'upon review', 'our investigation'
            ],
            'hebrew': [
                'בדקנו', 'ניתחנו', 'סקרנו', 'חקרנו', 'מצאנו', 'גילינו', 'התברר',
                'הניתוח מראה', 'החקירה גילתה', 'בדיקת', 'ניתוח של', 'סקירת',
                'ניתוח לוגים', 'ניתוח פורנזי', 'חיפוש', 'בעת בדיקת', 'מבדיקה עולה'
            ]
        }
        
        # Confidence indicators
        self.confidence_patterns = {
            'high': {
                'english': ['confirmed', 'verified', 'proven', 'established', 'clear evidence', 'definitive'],
                'hebrew': ['אושר', 'אומת', 'הוכח', 'הוכחנו', 'ראיות ברורות', 'ודאי']
            },
            'medium': {
                'english': ['likely', 'appears', 'indicates', 'suggests', 'evidence shows'],
                'hebrew': ['נראה', 'מצביע על', 'מעיד על', 'הראיות מצביעות', 'כנראה']
            },
            'low': {
                'english': ['possibly', 'might', 'could', 'potentially', 'maybe'],
                'hebrew': ['יתכן', 'אולי', 'יכול להיות', 'פוטנציאל', 'ייתכן']
            }
        }
    
    def _create_client(self, username: str, api_token: str):
        """Create Confluence client instance with user credentials"""
        if not username or not api_token:
            return None
        return Confluence(
            url=self.confluence_url,
            username=username,
            password=api_token,
            cloud=True
        )
    
    def validate_credentials(self, username: str, api_token: str) -> bool:
        """Validate Confluence credentials by attempting to fetch spaces"""
        try:
            client = self._create_client(username, api_token)
            # Test credentials by fetching spaces (minimal request)
            client.get_all_spaces(start=0, limit=1)
            return True
        except Exception as validation_error:
            print(f"Credential validation failed: {str(validation_error)}")
            return False
    
    def get_page_by_title(self, username: str, api_token: str, space_key: str, title: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a Confluence page by space and title
        
        Args:
            username: Confluence username
            api_token: Confluence API token
            space_key: The space key where the page exists
            title: The title of the page (must be unique within the space)
        
        Returns:
            Dictionary containing page data, or None if not found
        """
        try:
            client = self._create_client(username, api_token)
            if not client:
                return None
            page = client.get_page_by_title(
                space=space_key,
                title=title,
                expand='body.storage'
            )
            return page
        except Exception as e:
            print(f"Error fetching page '{title}' in space '{space_key}': {str(e)}")
            return None
    
    def get_page_clean_content_by_title(self, username: str, api_token: str, space_key: str, title: str) -> Optional[str]:
        try:
            page = self.get_page_by_title(username, api_token, space_key, title)
            if page and 'body' in page and 'storage' in page['body']:
                raw_content = page['body']['storage']['value']
                return self._strip_html(raw_content)
            return None
        except Exception as e:
            print(f"Error fetching clean content for page '{title}' in space '{space_key}': {str(e)}")
            return None

    def get_enhanced_page_analysis(self, username: str, api_token: str, space_key: str, title: str) -> Optional[Dict[str, Any]]:
        """
        Get page content with enhanced analysis separating facts from speculation
        
        Returns:
            Dictionary with separated content sections and confidence analysis
        """
        try:
            raw_content = self.get_page_clean_content_by_title(username, api_token, space_key, title)
            if not raw_content:
                return None
                
            return self._analyze_content_structure(raw_content)
        except Exception as e:
            print(f"Error analyzing page content: {str(e)}")
            return None

    def _analyze_content_structure(self, content: str) -> Dict[str, Any]:
        """
        Analyze content to separate attack flow facts from speculation and investigation
        """
        # Detect primary language
        is_hebrew = self._is_primarily_hebrew(content)
        lang = 'hebrew' if is_hebrew else 'english'
        
        # Split content into sentences/paragraphs
        sentences = self._split_into_sentences(content)
        
        analysis = {
            'language': lang,
            'confirmed_attack_flow': [],
            'speculation': [],
            'investigation_steps': [],
            'question_marks': [],
            'confidence_analysis': {}
        }
        
        for sentence in sentences:
            sentence_analysis = self._analyze_sentence(sentence.strip(), lang)
            
            if sentence_analysis['type'] == 'confirmed_attack':
                analysis['confirmed_attack_flow'].append({
                    'text': sentence,
                    'confidence': sentence_analysis['confidence'],
                    'indicators': sentence_analysis['indicators']
                })
            elif sentence_analysis['type'] == 'speculation':
                analysis['speculation'].append({
                    'text': sentence,
                    'speculation_markers': sentence_analysis['markers'],
                    'confidence': sentence_analysis['confidence']
                })
            elif sentence_analysis['type'] == 'investigation':
                analysis['investigation_steps'].append({
                    'text': sentence,
                    'investigation_markers': sentence_analysis['markers']
                })
            elif sentence_analysis['type'] == 'question_mark':
                analysis['question_marks'].append({
                    'text': sentence,
                    'missing_info': sentence_analysis['missing_info'],
                    'investigation_suggestions': sentence_analysis['suggestions']
                })
        
        # Generate overall confidence analysis
        analysis['confidence_analysis'] = self._generate_confidence_summary(analysis)
        
        return analysis

    def _is_primarily_hebrew(self, text: str) -> bool:
        """Check if text is primarily in Hebrew"""
        hebrew_chars = len(re.findall(r'[\u0590-\u05FF]', text))
        total_chars = len(re.sub(r'\s', '', text))
        return (hebrew_chars / max(total_chars, 1)) > 0.3

    def _split_into_sentences(self, content: str) -> list:
        """Split content into sentences while preserving Hebrew sentence structure"""
        # Split by common sentence endings
        sentences = re.split(r'[.!?։]\s+', content)
        # Further split by line breaks for better granularity
        result = []
        for sentence in sentences:
            if '\n' in sentence:
                result.extend([s.strip() for s in sentence.split('\n') if s.strip()])
            else:
                result.append(sentence.strip())
        return [s for s in result if len(s.strip()) > 10]  # Filter very short sentences

    def _analyze_sentence(self, sentence: str, lang: str) -> Dict[str, Any]:
        """Analyze individual sentence to classify its content type"""
        sentence_lower = sentence.lower()
        
        # Check for speculation markers
        speculation_markers = []
        for marker in self.speculation_markers[lang]:
            if marker.lower() in sentence_lower:
                speculation_markers.append(marker)
        
        # Check for investigation markers
        investigation_markers = []
        for marker in self.investigation_patterns[lang]:
            if marker.lower() in sentence_lower:
                investigation_markers.append(marker)
        
        # Determine confidence level
        confidence = self._assess_confidence(sentence, lang)
        
        # Classify sentence type
        if speculation_markers:
            return {
                'type': 'speculation',
                'markers': speculation_markers,
                'confidence': confidence
            }
        elif investigation_markers:
            return {
                'type': 'investigation',
                'markers': investigation_markers,
                'confidence': confidence
            }
        elif confidence == 'low' or 'unknown' in sentence_lower or 'unclear' in sentence_lower:
            return {
                'type': 'question_mark',
                'missing_info': self._extract_missing_info(sentence),
                'suggestions': self._generate_investigation_suggestions(sentence),
                'confidence': confidence
            }
        else:
            return {
                'type': 'confirmed_attack',
                'confidence': confidence,
                'indicators': self._extract_technical_indicators(sentence)
            }

    def _assess_confidence(self, sentence: str, lang: str) -> str:
        """Assess confidence level of a sentence"""
        sentence_lower = sentence.lower()
        
        # Check high confidence patterns
        for pattern in self.confidence_patterns['high'][lang]:
            if pattern.lower() in sentence_lower:
                return 'confirmed'
        
        # Check medium confidence patterns
        for pattern in self.confidence_patterns['medium'][lang]:
            if pattern.lower() in sentence_lower:
                return 'likely'
        
        # Check low confidence patterns
        for pattern in self.confidence_patterns['low'][lang]:
            if pattern.lower() in sentence_lower:
                return 'uncertain'
        
        # Default assessment based on language patterns
        if any(word in sentence_lower for word in ['not', 'no', 'לא', 'אין']):
            return 'uncertain'
        
        return 'likely'  # Default for statements without explicit confidence markers

    def _extract_missing_info(self, sentence: str) -> str:
        """Extract what information is missing from uncertain sentences"""
        # Common patterns indicating missing information
        missing_patterns = [
            'need to check', 'unclear', 'unknown', 'unconfirmed', 'not verified',
            'צריך לבדוק', 'לא ברור', 'לא ידוע', 'לא אושר', 'לא מאומת'
        ]
        
        for pattern in missing_patterns:
            if pattern.lower() in sentence.lower():
                return f"Missing: Information about {pattern}"
        
        return "Missing: Additional verification needed"

    def _generate_investigation_suggestions(self, sentence: str) -> str:
        """Generate investigation suggestions for uncertain content"""
        suggestions = []
        
        # Analyze what type of investigation might be needed
        if any(term in sentence.lower() for term in ['ip', 'address', 'host', 'server']):
            suggestions.append("Check network logs for IP/host activity")
        
        if any(term in sentence.lower() for term in ['file', 'hash', 'malware']):
            suggestions.append("Verify file hashes and malware signatures")
        
        if any(term in sentence.lower() for term in ['user', 'account', 'login']):
            suggestions.append("Review authentication logs and user activity")
        
        if any(term in sentence.lower() for term in ['time', 'when', 'timestamp']):
            suggestions.append("Confirm exact timestamps from logs")
        
        if not suggestions:
            suggestions.append("Gather additional evidence to confirm this information")
        
        return "; ".join(suggestions)

    def _extract_technical_indicators(self, sentence: str) -> list:
        """Extract technical indicators from confirmed attack sentences"""
        indicators = []
        
        # IP addresses
        ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
        ips = re.findall(ip_pattern, sentence)
        indicators.extend([{'type': 'ip', 'value': ip} for ip in ips])
        
        # Domains
        domain_pattern = r'\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\b'
        domains = re.findall(domain_pattern, sentence)
        indicators.extend([{'type': 'domain', 'value': domain} for domain in domains])
        
        # File hashes (MD5, SHA1, SHA256)
        hash_pattern = r'\b[a-fA-F0-9]{32,64}\b'
        hashes = re.findall(hash_pattern, sentence)
        indicators.extend([{'type': 'hash', 'value': hash_val} for hash_val in hashes])
        
        # CVEs
        cve_pattern = r'CVE-\d{4}-\d{4,7}'
        cves = re.findall(cve_pattern, sentence, re.IGNORECASE)
        indicators.extend([{'type': 'cve', 'value': cve} for cve in cves])
        
        return indicators

    def _generate_confidence_summary(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate overall confidence summary for the analysis"""
        total_statements = (
            len(analysis['confirmed_attack_flow']) +
            len(analysis['speculation']) +
            len(analysis['investigation_steps']) +
            len(analysis['question_marks'])
        )
        
        if total_statements == 0:
            return {'overall_confidence': 'unknown', 'reliability_score': 0}
        
        confirmed_count = len(analysis['confirmed_attack_flow'])
        speculation_count = len(analysis['speculation'])
        question_count = len(analysis['question_marks'])
        
        confirmed_ratio = confirmed_count / total_statements
        speculation_ratio = speculation_count / total_statements
        
        if confirmed_ratio > 0.7:
            overall_confidence = 'high'
            reliability_score = 85 + (confirmed_ratio - 0.7) * 50
        elif confirmed_ratio > 0.4:
            overall_confidence = 'medium'
            reliability_score = 50 + confirmed_ratio * 50
        else:
            overall_confidence = 'low'
            reliability_score = confirmed_ratio * 50
        
        return {
            'overall_confidence': overall_confidence,
            'reliability_score': min(int(reliability_score), 100),
            'confirmed_statements': confirmed_count,
            'speculation_statements': speculation_count,
            'investigation_statements': len(analysis['investigation_steps']),
            'question_marks': question_count,
            'total_statements': total_statements
        }
    
    def _strip_html(self, html_content: str) -> str:
        html_content = re.sub(r'<!--.*?-->', '', html_content, flags=re.DOTALL)        
        html_content = re.sub(r'<script[^>]*?>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        html_content = re.sub(r'<style[^>]*?>.*?</style>', '', html_content, flags=re.DOTALL | re.IGNORECASE)        
        html_content = re.sub(r'<br\s*/?>', '\n', html_content, flags=re.IGNORECASE)
        html_content = re.sub(r'</p>', '\n\n', html_content, flags=re.IGNORECASE)
        html_content = re.sub(r'</div>', '\n', html_content, flags=re.IGNORECASE)
        html_content = re.sub(r'</h[1-6]>', '\n\n', html_content, flags=re.IGNORECASE)        
        # Remove all remaining HTML tags
        html_content = re.sub(r'<[^>]+>', '', html_content)
        # Decode HTML entities
        html_content = unescape(html_content)
        # Clean up whitespace
        html_content = re.sub(r'\n\s*\n\s*\n+', '\n\n', html_content)  # Multiple newlines to double
        html_content = re.sub(r' +', ' ', html_content)  # Multiple spaces to single
        html_content = html_content.strip()        
        return html_content
