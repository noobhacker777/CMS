
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Store the root directory for media files
media_root = ''

@app.route('/api/files')
def list_files():
    global media_root
    path = request.args.get('path', '')
    if not path or not os.path.isdir(path):
        return jsonify({"error": "Invalid or missing directory path"}), 400

    media_root = os.path.abspath(path)
    
    try:
        files = [f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]
        return jsonify(files)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/media/<path:filename>')
def serve_media(filename):
    global media_root
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

    file_path = os.path.join(media_root, filename)

    if not os.path.abspath(file_path).startswith(os.path.abspath(media_root)):
        abort(403) # Prevent directory traversal attacks

    try:
        if os.path.exists(file_path):
            return send_from_directory(media_root, filename)
        else:
             # This part is for the drag-and-dropped file which doesn't have a path context
             # This is a fallback and assumes the file might be in the current working directory
             if os.path.exists(filename) and os.path.isfile(filename):
                 return send_from_directory(os.getcwd(), filename)
             abort(404)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # Running on 0.0.0.0 makes it accessible on your network
    app.run(host='0.0.0.0', port=5000, debug=True)
