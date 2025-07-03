# backend/init_db.py

from models.database import Base, engine
from models.camion import Camion
from models.bl_documents import BLDocument
from models.prestations import Prestation
from models.pieces import Piece
from models.controles import Controle
from models.alertes import Alerte
from models.users import User

print("🛠 Création des tables...")

Base.metadata.create_all(bind=engine)

print("✅ Tables créées avec succès dans Supabase !")
