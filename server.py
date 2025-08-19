
from flask import Flask, request, jsonify, send_from_directory, abort, Response
from flask_cors import CORS
import os
import logging
from logging.handlers import RotatingFileHandler
from collections import deque
from werkzeug.utils import secure_filename
import socket
import zipfile
from zipstream import ZipStream
import io


# --- Basic Setup ---
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})


# --- Configuration ---
# Get the absolute path of the directory where the script is located
APP_ROOT = os.path.dirname(os.path.abspath(__file__))
MEDIA_FOLDER = os.path.join(APP_ROOT, 'media')

if not os.path.exists(MEDIA_FOLDER):
    os.makedirs(MEDIA_FOLDER)
app.config['UPLOAD_FOLDER'] = MEDIA_FOLDER


# --- In-memory Log Storage ---
log_capture = deque(maxlen=100) # Store the last 100 log messages

class DequeLogHandler(logging.Handler):
    def __init__(self, deque_instance):
        super().__init__()
        self.deque_instance = deque_instance

    def emit(self, record):
        log_entry = self.format(record)
        self.deque_instance.append(log_entry)

# --- Logging Configuration ---
log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')

# Deque handler to capture logs for the UI
deque_handler = DequeLogHandler(log_capture)
deque_handler.setLevel(logging.INFO)
deque_handler.setFormatter(log_formatter)

# Add the deque handler to the root logger
logging.getLogger().addHandler(deque_handler)
logging.getLogger().setLevel(logging.INFO)

# --- Global State ---
media_root = app.config['UPLOAD_FOLDER']
logging.info(f"Media root is set to: '{media_root}'")

def get_local_ips():
    ips = []
    try:
        # This gets all addresses, including localhost and IPv6
        for info in socket.getaddrinfo(socket.gethostname(), None):
            ip = info[4][0]
            # Filter for IPv4 and avoid duplicates
            if '.' in ip and ip not in ips:
                ips.append(ip)
    except socket.gaierror:
        # Fallback if hostname is not configured properly
        try:
            # This often gets the primary interface IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            if ip not in ips:
                ips.append(ip)
            s.close()
        except Exception:
            # If all else fails, use localhost
            ips.append("127.0.0.1")
    
    # Prioritize private network IPs
    private_ips = [ip for ip in ips if ip.startswith(('192.168.', '10.', '172.')) and not ip.endswith('.1')]
    other_ips = [ip for ip in ips if ip not in private_ips]
    
    sorted_ips = private_ips + other_ips
    
    # Log the IPs for user visibility
    logging.info(f"Detected accessible local IPs: {', '.join(sorted_ips)}")
    return sorted_ips


# --- API Endpoints ---
@app.route('/api/ip_addresses')
def ip_addresses():
    """Returns a list of local IP addresses for the server."""
    return jsonify(get_local_ips())

@app.route('/api/files')
def list_files():
    """Lists files in the specified directory, defaulting to the media folder."""
    path_param = request.args.get('path', 'media')

    # This is a security measure to prevent directory traversal.
    # We only allow access to the 'media' folder.
    if path_param != 'media':
        logging.warning(f"Attempt to access non-media path denied: '{path_param}'")
        return jsonify({"error": "Access to specified path is forbidden"}), 403

    directory = media_root
    logging.info(f"File list requested for directory: '{directory}'")

    try:
        if not os.path.isdir(directory):
            logging.error(f"Media directory not found at '{directory}'")
            return jsonify({"error": "Media directory not found"}), 404
            
        files = [f for f in os.listdir(directory) if os.path.isfile(os.path.join(directory, f))]
        logging.info(f"Found {len(files)} files in directory '{directory}'.")
        return jsonify(files)
    except Exception as e:
        logging.error(f"Error listing files at path '{directory}': {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred while listing files."}), 500


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        logging.error("Upload attempt failed: No file part in the request.")
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        logging.error("Upload attempt failed: No file selected.")
        return jsonify({"error": "No selected file"}), 400

    if file:
        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        logging.info(f"Attempting to save uploaded file '{filename}' to '{save_path}'")
        try:
            file.save(save_path)
            logging.info(f"File '{filename}' uploaded successfully.")
            return jsonify({"success": True, "filename": filename}), 201
        except Exception as e:
            logging.error(f"Failed to save file '{filename}'. Exception: {e}", exc_info=True)
            return jsonify({"error": "Failed to save file on server."}), 500

@app.route('/api/logs')
def get_logs():
    """Endpoint to retrieve captured logs."""
    return jsonify(list(log_capture))

@app.route('/media/<path:filename>')
def serve_media(filename):
    """Serves a file from the media directory."""
    logging.info(f"Media request for: {filename}")
    try:
        # Securely serve files from the media_root directory.
        # This prevents access to files outside this directory.
        return send_from_directory(media_root, filename, as_attachment=False)
    except FileNotFoundError:
        logging.error(f"File not found: {filename}")
        abort(404)
    except Exception as e:
        logging.error(f"Exception serving file {filename}: {e}", exc_info=True)
        abort(500)


if __name__ == '__main__':
    get_local_ips() # Log IPs on startup
    logging.info("Starting Flask server...")
    app.run(host='0.0.0.0', port=5000, debug=True)
