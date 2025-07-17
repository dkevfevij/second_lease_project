from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from config.supabase_client import supabase  # 👈 importer ici

load_dotenv()

app = Flask(__name__)
#CORS(app)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})


# Routes
from routes.auth import auth_router
app.register_blueprint(auth_router)

from routes.dashboard import dashboard_bp
app.register_blueprint(dashboard_bp)

from routes.upload_photo import upload_photo_bp, init_app
init_app(supabase)  # 👈 on passe supabase ici
app.register_blueprint(upload_photo_bp)

from routes.camions import camions_bp
app.register_blueprint(camions_bp)

from routes.users import users_bp
app.register_blueprint(users_bp)

from routes.fiche_routes import fiche_routes_bp
app.register_blueprint(fiche_routes_bp)


from routes.importation import importation_bp
app.register_blueprint(importation_bp)

from scrape_erp.login import login_bp
app.register_blueprint(login_bp, url_prefix="/api")

@app.route('/ping')
def ping():
    return {'message': 'pong'}, 200

if __name__ == '__main__':
    print("✅ Serveur Flask en cours d'exécution sur http://localhost:5000")
    app.run(debug=True)
