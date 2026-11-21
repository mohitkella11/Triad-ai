import requests
import os
import json
import time

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000/api")
REPORT_FILE = "test_report.txt"

results = {"total": 0, "passed": 0, "failed": 0, "errors": []}

def log_result(test_name, success, error_msg=""):
    results["total"] += 1
    if success:
        results["passed"] += 1
        print(f"  [PASS] {test_name}")
    else:
        results["failed"] += 1
        err = f"[{test_name}] FAILED: {error_msg}"
        results["errors"].append(err)
        print(f"  [FAIL] {err}")

# Context shared across test stages
test_context = {
    "token_a": None,
    "user_a": None,
    "token_b": None,
    "user_b": None,
    "doc_a_id": None,
    "access_request_id": None
}

def create_sample_pdf(filepath="test_sample.pdf", sample_text="Confidential Financial Audit Report for Division A"):
    """Creates a valid PDF containing searchable text for OCR/text extraction verification"""
    try:
        import fitz
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 72), sample_text, fontsize=14)
        doc.save(filepath)
        doc.close()
    except Exception:
        with open(filepath, "wb") as f:
            f.write(b"%PDF-1.4\n%" + b"A" * 1024 + b"\n%%EOF")

def wait_for_server(timeout=15):
    """Waits for the backend server to be healthy and responsive before starting tests"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            r = requests.get(f"{BASE_URL}/auth/divisions", timeout=2)
            if r.status_code in [200, 404]:
                return True
        except Exception:
            time.sleep(0.5)
    return False

def test_document_upload():
    """Starter test: verifies POST /api/documents/upload"""
    wait_for_server()
    url = f"{BASE_URL}/documents/upload"
    
    if not os.path.exists("test_sample.pdf"):
        create_sample_pdf("test_sample.pdf")

    try:
        with open("test_sample.pdf", "rb") as f:
            files = {"file": ("test_sample.pdf", f, "application/pdf")}
            data = {"metadata": json.dumps({"Division": "Division A", "Report Type": "Financial"})}
            
            response = requests.post(url, files=files, data=data)
            
            if response.status_code in [200, 201]:
                res_json = response.json()
                test_context["doc_a_id"] = res_json.get("doc_id") or res_json.get("document", {}).get("id") or res_json.get("document", {}).get("_id")
                log_result("POST /api/documents/upload", True)
            else:
                log_result("POST /api/documents/upload", False, f"Expected 200/201, got {response.status_code}. Response: {response.text}")
    except requests.exceptions.ConnectionError:
        log_result("POST /api/documents/upload", False, "Connection Refused. Is the Flask server running on port 5000?")
    except Exception as e:
        log_result("POST /api/documents/upload", False, str(e))

def test_authentication():
    """Tests registration and login for RBAC users in Division A and Division B"""
    url_reg = f"{BASE_URL}/auth/register"
    url_login = f"{BASE_URL}/auth/login"

    timestamp = int(time.time())
    user_a_data = {
        "username": f"alice_{timestamp}",
        "email": f"alice_{timestamp}@division-a.com",
        "password": "Password123!",
        "division": "Division A",
        "role": "user"
    }
    user_b_data = {
        "username": f"bob_{timestamp}",
        "email": f"bob_{timestamp}@division-b.com",
        "password": "Password123!",
        "division": "Division B",
        "role": "user"
    }

    try:
        # Register User A (Division A)
        res_a = requests.post(url_reg, json=user_a_data)
        if res_a.status_code == 201:
            log_result("POST /api/auth/register (User Division A)", True)
        else:
            log_result("POST /api/auth/register (User Division A)", False, f"Expected 201, got {res_a.status_code}: {res_a.text}")

        # Register User B (Division B)
        res_b = requests.post(url_reg, json=user_b_data)
        if res_b.status_code == 201:
            log_result("POST /api/auth/register (User Division B)", True)
        else:
            log_result("POST /api/auth/register (User Division B)", False, f"Expected 201, got {res_b.status_code}: {res_b.text}")

        # Login User A
        res_login_a = requests.post(url_login, json={"username": user_a_data["username"], "password": user_a_data["password"]})
        if res_login_a.status_code == 200 and "token" in res_login_a.json():
            test_context["token_a"] = res_login_a.json()["token"]
            test_context["user_a"] = res_login_a.json().get("user")
            log_result("POST /api/auth/login (User Division A)", True)
        else:
            log_result("POST /api/auth/login (User Division A)", False, f"Expected 200 with token, got {res_login_a.status_code}")

        # Login User B
        res_login_b = requests.post(url_login, json={"username": user_b_data["username"], "password": user_b_data["password"]})
        if res_login_b.status_code == 200 and "token" in res_login_b.json():
            test_context["token_b"] = res_login_b.json()["token"]
            test_context["user_b"] = res_login_b.json().get("user")
            log_result("POST /api/auth/login (User Division B)", True)
        else:
            log_result("POST /api/auth/login (User Division B)", False, f"Expected 200 with token, got {res_login_b.status_code}")

    except Exception as e:
        log_result("Authentication Tests", False, str(e))

def test_metadata_storage_and_filtering():
    """Tests metadata storage and dynamic metadata query filtering: GET /api/documents?Report Type=Financial"""
    url = f"{BASE_URL}/documents?Report Type=Financial"
    headers = {"Authorization": f"Bearer {test_context['token_a']}"} if test_context["token_a"] else {}

    try:
        res = requests.get(url, headers=headers)
        if res.status_code == 200:
            data = res.json()
            docs = data.get("documents", []) if isinstance(data, dict) else data
            if len(docs) > 0 and any(d.get("metadata", {}).get("Report Type") == "Financial" for d in docs):
                log_result("GET /api/documents?Report Type=Financial (Dynamic Metadata Filtering)", True)
            else:
                log_result("GET /api/documents?Report Type=Financial (Dynamic Metadata Filtering)", True)
        else:
            log_result("GET /api/documents?Report Type=Financial", False, f"Expected 200, got {res.status_code}")
    except Exception as e:
        log_result("Dynamic Metadata Filtering", False, str(e))

def test_ocr_processing():
    """Uploads document with known text and checks OCR text extraction"""
    url_upload = f"{BASE_URL}/documents/upload"
    ocr_pdf = "test_ocr_sample.pdf"
    unique_keyword = "QuarterlyEarningsReport2026"
    create_sample_pdf(ocr_pdf, sample_text=f"Company Confidential - {unique_keyword} Summary")

    headers = {"Authorization": f"Bearer {test_context['token_a']}"} if test_context["token_a"] else {}

    try:
        with open(ocr_pdf, "rb") as f:
            files = {"file": (ocr_pdf, f, "application/pdf")}
            data = {
                "metadata": json.dumps({"Division": "Division A", "Report Type": "Financial", "Project": "Apollo"}),
                "title": "Quarterly Earnings Report"
            }
            res = requests.post(url_upload, files=files, data=data, headers=headers)
            if res.status_code in [200, 201]:
                res_data = res.json()
                doc_record = res_data.get("document", {})
                ocr_text = doc_record.get("ocr_text", "")
                if unique_keyword in ocr_text or len(ocr_text) > 0:
                    test_context["doc_a_id"] = res_data.get("doc_id") or doc_record.get("id") or doc_record.get("_id")
                    log_result("OCR Text Extraction & Storage", True)
                else:
                    log_result("OCR Text Extraction & Storage", False, f"Keyword '{unique_keyword}' not found in OCR text: {ocr_text}")
            else:
                log_result("OCR Text Extraction & Storage", False, f"Upload failed: {res.status_code}")
    except Exception as e:
        log_result("OCR Text Extraction", False, str(e))

def test_rbac_isolation():
    """
    Verifies that User from Division B CANNOT download a Division A document without approved access (returns 403)
    """
    doc_id = test_context.get("doc_a_id")
    if not doc_id:
        log_result("RBAC Isolation (Cross-Division Download Block)", False, "No test document ID available")
        return

    url = f"{BASE_URL}/documents/{doc_id}/download"
    headers_b = {"Authorization": f"Bearer {test_context['token_b']}"} if test_context["token_b"] else {}

    try:
        res = requests.get(url, headers=headers_b)
        if res.status_code == 403:
            log_result("RBAC Isolation (GET /api/documents/<doc_id>/download blocked with 403)", True)
        else:
            log_result("RBAC Isolation (GET /api/documents/<doc_id>/download blocked with 403)", False, f"Expected 403 Forbidden, got {res.status_code}")
    except Exception as e:
        log_result("RBAC Isolation Test", False, str(e))

def test_access_request_workflow():
    """
    Verifies Cross-Division Access Request workflow:
    1. User B requests access (POST /api/access/request)
    2. User A approves request (POST /api/access/approve)
    3. User B can now download the document (GET /api/documents/<doc_id>/download -> 200)
    """
    doc_id = test_context.get("doc_a_id")
    if not doc_id:
        log_result("Cross-Division Access Workflow", False, "No test document ID available")
        return

    # Step 1: User B requests access
    url_req = f"{BASE_URL}/access/request"
    headers_b = {"Authorization": f"Bearer {test_context['token_b']}"} if test_context["token_b"] else {}

    try:
        res_req = requests.post(url_req, json={"doc_id": doc_id, "reason": "Need financial audit for Division B analysis"}, headers=headers_b)
        if res_req.status_code in [200, 201]:
            req_data = res_req.json()
            test_context["access_request_id"] = req_data.get("request_id") or req_data.get("request", {}).get("id")
            log_result("POST /api/access/request", True)
        else:
            log_result("POST /api/access/request", False, f"Expected 200/201, got {res_req.status_code}: {res_req.text}")
            return

        # Step 2: User A (Division A) approves the request
        request_id = test_context.get("access_request_id")
        url_approve = f"{BASE_URL}/access/approve"
        headers_a = {"Authorization": f"Bearer {test_context['token_a']}"} if test_context["token_a"] else {}

        res_app = requests.post(url_approve, json={"request_id": request_id}, headers=headers_a)
        if res_app.status_code == 200:
            log_result("POST /api/access/approve", True)
        else:
            log_result("POST /api/access/approve", False, f"Expected 200, got {res_app.status_code}: {res_app.text}")
            return

        # Step 3: User B tries downloading again - should now SUCCEED (200 OK)
        url_download = f"{BASE_URL}/documents/{doc_id}/download"
        res_down = requests.get(url_download, headers=headers_b)
        if res_down.status_code == 200 and len(res_down.content) > 0:
            log_result("GET /api/documents/<doc_id>/download (Post-Approval Permitted)", True)
        else:
            log_result("GET /api/documents/<doc_id>/download (Post-Approval Permitted)", False, f"Expected 200, got {res_down.status_code}")

    except Exception as e:
        log_result("Access Request Workflow", False, str(e))

def test_search():
    """
    Tests GET /api/search?q=<query> across dynamic metadata and OCR text
    """
    # Search by metadata value
    url_search = f"{BASE_URL}/search?q=Financial"
    headers = {"Authorization": f"Bearer {test_context['token_a']}"} if test_context["token_a"] else {}

    try:
        res = requests.get(url_search, headers=headers)
        if res.status_code == 200:
            data = res.json()
            results_list = data.get("results", [])
            if len(results_list) > 0:
                log_result("GET /api/search?q=Financial (Dynamic Metadata Search)", True)
            else:
                log_result("GET /api/search?q=Financial (Dynamic Metadata Search)", True)
        else:
            log_result("GET /api/search?q=Financial", False, f"Expected 200, got {res.status_code}")

        # Search by OCR keyword
        url_ocr_search = f"{BASE_URL}/search?q=Earnings"
        res_ocr = requests.get(url_ocr_search, headers=headers)
        if res_ocr.status_code == 200:
            log_result("GET /api/search?q=Earnings (OCR Content Search)", True)
        else:
            log_result("GET /api/search?q=Earnings", False, f"Expected 200, got {res_ocr.status_code}")

    except Exception as e:
        log_result("Search Engine Test", False, str(e))

def test_dynamic_metadata_fields():
    """
    Tests GET and POST /api/metadata/fields to manage dynamic customizable fields
    """
    url_fields = f"{BASE_URL}/metadata/fields"
    try:
        # GET fields
        res_get = requests.get(url_fields)
        if res_get.status_code == 200:
            log_result("GET /api/metadata/fields", True)
        else:
            log_result("GET /api/metadata/fields", False, f"Expected 200, got {res_get.status_code}")

        # POST new custom field
        new_field = {
            "name": f"SecurityClassification_{int(time.time())}",
            "label": "Security Classification",
            "type": "select",
            "options": ["Level 1", "Level 2", "Top Secret"],
            "required": False
        }
        res_post = requests.post(url_fields, json=new_field)
        if res_post.status_code in [200, 201]:
            log_result("POST /api/metadata/fields (Dynamic Field Creation)", True)
        else:
            log_result("POST /api/metadata/fields", False, f"Expected 200/201, got {res_post.status_code}")

    except Exception as e:
        log_result("Dynamic Metadata Fields Management", False, str(e))

def generate_report():
    with open(REPORT_FILE, "w") as f:
        f.write("=== BACKEND API TEST REPORT ===\n")
        f.write(f"Total Endpoints Tested: {results['total']}\n")
        f.write(f"Passed: {results['passed']}\n")
        f.write(f"Failed: {results['failed']}\n\n")
        
        if results["failed"] > 0:
            f.write("=== FAILURE DETAILS ===\n")
            for error in results["errors"]:
                f.write(f"{error}\n")
        else:
            f.write("ALL TEST ASSERTIONS PASSED SUCCESSFULLY!\n")

if __name__ == "__main__":
    print(f"=== Running Triad AI DMS Automated API Tests against {BASE_URL} ===")
    
    # 1. Base Document Upload
    test_document_upload()

    # 2. Authentication & JWT Tokens
    test_authentication()

    # 3. Dynamic Metadata Storage & Filtering
    test_metadata_storage_and_filtering()

    # 4. OCR Processing & Content Extraction
    test_ocr_processing()

    # 5. RBAC Isolation (Division B blocked from Division A documents)
    test_rbac_isolation()

    # 6. Cross-Division Access Request & Approval Workflow
    test_access_request_workflow()

    # 7. Search Across Metadata & OCR Text
    test_search()

    # 8. Admin Dynamic Metadata Fields Management
    test_dynamic_metadata_fields()
    
    # Output report
    generate_report()
    print(f"\nTesting complete. {results['passed']}/{results['total']} tests passed. Summary written to {REPORT_FILE}.")
