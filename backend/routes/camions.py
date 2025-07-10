from flask import Blueprint, request, jsonify
from config.supabase_client import supabase
from functools import wraps
import jwt
import os

camions_bp = Blueprint("camions", __name__, url_prefix="/api/camions")
SECRET_KEY = os.environ.get("SECRET_KEY", "SecondLeaseJWTSecret2025")

# -----------------------------
# Authentification JWT
# -----------------------------
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

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.user.get('role') != 'admin':
            return jsonify({'message': 'Accès refusé'}), 403
        return f(*args, **kwargs)
    return decorated

# -----------------------------
# Ajouter un camion
# -----------------------------
@camions_bp.route("/add", methods=["POST"])
@token_required
@admin_required
def add_camion():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Aucune donnée reçue"}), 400

        required_fields = [
            "numero_chassis", "immatriculation_etrangere", "marque", "modele",
            "kilometrage", "date_mise_en_circulation", "inspection_reception"
        ]
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Le champ '{field}' est requis"}), 400

        camion_data = {
            "numero_chassis": data["numero_chassis"],
            "immatriculation_etrangere": data["immatriculation_etrangere"],
            "marque": data["marque"],
            "modele": data["modele"],
            "kilometrage": data["kilometrage"],
            "date_mise_en_circulation": data["date_mise_en_circulation"],
            "client": data.get("client"),
            "inspection_reception": data["inspection_reception"],
            "memos": data.get("memos"),
            "photos_url": "",
            "statut": "en_attente",
            "fiche_complete": False,
            "a_des_alertes": False
        }

        response = supabase.table("camions").insert(camion_data).execute()
        if hasattr(response, "error") and response.error:
            return jsonify({"error": response.error.message}), 500

        return jsonify({"message": "Camion ajouté avec succès"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -----------------------------
# Modifier un camion
# -----------------------------
@camions_bp.route("/<string:numero_chassis>", methods=["PUT"])
@token_required
@admin_required
def modifier_camion(numero_chassis):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Aucune donnée reçue"}), 400

        response = supabase.table("camions").update(data).eq("numero_chassis", numero_chassis).execute()
        if hasattr(response, "error") and response.error:
            return jsonify({"error": response.error.message}), 500

        if not response.data:
            return jsonify({"error": "Aucun camion trouvé"}), 404

        return jsonify({"message": "Camion modifié", "data": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -----------------------------
# Supprimer un camion
# -----------------------------
@camions_bp.route("/<string:numero_chassis>", methods=["DELETE"])
@token_required
@admin_required
def supprimer_camion(numero_chassis):
    try:
        response = supabase.table("camions").delete().eq("numero_chassis", numero_chassis).execute()
        if hasattr(response, "error") and response.error:
            return jsonify({"error": response.error.message}), 500
        if not response.data:
            return jsonify({"error": "Aucun camion trouvé"}), 404
        return jsonify({"message": "Camion supprimé"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -----------------------------
# Récupérer les infos d’un camion
# -----------------------------
@camions_bp.route("/<string:numero_chassis>", methods=["GET"])
@token_required
def get_camion_by_numero(numero_chassis):
    try:
        response = supabase.table("camions").select("*").eq("numero_chassis", numero_chassis).execute()
        if not response.data:
            return jsonify({"error": "Camion introuvable"}), 404
        return jsonify(response.data[0]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
