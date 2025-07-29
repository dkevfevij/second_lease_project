from flask import Blueprint, request, jsonify
from config.supabase_client import supabase
from middlewares.auth_guard import token_required, role_required

fiche_routes_bp = Blueprint("fiche_routes", __name__, url_prefix="/api")

# ✅ Récupérer prestations + pièces liées à un camion
@fiche_routes_bp.route("/camions/<string:chassis>/elements_fiche", methods=["GET"])
@token_required
def get_elements_fiche(chassis):
    try:
        camion_res = supabase.table("camions").select("id").eq("numero_chassis", chassis).execute()
        if not camion_res.data:
            return jsonify({"error": "Camion introuvable"}), 404

        camion_id = camion_res.data[0]["id"]

        prestations = supabase.table("prestations").select("id, reference, description, est_validee, fiche_reference").eq("camion_id", camion_id).execute().data
        pieces = supabase.table("pieces").select("id, reference, designation, quantite, est_livree, fiche_reference").eq("camion_id", camion_id).execute().data

         # 🔄 Extraire toutes les références de fiche uniques (depuis prestations ou pieces)
        fiches = list(set([p["fiche_reference"] for p in prestations + pieces if p.get("fiche_reference")]))

        return jsonify({
            "prestations": prestations,
            "pieces": pieces,
            "fiches": fiches  # 🆕 on envoie aussi les références
        }), 200


    except Exception as e:
        return jsonify({"error": str(e)}), 500


@fiche_routes_bp.route("/prestations/<int:prestation_id>", methods=["PATCH"])
@token_required
@role_required("admin")
def update_prestation(prestation_id):
    try:
        payload = request.get_json()
        est_validee = payload.get("est_validee")

        # Vérification existence de la prestation et récupération du camion_id
        prestation_res = supabase.table("prestations").select("camion_id").eq("id", prestation_id).single().execute()
        if not prestation_res.data:
            return jsonify({"error": "Prestation introuvable"}), 404

        camion_id = prestation_res.data["camion_id"]

        # Vérifier le statut du camion
        camion = supabase.table("camions").select("statut").eq("id", camion_id).single().execute()
        if camion.data and camion.data["statut"] == "pret_a_livrer":
            return jsonify({"error": "Modification refusée : le camion est en état 'pret_a_livrer'"}), 403

        # Mise à jour de la prestation
        supabase.table("prestations").update({"est_validee": est_validee}).eq("id", prestation_id).execute()

        return jsonify({
            "message": "Prestation mise à jour",
            "id": prestation_id,
            "est_validee": est_validee
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ✅ Mettre à jour une pièce (admin uniquement)
@fiche_routes_bp.route("/pieces/<int:piece_id>", methods=["PATCH"])
@token_required
@role_required("admin")
def update_piece(piece_id):
    try:
        payload = request.get_json()
        est_livree = payload.get("est_livree")

        # Vérification existence de la pièce et récupération du camion_id
        piece_res = supabase.table("pieces").select("camion_id").eq("id", piece_id).single().execute()
        if not piece_res.data:
            return jsonify({"error": "Pièce introuvable"}), 404

        camion_id = piece_res.data["camion_id"]

        # Vérifier le statut du camion
        camion = supabase.table("camions").select("statut").eq("id", camion_id).single().execute()
        if camion.data and camion.data["statut"] == "pret_a_livrer":
            return jsonify({"error": "Modification refusée : le camion est en état 'pret_a_livrer'"}), 403

        # Mise à jour de la pièce
        supabase.table("pieces").update({"est_livree": est_livree}).eq("id", piece_id).execute()

        return jsonify({
            "message": "Pièce mise à jour",
            "id": piece_id,
            "est_livree": est_livree
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ✅ Changer le statut d'un camion (admin uniquement)
from datetime import datetime

@fiche_routes_bp.route("/camions/<string:chassis>/changer-statut", methods=["PATCH"])
@token_required
@role_required("admin")
def changer_statut_camion(chassis):
    try:
        payload = request.get_json()
        nouveau_statut = payload.get("nouveau_statut")
        statuts_valides = ["en_attente", "en_cours", "pret_a_livrer", "livree"]

        if nouveau_statut not in statuts_valides:
            return jsonify({"error": f"Statut invalide. Choisissez parmi : {statuts_valides}"}), 400

        camion_res = supabase.table("camions").select("*").eq("numero_chassis", chassis).single().execute()
        if not camion_res.data:
            return jsonify({"error": "Camion introuvable"}), 404

        camion = camion_res.data
        camion_id = camion.get("id")
        ancien_statut = camion.get("statut")
        update_data = {"statut": nouveau_statut}

        if nouveau_statut == "en_cours":
            update_data["date_statut_en_cours"] = datetime.utcnow().isoformat()
            update_data["retour_arriere"] = ancien_statut == "pret_a_livrer"
            supabase.table("controles").delete().eq("camion_id", camion_id).eq("valide", False).execute()
            update_data["reminders_initialises"] = False
            update_data["a_des_alertes"] = False

        elif nouveau_statut == "pret_a_livrer":
            update_data["retour_arriere"] = True
            update_data["a_des_alertes"] = False
            if not camion.get("reminders_initialises"):
                for type_controle in ["test_batterie", "controle_visuel", "demarrage"]:
                    supabase.table("controles").insert({
                        "camion_id": camion_id,
                        "type": type_controle,
                        "date_controle": datetime.utcnow().isoformat(),
                        "valide": False,
                        "is_reminder": False,
                        "count": 1,
                        "commentaire": None
                    }).execute()
                update_data["reminders_initialises"] = True

        elif nouveau_statut == "livree":
            update_data["reminders_initialises"] = False
            update_data["a_des_alertes"] = False
            update_data["date_livraison"] = datetime.utcnow().isoformat()
            # Marquer explicitement que les rappels sont terminés
            update_data["rappels_termines"] = True  # Nouveau champ suggéré

        else:
            update_data["retour_arriere"] = False

        supabase.table("camions").update(update_data).eq("numero_chassis", chassis).execute()

        return jsonify({
            "message": "Statut mis à jour",
            "numero_chassis": chassis,
            "nouveau_statut": nouveau_statut
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@fiche_routes_bp.route("/camions/<string:chassis>/alerte", methods=["GET"])
@token_required
def verifier_alerte_camion(chassis):
    try:
        # 1. Récupération des infos
        res = supabase.table("camions").select("id, statut, date_statut_en_cours, retour_arriere").eq("numero_chassis", chassis).single().execute()
        if not res.data:
            return jsonify({"alerte": False, "reason": "Camion introuvable"}), 404

        camion = res.data
        statut = camion.get("statut")
        retour = camion.get("retour_arriere", False)
        date_str = camion.get("date_statut_en_cours")

        if not date_str:
            return jsonify({"alerte": False, "reason": "Date statut en cours absente"}), 200

        from datetime import datetime, timedelta
        date_statut = datetime.fromisoformat(date_str)
        now = datetime.utcnow()

        # 2. Déterminer si une alerte est active
        alerte_active = False
        if statut == "en_cours":
            delai = timedelta(days=3) if retour else timedelta(days=7)
            alerte_active = (now - date_statut) > delai

        # 3. Mettre à jour le champ a_des_alertes dans la table si nécessaire
        supabase.table("camions").update({"a_des_alertes": alerte_active}).eq("numero_chassis", chassis).execute()

        return jsonify({
            "alerte": alerte_active,
            "retour_arriere": retour,
            "depassement_jours": (now - date_statut).days,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@fiche_routes_bp.route("/camions/<string:chassis>/reminders", methods=["GET"])
@token_required
def get_reminders_camion(chassis):
    try:
        # Récupérer l’ID du camion et le statut des rappels
        res = supabase.table("camions").select("id, statut, rappels_termines").eq("numero_chassis", chassis).single().execute()
        if not res.data:
            return jsonify({"error": "Camion introuvable"}), 404

        camion = res.data
        if camion.get("rappels_termines", False) or camion.get("statut") == "livree":
            return jsonify({})  # Pas de rappels si terminés ou si statut est "livree"

        camion_id = camion["id"]
        now = datetime.utcnow()

        types_reminders = {
            "test_batterie": 15,
            "controle_visuel": 3,
            "demarrage": 7
        }

        result = {}

        for type_controle, max_jours in types_reminders.items():
            controle_res = supabase.table("controles") \
                .select("id, date_controle, valide, count") \
                .eq("camion_id", camion_id) \
                .eq("type", type_controle) \
                .order("date_controle", desc=True) \
                .limit(1) \
                .execute()

            reminder = False
            jours_ecoules = None
            last = None
            count = 0

            if controle_res.data:
                controle = controle_res.data[0]
                last = datetime.fromisoformat(controle["date_controle"].replace("Z", "+00:00"))
                jours_ecoules = (now - last).days
                count = controle.get("count", 1)
                if not controle["valide"] and jours_ecoules > max_jours:
                    reminder = True
                    if not controle.get("is_reminder", False):
                        supabase.table("controles").update({"is_reminder": True}).eq("id", controle["id"]).execute()

            result[type_controle] = {
                "rappel": reminder,
                "dernier": last.isoformat() if last else None,
                "jours_depuis_dernier": jours_ecoules,
                "count": count
            }

        alerte_active = any(rem["rappel"] for rem in result.values())
        supabase.table("camions").update({"a_des_alertes": alerte_active}).eq("id", camion_id).execute()

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@fiche_routes_bp.route("/reminders/valider", methods=["POST"])
@token_required
@role_required("admin")
def valider_reminder():
    try:
        data = request.get_json()
        chassis = data.get("numero_chassis")
        type_controle = data.get("type")
        commentaire = data.get("commentaire", None)

        if not chassis or not type_controle:
            return jsonify({"error": "Champs manquants"}), 400

        camion_res = supabase.table("camions").select("id").eq("numero_chassis", chassis).single().execute()
        if not camion_res.data:
            return jsonify({"error": "Camion introuvable"}), 404

        camion_id = camion_res.data["id"]

        # Récupérer le dernier contrôle non validé pour ce type
        controle_res = supabase.table("controles") \
            .select("id, count") \
            .eq("camion_id", camion_id) \
            .eq("type", type_controle) \
            .eq("valide", False) \
            .eq("is_reminder", True) \
            .order("date_controle", desc=True) \
            .limit(1) \
            .execute()

        if not controle_res.data:
            return jsonify({"error": "Aucun contrôle en attente pour ce type"}), 404

        controle = controle_res.data[0]
        controle_id = controle["id"]
        count = controle.get("count", 1)

        # Mettre à jour le contrôle existant
        supabase.table("controles").update({
            "valide": True,
            "resultat": "Validé",
            "commentaire": commentaire,
            "date_controle": datetime.utcnow().isoformat()  # Mise à jour de la date pour refléter la validation
        }).eq("id", controle_id).execute()

        # Insérer un nouveau contrôle pour le prochain cycle
        supabase.table("controles").insert({
            "camion_id": camion_id,
            "type": type_controle,
            "date_controle": datetime.utcnow().isoformat(),
            "valide": False,
            "is_reminder": False,  # Par défaut, pas un rappel
            "count": count + 1,
            "commentaire": None
        }).execute()

        return jsonify({
            "message": "Reminder validé",
            "type": type_controle,
            "count": count + 1
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500