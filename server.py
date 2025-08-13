
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
import os
import logging
from logging.handlers import RotatingFileHandler
from collections import deque
from werkzeug.utils import secure_filename

# --- Basic Setup ---
app = Flask(__name__)
CORS(app)

# --- Configuration ---
MEDIA_FOLDER = 'media'
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
# We now consistently use the MEDIA_FOLDER for all file operations
media_root = os.path.abspath(MEDIA_FOLDER)
logging.info(f"Media root is set to: '{media_root}'")


# --- API Endpoints ---
@app.route('/api/files')
def list_files():
    # This endpoint now defaults to the MEDIA_FOLDER but can be overridden.
    path = request.args.get('path', MEDIA_FOLDER)
    logging.info(f"Received file list request for path: '{path}'")

    if not os.path.isdir(path):
        logging.error(f"Invalid or missing directory path provided: '{path}'")
        return jsonify({"error": "Invalid or missing directory path"}), 400
    
    try:
        files = [f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]
        logging.info(f"Found {len(files)} files in directory '{path}'.")
        return jsonify(files)
    except Exception as e:
        logging.error(f"Error listing files at path '{path}': {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        logging.error("No file part in the request")
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        logging.error("No selected file")
        return jsonify({"error": "No selected file"}), 400
    if file:
        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        try:
            file.save(save_path)
            logging.info(f"File '{filename}' uploaded successfully to '{save_path}'")
            return jsonify({"success": True, "filename": filename}), 201
        except Exception as e:
            logging.error(f"Failed to save file '{filename}': {e}")
            return jsonify({"error": "Failed to save file"}), 500

@app.route('/api/logs')
def get_logs():
    """Endpoint to retrieve captured logs."""
    return jsonify(list(log_capture))

@app.route('/media/<path:filename>')
def serve_media(filename):
    logging.info(f"Media request for: {filename}")
    
    # All media is served from the single, consistent media_root
    file_path = os.path.join(media_root, filename)
    logging.info(f"Serving file from absolute path: {os.path.abspath(file_path)}")

    if not os.path.abspath(file_path).startswith(os.path.abspath(media_root)):
        logging.warning(f"Directory traversal attempt blocked for: {filename}")
        abort(403) # Prevent directory traversal attacks

    try:
        if os.path.exists(file_path):
            return send_from_directory(media_root, filename)
        else:
             logging.error(f"File not found: {file_path}")
             abort(404)
    except Exception as e:
        logging.error(f"Exception serving file {filename}: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    logging.info("Starting Flask server...")
    # Running on 0.0.0.0 makes it accessible on your network
    app.run(host='0.0.0.0', port=5000, debug=True)
