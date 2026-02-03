# Decompiled with PyLingual (https://pylingual.io)
# Internal filename: 'app.py'
# Bytecode version: 3.12.0rc2 (3531)
# Source timestamp: 2026-02-01 15:31:25 UTC (1769959885)

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
@app.after_request
def add_security_headers(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, private'
    response.headers['Pragma'] = 'no-cache'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response
allowed_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
CORS(app, origins=allowed_origins, methods=['GET', 'POST', 'DELETE', 'OPTIONS'], allow_headers=['Content-Type', 'Authorization', 'X-Session-ID'], supports_credentials=True, max_age=3600)
def limiter_key_func():
    """Skip rate limiting for OPTIONS requests (CORS preflight)"""
    if request.method == 'OPTIONS':
        return
    else:
        return get_remote_address()
redis_password = os.getenv('REDIS_PASSWORD')
redis_uri = f"redis://:{redis_password}@{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', 6379)}" if redis_password else f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', 6379)}"
limiter = Limiter(app=app, key_func=get_remote_address, default_limits=['200 per hour', '50 per minute'], storage_uri=f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', 6379)}", storage_options={'socket_connect_timeout': 30}, strategy='fixed-window')
try:
    redis_service = RedisService()
    confluence_service = ConfluenceService()
except Exception as init_error:
    logging.error(f'Service initialization failed: {str(init_error)}')
    raise
def get_session_id_from_request():
    """Extract session_id from cookies or Cookie header (for proxied requests)"""
    session_id = request.cookies.get('session_id')
    if session_id:
        logging.info(f'Found session_id in request.cookies: {session_id}')
        return session_id
    else:
        cookie_header = request.headers.get('Cookie')
        logging.info(f'Cookie header: \'{cookie_header}\'')
        if cookie_header:
            import re
            match = re.search('session_id=([^;,\\s]+)', cookie_header)
            if match:
                session_id = match.group(1)
                logging.info(f'Extracted session_id from header: {session_id}')
                return session_id
            else:
                logging.error(f'Failed to extract session_id from Cookie header: {cookie_header}')
                return
        else:
            logging.warning('No Cookie header found in request')
@app.route('/health', methods=['GET'])
@limiter.limit('100 per minute')
def health_check():
    """Health check endpoint"""
    return (jsonify({'status': 'healthy', 'service': 'flowviz-api'}), 200)
@app.route('/api/auth/login', methods=['POST'])
@limiter.limit('5 per minute')
def login():
    # irreducible cflow, using cdg fallback
    """Authenticate user with Confluence credentials and create session"""
    # ***<module>.login: Failure: Compilation Error
    data = request.json
    username = data.get('username')
    api_token = data.get('api_token')
    if not all([username, api_token]):
        return (jsonify({'error': 'username and api_token are required'}), 400)
        if not confluence_service.validate_credentials(username, api_token):
            logging.error('Authentication failed: Invalid Confluence credentials')
            return (jsonify({'error': 'Invalid Confluence credentials'}), 401)
            confluence_url = confluence_service.confluence_url
            session_id = secrets.token_urlsafe(32)
            logging.info(f'Login - Creating session with ID: {session_id} for user: {username}')
            session_created = redis_service.set_session(session_id, username, ttl=3600, api_token=api_token, confluence_url=confluence_url)
            logging.info(f'Login - Session creation result: {session_created}')
            response = jsonify({'success': True, 'username': username, 'message': 'Authentication successful'})
            is_production = os.getenv('FLASK_ENV') == 'production'
            response.set_cookie('session_id', session_id, httponly=True, secure=is_production, samesite='Lax', max_age=3600)
            return (response, 200)
            except Exception as e:
                    return (jsonify({'error': str(e)}), 500)
@app.route('/api/auth/verify', methods=['GET'])
@limiter.limit('50 per minute')
def verify_session():
    # irreducible cflow, using cdg fallback
    """Verify if session is valid"""
    # ***<module>.verify_session: Failure: Compilation Error
    session_id = get_session_id_from_request()
    if not session_id:
        logging.warning('Verify - No session ID found')
        return (jsonify({'valid': False, 'error': 'No session ID provided'}), 401)
        logging.info(f'Verify - Looking up session_id in Redis: {session_id}')
        username = redis_service.get_session(session_id)
        logging.info(f'Verify - Redis returned username: {username}')
        if username:
            return (jsonify({'valid': True, 'username': username}), 200)
            return (jsonify({'valid': False, 'error': 'Invalid or expired session'}), 401)
            except Exception as e:
                    logging.exception('Verify session error')
                    return (jsonify({'error': str(e)}), 500)
                            pass
@app.route('/api/auth/logout', methods=['POST'])
@limiter.limit('20 per minute')
def logout():
    """Logout user and destroy session"""
    try:
        session_id = get_session_id_from_request()
        if session_id:
            redis_service.delete_session(session_id)
        response = jsonify({'success': True, 'message': 'Logged out successfully'})
        response.set_cookie('session_id', '', expires=0, httponly=True, samesite='Lax')
        return (response, 200)
    except Exception as e:
        return (jsonify({'error': str(e)}), 500)
@app.route('/api/auth/status', methods=['GET'])
def check_auth_status():
    # irreducible cflow, using cdg fallback
    """Debug endpoint to check authentication status and session data"""
    # ***<module>.check_auth_status: Failure: Compilation Error
    session_id = get_session_id_from_request()
    if not session_id:
        return (jsonify({'error': 'No session ID found'}), 401)
        username = redis_service.get_session_username(session_id)
        credentials = redis_service.get_session_credentials(session_id)
        return (jsonify({'session_id': session_id, 'username': username, 'has_credentials': credentials is not None, 'credentials_keys': list(credentials.keys()) if credentials else None}), 200)
            except Exception as e:
                    return (jsonify({'error': str(e)}), 500)
@app.route('/api/confluence/page', methods=['GET'])
@limiter.limit('30 per minute')
def get_confluence_page_by_title():
    # irreducible cflow, using cdg fallback
    # ***<module>.get_confluence_page_by_title: Failure: Compilation Error
    session_id = get_session_id_from_request()
    if not session_id:
        return (jsonify({'error': 'Authentication required'}), 401)
        username = redis_service.get_session_username(session_id)
        if not username:
            return (jsonify({'error': 'Invalid or expired session'}), 401)
            logging.info(f'Confluence - Getting credentials for session: {session_id}')
            credentials = redis_service.get_session_credentials(session_id)
            logging.info(f'Confluence - Retrieved credentials: {credentials is not None}')
            if not credentials:
                logging.error(f'Confluence - Session credentials not found for session: {session_id}')
                return (jsonify({'error': 'Session credentials not found. Please log in again.'}), 401)
                space_key = request.args.get('space')
                title = request.args.get('title')
                if not space_key or not title:
                    return (jsonify({'error': 'Both \'space\' and \'title\' query parameters are required'}), 400)
                    content = confluence_service.get_page_clean_content_by_title(credentials['username'], credentials['api_token'], space_key, title)
                    if content:
                        return (jsonify({'space': space_key, 'title': title, 'content': content}), 200)
                        return (jsonify({'error': 'Page not found'}), 404)
            except Exception as e:
                    return (jsonify({'error': str(e)}), 500)
                            pass
@app.route('/api/flows', methods=['GET'])
@limiter.limit('50 per minute')
def get_user_flows():
    # irreducible cflow, using cdg fallback
    """Get all flows for authenticated user"""
    # ***<module>.get_user_flows: Failure: Compilation Error
    session_id = get_session_id_from_request()
    if not session_id:
        return (jsonify({'error': 'Authentication required'}), 401)
        username = redis_service.get_session_username(session_id)
        if not username:
            return (jsonify({'error': 'Invalid or expired session'}), 401)
            flows = redis_service.get_user_flows(username)
            return (jsonify({'flows': flows}), 200)
            except Exception as e:
                    return (jsonify({'error': str(e)}), 500)
@app.route('/api/flows', methods=['POST'])
@limiter.limit('30 per minute')
def save_user_flow():
    # irreducible cflow, using cdg fallback
    """Save or update a flow for authenticated user"""
    # ***<module>.save_user_flow: Failure: Compilation Error
    session_id = get_session_id_from_request()
    if not session_id:
        return (jsonify({'error': 'Authentication required'}), 401)
        username = redis_service.get_session_username(session_id)
        if not username:
            return (jsonify({'error': 'Invalid or expired session'}), 401)
            flow_data = request.json
            if not flow_data:
                return (jsonify({'error': 'Flow data is required'}), 400)
                result = redis_service.save_user_flow(username, flow_data)
                return (jsonify({'success': result, 'flow': flow_data}), 201)
            except Exception as e:
                    print(f'Error saving flow: {str(e)}')
                    import traceback
                    traceback.print_exc()
                    return (jsonify({'error': str(e)}), 500)
@app.route('/api/flows/<flow_id>', methods=['DELETE'])
@limiter.limit('20 per minute')
def delete_user_flow(flow_id):
    # irreducible cflow, using cdg fallback
    """Delete a specific flow for authenticated user"""
    # ***<module>.delete_user_flow: Failure: Compilation Error
    session_id = get_session_id_from_request()
    if not session_id:
        return (jsonify({'error': 'Authentication required'}), 401)
        username = redis_service.get_session_username(session_id)
        if not username:
            return (jsonify({'error': 'Invalid or expired session'}), 401)
            result = redis_service.delete_user_flow(username, flow_id)
            return (jsonify({'success': result}), 200)
            except Exception as e:
                    return (jsonify({'error': str(e)}), 500)
                            pass
@app.route('/api/redis/set', methods=['POST'])
@limiter.limit('20 per minute')
def redis_set():
    # irreducible cflow, using cdg fallback
    # ***<module>.redis_set: Failure: Compilation Error
    data = request.json
    key = data.get('key')
    value = data.get('value')
    if not key or value is None:
        return (jsonify({'error': 'Both \'key\' and \'value\' are required'}), 400)
        result = redis_service.set_value(key, value)
        return (jsonify({'success': result, 'key': key}), 200)
            except Exception as e:
                    return (jsonify({'error': str(e)}), 500)
@app.route('/api/redis/get/<key>', methods=['GET'])
@limiter.limit('50 per minute')
def redis_get(key):
    # irreducible cflow, using cdg fallback
    # ***<module>.redis_get: Failure: Compilation Error
    value = redis_service.get_value(key)
    if value is not None:
        return (jsonify({'key': key, 'value': value}), 200)
        return (jsonify({'error': 'Key not found'}), 404)
            except Exception as e:
                    return (jsonify({'error': str(e)}), 500)
@app.route('/api/redis/delete/<key>', methods=['DELETE'])
@limiter.limit('20 per minute')
def redis_delete(key):
    try:
        result = redis_service.delete_value(key)
        return (jsonify({'success': result > 0, 'key': key}), 200)
    except Exception as e:
        return (jsonify({'error': str(e)}), 500)
if __name__ == '__main__':
    port = int(os.getenv('API_PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)