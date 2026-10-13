import sys
from pathlib import Path
from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

BASE_DIR = Path(__file__).resolve().parent.parent
if __package__ in (None, ""):
    sys.path.insert(0, str(BASE_DIR))

from pydantic import BaseModel
from scripts.analysis import run_analysis
from content.slide_generator import SlideGenerator
from novaretail_agent.tools.build_presentation_tool import (build_presentation)

app = FastAPI()
app.mount(
    "/static",
    StaticFiles(directory="webapp/static"),
    name="static"
)

templates = Jinja2Templates(
    directory="webapp/templates"
)

# Tracks the currently active dataset path (None = use bundled default)
_active_data_path: Path | None = None
# Tracks the currently active/refined slide content (None = generate on demand)
_active_content: dict | None = None
# Tracks in-session conversational memory on the server
_session_chat_history: list[dict] = []

class ChatModifyRequest(BaseModel):
    message: str
    content: dict | None = None
    history: list[dict] | None = None

class BuildRequest(BaseModel):
    content: dict | None = None

@app.get("/")
def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html"
    )

@app.post("/upload-data")
async def upload_data(file: UploadFile = File(...)):
    global _active_data_path, _active_content, _session_chat_history

    # Validate file extension
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Only Excel files (.xlsx / .xls) are accepted."
        )

    upload_dir = BASE_DIR / "data" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / file.filename

    # Save the uploaded file (use await read() — correct async pattern)
    contents = await file.read()
    dest.write_bytes(contents)

    # Validate the file by running analysis against it
    try:
        run_analysis(data_path=dest)
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(
            status_code=422,
            detail=f"File validation failed: {e}"
        )

    _active_data_path = dest
    _active_content = None
    _session_chat_history = []
    return {
        "status": "success",
        "message": f"'{file.filename}' uploaded and validated successfully.",
        "filename": file.filename
    }

@app.post("/analyze")
def analyze():
    analysis = run_analysis(data_path=_active_data_path)
    return {
        "status": "success",
        "kpis": analysis["kpis"],
        "growth_region": analysis["growth_region"],
        "risk_region": analysis["risk_region"]
    }

@app.post("/generate-content")
def generate_content():
    global _active_content, _session_chat_history
    analysis = run_analysis(data_path=_active_data_path)
    generator = SlideGenerator(analysis)
    content = generator.generate(use_ai=True)
    _active_content = content
    _session_chat_history = []
    return {
        "status": "success",
        "content": content
    }

@app.post("/chat-modify")
def chat_modify(req: ChatModifyRequest):
    global _active_content, _session_chat_history
    analysis = run_analysis(data_path=_active_data_path)
    generator = SlideGenerator(analysis)
    current = req.content or _active_content
    if not current:
        current = generator.generate(use_ai=True)

    # Use client history if provided, otherwise fallback to server session history
    history = req.history if req.history is not None else _session_chat_history
    result = generator.modify_with_chat(current, req.message, history)

    _active_content = result["content"]
    _session_chat_history = list(history)
    _session_chat_history.append({"role": "user", "content": req.message})
    _session_chat_history.append({"role": "assistant", "content": result["reply"]})

    return {
        "status": "success",
        "reply": result["reply"],
        "content": result["content"]
    }

@app.post("/clear-chat")
def clear_chat():
    global _session_chat_history
    _session_chat_history = []
    return {"status": "success", "message": "Session chat memory cleared."}

@app.post("/build-presentation")
def buildPresentation(req: BuildRequest | None = None):
    content_to_use = (req.content if req and req.content else None) or _active_content
    result = build_presentation(use_ai=True, data_path=_active_data_path, content=content_to_use)
    return result

@app.get("/download-ppt")
def download_ppt():
    return FileResponse(
        "output/presentation.pptx",
        media_type=
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename="NovaRetail_Executive_Review.pptx"
    )