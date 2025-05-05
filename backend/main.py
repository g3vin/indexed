from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import text
from .db import get_db
from .models import User, Card, CardPermission
import bcrypt
import jwt
import datetime
from typing import List

from fastapi import WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from .db import get_db
from .models import Card
from .websockets import ConnectionManager
import json
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

SECRET_KEY = "your_secret_key"

app = FastAPI()

origins = [
    "https://indexed-1.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = ConnectionManager()

#websocket connection manager
@app.websocket("/ws/card/{card_id}")
async def websocket_endpoint(websocket: WebSocket, card_id: int, db: Session = Depends(get_db)):
    await manager.connect(websocket, card_id)
    try:
        while True:
            data = await websocket.receive_text()
            
            try:
                payload = json.loads(data)
                text = payload.get("text")
                color = payload.get("color")

                card = db.query(Card).filter(Card.id == card_id).first()
                if card:
                    card.text = text
                    card.color = color
                    db.commit()
                else:
                    print(f"Card with id {card_id} not found in DB.")

                # Broadcast to others
                await manager.broadcast(card_id, data)
                #print(f"Broadcasted update to card {card_id}: {data}")
            except Exception as e:
                print(f"Failed to process message: {e}")

    except WebSocketDisconnect:
        manager.disconnect(websocket, card_id)
        #print(f"Client disconnected from card {card_id}")


class CardCreate(BaseModel):
    owner_id: int
    text: str = "New Card"
    color: str = "#ffffff"
    

#creates a new card
@app.post("/cards/")
def create_card(card: CardCreate, db: Session = Depends(get_db)):
    stmt_card = text("""
        INSERT INTO cards (owner_id, text, color)
        VALUES (:owner_id, :text, :color)
        RETURNING id, text, color
    """)
    result = db.execute(stmt_card, {
        "owner_id": card.owner_id,
        "text": card.text,
        "color": card.color
    }).fetchone()

    stmt_perm = text("""
        INSERT INTO card_permissions (card_id, user_id, permission)
        VALUES (:card_id, :user_id, 'owner')
    """)
    db.execute(stmt_perm, {"card_id": result.id, "user_id": card.owner_id})
    db.commit()

    return {"id": result.id, "text": result.text, "color": result.color, "permission": "owner"}

class UserRegister(BaseModel):
    username: str
    password: str
    firstName: str
    lastName: str
    email: EmailStr

class UserLogin(BaseModel):
    username: str
    password: str

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_jwt_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

#register endpoint
@app.post("/register/")
def register(user: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = hash_password(user.password)
    db_user = User(username=user.username, password=hashed_pw, firstName=user.firstName, lastName=user.lastName, email=user.email)
    db.add(db_user)
    db.commit()

    return {"message": "User created successfully"}

#login endpoint uses no raw sql, just ORM
@app.post("/login/")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Invalid username or password")
    
    token = create_jwt_token(user.username)
    return {"token": token, "userId": db_user.id}

#gets the list of cards for a user
@app.get("/users/{user_id}/cards/")
def get_user_cards(user_id: int, db: Session = Depends(get_db)):
    stmt = text("""
        SELECT cards.id, cards.text, cards.color FROM cards
        INNER JOIN card_permissions ON cards.id = card_permissions.card_id
        WHERE card_permissions.user_id = :user_id
    """)
    results = db.execute(stmt, {"user_id": user_id}).fetchall()
    return [{"id": row.id, "text": row.text, "color": row.color} for row in results]

#shares the card with another user
@app.post("/cards/{card_id}/share/")
def share_card(card_id: int, share_data: dict, db: Session = Depends(get_db)):
    username = share_data.get("username")
    permission = share_data.get("permission", "view")

    db_user = db.query(User).filter(User.username == username).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    stmt = text("""
        INSERT INTO card_permissions (card_id, user_id, permission)
        VALUES (:card_id, :user_id, :permission)
    """)
    db.execute(stmt, {"card_id": card_id, "user_id": db_user.id, "permission": permission})
    db.commit()

    return {"message": "Card shared successfully", "permission": permission}
from fastapi import Query
#deletes the card
@app.delete("/cards/{card_id}/")
def delete_card(card_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    db_card = db.query(Card).filter(Card.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Card not found")

    if db_card.owner_id != user_id:
        raise HTTPException(status_code=403, detail="You are not the owner and cannot delete this card")

    db.execute(text("DELETE FROM card_permissions WHERE card_id = :card_id"), {"card_id": card_id})
    db.execute(text("DELETE FROM cards WHERE id = :card_id"), {"card_id": card_id})
    db.commit()

    return {"message": "Card deleted successfully"}

#pulls the card details
@app.get("/cards/{card_id}/")
def get_card(card_id: int, user_id: int, db: Session = Depends(get_db)):
    # Fetch card details
    stmt = text("SELECT * FROM cards WHERE id = :card_id")
    row = db.execute(stmt, {"card_id": card_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Card not found")

    # Fetch user-specific permission
    perm_stmt = text("""
        SELECT permission FROM card_permissions
        WHERE card_id = :card_id AND user_id = :user_id
    """)
    perm_row = db.execute(perm_stmt, {"card_id": card_id, "user_id": user_id}).fetchone()

    if not perm_row:
        raise HTTPException(status_code=403, detail="You do not have access to this card")

    return {
        "id": row.id,
        "text": row.text,
        "color": row.color,
        "owner_id": row.owner_id,
        "user_permission": perm_row.permission
    }


    return {"id": row.id, "text": row.text, "color": row.color, "owner_id": row.owner_id}
class CardUpdate(BaseModel):
    text: str
    color: str

#updates the card
@app.put("/cards/{card_id}/")
def update_card(card_id: int, update: CardUpdate, db: Session = Depends(get_db)):
    stmt = text("""
        UPDATE cards SET text = :text, color = :color WHERE id = :card_id
    """)
    result = db.execute(stmt, {"text": update.text, "color": update.color, "card_id": card_id})
    db.commit()
    return {"message": "Card updated successfully"}


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))