import datetime
from bson import ObjectId

class User:
    @staticmethod
    def build(username, email, password_hash, division, role="user"):
        return {
            "username": username.strip(),
            "email": email.strip().lower(),
            "password_hash": password_hash,
            "division": division.strip(),
            "role": role,
            "created_at": datetime.datetime.utcnow()
        }

class Document:
    @staticmethod
    def build(title, filename, file_id, file_size, content_type, division, metadata=None, ocr_text="", uploaded_by=None):
        return {
            "title": title or filename,
            "filename": filename,
            "file_id": file_id,
            "file_size": file_size,
            "content_type": content_type,
            "division": division,
            "metadata": metadata or {},
            "ocr_text": ocr_text or "",
            "uploaded_by": uploaded_by or "system",
            "created_at": datetime.datetime.utcnow()
        }

class AccessRequest:
    @staticmethod
    def build(doc_id, doc_title, requester_id, requester_name, requester_division, target_division, reason=""):
        return {
            "doc_id": str(doc_id),
            "doc_title": doc_title,
            "requester_id": str(requester_id),
            "requester_name": requester_name,
            "requester_division": requester_division,
            "target_division": target_division,
            "reason": reason or "Need access for cross-division task",
            "status": "pending",  # pending | approved | rejected
            "reviewed_by": None,
            "reviewed_at": None,
            "created_at": datetime.datetime.utcnow()
        }

class MetadataField:
    @staticmethod
    def build(name, label, field_type="text", options=None, required=False, description=""):
        return {
            "name": name.strip(),
            "label": label or name.strip(),
            "type": field_type,  # text, select, date, number
            "options": options or [],
            "required": bool(required),
            "description": description or "",
            "created_at": datetime.datetime.utcnow()
        }
