from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# 1. Charger les variables d’environnement
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# 2. Créer le moteur SQLAlchemy
engine = create_engine(DATABASE_URL, echo=True, future=True)

# 3. Exécution du test
try:
    with engine.connect() as conn:
        print("✅ Connexion à la base Supabase réussie !")

        # 4. Créer la table camions (si elle n'existe pas déjà)
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS camions (
                id SERIAL PRIMARY KEY,
                numero_chassis TEXT NOT NULL,
                immatriculation_etrangere TEXT NOT NULL,
                marque TEXT NOT NULL,
                modele TEXT NOT NULL,
                kilometrage INTEGER NOT NULL,
                date_mise_en_circulation DATE NOT NULL,
                client TEXT,
                inspection_reception TEXT NOT NULL,
                memos TEXT,
                photos_url TEXT,
                statut TEXT DEFAULT 'en_attente',
                date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()
        print("🛠 Table camions vérifiée ou créée.")

        # 5. Insertion d’un camion test
        conn.execute(text("""
            INSERT INTO camions (
                numero_chassis, immatriculation_etrangere, marque, modele,
                kilometrage, date_mise_en_circulation, client, inspection_reception,
                memos, photos_url, statut
            )
            VALUES (
                :chassis, :immat, :marque, :modele,
                :km, :date_mec, :client, :inspection,
                :memos, :photos, :statut
            )
        """), {
            "chassis": "XDF1234567890",
            "immat": "7890-AB-99",
            "marque": "DAF",
            "modele": "XF 480",
            "km": 654321,
            "date_mec": "2021-06-01",
            "client": "Transport Casa Nord",
            "inspection": "Rien à signaler à la réception",
            "memos": "Prévoir un contrôle visuel en atelier",
            "photos": "https://monlienphoto.com/image.jpg",
            "statut": "en_attente"
        })
        conn.commit()
        print("✅ Camion test inséré.")

        # 6. Lecture des données
        result = conn.execute(text("SELECT id, numero_chassis, statut FROM camions"))
        for row in result:
            print("🚚 Camion :", row)

except Exception as e:
    print("❌ Erreur pendant l'exécution :", e)
