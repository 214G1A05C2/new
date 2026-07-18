from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
from app.database import get_db_connection
from app.schemas import UserLogin, Token

SECRET_KEY = "supersecret_ezmedtech_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 1 day

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login-docs")

router = APIRouter(prefix="/auth", tags=["auth"])

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE email = %s AND is_active = TRUE", (user_credentials.email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=403, detail="Invalid Credentials")
        
    if not verify_password(user_credentials.password, user['password_hash']):
        raise HTTPException(status_code=403, detail="Invalid Credentials")
        
    access_token = create_access_token(data={
        "user_id": user['user_id'],
        "role": user['role']
    })
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": user['user_id'],
        "role": user['role'],
        "name": user['name']
    }

# FastAPI requires Form data for Swagger UI login
from fastapi.security import OAuth2PasswordRequestForm
@router.post("/login-docs")
def login_docs(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = %s", (form_data.username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if not user or not verify_password(form_data.password, user['password_hash']):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
        
    access_token = create_access_token(data={"user_id": user['user_id'], "role": user['role']})
    return {"access_token": access_token, "token_type": "bearer"}

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        role: str = payload.get("role")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "role": role}
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def require_manager(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")
    return current_user
