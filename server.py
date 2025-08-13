
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
import os
import logging
from logging.handlers import RotatingFileHandler
from collections import deque
from werkzeug.utils import secure_filename
import socket
import netifaces

# --- Basic Setup ---
app = Flask(__name__)
# Allow all origins for simplicity in a local development tool.
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/media/*": {"origins": "*"}})


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


# --- API Endpoints ---
@app.route('/api/ip_addresses')
def get_ip_addresses():
    """Lists all IP addresses for the host machine."""
    ips = ['localhost']
    try:
        for iface in netifaces.interfaces():
            ifaddrs = netifaces.ifaddresses(iface)
            if netifaces.AF_INET in ifaddrs:
                for addr in ifaddrs[netifaces.AF_INET]:
                    ip = addr.get('addr')
                    if ip and not ip.startswith('127.'):
                        ips.append(ip)
        # Prioritize private network IPs for default selection
        lan_ips = [ip for ip in ips if ip.startswith(('192.168.', '10.', '172.')) and ip != 'localhost']
        other_ips = [ip for ip in ips if ip not in lan_ips]
        sorted_ips = lan_ips + other_ips
        logging.info(f"Found IP addresses: {sorted_ips}")
        return jsonify(sorted_ips)
    except Exception as e:
        logging.error(f"Error getting IP addresses: {e}", exc_info=True)
        return jsonify({"error": "Could not retrieve IP addresses."}), 500


@app.route('/api/files')
def list_files():
    """Lists files in the specified directory, defaulting to the media folder."""
    path_param = request.args.get('path', 'media')

    if path_param != 'media':
        logging.warning(f"Access denied for path: '{path_param}'. Only 'media' is allowed.")
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
        return send_from_directory(media_root, filename)
    except FileNotFoundError:
        logging.error(f"File not found: {filename}")
        abort(404)
    except Exception as e:
        logging.error(f"Exception serving file {filename}: {e}", exc_info=True)
        abort(500)


if __name__ == '__main__':
    logging.info("Starting Flask server...")
    app.run(host='0.0.0.0', port=5000, debug=True)
