"""Route blueprints for Project Barn."""

from app.routes.auth import auth_bp
from app.routes.dashboard import dashboard_bp
from app.routes.api import api_bp

__all__ = ["auth_bp", "dashboard_bp", "api_bp"]
