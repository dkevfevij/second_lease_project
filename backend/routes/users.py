# backend/routes/users.py

from flask import Blueprint, request, jsonify
from config.supabase_client import supabase
import bcrypt
import jwt
import os
from functools import wraps

users_bp = Blueprint("users", __name__, url_prefix="/api/users")
SECRET_KEY = os.environ.get("SECRET_KEY", "SecondLeaseJWTSecret2025")

# ✅ Vérifie le token
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

# ✅ Vérifie que l'utilisateur est admin
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.user.get('role') != 'admin':
            return jsonify({'message': 'Accès refusé'}), 403
        return f(*args, **kwargs)
    return decorated

# ➕ Ajouter un utilisateur (admin uniquement)
@users_bp.route("", methods=["POST"])
@token_required
@admin_required
def ajouter_utilisateur():
    try:
        data = request.get_json()
        nom = data.get("nom")
        prenom = data.get("prenom")
        mot_de_passe = data.get("mot_de_passe")
        role = data.get("role", "viewer")

        if not nom or not prenom or not mot_de_passe:
            return jsonify({"error": "Champs requis manquants"}), 400

        identifiant = f"{nom[0].lower()}.{prenom.lower()}"

        # Vérifie unicité de l'identifiant
        existing = supabase.table("users").select("identifiant").eq("identifiant", identifiant).execute()
        if existing.data:
            return jsonify({"error": "Identifiant déjà existant"}), 400

        hashed_pw = bcrypt.hashpw(mot_de_passe.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        result = supabase.table("users").insert({
            "nom": nom,
            "prenom": prenom,
            "identifiant": identifiant,
            "mot_de_passe": hashed_pw,
            "role": role,
            "actif": True
        }).execute()

        return jsonify({"message": "Utilisateur ajouté", "identifiant": identifiant}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
# reccuperer users
@users_bp.route("", methods=["GET"])
@token_required
def get_users():
    try:
        result = supabase.table("users").select("id, nom, prenom, role, actif").execute()
        return jsonify(result.data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 🔁 Activer ou désactiver un compte
@users_bp.route("/<int:user_id>/toggle", methods=["PATCH"])
@token_required
@admin_required
def toggle_statut_utilisateur(user_id):
    try:
        user_data = supabase.table("users").select("actif").eq("id", user_id).single().execute()
        if not user_data.data:
            return jsonify({"error": "Utilisateur non trouvé"}), 404

        current = user_data.data["actif"]
        updated = supabase.table("users").update({"actif": not current}).eq("id", user_id).execute()

        return jsonify({
            "message": "Utilisateur mis à jour",
            "nouveau_statut": "actif" if not current else "inactif"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@users_bp.route("/<int:user_id>", methods=["PUT"])
@token_required
@admin_required
def modifier_utilisateur(user_id):
    try:
        data = request.get_json()
        champs = {}

        if "nom" in data:
            champs["nom"] = data["nom"]
        if "prenom" in data:
            champs["prenom"] = data["prenom"]
        if "role" in data:
            champs["role"] = data["role"]
        if "mot_de_passe" in data and data["mot_de_passe"]:
            hashed_pw = bcrypt.hashpw(data["mot_de_passe"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            champs["mot_de_passe"] = hashed_pw

        update = supabase.table("users").update(champs).eq("id", user_id).execute()
        return jsonify({"message": "Utilisateur modifié", "data": update.data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
@users_bp.route("/<int:user_id>", methods=["DELETE"])
@token_required
@admin_required
def supprimer_utilisateur(user_id):
    try:
        delete = supabase.table("users").delete().eq("id", user_id).execute()
        return jsonify({"message": "Utilisateur supprimé"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
