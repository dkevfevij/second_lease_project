# backend/models/pieces.py

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from .database import Base

class Piece(Base):
    __tablename__ = "pieces"

    id = Column(Integer, primary_key=True, index=True)
    camion_id = Column(Integer, ForeignKey("camions.id"), nullable=False)
    reference = Column(String, nullable=False)
    designation = Column(String)
    quantite = Column(Integer)
    est_livree = Column(Boolean, default=False)
    fiche_reference = Column(String, nullable=True)