from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import sqlite3
import bcrypt
import jwt
import datetime
from fastapi import Request
from fastapi import Body

SECRET_KEY = "your_secret_key"  # Change this to a secure key

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database connection
conn = sqlite3.connect("database.db", check_same_thread=False)
cursor = conn.cursor()

# Create users table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
    )
""")
conn.commit()

# Create cards table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL,
        text TEXT NOT NULL DEFAULT 'New Card',
        color TEXT NOT NULL DEFAULT '#ffffff'  -- Ensure correct format
    )
""")
conn.commit()

# Create card_permissions table (replacing shared_cards)
cursor.execute("""
    CREATE TABLE IF NOT EXISTS card_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        permission TEXT NOT NULL, -- allowed values: 'view', 'edit', 'owner'
        UNIQUE(card_id, user_id),
        FOREIGN KEY (card_id) REFERENCES cards (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
""")
conn.commit()

# Pydantic models
class CardCreate(BaseModel):
    owner_id: int  # Must be a valid integer
    text: str = "New Card"
    color: str = "#ffffff"

@app.post("/cards/")
def create_card(card: CardCreate):
    try:
        cursor.execute(
            "INSERT INTO cards (owner_id, text, color) VALUES (?, ?, ?)",
            (card.owner_id, card.text, card.color),
        )
        conn.commit()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error inserting card: {e}")

    card_id = cursor.lastrowid

    try:
        cursor.execute(
            "INSERT INTO card_permissions (card_id, user_id, permission) VALUES (?, ?, ?)",
            (card_id, card.owner_id, "owner"),
        )
        conn.commit()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error inserting card permission: {e}")

    # Return permission in the response so front-end knows this card is owned by the user.
    return {"id": card_id, "text": card.text, "color": card.color, "permission": "owner"}

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


@app.post("/register/")
def register(user: UserRegister):
    cursor.execute("SELECT * FROM users WHERE username = ?", (user.username,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Username already exists")

    cursor.execute("SELECT * FROM users WHERE email = ?", (user.email,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = hash_password(user.password)
    cursor.execute(
        "INSERT INTO users (username, password, firstName, lastName, email) VALUES (?, ?, ?, ?, ?)",
        (user.username, hashed_pw, user.firstName, user.lastName, user.email)
    )
    conn.commit()
    return {"message": "User created successfully"}


@app.post("/login/")
def login(user: UserLogin):
    cursor.execute("SELECT id, password FROM users WHERE username = ?", (user.username,))
    record = cursor.fetchone()

    if not record or not verify_password(user.password, record[1]):
        raise HTTPException(status_code=400, detail="Invalid username or password")
    
    user_id = record[0]
    token = create_jwt_token(user.username)
    return {"token": token, "userId": user_id}



@app.get("/users/{user_id}/cards/")
def get_user_cards(user_id: int):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    query = """
        SELECT c.id, c.text, c.color, cp.permission
        FROM cards c
        JOIN card_permissions cp ON c.id = cp.card_id
        WHERE cp.user_id = ?
    """
    cursor.execute(query, (user_id,))
    cards = [
        {"id": row[0], "text": row[1], "color": row[2], "permission": row[3]}
        for row in cursor.fetchall()
    ]

    conn.close()  # Close the connection after the request
    return cards



@app.post("/cards/{card_id}/share/")
def share_card(card_id: int, share_data: dict):
    username = share_data.get("username")
    permission = share_data.get("permission", "view")  # default permission is "view"

    # Get user ID from username
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = user[0]

    try:
        cursor.execute(
            "INSERT INTO card_permissions (card_id, user_id, permission) VALUES (?, ?, ?)",
            (card_id, user_id, permission)
        )
        conn.commit()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error sharing card: {e}")

    return {"message": "Card shared successfully", "permission": permission}

@app.delete("/cards/{card_id}/")
async def delete_card(card_id: int, request: Request):
    data = await request.json()  # Read the JSON body
    user_id = data.get("user_id")  # Extract user_id
    print(f"Received user_id: {user_id}")  # Debugging line

    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    user_id = int(user_id)  # Convert to integer
    print(f"User ID converted to integer: {user_id}")  # Debugging line

    cursor.execute("SELECT owner_id FROM cards WHERE id = ?", (card_id,))
    card = cursor.fetchone()

    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    owner_id = card[0]
    print(f"Card owner_id: {owner_id}")  # Debugging line

    if owner_id != user_id:
        raise HTTPException(status_code=403, detail="You are not the owner and cannot delete this card")

    # Delete the card
    cursor.execute("DELETE FROM cards WHERE id = ?", (card_id,))
    cursor.execute("DELETE FROM card_permissions WHERE card_id = ?", (card_id,))
    conn.commit()

    return {"message": "Card deleted successfully"}

@app.get("/cards/{card_id}/")
def get_card(card_id: int):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    # Fetch card details
    query = """
        SELECT c.id, c.text, c.color, c.owner_id
        FROM cards c
        WHERE c.id = ?
    """
    cursor.execute(query, (card_id,))
    card = cursor.fetchone()
    
    if not card:
        conn.close()
        raise HTTPException(status_code=404, detail="Card not found")

    # Return ownership information
    card_data = {
        "id": card[0],
        "text": card[1],
        "color": card[2],
        "owner_id": card[3],  # ✅ Ensure this is included
    }
    
    conn.close()
    return card_data

@app.put("/cards/{card_id}/")
def update_card(card_id: int, text: str = Body(...), color: str = Body(...)):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    # Check if the card exists
    cursor.execute("SELECT id FROM cards WHERE id = ?", (card_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Card not found")

    # Update the card
    cursor.execute("UPDATE cards SET text = ?, color = ? WHERE id = ?", (text, color, card_id))
    conn.commit()
    conn.close()

    return {"message": "Card updated successfully"}
