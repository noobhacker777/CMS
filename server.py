
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
import os
import logging
from logging.handlers import RotatingFileHandler
from collections import deque

# --- Basic Setup ---
app = Flask(__name__)
CORS(app)

# --- In-memory Log Storage ---
# Use a deque for efficient, thread-safe appends and pops from either end.
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
media_root = ''

# --- API Endpoints ---
@app.route('/api/files')
def list_files():
    global media_root
    path = request.args.get('path', '')
    logging.info(f"Received file list request for path: '{path}'")
    if not path or not os.path.isdir(path):
        logging.error(f"Invalid or missing directory path provided: '{path}'")
        return jsonify({"error": "Invalid or missing directory path"}), 400

    media_root = os.path.abspath(path)
    logging.info(f"Set media root to: '{media_root}'")
    
    try:
        files = [f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]
        logging.info(f"Found {len(files)} files in directory.")
        return jsonify(files)
    except Exception as e:
        logging.error(f"Error listing files at path '{path}': {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs')
def get_logs():
    """Endpoint to retrieve captured logs."""
    return jsonify(list(log_capture))

@app.route('/media/<path:filename>')
def serve_media(filename):
    global media_root
    logging.info(f"Media request for: {filename}")
    if not media_root:
        # Try to deduce folder from filename
        potential_root = os.path.abspath(os.path.join(os.getcwd(), filename, '..'))
        if os.path.isdir(potential_root):
             media_root = potential_root
        else:
             # Fallback for drag-and-drop where we don't have a folder path
             # This is insecure and should be handled carefully in a real app.
             # We assume the file is in the current working directory for simplicity.
             media_root = os.getcwd()
        logging.info(f"Media root was not set. Deduced to: {media_root}")


    file_path = os.path.join(media_root, filename)
    logging.info(f"Serving file from absolute path: {os.path.abspath(file_path)}")

    if not os.path.abspath(file_path).startswith(os.path.abspath(media_root)):
        logging.warning(f"Directory traversal attempt blocked for: {filename}")
        abort(403) # Prevent directory traversal attacks

    try:
        if os.path.exists(file_path):
            return send_from_directory(media_root, filename)
        else:
             # This part is for the drag-and-dropped file which doesn't have a path context
             # This is a fallback and assumes the file might be in the current working directory
             if os.path.exists(filename) and os.path.isfile(filename):
                 logging.info(f"File not in media_root, but found in CWD: {filename}")
                 return send_from_directory(os.getcwd(), filename)
             logging.error(f"File not found: {file_path}")
             abort(404)

    except Exception as e:
        logging.error(f"Exception serving file {filename}: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    logging.info("Starting Flask server...")
    # Running on 0.0.0.0 makes it accessible on your network
    app.run(host='0.0.0.0', port=5000, debug=True)
