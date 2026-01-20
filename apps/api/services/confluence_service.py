from atlassian import Confluence
from dotenv import load_dotenv
import os
import re
from html import unescape
from typing import Optional, Dict, Any

load_dotenv()

class ConfluenceService:
    def __init__(self):
        """Initialize Confluence connection using environment variables"""
        self.confluence_url = os.getenv('CONFLUENCE_URL')
        self.confluence_username = os.getenv('CONFLUENCE_USERNAME')
        self.confluence_api_token = os.getenv('CONFLUENCE_API_TOKEN')
                
        if not all([self.confluence_url, self.confluence_username, self.confluence_api_token]):
            raise ValueError("Confluence credentials not properly configured. Please set CONFLUENCE_URL, CONFLUENCE_USERNAME, and CONFLUENCE_API_TOKEN environment variables.")
        
        self.client = self._create_client()
    
    def _create_client(self):
        """Create Confluence client instance"""
        return Confluence(
            url=self.confluence_url,
            username=self.confluence_username,
            password=self.confluence_api_token,
            cloud=True
        )
    
    def get_page_by_title(self, space_key: str, title: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a Confluence page by space and title
        
        Args:
            space_key: The space key where the page exists
            title: The title of the page (must be unique within the space)
        
        Returns:
            Dictionary containing page data, or None if not found
        """
        try:
            page = self.client.get_page_by_title(
                space=space_key,
                title=title,
                expand='body.storage'
            )
            return page
        except Exception as e:
            print(f"Error fetching page '{title}' in space '{space_key}': {str(e)}")
            return None
    
    def get_page_clean_content_by_title(self, space_key: str, title: str) -> Optional[str]:
        try:
            page = self.get_page_by_title(space_key, title)
            if page and 'body' in page and 'storage' in page['body']:
                raw_content = page['body']['storage']['value']
                return self._strip_html(raw_content)
            return None
        except Exception as e:
            print(f"Error fetching clean content for page '{title}' in space '{space_key}': {str(e)}")
            return None
    
    def _strip_html(self, html_content: str) -> str:
        # Remove HTML comments
        html_content = re.sub(r'<!--.*?-->', '', html_content, flags=re.DOTALL)        
        # Remove script and style elements
        html_content = re.sub(r'<script[^>]*?>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        html_content = re.sub(r'<style[^>]*?>.*?</style>', '', html_content, flags=re.DOTALL | re.IGNORECASE)        
        # Replace <br>, <p>, <div> with newlines
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
