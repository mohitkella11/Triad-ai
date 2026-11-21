import io
import logging
import fitz  # PyMuPDF
from PIL import Image

logger = logging.getLogger(__name__)

# Check if pytesseract is available and executable
try:
    import pytesseract
    # Optional: If tesseract is in standard Windows paths, set tesseract_cmd
    import shutil
    tess_path = shutil.which("tesseract")
    if not tess_path:
        for possible_path in [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            r"C:\tools\tesseract\tesseract.exe"
        ]:
            import os
            if os.path.exists(possible_path):
                pytesseract.pytesseract.tesseract_cmd = possible_path
                tess_path = possible_path
                break
    _pytesseract_available = True if tess_path else False
except Exception:
    _pytesseract_available = False

def extract_text_from_file(file_bytes: bytes, filename: str, content_type: str = "") -> str:
    """
    Extracts text from PDF or Image files using PyMuPDF and OCR (Tesseract).
    Always returns a string, never raises unhandled exceptions.
    """
    if not file_bytes:
        return ""

    filename_lower = filename.lower()
    extracted_text_chunks = []

    # Handle PDF files
    if filename_lower.endswith(".pdf") or "pdf" in content_type.lower():
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page_index in range(len(doc)):
                page = doc[page_index]
                text = page.get_text()
                
                # If digital text exists, use it
                if text and len(text.strip()) > 10:
                    extracted_text_chunks.append(text.strip())
                elif _pytesseract_available:
                    # Scanned PDF: Render page to image and run OCR
                    try:
                        pix = page.get_pixmap(dpi=150)
                        img = Image.open(io.BytesIO(pix.tobytes("png")))
                        ocr_text = pytesseract.image_to_string(img)
                        if ocr_text.strip():
                            extracted_text_chunks.append(ocr_text.strip())
                    except Exception as ocr_err:
                        logger.warning(f"OCR failed for page {page_index}: {ocr_err}")
                else:
                    if text and text.strip():
                        extracted_text_chunks.append(text.strip())
            
            full_text = "\n\n".join(extracted_text_chunks).strip()
            if full_text:
                return full_text
            
            # If still empty (e.g. dummy test PDF with binary bytes), check for any ASCII strings
            ascii_text = extract_ascii_strings(file_bytes)
            return ascii_text if ascii_text else "No extractable text found in document."
        except Exception as e:
            logger.error(f"Error parsing PDF with PyMuPDF: {e}")
            return extract_ascii_strings(file_bytes)

    # Handle Image files
    image_extensions = (".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp")
    if filename_lower.endswith(image_extensions) or "image" in content_type.lower():
        try:
            img = Image.open(io.BytesIO(file_bytes))
            if _pytesseract_available:
                try:
                    ocr_text = pytesseract.image_to_string(img)
                    return ocr_text.strip() or "Image document (No text detected)."
                except Exception as e:
                    logger.warning(f"Tesseract OCR execution failed: {e}")
                    return "Image document (OCR processing unavailable)."
            else:
                return "Image document processed. Tesseract OCR engine not configured on system."
        except Exception as e:
            logger.error(f"Failed to open image file: {e}")
            return "Unable to decode image file."

    # Fallback for plain text files
    if filename_lower.endswith((".txt", ".csv", ".json", ".xml", ".md", ".log")):
        try:
            return file_bytes.decode("utf-8", errors="replace")
        except Exception:
            return ""

    return extract_ascii_strings(file_bytes)

def extract_ascii_strings(data: bytes, min_length: int = 4) -> str:
    """Fallback utility to extract printable strings from raw bytes"""
    result = []
    current = []
    for b in data:
        if 32 <= b <= 126 or b in (10, 13):
            current.append(chr(b))
        else:
            if len(current) >= min_length:
                result.append("".join(current))
            current = []
    if len(current) >= min_length:
        result.append("".join(current))
    text = " ".join(result).strip()
    return text[:2000] if text else ""
