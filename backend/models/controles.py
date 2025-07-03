# backend/models/controles.py

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from .database import Base

class Controle(Base):
    __tablename__ = "controles"

    id = Column(Integer, primary_key=True, index=True)
    camion_id = Column(Integer, ForeignKey("camions.id"), nullable=False)
    type = Column(String, nullable=False)  # Ex : test batterie, contrôle visuel
    resultat = Column(String)
    date_controle = Column(DateTime)
