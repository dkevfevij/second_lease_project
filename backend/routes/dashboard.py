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
from datetime import datetime

def check_reminder(camion_id):
    try:
        now = datetime.utcnow()

        # Récupérer le statut du camion
        camion_res = supabase.table("camions").select("statut").eq("id", camion_id).single().execute()
        if not camion_res.data or camion_res.data["statut"] != "pret_a_livrer":
            return False  # Ne pas déclencher de reminder

        reminders_config = {
            "test_batterie": 15,
            "controle_visuel": 3,
            "demarrage": 7
        }

        for reminder_type, max_days in reminders_config.items():
            res = supabase.table("controles") \
                .select("date_controle") \
                .eq("camion_id", camion_id) \
                .eq("type", reminder_type) \
                .eq("valide", True) \
                .eq("is_reminder", True) \
                .order("date_controle", desc=True) \
                .limit(1) \
                .execute()

            if res.data:
                date = datetime.fromisoformat(res.data[0]["date_controle"])
                if (now - date).days > max_days:
                    return True
            else:
                # ⚠️ Ne pas déclencher le reminder tant que le délai n’est pas dépassé depuis le passage à pret_a_livrer
                camion = camion_res.data
                date_statut = camion.get("date_statut_en_cours")
                if not date_statut:
                    continue  # impossible de calculer

                date_passage = datetime.fromisoformat(date_statut)
                if (now - date_passage).days > max_days:
                    return True  # délai dépassé et aucun test encore fait

        return False
    except:
        return False


# 🔐 /me : Infos utilisateur connecté
@dashboard_bp.route('/me', methods=['GET'])
@token_required
def get_me():
    return jsonify({
        "username": request.user['username'],
        "role": request.user['role']
    }), 200
#recupere tous les camions
@dashboard_bp.route('/camions', methods=['GET'])
@token_required
def get_camions():
    try:
        # 🔽 Récupération des paramètres
        sort_order = request.args.get('sort', 'desc')  # 'asc' ou 'desc'
        statut_filter = request.args.get('statut')  # facultatif
        alert_filter = request.args.get('alertes')  # 'true' ou 'false'

        query = supabase.table("camions").select("id, numero_chassis, statut, a_des_alertes, date_creation")

        if statut_filter:
            query = query.eq("statut", statut_filter)
        if alert_filter in ["true", "false"]:
            query = query.eq("a_des_alertes", alert_filter.lower() == "true")

        query = query.order("date_creation", desc=(sort_order == "desc"))

        result = query.execute()

        camions_resumés = [
            {
                "numero_chassis": camion.get("numero_chassis"),
                "statut": camion.get("statut"),
                "a_des_alertes": camion.get("a_des_alertes") or check_reminder(camion.get("id")),
                "date_creation": camion.get("date_creation"),
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
