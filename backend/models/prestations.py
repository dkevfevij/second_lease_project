# backend/models/prestations.py

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from .database import Base

class Prestation(Base):
    __tablename__ = "prestations"

    id = Column(Integer, primary_key=True, index=True)
    camion_id = Column(Integer, ForeignKey("camions.id"), nullable=False)
    description = Column(String, nullable=False)
    est_validee = Column(Boolean, default=False)
