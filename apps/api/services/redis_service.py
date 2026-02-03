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
        
    def set_session(self, session_id: str, username: str, ttl: int = 3600, api_token: str = None, confluence_url: str = None) -> bool:
        """Create a session with username and optionally API credentials (default 1 hour)"""
        print(f"Redis - Setting session: session_id={session_id}, username={username}, ttl={ttl}")
        print(f"Redis - API token provided: {api_token is not None}")
        print(f"Redis - Confluence URL provided: {confluence_url is not None}")
        
        pipeline = self.client.pipeline()
        pipeline.setex(f'session:{session_id}', ttl, '1')
        pipeline.setex(f'session:user:{session_id}', ttl, username)
        
        # Store API credentials with session if provided
        if api_token and confluence_url:
            session_data = {
                'username': username,
                'api_token': api_token,
                'confluence_url': confluence_url
            }
            credentials_json = json.dumps(session_data)
            print(f"Redis - Storing credentials JSON: {credentials_json}")
            pipeline.setex(f'session:credentials:{session_id}', ttl, credentials_json)
        else:
            print(f"Redis - Not storing credentials (missing api_token or confluence_url)")
        
        results = pipeline.execute()
        print(f"Redis - Set session results: {results}")
        return all(results)
    
    def get_session(self, session_id: str) -> Optional[str]:
        """Get username from session if valid"""
        print(f"Redis - Getting session for: {session_id}")
        
        # Try to check what keys exist in Redis (may not have permission)
        try:
            all_keys = self.client.keys('session:*')
            print(f"Redis - All session keys: {all_keys}")
        except Exception as e:
            print(f"Redis - Cannot list keys (permission denied or error): {e}")
        
        session_flag = self.client.get(f'session:{session_id}')
        print(f"Redis - Session flag value for 'session:{session_id}': {session_flag}")
        print(f"Redis - Session flag type: {type(session_flag)}")
        
        # Convert bytes to string if needed
        if isinstance(session_flag, bytes):
            session_flag = session_flag.decode('utf-8')
            print(f"Redis - Decoded session flag: {session_flag}")
        
        if session_flag == '1':
            username = self.client.get(f'session:user:{session_id}')
            
            # Convert username bytes to string if needed
            if isinstance(username, bytes):
                username = username.decode('utf-8')
            
            print(f"Redis - Username from session: {username}")
            return username
        else:
            print(f"Redis - Session not found or invalid (flag was: {session_flag})")
            return None
    
    def get_session_credentials(self, session_id: str) -> Optional[dict]:
        """Get API credentials from session if available"""
        print(f"Redis - Getting credentials for session: {session_id}")
        credentials_data = self.client.get(f'session:credentials:{session_id}')
        print(f"Redis - Raw credentials data: {credentials_data}")
        print(f"Redis - Credentials data type: {type(credentials_data)}")
        
        if credentials_data:
            if isinstance(credentials_data, bytes):
                credentials_data = credentials_data.decode('utf-8')
                print(f"Redis - Decoded credentials data: {credentials_data}")
            try:
                parsed_credentials = json.loads(credentials_data)
                print(f"Redis - Parsed credentials: {parsed_credentials}")
                return parsed_credentials
            except json.JSONDecodeError as e:
                print(f"Redis - JSON decode error: {e}")
                return None
        else:
            print(f"Redis - No credentials found for session: {session_id}")
            return None
    
    def get_session_username(self, session_id: str) -> Optional[str]:
        """Get username from session (alias for get_session for clarity)"""
        return self.get_session(session_id)
    
    def delete_session(self, session_id: str) -> int:
        """Delete a session (logout)"""
        pipeline = self.client.pipeline()
        pipeline.delete(f'session:{session_id}')
        pipeline.delete(f'session:user:{session_id}')
        pipeline.delete(f'session:credentials:{session_id}')
        results = pipeline.execute()
        return sum(results)
    
    # Flow storage methods
    def get_user_flows(self, username: str) -> List[dict]:
        """Get all flows for a specific user"""
        flows_key = f'user:flows:{username}'
        value = self.client.get(flows_key)
        
        if not value:
            return []
        
        try:
            flows = json.loads(value)
            # Ensure flows is a list
            if not isinstance(flows, list):
                return []
            # Ensure each item is a dict (handle double-encoded data)
            parsed_flows = []
            for flow in flows:
                if isinstance(flow, str):
                    # Double-encoded, parse it
                    try:
                        parsed_flows.append(json.loads(flow))
                    except:
                        pass
                elif isinstance(flow, dict):
                    parsed_flows.append(flow)
            return parsed_flows
        except json.JSONDecodeError:
            return []
    
    def save_user_flow(self, username: str, flow_data: dict) -> bool:
        """Save or update a flow for a user"""
        flows_key = f'user:flows:{username}'
        flows = self.get_user_flows(username)
        
        # Check if flow exists (by id)
        flow_id = flow_data.get('id')
        if flow_id:
            # Update existing flow
            flows = [f for f in flows if f.get('id') != flow_id]
        
        flows.append(flow_data)
        return self.set_value(flows_key, flows)
    
    def delete_user_flow(self, username: str, flow_id: str) -> bool:
        """Delete a specific flow for a user"""
        flows_key = f'user:flows:{username}'
        flows = self.get_user_flows(username)
        
        # Filter out the flow to delete
        updated_flows = [f for f in flows if f.get('id') != flow_id]
        
        if len(updated_flows) == len(flows):
            return False  # Flow not found
        
        return self.set_value(flows_key, updated_flows)
