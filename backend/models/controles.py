from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from .database import Base

class Controle(Base):
    __tablename__ = "controles"

    id = Column(Integer, primary_key=True, index=True)
    camion_id = Column(Integer, ForeignKey("camions.id"), nullable=False)
    type = Column(String, nullable=False)  # Ex : test_batterie, controle_visuel, demarrage
    resultat = Column(String)
    date_controle = Column(DateTime)

    # Champs à ajouter :
    is_reminder = Column(Boolean, default=False)  # True si c’est un contrôle périodique
    valide = Column(Boolean, default=False)       # True si validé manuellement
    count = Column(Integer, default=1)            # Nombre de fois effectué
