import os
import io
import uuid
import logging
from bson import ObjectId
from pymongo import MongoClient
import gridfs

logger = logging.getLogger(__name__)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/triad_dms")
DB_NAME = os.getenv("DB_NAME", "triad_dms")

_db_instance = None
_fs_instance = None
_is_mock = False

class MockGridOut:
    def __init__(self, file_bytes, filename, content_type):
        self._bytes = file_bytes
        self.filename = filename
        self.content_type = content_type

    def read(self):
        return self._bytes

class MockGridFS:
    def __init__(self):
        self.files = {}

    def put(self, data, filename=None, content_type=None, **kwargs):
        file_id = ObjectId()
        if hasattr(data, "read"):
            content = data.read()
        else:
            content = data
        self.files[str(file_id)] = {
            "bytes": content,
            "filename": filename or "document",
            "content_type": content_type or "application/octet-stream"
        }
        return file_id

    def get(self, file_id):
        fid_str = str(file_id)
        if fid_str in self.files:
            item = self.files[fid_str]
            return MockGridOut(item["bytes"], item["filename"], item["content_type"])
        raise gridfs.errors.NoFile(f"No file with id {file_id}")

    def delete(self, file_id):
        fid_str = str(file_id)
        if fid_str in self.files:
            del self.files[fid_str]

def init_db():
    global _db_instance, _fs_instance, _is_mock

    try:
        # Attempt connecting to real MongoDB with short timeout
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        client.admin.command('ping')
        _db_instance = client[DB_NAME]
        _fs_instance = gridfs.GridFS(_db_instance)
        _is_mock = False
        print(f"[DB] Connected to MongoDB at {MONGO_URI} (Database: {DB_NAME})")
    except Exception as e:
        print(f"[DB WARN] Could not connect to real MongoDB ({e}). Falling back to in-memory mongomock.")
        try:
            import mongomock
            client = mongomock.MongoClient()
            _db_instance = client[DB_NAME]
            _fs_instance = MockGridFS()
            _is_mock = True
            print("[DB] Initialized mongomock + MockGridFS successfully.")
        except Exception as mock_err:
            print(f"[DB ERROR] Could not initialize mongomock: {mock_err}")
            raise

    # Seed default dynamic metadata fields if not present
    seed_default_metadata()
    return _db_instance, _fs_instance

def get_db():
    global _db_instance
    if _db_instance is None:
        init_db()
    return _db_instance

def get_fs():
    global _fs_instance
    if _fs_instance is None:
        init_db()
    return _fs_instance

def is_mock():
    global _is_mock
    return _is_mock

def seed_default_metadata():
    db = get_db()
    fields_col = db["metadata_fields"]
    
    # Check if fields already seeded
    if fields_col.count_documents({}) == 0:
        default_fields = [
            {
                "name": "Division",
                "label": "Division",
                "type": "select",
                "options": ["Division A", "Division B", "Division C", "Engineering", "Operations"],
                "required": True,
                "description": "Organizational division owning this document"
            },
            {
                "name": "Report Type",
                "label": "Report Type",
                "type": "select",
                "options": ["Financial", "Technical", "Audit", "HR", "Quarterly", "Legal"],
                "required": False,
                "description": "Category or type of report"
            },
            {
                "name": "Confidentiality",
                "label": "Confidentiality Level",
                "type": "select",
                "options": ["Public", "Internal", "Confidential", "Strictly Restricted"],
                "required": False,
                "description": "Classification level"
            },
            {
                "name": "Author",
                "label": "Document Author",
                "type": "text",
                "options": [],
                "required": False,
                "description": "Author or creator of document"
            },
            {
                "name": "Project Code",
                "label": "Project Code",
                "type": "text",
                "options": [],
                "required": False,
                "description": "Associated project identifier"
            }
        ]
        fields_col.insert_many(default_fields)
        print("[DB] Seeded initial dynamic metadata fields.")
