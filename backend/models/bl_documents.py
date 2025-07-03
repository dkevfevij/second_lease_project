# backend/models/bl_documents.py

from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP
from .database import Base

class BLDocument(Base):
    __tablename__ = "bl_documents"

    id = Column(Integer, primary_key=True, index=True)
    camion_id = Column(Integer, ForeignKey("camions.id"), nullable=False)
    fichier_url = Column(String, nullable=False)
    date_upload = Column(TIMESTAMP)
