from pydantic import BaseModel, EmailStr

class UserRegister(BaseModel):
    username: str
    password: str
    firstName: str
    lastName: str
    email: EmailStr

class UserLogin(BaseModel):
    username: str
    password: str

class CardCreate(BaseModel):
    owner_id: int
    text: str = "New Card"
    color: str = "#ffffff"