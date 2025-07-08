# backend/routes/dashboard.py

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
from config.supabase_client import supabase
import os

dashboard_bp = Blueprint('dashboard', __name__)
SECRET_KEY = os.environ.get("SECRET_KEY", "SecondLeaseJWTSecret2025")

# ✅ Décorateur pour vérifier le token
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token manquant'}), 401
        try:
            if token.startswith("Bearer "):
                token = token.split(" ")[1]
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.user = data
        except Exception:
            return jsonify({'message': 'Token invalide'}), 403
        return f(*args, **kwargs)
    return decorated

# ✅ Décorateur pour restreindre aux admins
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.user.get('role') != 'admin':
            return jsonify({'message': 'Accès refusé'}), 403
        return f(*args, **kwargs)
    return decorated

# 🔐 /me : Infos utilisateur connecté
@dashboard_bp.route('/me', methods=['GET'])
@token_required
def get_me():
    return jsonify({
        "username": request.user['username'],
        "role": request.user['role']
    }), 200

@dashboard_bp.route('/camions', methods=['GET'])
@token_required
def get_camions():
    try:
        # On récupère tout (temporairement)
        result = supabase.table("camions").select("*").execute()

        # On ne garde que les champs nécessaires
        camions_resumés = [
            {
                "numero_chassis": camion.get("numero_chassis"),
                "statut": camion.get("statut"),
                "a_des_alertes": camion.get("a_des_alertes")
            }
            for camion in result.data
        ]

        return jsonify(camions_resumés), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ➕ /camions : Ajouter un camion (admin uniquement)
@dashboard_bp.route('/camions', methods=['POST'])
@token_required
@admin_required
def ajouter_camion():
    try:
        data = request.json
        result = supabase.table("camions").insert(data).execute()
        return jsonify({"message": "Camion ajouté", "data": result.data}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 👤 /users : Ajouter un utilisateur (admin uniquement)
@dashboard_bp.route('/users', methods=['POST'])
@token_required
@admin_required
def ajouter_user():
    try:
        data = request.json
        result = supabase.table("users").insert(data).execute()
        return jsonify({"message": "Utilisateur ajouté", "data": result.data}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
