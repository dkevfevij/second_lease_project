# backend/routes/camions.py

from flask import Blueprint, request, jsonify
from models.database import SessionLocal
from models.camion import Camion
from datetime import datetime

router = Blueprint('camions', __name__)

@router.route('/camions', methods=['GET'])
def get_camions():
    db = SessionLocal()
    try:
        camions = db.query(Camion).all()
        resultat = []
        for c in camions:
            resultat.append({
                "id": c.id,
                "numero_chassis": c.numero_chassis,
                "immatriculation_etrangere": c.immatriculation_etrangere,
                "marque": c.marque,
                "modele": c.modele,
                "kilometrage": c.kilometrage,
                "date_mise_en_circulation": c.date_mise_en_circulation.isoformat(),
                "client": c.client,
                "inspection_reception": c.inspection_reception,
                "memos": c.memos,
                "photos_url": c.photos_url,
                "statut": c.statut,
                "fiche_complete": c.fiche_complete,
                "a_des_alertes": c.a_des_alertes
            })
        return jsonify(resultat), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
