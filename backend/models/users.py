# backend/models/users.py

from sqlalchemy import Column, Integer, String
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    mot_de_passe = Column(String, nullable=False)  # mot de passe hashé
    role = Column(String, default="viewer")  # admin ou viewer
