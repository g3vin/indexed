from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    firstName = Column(String, nullable=False)
    lastName = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    cards = relationship("Card", back_populates="owner")

class Card(Base):
    __tablename__ = "cards"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, default="New Card", nullable=False)
    color = Column(String, default="#ffffff", nullable=False)
    owner = relationship("User", back_populates="cards")
    permissions = relationship("CardPermission", back_populates="card")

class CardPermission(Base):
    __tablename__ = "card_permissions"
    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    permission = Column(String, nullable=False)
    card = relationship("Card", back_populates="permissions")
    user = relationship("User")
