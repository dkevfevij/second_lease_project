import requests
from flask import Blueprint, jsonify
from models.camion import Camion
from models.pieces import Piece
from models.prestations import Prestation
from models.database import SessionLocal
from config.supabase_client import supabase

login_bp = Blueprint("login_erp", __name__, url_prefix="/api")

# 👉 Fonction qui interroge l'ERP et retourne uniquement le token
def get_erp_token():
    url = "https://bonneroute-api.foliatech.app/api/Account/Login"
    payload = {
        "userName": "N.HILALI",
        "password": "123456789"
    }
    headers = {
        "Content-Type": "application/json"
    }

    response = requests.post(url, json=payload, headers=headers)
    data = response.json()

    # Extraire uniquement le token
    return data.get("token")

# 👉 Route Flask qui appelle la fonction et retourne uniquement le token
@login_bp.route("/login_erp", methods=["POST"])
def login_erp():
    try:
        token = get_erp_token()
        if not token:
            return jsonify({"error": "Token manquant ou invalide"}), 400
        return jsonify({"token": token}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def getall_fiche_ids():
    token = get_erp_token()
    if not token:
        raise Exception("Token ERP introuvable")

    url = "https://bonneroute-api.foliatech.app/api/FicheIntervention/"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "Page": 1,
        "PageSize": 3,
        "OrderBy": "createdOn",
        "SortDirection": 0,
        "SearchQuery": "FIT2025-01534"
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    data = response.json()

    # 📌 Extraire uniquement les IDs
    fiches = data.get("value", [])
    ids = [fiche.get("id") for fiche in fiches if fiche.get("id")]

    return ids


def get_fiche_filtrée_par_reference(reference_fiche):
    token = get_erp_token()
    if not token:
        raise Exception("Token ERP introuvable")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 🔍 Requête de recherche
    url_search = "https://bonneroute-api.foliatech.app/api/FicheIntervention/"
    payload = {
        "Page": 1,
        "PageSize": 1,
        "OrderBy": "createdOn",
        "SortDirection": 0,
        "SearchQuery": reference_fiche
    }

    response = requests.post(url_search, json=payload, headers=headers)
    response.raise_for_status()
    fiches = response.json().get("value", [])

    if not fiches:
        return {"error": f"Fiche {reference_fiche} introuvable"}

    fiche_id = fiches[0].get("id")
    if not fiche_id:
        return {"error": "ID de fiche manquant"}

    # 📄 Récupérer la fiche complète
    url_fiche = f"https://bonneroute-api.foliatech.app/api/FicheIntervention/{fiche_id}"
    res = requests.get(url_fiche, headers=headers)
    res.raise_for_status()
    data = res.json().get("value", {})

    resultats = []

    # 🔧 Produits
    for produit in data.get("produits", []):
        resultats.append({
            "fiche_id": fiche_id,
            "type": "produit",
            "reference": produit.get("reference", ""),
            "designation": produit.get("designation", "").strip(),
            "quantite": produit.get("qte", 0)
        })

    # 🔧 Prestations
    for article in data.get("articles", []):
        if article.get("type") == 2:
            resultats.append({
                "fiche_id": fiche_id,
                "type": "prestation",
                "reference": article.get("reference", ""),
                "designation": article.get("designation", "").strip(),
                "quantite": article.get("qte", 0)
            })

    return resultats



@login_bp.route("/fiche_erp_filtrée/<string:reference>", methods=["GET"])
def fetch_fiche_par_reference(reference):
    try:
        lignes = get_fiche_filtrée_par_reference(reference)
        return jsonify(lignes), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


    
# ✅ Fonction pour récupérer le détail d'une fiche intervention par ID
def get_fiche_intervention_by_id(fiche_id):
    token = get_erp_token()
    if not token:
        raise Exception("Token ERP introuvable")

    url = f"https://bonneroute-api.foliatech.app/api/FicheIntervention/{fiche_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

# ✅ Route pour le frontend : /api/fiche_erp/<fiche_id>
@login_bp.route("/fiche_erp/<string:fiche_id>", methods=["GET"])
def fetch_fiche_by_id(fiche_id):
    print(fiche_id)
    try:
        data = get_fiche_intervention_by_id(fiche_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@login_bp.route("/importer_fiche/<string:reference_fiche>", methods=["POST"])
def importer_fiche_erp(reference_fiche):
    try:
        token = get_erp_token()
        if not token:
            return jsonify({"error": "Token ERP introuvable"}), 403

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Rechercher la fiche par sa référence
        res_ids = requests.post(
            "https://bonneroute-api.foliatech.app/api/FicheIntervention/",
            json={
                "Page": 1,
                "PageSize": 1,
                "OrderBy": "createdOn",
                "SortDirection": 0,
                "SearchQuery": reference_fiche
            },
            headers=headers
        )
        res_ids.raise_for_status()
        fiche = res_ids.json().get("value", [])[0]
        fiche_id = fiche.get("id")

        res_detail = requests.get(
            f"https://bonneroute-api.foliatech.app/api/FicheIntervention/{fiche_id}",
            headers=headers
        )
        fiche_detail = res_detail.json().get("value", {})
        chassis = (fiche_detail.get("chassis") or "").strip().upper()
        if not chassis:
            return jsonify({"error": "Châssis manquant"}), 400

        # Vérifie si le camion existe déjà dans Supabase
        camion_query = supabase.table("camions").select("id").eq("numero_chassis", chassis).execute()
        if not camion_query.data:
            return jsonify({"error": f"Camion avec châssis {chassis} introuvable"}), 404
        camion_id = camion_query.data[0]["id"]

        # ⚠️ Vérifie si la fiche a déjà été importée
        doublon_presta = supabase.table("prestations")\
            .select("id")\
            .eq("fiche_reference", reference_fiche)\
            .eq("camion_id", camion_id).execute()

        doublon_piece = supabase.table("pieces")\
            .select("id")\
            .eq("fiche_reference", reference_fiche)\
            .eq("camion_id", camion_id).execute()

        if doublon_presta.data or doublon_piece.data:
            return jsonify({
                "message": f"⚠️ Fiche {reference_fiche} déjà importée pour le camion {chassis}",
                "chassis": chassis
            }), 200

        # Enregistrer les prestations
        prestations_total = 0
        for prestation in fiche_detail.get("articles", []):
            if prestation.get("type") == 2:
                ref = prestation.get("reference")
                des = prestation.get("designation")
                if ref and des:
                    supabase.table("prestations").insert({
                        "camion_id": camion_id,
                        "reference": ref,
                        "description": des.strip(),
                        "est_validee": False,
                        "fiche_reference": reference_fiche
                    }).execute()
                    prestations_total += 1

        # Enregistrer les pièces
        pieces_total = 0
        for piece in fiche_detail.get("produits", []):
            ref = piece.get("reference")
            des = piece.get("designation")
            qty = piece.get("qte", 1)
            if ref and des:
                supabase.table("pieces").insert({
                    "camion_id": camion_id,
                    "reference": ref,
                    "designation": des.strip(),
                    "quantite": int(qty or 1),
                    "est_livree": False,
                    "fiche_reference": reference_fiche
                }).execute()
                pieces_total += 1

        return jsonify({
            "message": "✅ Import terminé avec succès",
            "fiche": reference_fiche,
            "chassis": chassis,
            "prestations_inserées": prestations_total,
            "pieces_inserées": pieces_total
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@login_bp.route("/importer_fiche/<string:reference>", methods=["POST"])
def route_importer_fiche(reference):
    try:
        resultat = importer_fiche_erp(reference)
        return jsonify(resultat), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

