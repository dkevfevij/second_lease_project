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

@camions_complets_bp.route("/liste_complets", methods=["GET"])
@token_required
def get_all_camions():
    try:
        # Lire les filtres depuis la query string
        statut = request.args.get("statut")
        alerte = request.args.get("alertes")  # "true" ou "false"
        sort = request.args.get("sort", "desc")  # "asc" ou "desc"
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))
        offset = (page - 1) * limit

        # Requête initiale
        query = supabase.table("camions").select("*")

        # Filtrage par statut si fourni
        if statut:
            query = query.eq("statut", statut)

        # Tri
        if sort == "asc":
            query = query.order("date_creation", desc=False)
        else:
            query = query.order("date_creation", desc=True)

        # Récupération des données
        res = query.range(offset, offset + limit - 1).execute()

        # Traitement des alertes
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

        # Si filtre alerte côté client → appliquer maintenant
        if alerte == "true":
            result = [c for c in result if c.get("a_des_alertes") is True]
        elif alerte == "false":
            result = [c for c in result if not c.get("a_des_alertes")]

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
