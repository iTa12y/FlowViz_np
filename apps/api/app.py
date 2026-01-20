from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from services.redis_service import RedisService
from services.confluence_service import ConfluenceService
import os
import secrets

app = Flask(__name__)

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

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per hour", "50 per minute"],
    storage_uri=f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', 6379)}",
    storage_options={"socket_connect_timeout": 30},
    strategy="fixed-window"
)

redis_service = RedisService()
confluence_service = ConfluenceService()

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
        
        # Use Confluence URL from environment
        confluence_url = os.getenv('CONFLUENCE_URL')
        if not confluence_url:
            return jsonify({"error": "Confluence URL not configured on server"}), 500
        
        # Test Confluence connection to validate credentials
        try:
            from atlassian import Confluence
            test_client = Confluence(
                url=confluence_url,
                username=username,
                password=api_token,
                cloud=True
            )
            
            # Validate credentials by trying to get spaces
            test_client.get_all_spaces(start=0, limit=1)
        except Exception as e:
            # Log error server-side but don't expose details to client
            print(f"Authentication failed: {str(e)}")
            return jsonify({"error": "Invalid Confluence credentials"}), 401
        
        # Store credentials securely (hashed)
        redis_service.store_credentials(username, api_token, confluence_url)
        
        # Create session
        session_id = secrets.token_urlsafe(32)
        redis_service.set_session(session_id, username, ttl=3600)  # 1 hour session
        
        return jsonify({
            "success": True,
            "session_id": session_id,
            "username": username,
            "message": "Authentication successful"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/verify', methods=['GET'])
@limiter.limit("50 per minute")
def verify_session():
    """Verify if session is valid"""
    try:
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            return jsonify({"valid": False, "error": "No session ID provided"}), 401
        
        username = redis_service.get_session(session_id)
        
        if username:
            return jsonify({"valid": True, "username": username}), 200
        else:
            return jsonify({"valid": False, "error": "Invalid or expired session"}), 401
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
@limiter.limit("20 per minute")
def logout():
    """Logout user and destroy session"""
    try:
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            return jsonify({"error": "No session ID provided"}), 400
        
        result = redis_service.delete_session(session_id)
        
        return jsonify({"success": True, "message": "Logged out successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/confluence/page', methods=['GET'])
@limiter.limit("30 per minute")
def get_confluence_page_by_title():
    """Fetch clean text content of a Confluence page by title"""
    try:
        space_key = request.args.get('space')
        title = request.args.get('title')     
        if not space_key or not title:
            return jsonify({"error": "Both 'space' and 'title' query parameters are required"}), 400
        content = confluence_service.get_page_clean_content_by_title(space_key, title)
        if content:
            return jsonify({"space": space_key, "title": title, "content": content}), 200
        else:
            return jsonify({"error": "Page not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Redis endpoints
@app.route('/api/redis/set', methods=['POST'])
@limiter.limit("20 per minute")
def redis_set():
    """Set a value in Redis"""
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
    """Get a value from Redis"""
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
    """Delete a key from Redis"""
    try:
        result = redis_service.delete_value(key)
        return jsonify({"success": result > 0, "key": key}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('API_PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)

