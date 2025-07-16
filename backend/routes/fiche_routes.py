from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from datetime import datetime
import os
from dotenv import load_dotenv
load_dotenv()

from models.database import SessionLocal
from models.camion import Camion
from models.bl_documents import BLDocument
from models.pieces import Piece
from models.prestations import Prestation
from utils.chatpdf import upload_pdf_to_chatpdf, ask_chatpdf_for_extraction

fiche_bp = Blueprint("fiche", __name__, url_prefix="/api/fiche")
UPLOAD_FOLDER = "static/bl_files"

# 🔼 Upload d'une fiche + traitement ChatPDF + insertion base
@fiche_bp.route("/upload", methods=["POST"])
def upload_fiche_pdf():
    try:
        file = request.files.get("file")
        numero_chassis = request.form.get("numero_chassis")

        if not file or not numero_chassis:
            return jsonify({"error": "Fichier ou numéro de châssis manquant"}), 400

        db = SessionLocal()
        camion = db.query(Camion).filter_by(numero_chassis=numero_chassis).first()
        if not camion:
            return jsonify({"error": "Camion non trouvé"}), 404

        camion_id = camion.id

        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        # 📄 Sauvegarde fichier dans bl_documents
        bl_doc = BLDocument(
            camion_id=camion_id,
            fichier_url=filepath,
            date_upload=datetime.utcnow()
        )
        db.add(bl_doc)

        # 🔁 Traitement IA via ChatPDF
        source_id = upload_pdf_to_chatpdf(filepath)
        json_data = ask_chatpdf_for_extraction(source_id)

        import json
        elements = json.loads(json_data)

        articles = []
        produits = []

        for item in elements:
            if item["type"] == "article":
                db.add(Prestation(
                    camion_id=camion_id,
                    reference=item["reference"],
                    description=item["description"],
                    est_validee=False
                ))
                articles.append(item)

            elif item["type"] == "produit":
                db.add(Piece(
                    camion_id=camion_id,
                    reference=item["reference"],
                    designation=item["description"],
                    quantite=int(float(item["quantite"])),
                    est_livree=False
                ))
                produits.append(item)

        db.commit()

        return jsonify({
            "message": "Fiche analysée avec succès via ChatPDF",
            "camion": numero_chassis,
            "fichier": filename,
            "articles": articles,
            "produits": produits,
            "total_elements": len(elements)
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 🔽 Récupérer les articles/pièces extraits
@fiche_bp.route("/checklist/<string:numero_chassis>", methods=["GET"])
def get_checklist(numero_chassis):
    try:
        db = SessionLocal()
        camion = db.query(Camion).filter_by(numero_chassis=numero_chassis).first()

        if not camion:
            return jsonify({"error": "Camion non trouvé"}), 404

        prestations = db.query(Prestation).filter_by(camion_id=camion.id).all()
        prestations_data = [
            {
                "id": p.id,
                "reference": p.reference,
                "description": p.description,
                "est_validee": p.est_validee
            }
            for p in prestations
        ]

        pieces = db.query(Piece).filter_by(camion_id=camion.id).all()
        pieces_data = [
            {
                "id": p.id,
                "reference": p.reference,
                "designation": p.designation,
                "quantite": p.quantite,
                "est_livree": p.est_livree
            }
            for p in pieces
        ]

        return jsonify({
            "numero_chassis": numero_chassis,
            "prestations": prestations_data,
            "pieces": pieces_data
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    