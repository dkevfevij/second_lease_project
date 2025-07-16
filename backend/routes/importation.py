from flask import Blueprint, request, jsonify
from config.supabase_client import supabase
import json

importation_bp = Blueprint("importation", __name__, url_prefix="/api")

@importation_bp.route("/importer-fiches", methods=["POST"])
def importer_fiches():
    if 'file' not in request.files:
        return jsonify({"error": "Fichier manquant"}), 400

    fichier = request.files['file']
    try:
        content = fichier.read().decode("utf-8")
        data = json.loads(content)
    except Exception as e:
        return jsonify({"error": f"Erreur de lecture du fichier : {str(e)}"}), 400

    interventions = data.get("value", [])
    prestations_total, pieces_total, camions_ajoutes = 0, 0, 0
    erreurs = []

    for fiche in interventions:
        chassis = (fiche.get("chassis") or "").strip().upper()
        if not chassis:
            continue

        # Vérifier si le camion existe déjà
        camion_query = supabase.table("camions").select("id").eq("numero_chassis", chassis).execute()
        if camion_query.data:
            camion_id = camion_query.data[0]["id"]
        else:
            try:
                nouveau_camion = {
                    "numero_chassis": chassis,
                    "immatriculation_etrangere": fiche.get("immatriculation") or "INCONNUE",
                    "marque": fiche.get("marque") or "INCONNUE",
                    "modele": fiche.get("modele") or "INCONNU",
                    "kilometrage": int(fiche.get("kilometrage") or 0),
                    "date_mise_en_circulation": fiche.get("dateFirstMiseEnCirculation") or "2000-01-01",
                    "client": (fiche.get("client") or "").strip(),
                    "inspection_reception": (fiche.get("description") or "").strip(),
                    "memos": "",
                    "photos_url": "",
                    "statut": "en_attente",
                    "fiche_complete": False,
                    "a_des_alertes": False
                }
                insert_res = supabase.table("camions").insert(nouveau_camion).execute()
                camion_id = insert_res.data[0]["id"]
                camions_ajoutes += 1
            except Exception as e:
                erreurs.append(f"❌ Erreur création camion {chassis} : {str(e)}")
                continue

        # Prestations
        for prestation in fiche.get("articles", []):
            ref = prestation.get("reference")
            des = prestation.get("designation")
            if ref and des:
                supabase.table("prestations").insert({
                    "camion_id": camion_id,
                    "reference": ref,
                    "description": des,
                    "est_validee": False
                }).execute()
                prestations_total += 1

        # Pièces
        for piece in fiche.get("produits", []):
            ref = piece.get("reference")
            des = piece.get("designation")
            qty = piece.get("qte", 1)
            if ref and des:
                supabase.table("pieces").insert({
                    "camion_id": camion_id,
                    "reference": ref,
                    "designation": des,
                    "quantite": int(qty or 1),
                    "est_livree": False
                }).execute()
                pieces_total += 1

    return jsonify({
        "message": "Import terminé",
        "camions_ajoutes": camions_ajoutes,
        "prestations_inserees": prestations_total,
        "pieces_inserées": pieces_total,
        "erreurs": erreurs
    }), 200
