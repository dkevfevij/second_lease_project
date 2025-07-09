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

        camion_id_str = request.form.get('camion_id')
        if not camion_id_str:
            return jsonify({"error": "camion_id is required"}), 400

        try:
            camion_id = int(camion_id_str)
        except ValueError:
            return jsonify({"error": "camion_id must be an integer"}), 400

        file_name = f"{camion_id}_{file.filename}"
        bucket = "photos"

        upload_response = supabase.storage.from_(bucket).upload(file_name, file.read(), {
            "content-type": file.content_type
        })

        # 🔍 Vérifie si le camion existe
        existing = supabase.table("camions").select("photos_url").eq("id", camion_id).execute()
        if not existing.data:
            return jsonify({"error": "Camion not found"}), 404

        # 📋 On récupère la liste actuelle d'images
        current_photos = existing.data[0].get("photos_url")
        try:
            photo_list = json.loads(current_photos) if current_photos else []
        except:
            photo_list = []

        # ➕ Ajouter le nouveau nom de fichier
        photo_list.append(file_name)

        # 📝 Mettre à jour
        update_response = supabase.table("camions").update({
            "photos_url": json.dumps(photo_list)
        }).eq("id", camion_id).execute()

        print("📝 Mise à jour effectuée :", update_response)

        return jsonify({"message": "Upload OK", "file_name": file_name, "all_photos": photo_list}), 200

    except Exception as e:
        print("🔥 Erreur :", str(e))
        return jsonify({"error": str(e)}), 500
