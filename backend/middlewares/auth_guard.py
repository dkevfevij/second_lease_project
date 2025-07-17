from functools import wraps
from flask import request, jsonify
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
SECRET_KEY = os.environ.get("SECRET_KEY", "SecondLeaseJWTSecret2025")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_storage = supabase.storage

import jwt
import os

SECRET_KEY = os.environ.get("SECRET_KEY", ...)


# ✅ Vérifie le token JWT et attache l'utilisateur à la requête
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Token manquant ou invalide"}), 401

        token = auth_header.replace("Bearer ", "")
        try:
            user_data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.user = user_data
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expiré"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token invalide"}), 403

        return f(*args, **kwargs)
    return decorated

# ✅ Restreint l’accès selon le rôle
def role_required(role):
    def wrapper(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(request, "user", {})
            if user.get("role") != role:
                return jsonify({"error": f"Accès réservé aux {role}s"}), 403
            return f(*args, **kwargs)
        return decorated
    return wrapper
