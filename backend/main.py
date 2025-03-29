from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import sqlite3
import bcrypt
import jwt
import datetime

SECRET_KEY = "your_secret_key"  # Change this to a secure key

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Vite frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
conn = sqlite3.connect("database.db", check_same_thread=False)
cursor = conn.cursor()
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

# Pydantic models
class UserRegister(BaseModel):
    username: str
    password: str
    firstName: str
    lastName: str
    email: EmailStr  # Validates proper email format

class UserLogin(BaseModel):
    username: str
    password: str

# Function to hash passwords
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

# Function to verify passwords
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# Function to generate JWT token
def create_jwt_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

# API route to create an account
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

# API route to login
@app.post("/login/")
def login(user: UserLogin):
    cursor.execute("SELECT password FROM users WHERE username = ?", (user.username,))
    record = cursor.fetchone()

    if not record or not verify_password(user.password, record[0]):
        raise HTTPException(status_code=400, detail="Invalid username or password")

    token = create_jwt_token(user.username)
    return {"token": token}