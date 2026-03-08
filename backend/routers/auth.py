from datetime import datetime, timedelta, timezone
from typing import Optional

import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
import bcrypt
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import Session, select
from dotenv import load_dotenv

from database import engine
from models.user import User

load_dotenv()

# =========================
# Security Config
# =========================

SECRET_KEY = os.getenv("SECRET_KEY", "devguardian-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

router = APIRouter(prefix="/auth", tags=["Auth"])


# =========================
# Pydantic Schemas
# =========================

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    username: str
    password: str


# =========================
# Password Utilities
# =========================

def verify_password(plain_password, hashed_password):
    # Apply the same 72-byte truncation as in hashing
    truncated_password = plain_password.encode("utf-8")[:72]
    return bcrypt.checkpw(truncated_password, hashed_password.encode("utf-8"))


def get_password_hash(password: str):
    # bcrypt has a 72-byte limit, so we truncate the password
    truncated_password = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(truncated_password, salt).decode("utf-8")


# =========================
# JWT Utilities
# =========================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# =========================
# Database Utilities
# =========================

def get_user_by_username(username: str):
    with Session(engine) as session:
        statement = select(User).where(User.username == username)
        return session.exec(statement).first()


def get_user_by_email(email: str):
    with Session(engine) as session:
        statement = select(User).where(User.email == email)
        return session.exec(statement).first()


def authenticate_user(username: str, password: str):
    user = get_user_by_username(username)

    if not user:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user


# =========================
# Current User Dependency
# =========================

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        username: str = payload.get("sub")

        if username is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = get_user_by_username(username)

    if user is None:
        raise credentials_exception

    return user


# =========================
# SIGNUP
# =========================

@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate):

    if get_user_by_username(user.username):
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )

    if get_user_by_email(user.email):
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(user.password)

    new_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password
    )

    with Session(engine) as session:
        session.add(new_user)
        session.commit()
        session.refresh(new_user)

        return new_user


# =========================
# LOGIN
# =========================

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest):

    user = authenticate_user(login_data.username, login_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.username}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# =========================
# GET CURRENT USER
# =========================

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's information"""
    return current_user