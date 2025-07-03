# backend/routes/camions.py

from flask import Blueprint, request, jsonify
from models.database import SessionLocal
from models.camion import Camion
from datetime import datetime

router = Blueprint('camions', __name__)

@router.route('/camions', methods=['POST'])
def enregistrer_camion():
    data = request.json

    # Champs obligatoires
    champs_obligatoires = [
        'numero_chassis', 'immatriculation_etrangere', 'marque',
        'modele', 'kilometrage', 'date_mise_en_circulation',
        'inspection_reception', 'photos_url'
    ]

    # Vérification des champs requis
    for champ in champs_obligatoires:
        if champ not in data or not str(data[champ]).strip():
            return jsonify({'error': f"Champ obligatoire manquant ou vide : '{champ}'"}), 400

    # Vérifier le format de date
    try:
        date_mec = datetime.strptime(data['date_mise_en_circulation'], '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': "Format de date invalide pour 'date_mise_en_circulation'. Format attendu : YYYY-MM-DD"}), 400

    # Vérifier que kilometrage est un entier positif
    try:
        kilometrage = int(data['kilometrage'])
        if kilometrage < 0:
            raise ValueError
    except ValueError:
        return jsonify({'error': "'kilometrage' doit être un entier positif"}), 400

    try:
        db = SessionLocal()

        # Vérifier unicité du numéro de châssis
        existant = db.query(Camion).filter(Camion.numero_chassis == data['numero_chassis']).first()
        if existant:
            return jsonify({'error': 'Un camion avec ce numéro de châssis existe déjà.'}), 409

        nouveau_camion = Camion(
            numero_chassis=data['numero_chassis'],
            immatriculation_etrangere=data['immatriculation_etrangere'],
            marque=data['marque'],
            modele=data['modele'],
            kilometrage=kilometrage,
            date_mise_en_circulation=date_mec,
            client=data.get('client'),
            inspection_reception=data['inspection_reception'],
            memos=data.get('memos'),
            photos_url=data['photos_url'],
            statut='en_attente',
            fiche_complete=False,
            a_des_alertes=False
        )

        db.add(nouveau_camion)
        db.commit()

        return jsonify({'message': 'Camion enregistré avec succès.'}), 201

    except Exception as e:
        return jsonify({'error': f'Erreur serveur : {str(e)}'}), 500

    finally:
        db.close()
