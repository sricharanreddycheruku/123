from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware  # Add this import

app = FastAPI()

# Add CORS middleware - Place this BEFORE your routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your React frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods including OPTIONS
    allow_headers=["*"],  # Allow all headers
)

DB = {}  # in-memory store

class ChildRecord(BaseModel):
    healthId: str
    name: str
    age: Optional[str] = ""
    weight: Optional[str] = ""
    height: Optional[str] = ""
    parent: Optional[str] = ""
    illness: Optional[str] = ""
    consent: Optional[bool] = False
    uploaded: Optional[bool] = False

@app.post("/upload")
def upload_record(record: ChildRecord):
    DB[record.healthId] = record.dict()
    return {"status": "success", "healthId": record.healthId}

@app.get("/booklet/{health_id}")
def get_booklet(health_id: str):
    if health_id not in DB:
        return {"error": "Not found"}

    record = DB[health_id]
    filename = f"{health_id}.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    c.drawString(100, 750, "Child Health Record Booklet")
    y = 720
    for k, v in record.items():
        c.drawString(100, y, f"{k}: {v}")
        y -= 20
    c.save()
    return FileResponse(filename, media_type="application/pdf", filename=filename)

# Add a root endpoint to test
@app.get("/")
def read_root():
    return {"message": "Backend is running!"}