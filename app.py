from flask import Flask, render_template, request, jsonify
import json
import os
import uuid
import time
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'default_secret')

DATA_FILE = 'links.json'
NOTICE_FILE = 'notice.txt'

# --- Helpers ---
def load_links():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def save_links(links):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(links, f, ensure_ascii=False, indent=2)

def load_notices():
    # Supports legacy single string or new JSON list
    if not os.path.exists(NOTICE_FILE):
        return []
    try:
        with open(NOTICE_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
        if not content:
            return []
        try:
            data = json.loads(content)
            if isinstance(data, list): return data
        except:
            pass
        # Fallback for plain text legacy
        return [{'id': str(uuid.uuid4()), 'content': content}]
    except:
        return []

def save_notices(notices):
    with open(NOTICE_FILE, 'w', encoding='utf-8') as f:
        json.dump(notices, f, ensure_ascii=False, indent=2)


# --- Routes ---
@app.route('/')
def index():
    links = load_links()
    notices = load_notices()
    # "is_frozen" context variable helps template distinguish logic if needed
    firebase_config = {
        'apiKey': os.environ.get('FIREBASE_API_KEY'),
        'authDomain': os.environ.get('FIREBASE_AUTH_DOMAIN'),
        'projectId': os.environ.get('FIREBASE_PROJECT_ID'),
        'storageBucket': os.environ.get('FIREBASE_STORAGE_BUCKET'),
        'messagingSenderId': os.environ.get('FIREBASE_MESSAGING_SENDER_ID'),
        'appId': os.environ.get('FIREBASE_APP_ID'),
        'measurementId': os.environ.get('FIREBASE_MEASUREMENT_ID')
    }
    return render_template('index.html', 
                           links=links, 
                           notices=notices, 
                           is_frozen=False,
                           firebase_messaging_sender_id=os.environ.get('FIREBASE_MESSAGING_SENDER_ID', ''),
                           firebase_app_id=os.environ.get('FIREBASE_APP_ID', ''),
                           firebase_measurement_id=os.environ.get('FIREBASE_MEASUREMENT_ID', '')
                           )

import hashlib

@app.route('/login.html')
def login():
    # Get password from env
    pwd = os.environ.get('EDITOR_PASSWORD', 'admin')
    # Hash it so plain text isn't in source code
    pwd_hash = hashlib.sha256(pwd.encode()).hexdigest()
    return render_template('login.html', editor_password_hash=pwd_hash)

# --- API for Local CMS ---
@app.route('/api/links', methods=['GET'])
def api_get_links():
    return jsonify(load_links())

@app.route('/api/links', methods=['POST'])
def api_add_link():
    data = request.json
    links = load_links()
    new_id = max([l.get('id', 0) for l in links], default=0) + 1
    new_link = {
        'id': new_id,
        'url': data.get('url'),
        'title': data.get('title'),
        'description': data.get('description', ''),
        'image': data.get('image', ''),
        'note': data.get('note', '')
    }
    links.append(new_link)
    save_links(links)
    return jsonify({'success': True, 'link': new_link})

@app.route('/api/links/<int:link_id>', methods=['DELETE'])
def api_delete_link(link_id):
    links = load_links()
    links = [l for l in links if l.get('id') != link_id]
    save_links(links)
    return jsonify({'success': True})

@app.route('/api/notice', methods=['GET'])
def api_get_notice():
    return jsonify({'notices': load_notices()})

@app.route('/api/notice', methods=['POST'])
def api_add_notice():
    data = request.json
    notices = load_notices()
    new_notice = {
        'id': str(uuid.uuid4()),
        'content': data.get('text'),
        'created_at': time.time()
    }
    notices.append(new_notice)
    save_notices(notices)
    return jsonify({'success': True})

@app.route('/api/notice/<string:notice_id>', methods=['DELETE'])
def api_delete_notice(notice_id):
    notices = load_notices()
    notices = [n for n in notices if n.get('id') != notice_id]
    save_notices(notices)
    return jsonify({'success': True})

@app.route('/api/publish', methods=['POST'])
def api_publish():
    import subprocess
    try:
        # 1. Build Static Site
        # subprocess.check_call(['python', 'build.py']) # Optional, if we want to ensure build before push, but usually GitHub Action does it.
        # Check if user wants local build or remote build. Assuming remote build via GitHub Actions for now as user mentioned it.
        # But if they are pushing files, they need to push links.json.
        
        # 2. Git Commands
        subprocess.check_call(['git', 'add', 'links.json', 'notice.txt'])
        subprocess.check_call(['git', 'commit', '-m', 'Content Update via Web Interface'])
        subprocess.check_call(['git', 'push'])
        
        return jsonify({'success': True, 'message': 'Deployment triggered successfully!'})
    except subprocess.CalledProcessError as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=8000)
