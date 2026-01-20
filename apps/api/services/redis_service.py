from redis import Redis
from dotenv import load_dotenv
import os
import json
import bcrypt
from typing import Union, List, Optional

load_dotenv()

class RedisService:
    def __init__(self):
        redis_host = os.getenv('REDIS_HOST', 'localhost')
        redis_port = int(os.getenv('REDIS_PORT', 6379))
        redis_password = os.getenv('REDIS_PASSWORD', None)
        
        self.client = Redis(
            host=redis_host, 
            port=redis_port,
            password=redis_password,
            decode_responses=True,
            db=0
        )
        
    def set_value(self, key: str, value: Union[str, dict, list]) -> bool:
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        return self.client.set(key, value)
    
    def get_value(self, key: Union[str, List[str]]) -> Union[Optional[str], List[Optional[str]]]:
        if isinstance(key, list):
            return [self.client.get(k) for k in key]
        return self.client.get(key)
    
    def get_json(self, key: str) -> Optional[dict]:
        value = self.client.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return None
        return None
    
    def delete_value(self, key: str) -> int:
        return self.client.delete(key)
    
    def exists(self, key: str) -> bool:
        return self.client.exists(key) > 0
    
    def set_session(self, session_id: str, username: str, ttl: int = 3600) -> bool:
        """Create a session with username and expiry (default 1 hour)"""
        pipeline = self.client.pipeline()
        pipeline.setex(f'session:{session_id}', ttl, '1')
        pipeline.setex(f'session:user:{session_id}', ttl, username)
        results = pipeline.execute()
        return all(results)
    
    def get_session(self, session_id: str) -> Optional[str]:
        """Get username from session if valid"""
        if self.client.get(f'session:{session_id}') == '1':
            return self.client.get(f'session:user:{session_id}')
        return None
    
    def delete_session(self, session_id: str) -> int:
        """Delete a session (logout)"""
        pipeline = self.client.pipeline()
        pipeline.delete(f'session:{session_id}')
        pipeline.delete(f'session:user:{session_id}')
        results = pipeline.execute()
        return sum(results)
    
    def store_credentials(self, username: str, api_token: str, confluence_url: str) -> bool:
        """Store hashed Confluence credentials securely"""
        # Truncate token to 72 bytes for bcrypt compatibility
        token_to_hash = api_token[:72].encode('utf-8')
        hashed_token = bcrypt.hashpw(token_to_hash, bcrypt.gensalt()).decode('utf-8')
        
        credentials = {
            'username': username,
            'hashed_token': hashed_token,
            'confluence_url': confluence_url
        }
        return self.set_value(f'user:credentials:{username}', credentials)
    
    def verify_credentials(self, username: str, api_token: str) -> Optional[dict]:
        """Verify credentials against stored hash"""
        stored_creds = self.get_json(f'user:credentials:{username}')
        if not stored_creds:
            return None
        
        # Truncate token to 72 bytes for bcrypt compatibility
        token_to_verify = api_token[:72].encode('utf-8')
        
        # Verify the token matches the hash
        if bcrypt.checkpw(token_to_verify, stored_creds['hashed_token'].encode('utf-8')):
            return {
                'username': stored_creds['username'],
                'confluence_url': stored_creds['confluence_url']
            }
        return None
