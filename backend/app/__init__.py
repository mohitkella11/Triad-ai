from flask import Flask, jsonify
from flask_cors import CORS
from app.db import init_db
from app.routes import api_bp

def create_app():
    app = Flask(__name__)
    
    # Enable CORS for all routes and origins
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Initialize DB connection and seed default dynamic fields
    init_db()

    # Register blueprints
    app.register_blueprint(api_bp)

    @app.route("/")
    def index():
        return jsonify({
            "service": "Triad AI Document Management System (DMS) API",
            "version": "1.0.0",
            "status": "online",
            "docs": "/api"
        })

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

    return app
