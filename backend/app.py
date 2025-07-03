# backend/app.py

from flask import Flask
from flask_cors import CORS

# Initialisation de l'app
app = Flask(__name__)
CORS(app)

# Importation des routes
from routes.camions import router as camions_router
app.register_blueprint(camions_router)

# Test simple
@app.route('/ping')
def ping():
    return {'message': 'pong'}, 200

if __name__ == '__main__':
    print("✅ Serveur Flask en cours d'exécution sur http://localhost:5000")
    app.run(debug=True)
