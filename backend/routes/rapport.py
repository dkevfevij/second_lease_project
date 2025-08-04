from flask import Blueprint, request, send_file, jsonify, render_template, make_response
from datetime import datetime
from config.supabase_client import supabase
import jwt
import os
import pdfkit
from functools import wraps
import shutil

rapport_bp = Blueprint("rapport", __name__, url_prefix="/api/camions")
SECRET_KEY = os.environ.get("SECRET_KEY", "SecondLeaseJWTSecret2025")

wkhtmltopdf_path = shutil.which("wkhtmltopdf")
if not wkhtmltopdf_path:
    raise OSError("❌ wkhtmltopdf introuvable. Vérifie l'installation dans l'image Docker.")

pdf_config = pdfkit.configuration(wkhtmltopdf=wkhtmltopdf_path)

# 🔧 Utilitaire de formatage de date
def format_date(date_input):
    try:
        if not date_input:
            return "—"
        
        if isinstance(date_input, datetime):
            return date_input.strftime("%d/%m/%Y")
        
        if isinstance(date_input, str):
            # Si c'est une string ISO (ex: '2025-06-30')
            return datetime.fromisoformat(date_input).strftime("%d/%m/%Y")
        
        # Si c’est un objet date (ex : type Date de SQLAlchemy ou Supabase)
        return date_input.strftime("%d/%m/%Y")
    
    except Exception as e:
        print("❌ Erreur format_date :", e)
        return "—"

def format_statut_fr(statut):
    mapping = {
        "en_attente": "En attente",
        "en_cours": "En cours",
        "pret_a_livrer": "Prêt à livrer",
        "livree": "Livré"
    }
    return mapping.get(statut, statut)

# 🔐 Décorateur d'authentification
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

@rapport_bp.route('/<string:chassis>/rapport-pdf', methods=['GET'])
@token_required
def generate_pdf(chassis):
    try:
        camion_res = supabase.table("camions").select("*", count="exact").eq("numero_chassis", chassis).single().execute()
        camion = camion_res.data
        if not camion:
            return jsonify({"error": "Camion introuvable"}), 404

        camion_id = camion.get("id")

        # Formatage des dates principales
        formatted_creation = format_date(camion.get("date_creation"))
        formatted_en_cours = format_date(camion.get("date_statut_en_cours"))
        formatted_mec = format_date(camion.get("date_mise_en_circulation"))
        formatted_livraison = format_date(camion.get("date_livraison"))


        prestations = supabase.table("prestations").select("*").eq("camion_id", camion_id).execute().data or []
        pieces = supabase.table("pieces").select("*").eq("camion_id", camion_id).execute().data or []

        # 🔁 Récupérer les contrôles périodiques si applicable
        controles = []
        
        if camion.get("statut") in ["pret_a_livrer", "livree"]:
            controles_res = supabase.table("controles").select("*").eq("camion_id", camion_id).eq("is_reminder", True).execute()
            controles = controles_res.data or []
            for ctrl in controles:
                ctrl["formatted_date"] = format_date(ctrl.get("date_controle"))

        now = datetime.now().strftime('%d/%m/%Y %H:%M')

        # 🔵 Logos
        logo_path = os.path.join(os.getcwd(), 'static', 'logo_BR.png').replace('\\', '/')
        second_logo_path = os.path.join(os.getcwd(), 'static', 'logo_second_lease.png').replace('\\', '/')

        html = render_template(
    "rapport.html",
    camion=camion,
    prestations=prestations,
    pieces=pieces,
    now=now,
    date_creation=formatted_creation,
    date_statut_en_cours=formatted_en_cours,
    date_mise_en_circulation=formatted_mec,
    date_livraison=formatted_livraison,
    controles=controles,
    logo=logo_path,
    second_logo=second_logo_path,
    statut_formate=format_statut_fr(camion.get("statut"))  # ✅ ligne ajoutée
)




        options = {
            'margin-top': '1cm',
            'margin-right': '1cm',
            'margin-bottom': '1cm',
            'margin-left': '1cm',
            'enable-local-file-access': None,
            'page-size': 'A4'
        }

        pdf = pdfkit.from_string(html, False, configuration=pdf_config, options=options)
        response = make_response(pdf)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'inline; filename=rapport_{chassis}.pdf'
        return response

    except Exception as e:
        print("Erreur génération PDF:", str(e))
        return jsonify({"error": str(e)}), 500
