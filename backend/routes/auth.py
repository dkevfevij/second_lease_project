# backend/routes/auth.py

from flask import Blueprint, request, jsonify
from models.database import SessionLocal
from models.users import User
import bcrypt
import jwt
import os

auth_router = Blueprint("auth", __name__)
SECRET_KEY = os.environ.get("SECRET_KEY", "SecondLeaseJWTSecret2025")

@auth_router.route('/auth/login', methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Champs manquants"}), 400

    db = SessionLocal()
    user = db.query(User).filter_by(identifiant=username).first()

    if user and bcrypt.checkpw(password.encode('utf-8'), user.mot_de_passe.encode('utf-8')):
        # 🔒 Vérifie si le compte est actif
        if not user.actif:
            return jsonify({"error": "Compte inactif. Contactez un administrateur."}), 403

        token = jwt.encode({
            "id": user.id,
            "username": user.identifiant,
            "role": user.role
        }, SECRET_KEY, algorithm="HS256")

        return jsonify({
            "token": token,
            "user": {
                "id": user.id,
                "username": user.identifiant,
                "role": user.role
            }
        }), 200

    return jsonify({"error": "Nom d'utilisateur ou mot de passe incorrect"}), 401
