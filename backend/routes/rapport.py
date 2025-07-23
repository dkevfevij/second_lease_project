from flask import Blueprint, request, send_file, jsonify, render_template, make_response
from datetime import datetime
from config.supabase_client import supabase
import jwt
import os
import pdfkit
from functools import wraps

rapport_bp = Blueprint("rapport", __name__, url_prefix="/api/camions")
SECRET_KEY = os.environ.get("SECRET_KEY", "SecondLeaseJWTSecret2025")
wkhtmltopdf_path = r'C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe'
pdf_config = pdfkit.configuration(wkhtmltopdf=wkhtmltopdf_path)

# Authentification décorateur
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
        prestations = supabase.table("prestations").select("*").eq("camion_id", camion_id).execute().data or []
        pieces = supabase.table("pieces").select("*").eq("camion_id", camion_id).execute().data or []

        now = datetime.now().strftime('%d/%m/%Y %H:%M')

        # 🔵 Logos
        logo_path = os.path.join(os.getcwd(), 'static', 'logo_BR.png').replace('\\', '/')
        second_logo_path = os.path.join(os.getcwd(), 'static', 'logo_second_lease.png').replace('\\', '/')

        html = render_template("rapport.html",
                               camion=camion,
                               prestations=prestations,
                               pieces=pieces,
                               now=now,
                               logo=logo_path,
                               second_logo=second_logo_path)

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
