# backend/models/alertes.py

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from .database import Base

class Alerte(Base):
    __tablename__ = "alertes"

    id = Column(Integer, primary_key=True, index=True)
    camion_id = Column(Integer, ForeignKey("camions.id"), nullable=False)
    type = Column(String, nullable=False)  # retard_en_cours, controle_en_retard
    message = Column(String)
    est_validee = Column(Boolean, default=False)
    date_alerte = Column(DateTime)
