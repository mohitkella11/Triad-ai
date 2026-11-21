import os
import datetime
import functools
from bson import ObjectId
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from flask import request, jsonify
from app.db import get_db

JWT_SECRET = os.getenv("JWT_SECRET", "triad-ai-dms-super-secret-key-2026")
JWT_ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    return generate_password_hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return check_password_hash(hashed, password)

def create_token(user: dict, expires_in_hours: int = 48) -> str:
    payload = {
        "sub": str(user["_id"]),
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "division": user.get("division", ""),
        "role": user.get("role", "user"),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=expires_in_hours),
        "iat": datetime.datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        return None

def serialize_doc(doc):
    """Recursively converts MongoDB ObjectIds and datetimes to JSON-serializable types"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        serialized = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                serialized[k] = str(v)
            elif isinstance(v, datetime.datetime):
                serialized[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                serialized[k] = serialize_doc(v)
            else:
                serialized[k] = v
        # Ensure 'id' alias is present for frontend convenience
        if "_id" in serialized and "id" not in serialized:
            serialized["id"] = serialized["_id"]
        return serialized
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime.datetime):
        return doc.isoformat()
    return doc

def get_token_from_header():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        # Check query param token for direct download links in browser
        return request.args.get("token")
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return parts[0]

def token_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = get_token_from_header()
        if not token:
            return jsonify({"error": "Authentication token is missing"}), 401
        
        payload = decode_token(token)
        if not payload:
            return jsonify({"error": "Invalid or expired authentication token"}), 401
        
        db = get_db()
        try:
            user = db["users"].find_one({"_id": ObjectId(payload["sub"])})
        except Exception:
            user = db["users"].find_one({"_id": payload["sub"]})

        if not user:
            # Fallback to token payload data if user record was purged in mock
            user = {
                "_id": payload["sub"],
                "username": payload.get("username", "user"),
                "email": payload.get("email", ""),
                "division": payload.get("division", "Division A"),
                "role": payload.get("role", "user")
            }
        
        return f(current_user=user, *args, **kwargs)
    return decorated

def token_optional(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = get_token_from_header()
        current_user = None
        if token:
            payload = decode_token(token)
            if payload:
                db = get_db()
                try:
                    current_user = db["users"].find_one({"_id": ObjectId(payload["sub"])})
                except Exception:
                    current_user = db["users"].find_one({"_id": payload["sub"]})
                if not current_user:
                    current_user = {
                        "_id": payload["sub"],
                        "username": payload.get("username", "user"),
                        "email": payload.get("email", ""),
                        "division": payload.get("division", "Division A"),
                        "role": payload.get("role", "user")
                    }
        return f(current_user=current_user, *args, **kwargs)
    return decorated

def can_access_document(user: dict, document: dict, db=None) -> bool:
    """
    Checks if a user has permission to view or download a document.
    Rules:
    - Same division: Yes
    - Admin: Yes
    - Approved cross-division access request: Yes
    - Otherwise: No
    """
    if not document:
        return False
    
    doc_division = document.get("division", "")
    
    # If unauthenticated, allow only if no division or default
    if not user:
        return False

    # Admins have global access
    if user.get("role") == "admin":
        return True

    # Same division has default access
    user_division = user.get("division", "")
    if user_division and user_division.lower() == doc_division.lower():
        return True

    # Check for approved cross-division access request
    if db is None:
        db = get_db()
    
    doc_id_str = str(document.get("_id", ""))
    user_id_str = str(user.get("_id", ""))

    approved_request = db["access_requests"].find_one({
        "$or": [
            {"doc_id": doc_id_str, "requester_id": user_id_str, "status": "approved"},
            {"doc_id": ObjectId(doc_id_str) if ObjectId.is_valid(doc_id_str) else None, "requester_id": user_id_str, "status": "approved"}
        ]
    })

    return approved_request is not None
