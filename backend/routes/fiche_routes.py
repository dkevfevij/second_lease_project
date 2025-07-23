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


# ✅ Mettre à jour une prestation (admin uniquement)
@fiche_routes_bp.route("/prestations/<int:prestation_id>", methods=["PATCH"])
@token_required
@role_required("admin")
def update_prestation(prestation_id):
    try:
        payload = request.get_json()
        est_validee = payload.get("est_validee")

        # Vérification existence
        check = supabase.table("prestations").select("id").eq("id", prestation_id).execute()
        if not check.data:
            return jsonify({"error": "Prestation introuvable"}), 404

        supabase.table("prestations").update({"est_validee": est_validee}).eq("id", prestation_id).execute()

        return jsonify({"message": "Prestation mise à jour", "id": prestation_id, "est_validee": est_validee}), 200

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

        # Vérification existence
        check = supabase.table("pieces").select("id").eq("id", piece_id).execute()
        if not check.data:
            return jsonify({"error": "Pièce introuvable"}), 404

        supabase.table("pieces").update({"est_livree": est_livree}).eq("id", piece_id).execute()

        return jsonify({"message": "Pièce mise à jour", "id": piece_id, "est_livree": est_livree}), 200

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
        statuts_valides = ["en_attente", "en_cours", "pret_a_livrer", "livre"]

        if nouveau_statut not in statuts_valides:
            return jsonify({"error": f"Statut invalide. Choisissez parmi : {statuts_valides}"}), 400

        # Vérifier si le camion existe
        check = supabase.table("camions").select("id").eq("numero_chassis", chassis).single().execute()
        if not check.data:
            return jsonify({"error": "Camion introuvable"}), 404

        # Construire les données à mettre à jour
        update_data = {"statut": nouveau_statut}

        # Si le nouveau statut est "en_cours", ajouter date_statut_en_cours
        if nouveau_statut == "en_cours":
            update_data["date_statut_en_cours"] = datetime.utcnow().isoformat()

        # Appliquer la mise à jour
        supabase.table("camions").update(update_data).eq("numero_chassis", chassis).execute()

        return jsonify({
            "message": "Statut mis à jour",
            "numero_chassis": chassis,
            "nouveau_statut": nouveau_statut
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

