# backend/routes/auth.py

from flask import Blueprint, request, jsonify
from models.database import SessionLocal
from models.users import User
import bcrypt

auth_router = Blueprint("auth", __name__)

@auth_router.route('/auth/login', methods=["POST"])
def login():
    data = request.json
    identifiant = data.get("username")
    mot_de_passe = data.get("mot_de_passe")

    if not identifiant or not mot_de_passe:
        return jsonify({"error": "Champs manquants"}), 400

    db = SessionLocal()
    user = db.query(User).filter_by(identifiant=identifiant).first()

    if user and bcrypt.checkpw(mot_de_passe.encode('utf-8'), user.mot_de_passe.encode('utf-8')):
        return jsonify({
            "message": "Connexion réussie",
            "user": {
                "id": user.id,
                "username": user.identifiant,
                "role": user.role
            }
        }), 200

    return jsonify({"error": "Nom d'utilisateur ou mot de passe incorrect"}), 401
