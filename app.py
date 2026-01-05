import os
import json
import requests
from bs4 import BeautifulSoup
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

load_dotenv() # Load variables from .env

app = Flask(__name__)
# Security Config
app.secret_key = os.environ.get('SECRET_KEY', 'dev_secret_key_123') # Change this in production
EDITOR_PASSWORD = os.environ.get('EDITOR_PASSWORD', 'admin123')

DATA_FILE = 'links.json'
NOTICE_FILE = 'notice.txt'

# ... (data helpers remain same) ...

from flask import session, redirect, url_for

# wrapper for editor required
def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('is_editor'):
            return jsonify({'error': 'Unauthorized', 'message': '需要編輯者權限'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Auth Endpoints
@app.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    password = data.get('password')
    if password == EDITOR_PASSWORD:
        session['is_editor'] = True
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': '密碼錯誤'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('is_editor', None)
    return jsonify({'success': True})

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    return jsonify({'is_editor': session.get('is_editor', False)})

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/links', methods=['GET'])
def get_links():
    links = load_links()
    return jsonify(links)

@app.route('/api/links', methods=['POST'])
@login_required
def add_link():
    data = request.json
    url = data.get('url')
    title = data.get('title')
    description = data.get('description', '')
    image = data.get('image', '')
    note = data.get('note', '') # Get note from request
    
    if not url or not title:
        return jsonify({'error': 'URL and Title are required'}), 400

    # 1. No Scraping - Use provided data directly
    # Favicon: basic check if we want to try to guess or just leave empty/client provided?
    # For now, let's assume no auto-favicon unless client sends it, or just use a default.
    # The original plan was "Manual Input", so we take what is given.
    favicon = "" 
    if not image:
         image = ""

    # 2. Smart Notice Logic
    # Check for date pattern (e.g., 1/15, 2026-01-01)
    import re
    import uuid
    date_pattern = r'(\d{1,4}[-/]\d{1,2})' # Matches 1/15, 2026-01 ...
    if re.search(date_pattern, note):
        notices = load_notices()
        # Create structured item
        notice_link_html = f" <a href='{url}' target='_blank' style='text-decoration: underline; color: inherit;'>[{title}]</a>"
        new_entry = {
            'id': str(uuid.uuid4()),
            'content': f"{note}{notice_link_html}",
            'created_at': __import__('time').time()
        }
        notices.append(new_entry)
        save_notices(notices)

    # 3. Save to JSON
    links = load_links()
    
    # Generate ID
    max_id = 0
    if links:
        max_id = max([l.get('id', 0) for l in links])
    
    new_link = {
        'id': max_id + 1,
        'url': url,
        'title': title,
        'description': description,
        'image': image,
        'favicon': favicon,
        'note': note # Save the note
    }
    links.append(new_link)
    save_links(links)
    return jsonify(new_link)


@app.route('/api/links/<int:link_id>', methods=['PATCH'])
@login_required
def update_link_note(link_id):
    data = request.json
    new_note = data.get('note')
    add_to_notice = data.get('addToNotice', False)
    
    if new_note is None:
        return jsonify({'error': 'Note is required'}), 400

    links = load_links()
    target_link = None
    updated = False
    
    for link in links:
        if link.get('id') == link_id:
            link['note'] = new_note
            target_link = link
            updated = True
            break
            
    if updated:
        save_links(links)
        
        # Handle Sync to Notice
        if add_to_notice and target_link:
            import uuid
            import time
            notices = load_notices()
            url = target_link.get('url', '#')
            title = target_link.get('title', '連結')
            # Create notice with link markup
            notice_link_html = f" <a href='{url}' target='_blank' style='text-decoration: underline; color: inherit;'>[{title}]</a>"
            new_item = {
                'id': str(uuid.uuid4()),
                'content': f"{new_note}{notice_link_html}",
                'created_at': time.time()
            }
            notices.append(new_item)
            save_notices(notices)
        
        return jsonify({'success': True, 'note': new_note})
    return jsonify({'error': 'Link not found'}), 404

@app.route('/api/links/<int:link_id>', methods=['DELETE'])
@login_required
def delete_link(link_id):
    links = load_links()
    initial_len = len(links)
    links = [l for l in links if l.get('id') != link_id]
    
    if len(links) < initial_len:
        save_links(links)
        return jsonify({'success': True})
    return jsonify({'error': 'Link not found'}), 404

def load_links():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            links = json.load(f)
            
        # ID Migration: Ensure all links have an ID
        migrated = False
        max_id = 0
        for link in links:
            if 'id' in link:
                max_id = max(max_id, link['id'])
        
        for link in links:
            if 'id' not in link:
                max_id += 1
                link['id'] = max_id
                migrated = True
                
        if migrated:
            save_links(links)
            
        return links
    except:
        return []

def save_links(links):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(links, f, ensure_ascii=False, indent=2)

# Notice Board Functions (Refactored for Multi-item)
def load_notices():
    import uuid
    if not os.path.exists(NOTICE_FILE):
        return []
    try:
        with open(NOTICE_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            
        if not content:
            return []
            
        # Try parsing as JSON list
        try:
            data = json.loads(content)
            if isinstance(data, list):
                return data
        except json.JSONDecodeError:
            pass
            
        # Legacy migration: Treat file content as single string item
        migrated_data = [{'id': str(uuid.uuid4()), 'content': content}]
        save_notices(migrated_data) # Persist immediately so ID is stable
        return migrated_data
    except:
        return []

def save_notices(notices):
    with open(NOTICE_FILE, 'w', encoding='utf-8') as f:
        json.dump(notices, f, ensure_ascii=False, indent=2)


@app.route('/api/notice', methods=['GET'])
def get_notice():
    return jsonify({'notices': load_notices()})

@app.route('/api/notice', methods=['POST'])
@login_required
def add_notice():
    import uuid
    import time
    data = request.json
    text = data.get('text', '').strip()
    
    if text:
        notices = load_notices()
        new_item = {
            'id': str(uuid.uuid4()),
            'content': text,
            'created_at': time.time()
        }
        notices.append(new_item)
        save_notices(notices)
        return jsonify({'success': True, 'notices': notices})
        
    # If text is empty, maybe perform clear all? Or just return existing?
    # For now, if empty text loop, we might interpret as clear all if specific flag?
    # Request was for "individually delete". 
    # Current 'update_notice' clears if text is empty. 
    # Let's keep a dedicated clear all endpoint or handle empty text as clear logic if needed.
    # But for multi-item, usually empty text means "do nothing". 
    # Let's add explicit DELETE for single item.
    return jsonify({'success': False, 'message': 'Content required'})

@app.route('/api/notice/clear', methods=['POST'])
@login_required
def clear_all_notices():
    save_notices([])
    return jsonify({'success': True, 'notices': []})

@app.route('/api/notice/<string:notice_id>', methods=['DELETE'])
@login_required
def delete_notice(notice_id):
    notices = load_notices()
    initial_len = len(notices)
    notices = [n for n in notices if n.get('id') != notice_id]
    
    if len(notices) < initial_len:
        save_notices(notices)
        return jsonify({'success': True, 'notices': notices})
    return jsonify({'error': 'Notice not found'}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
