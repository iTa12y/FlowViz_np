from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from services.redis_service import RedisService
from services.confluence_service import ConfluenceService
import os
import secrets
import logging

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)

# Security headers
@app.after_request
def add_security_headers(response):
    # Prevent credentials from being cached
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, private'
    response.headers['Pragma'] = 'no-cache'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    # HSTS header for HTTPS enforcement (uncomment in production)
    # response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

allowed_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
CORS(app, 
     origins=allowed_origins,
     methods=['GET', 'POST', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization', 'X-Session-ID'],
     supports_credentials=True,
     max_age=3600)

def limiter_key_func():
    """Skip rate limiting for OPTIONS requests (CORS preflight)"""
    if request.method == 'OPTIONS':
        return None
    return get_remote_address()

# Build Redis URI with password if available
redis_password = os.getenv('REDIS_PASSWORD')
redis_uri = f"redis://:{redis_password}@{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', 6379)}" if redis_password else f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', 6379)}"

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per hour", "50 per minute"],
    storage_uri=f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', 6379)}",
    storage_options={"socket_connect_timeout": 30},
    strategy="fixed-window"
)

try:
    redis_service = RedisService()
    confluence_service = ConfluenceService()
except Exception as init_error:
    logging.error(f"Service initialization failed: {str(init_error)}")
    raise

def get_session_id_from_request():
    """Extract session_id from cookies or Cookie header (for proxied requests)"""
    # First try Flask's cookie parser (direct browser requests)
    session_id = request.cookies.get('session_id')
    
    if session_id:
        logging.info(f"Found session_id in request.cookies: {session_id}")
        return session_id
    
    # If not found, parse from Cookie header (proxied requests from backend)
    cookie_header = request.headers.get('Cookie')
    logging.info(f"Cookie header: '{cookie_header}'")
    
    if cookie_header:
        import re
        # Try different patterns
        match = re.search(r'session_id=([^;,\s]+)', cookie_header)
        if match:
            session_id = match.group(1)
            logging.info(f"Extracted session_id from header: {session_id}")
            return session_id
        else:
            logging.error(f"Failed to extract session_id from Cookie header: {cookie_header}")
    else:
        logging.warning("No Cookie header found in request")
    
    return None

@app.route('/health', methods=['GET'])
@limiter.limit("100 per minute")
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "flowviz-api"}), 200

# Authentication endpoints
@app.route('/api/auth/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    """Authenticate user with Confluence credentials and create session"""
    try:
        data = request.json
        username = data.get('username')
        api_token = data.get('api_token')
        
        if not all([username, api_token]):
            return jsonify({"error": "username and api_token are required"}), 400
        
        # Validate credentials using ConfluenceService
        if not confluence_service.validate_credentials(username, api_token):
            logging.error("Authentication failed: Invalid Confluence credentials")
            return jsonify({"error": "Invalid Confluence credentials"}), 401
        
        # Get Confluence URL from service
        confluence_url = confluence_service.confluence_url
        
        # Create session with credentials (stored only in session, not permanently)
        session_id = secrets.token_urlsafe(32)
        logging.info(f"Login - Creating session with ID: {session_id} for user: {username}")
        
        session_created = redis_service.set_session(
            session_id, username, ttl=3600,  # 1 hour session
            api_token=api_token, confluence_url=confluence_url
        )
        logging.info(f"Login - Session creation result: {session_created}")
        
        # Create response with HTTP-only secure cookie
        response = jsonify({
            "success": True,
            "username": username,
            "message": "Authentication successful"
        })
        
        # Set HTTP-only cookie
        is_production = os.getenv('FLASK_ENV') == 'production'
        
        # Development: use Lax (works for localhost same-site)
        # Production: use Strict for maximum security
        response.set_cookie(
            'session_id',
            session_id,
            httponly=True,
            secure=is_production,
            samesite='Lax',  # Works for localhost:5173 -> localhost:5001
            max_age=3600  # 1 hour
        )
        
        return response, 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/verify', methods=['GET'])
@limiter.limit("50 per minute")
def verify_session():
    """Verify if session is valid"""
    try:
        session_id = get_session_id_from_request()
        
        if not session_id:
            logging.warning("Verify - No session ID found")
            return jsonify({"valid": False, "error": "No session ID provided"}), 401
        
        logging.info(f"Verify - Looking up session_id in Redis: {session_id}")
        username = redis_service.get_session(session_id)
        logging.info(f"Verify - Redis returned username: {username}")
        
        if username:
            return jsonify({"valid": True, "username": username}), 200
        else:
            return jsonify({"valid": False, "error": "Invalid or expired session"}), 401
            
    except Exception as e:
        logging.exception("Verify session error")
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
@limiter.limit("20 per minute")
def logout():
    """Logout user and destroy session"""
    try:
        session_id = get_session_id_from_request()
        
        if session_id:
            redis_service.delete_session(session_id)
        
        response = jsonify({"success": True, "message": "Logged out successfully"})
        response.set_cookie('session_id', '', expires=0, httponly=True, samesite='Lax')
        
        return response, 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/status', methods=['GET'])
def check_auth_status():
    """Debug endpoint to check authentication status and session data"""
    try:
        session_id = get_session_id_from_request()
        if not session_id:
            return jsonify({"error": "No session ID found"}), 401
        
        username = redis_service.get_session_username(session_id)
        credentials = redis_service.get_session_credentials(session_id)
        
        return jsonify({
            "session_id": session_id,
            "username": username,
            "has_credentials": credentials is not None,
            "credentials_keys": list(credentials.keys()) if credentials else None
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/confluence/page', methods=['GET'])
@limiter.limit("30 per minute")
def get_confluence_page_by_title():
    try:
        # Verify session and get user credentials
        session_id = get_session_id_from_request()
        if not session_id:
            return jsonify({"error": "Authentication required"}), 401
        
        username = redis_service.get_session_username(session_id)
        if not username:
            return jsonify({"error": "Invalid or expired session"}), 401
        
        # Retrieve user credentials from session
        logging.info(f"Confluence - Getting credentials for session: {session_id}")
        credentials = redis_service.get_session_credentials(session_id)
        logging.info(f"Confluence - Retrieved credentials: {credentials is not None}")
        if not credentials:
            logging.error(f"Confluence - Session credentials not found for session: {session_id}")
            return jsonify({"error": "Session credentials not found. Please log in again."}), 401
        
        space_key = request.args.get('space')
        title = request.args.get('title')     
        if not space_key or not title:
            return jsonify({"error": "Both 'space' and 'title' query parameters are required"}), 400
        
        content = confluence_service.get_page_clean_content_by_title(
            credentials['username'], 
            credentials['api_token'], 
            space_key, 
            title
        )
        if content:
            return jsonify({"space": space_key, "title": title, "content": content}), 200
        else:
            return jsonify({"error": "Page not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Enhanced Confluence endpoint for content analysis
@app.route('/api/confluence/analyze', methods=['POST'])
@limiter.limit("10 per minute")
def analyze_confluence_page():
    """Analyze Confluence page content and separate speculation from facts"""
    try:
        session_id = get_session_id_from_request()
        if not session_id:
            return jsonify({"error": "Authentication required"}), 401
        
        username = redis_service.get_session_username(session_id)
        if not username:
            return jsonify({"error": "Invalid or expired session"}), 401
            
        credentials = redis_service.get_session_credentials(session_id)
        if not credentials:
            return jsonify({"error": "Session credentials not found. Please log in again."}), 401

        data = request.json
        if not data:
            return jsonify({"error": "Request body is required"}), 400

        space_key = data.get('space_key')
        page_title = data.get('page_title')
        
        if not all([space_key, page_title]):
            return jsonify({"error": "space_key and page_title are required"}), 400

        # Get enhanced analysis from Confluence service
        analysis = confluence_service.get_enhanced_page_analysis(
            credentials['username'], 
            credentials['api_token'], 
            space_key, 
            page_title
        )
        
        if analysis:
            return jsonify({
                "success": True, 
                "analysis": analysis,
                "page_info": {
                    "space_key": space_key,
                    "title": page_title,
                    "confluence_url": credentials.get('confluence_url')
                }
            }), 200
        else:
            return jsonify({"error": "Page not found or analysis failed"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Flow storage endpoints (user-specific)
@app.route('/api/flows', methods=['GET'])
@limiter.limit("50 per minute")
def get_user_flows():
    """Get all flows for authenticated user"""
    try:
        session_id = get_session_id_from_request()
        if not session_id:
            return jsonify({"error": "Authentication required"}), 401
        
        username = redis_service.get_session_username(session_id)
        if not username:
            return jsonify({"error": "Invalid or expired session"}), 401
        
        flows = redis_service.get_user_flows(username)
        return jsonify({"flows": flows}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/flows', methods=['POST'])
@limiter.limit("30 per minute")
def save_user_flow():
    """Save or update a flow for authenticated user"""
    try:
        session_id = get_session_id_from_request()
        if not session_id:
            return jsonify({"error": "Authentication required"}), 401
        
        username = redis_service.get_session_username(session_id)
        if not username:
            return jsonify({"error": "Invalid or expired session"}), 401
        
        flow_data = request.json
        if not flow_data:
            return jsonify({"error": "Flow data is required"}), 400
        
        result = redis_service.save_user_flow(username, flow_data)
        return jsonify({"success": result, "flow": flow_data}), 201
    except Exception as e:
        print(f"Error saving flow: {str(e)}")  # Log the actual error
        import traceback
        traceback.print_exc()  # Print full stack trace
        return jsonify({"error": str(e)}), 500

@app.route('/api/flows/<flow_id>', methods=['DELETE'])
@limiter.limit("20 per minute")
def delete_user_flow(flow_id):
    """Delete a specific flow for authenticated user"""
    try:
        session_id = get_session_id_from_request()
        if not session_id:
            return jsonify({"error": "Authentication required"}), 401
        
        username = redis_service.get_session_username(session_id)
        if not username:
            return jsonify({"error": "Invalid or expired session"}), 401
        
        result = redis_service.delete_user_flow(username, flow_id)
        return jsonify({"success": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Redis endpoints (kept for backward compatibility, but should be deprecated)
@app.route('/api/redis/set', methods=['POST'])
@limiter.limit("20 per minute")
def redis_set():
    try:
        data = request.json
        key = data.get('key')
        value = data.get('value')
        
        if not key or value is None:
            return jsonify({"error": "Both 'key' and 'value' are required"}), 400
        
        result = redis_service.set_value(key, value)
        return jsonify({"success": result, "key": key}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/redis/get/<key>', methods=['GET'])
@limiter.limit("50 per minute")
def redis_get(key):
    try:
        value = redis_service.get_value(key)
        
        if value is not None:
            return jsonify({"key": key, "value": value}), 200
        else:
            return jsonify({"error": "Key not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/redis/delete/<key>', methods=['DELETE'])
@limiter.limit("20 per minute")
def redis_delete(key):
    try:
        result = redis_service.delete_value(key)
        return jsonify({"success": result > 0, "key": key}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('API_PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)

