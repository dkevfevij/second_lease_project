# routes/camions_complets.py
from flask import Blueprint, request, jsonify
from config.supabase_client import supabase
from functools import wraps
import jwt
import os
from datetime import datetime, timedelta

camions_complets_bp = Blueprint("camions_complets", __name__, url_prefix="/api/camions")


SECRET_KEY = os.environ.get("SECRET_KEY", "SecondLeaseJWTSecret2025")

# -----------------------------
# Auth
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

# -----------------------------
#  GET : Liste camions + alertes calculées
# -----------------------------
@camions_complets_bp.route("/liste_complets", methods=["GET"])
@token_required
def get_all_camions():
    try:
        res = supabase.table("camions").select("*").execute()
        now = datetime.utcnow()
        result = []

        for camion in res.data:
            statut = camion.get("statut")
            retour = camion.get("retour_arriere", False)
            date_str = camion.get("date_statut_en_cours")
            alerte_active = False

            if statut == "en_cours" and date_str:
                try:
                    date_statut = datetime.fromisoformat(date_str)
                    delai = timedelta(days=3) if retour else timedelta(days=7)
                    alerte_active = (now - date_statut) > delai
                except:
                    pass

            camion["a_des_alertes"] = alerte_active
            result.append(camion)

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -----------------------------
#  GET : Fiche complète d’un camion
# -----------------------------
@camions_complets_bp.route("/<string:chassis>/fiche_complete", methods=["GET"])
@token_required
def get_camion_complet(chassis):
    try:
        camion_res = supabase.table("camions").select("*").eq("numero_chassis", chassis).single().execute()
        if not camion_res.data:
            return jsonify({"error": "Camion introuvable"}), 404

        camion = camion_res.data
        camion_id = camion.get("id")
        now = datetime.utcnow()

        prestations = supabase.table("prestations").select("*").eq("camion_id", camion_id).execute().data or []
        pieces = supabase.table("pieces").select("*").eq("camion_id", camion_id).execute().data or []

        controles = []
        if camion.get("statut") in ["pret_a_livrer", "livree"]:
            controles = supabase.table("controles").select("*").eq("camion_id", camion_id).eq("is_reminder", True).execute().data or []

        alerte_active = False
        date_str = camion.get("date_statut_en_cours")
        if camion.get("statut") == "en_cours" and date_str:
            try:
                date_statut = datetime.fromisoformat(date_str)
                retour = camion.get("retour_arriere", False)
                delai = timedelta(days=3) if retour else timedelta(days=7)
                alerte_active = (now - date_statut) > delai
            except:
                pass

        camion["a_des_alertes"] = alerte_active

        return jsonify({
            "camion": camion,
            "prestations": prestations,
            "pieces": pieces,
            "controles": controles
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
__all__ = ["camions_complets_bp"]
