# backend/models/camion.py

from sqlalchemy import Column, Integer, String, Date, Text, TIMESTAMP, Boolean
from .database import Base
from datetime import datetime

class Camion(Base):
    __tablename__ = "camions"

    id = Column(Integer, primary_key=True, index=True)

    # Champs saisis depuis le formulaire utilisateur
    numero_chassis = Column(String, unique=True, nullable=False)
    immatriculation_etrangere = Column(String, nullable=False)
    marque = Column(String, nullable=False)
    modele = Column(String, nullable=False)
    kilometrage = Column(Integer, nullable=False)
    date_mise_en_circulation = Column(Date, nullable=False)
    client = Column(String)  # facultatif
    inspection_reception = Column(Text, nullable=False)
    memos = Column(Text)  # facultatif
    photos_url = Column(Text, nullable=True)


    # Suivi du statut et alertes
    statut = Column(String, default="en_attente")  # en_attente, en_cours, pret_a_livrer, livre
    fiche_complete = Column(Boolean, default=False)  # devient true après validation complète
    a_des_alertes = Column(Boolean, default=False)  # si alertes actives non validées

    # Horodatage
    date_creation = Column(TIMESTAMP, default=datetime.utcnow)
    date_derniere_maj = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
