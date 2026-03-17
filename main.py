from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo import MongoClient
from textblob import TextBlob
from pydantic import BaseModel
import bcrypt
import shutil
import joblib
import jwt
import datetime
import os

app = FastAPI(title="PM Helpline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── DB ───────────────────────────────────────────────────────────────────────
client         = MongoClient("mongodb://localhost:27017/")
db             = client["pm_helpline"]
complaints_col = db["complaints"]
users_col      = db["users"]

# ─── Auth helpers ─────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM  = "HS256"
bearer     = HTTPBearer()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── ML model ─────────────────────────────────────────────────────────────────
try:
    model      = joblib.load("xgb_model.pkl")
    vectorizer = joblib.load("tfidf.pkl")
    ML_READY   = True
except Exception:
    ML_READY = False

# ─── Pydantic schemas ─────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    full_name: str
    email:     str
    phone:     str
    state:     str
    aadhaar:   str
    password:  str

class LoginRequest(BaseModel):
    email:    str
    password: str

# ─── NLP helpers ──────────────────────────────────────────────────────────────
def get_sentiment(text: str) -> str:
    score = TextBlob(text).sentiment.polarity
    if score < -0.3: return "Negative"
    elif score > 0.3: return "Positive"
    return "Neutral"

def calc_importance(text: str) -> int:
    return sum(w in text.lower() for w in ["water","corruption","unemployment","electricity"])

def calc_priority(sentiment: str, imp: int) -> str:
    if sentiment == "Negative" and imp >= 2: return "Critical"
    elif imp >= 2: return "High"
    elif sentiment == "Negative": return "Medium"
    return "Low"

# ─── Auth routes ──────────────────────────────────────────────────────────────
@app.post("/auth/register")
def register(body: RegisterRequest):
    if users_col.find_one({"email": body.email}):
        raise HTTPException(400, detail="Email already registered")
    if users_col.find_one({"aadhaar": body.aadhaar}):
        raise HTTPException(400, detail="Aadhaar already registered")
    user = {
        "full_name": body.full_name, "email": body.email,
        "phone": body.phone, "state": body.state, "aadhaar": body.aadhaar,
        "password_hash": hash_password(body.password),
        "created_at": datetime.datetime.utcnow().isoformat(), "is_active": True,
    }
    result = users_col.insert_one(user)
    token  = create_token(str(result.inserted_id), body.email)
    return {"msg": "Registered successfully", "token": token,
            "user": {"full_name": body.full_name, "email": body.email,
                     "phone": body.phone, "state": body.state}}

@app.post("/auth/login")
def login(body: LoginRequest):
    user = users_col.find_one({"email": body.email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, detail="Invalid email or password")
    token = create_token(str(user["_id"]), user["email"])
    return {"msg": "Login successful", "token": token,
            "user": {"full_name": user["full_name"], "email": user["email"],
                     "phone": user["phone"], "state": user["state"]}}

@app.get("/auth/me")
def me(current_user=Depends(get_current_user)):
    user = users_col.find_one({"email": current_user["email"]}, {"_id": 0, "password_hash": 0})
    if not user: raise HTTPException(404, detail="User not found")
    return user

# ─── Complaint routes ─────────────────────────────────────────────────────────
@app.post("/submit")
async def submit_complaint(
    text: str        = Form(...),
    file: UploadFile = File(None),
    current_user     = Depends(get_current_user),
):
    file_path = None
    if file:
        os.makedirs("uploads", exist_ok=True)
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)

    user      = users_col.find_one({"email": current_user["email"]})
    sentiment = get_sentiment(text)
    imp       = calc_importance(text)
    pr        = calc_priority(sentiment, imp)
    valid     = ("Valid" if model.predict(vectorizer.transform([text]))[0] == 1
                 else "Invalid") if ML_READY else "Pending"

    record = {
        "user_email": current_user["email"],
        "name":       user["full_name"] if user else "Unknown",
        "state":      user["state"]     if user else "Unknown",
        "aadhaar":    user["aadhaar"]   if user else "Unknown",
        "text": text, "file": file_path,
        "sentiment": sentiment, "validity": valid,
        "importance": imp, "priority": pr,
        "submitted_at": datetime.datetime.utcnow().isoformat(),
    }
    complaints_col.insert_one(record)
    record.pop("_id", None)
    return {"msg": "Complaint submitted", "data": record}

@app.get("/my-complaints")
def my_complaints(current_user=Depends(get_current_user)):
    return list(complaints_col.find({"user_email": current_user["email"]}, {"_id": 0}))

@app.get("/dashboard")
def dashboard(current_user=Depends(get_current_user)):
    return list(complaints_col.find({}, {"_id": 0}))

from fastapi.responses import FileResponse
@app.get("/")
def home():
    return FileResponse("pm_helpline_app.html")
