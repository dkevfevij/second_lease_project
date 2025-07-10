import json
from flask import Blueprint, request, jsonify

upload_photo_bp = Blueprint('upload_photo', __name__, url_prefix='/api/photos')
supabase = None

def init_app(supabase_client):
    global supabase
    supabase = supabase_client

@upload_photo_bp.route('/upload', methods=['POST'])
def upload_photo():
    try:
        print("📥 Requête reçue : /api/photos/upload")

        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        numero_chassis = request.form.get('numero_chassis')
        if not numero_chassis:
            return jsonify({"error": "numero_chassis is required"}), 400

        # 🔍 Recherche du camion via numero_chassis
        existing = supabase.table("camions").select("id, photos_url").eq("numero_chassis", numero_chassis).execute()
        if not existing.data:
            return jsonify({"error": "Camion not found"}), 404

        camion = existing.data[0]
        camion_id = camion["id"]

        file_name = f"{numero_chassis}_{file.filename}"
        bucket = "photos"

        # 📤 Upload du fichier
        upload_response = supabase.storage.from_(bucket).upload(file_name, file.read(), {
            "content-type": file.content_type
        })

        # 📋 Récupération des photos existantes
        current_photos = camion.get("photos_url")
        try:
            photo_list = json.loads(current_photos) if current_photos else []
        except:
            photo_list = []

        # ➕ Ajout du fichier
        photo_list.append(file_name)

        # 📝 Mise à jour dans la table
        update_response = supabase.table("camions").update({
            "photos_url": json.dumps(photo_list)
        }).eq("id", camion_id).execute()

        print("📝 Mise à jour effectuée :", update_response)

        return jsonify({"message": "Upload OK", "file_name": file_name, "all_photos": photo_list}), 200

    except Exception as e:
        print("🔥 Erreur :", str(e))
        return jsonify({"error": str(e)}), 500
