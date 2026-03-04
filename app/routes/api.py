from flask import Blueprint, jsonify

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.get("/health")
def api_health():
    return jsonify({"status": "ok", "service": "project-barn-backend"})
