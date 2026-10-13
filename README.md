# NovaRetail AI Executive Review Builder

An end-to-end AI-powered application that transforms structured quarterly Excel retail datasets into executive PowerPoint presentations.

The platform combines deterministic Python analytics, Google Gemini for evidence-grounded executive narrative authoring, an interactive multi-turn AI Copilot chat for real-time narrative customization, and native PowerPoint automation via `python-pptx`.

---

## Key Features

1. **Flexible Excel Ingestion & Schema Validation**
   - Preloaded with the default `novaretail_dataset.xlsx`.
   - Supports uploading custom `.xlsx` workbooks via a collapsible upload drawer.
   - Automatically validates required worksheets (`Regional_Performance`, `Customer_Experience`, `Operational_Risk`), a complete 4-region &times; 4-quarter grid, and data integrity.

2. **Deterministic Business Analytics**
   - Calculates core executive metrics with pandas:
     - Total Revenue & QoQ Revenue Growth (%)
     - Unweighted Regional Net Promoter Score (NPS)
     - Top Growth Region (observed period expansion)
     - Operational Risk Region (highest stockouts)
     - Warehouse capacity utilization and delivery performance.

3. **Gemini AI Narrative Generation**
   - Automatically authors executive slide copy aligned with a PowerPoint master template.
   - Produces strategic headlines, concise executive summaries, bullet insights, and prioritized recommendations adhering to strict word and character limits.

4. **Interactive AI Copilot Chat (In-Session Memory)**
   - Chat interface allows executives to customize the narrative in real time (e.g., *"Emphasize APAC expansion"*, *"Shorten executive summary"*).
   - Features 1-click prompt suggestion chips.
   - **Multi-Turn Session Memory**: Preserves cumulative slide modifications across conversation turns. Includes a `🔄 Clear Chat` control to reset dialog history.

5. **Modern Zero-Scroll Responsive UI**
   - **Sticky Top Bar**: Progressively synchronized action buttons (`1. Analyze Data`, `2. AI Narrative`, `3. Build Presentation`).
   - **2-Column Split Workspace**: Slide narrative cards on the left, sticky AI Copilot on the right.
   - **Instant Build Presentation Access**: Build buttons accessible from the top navbar, inside the chat panel, and below the slide cards—eliminating page scrolling.
   - **Interactive User Guide**: Text-based 5-step user guide in the Instructions modal.

6. **PowerPoint Automation & Export**
   - Compiles native PowerPoint slides (`output/presentation.pptx`) with named-shape mapping, KPI callouts, native chart insertion, and approved category icons.
   - Displays live progress in an animated modal with instant 1-click download.

---

## End-to-End Workflow

```
[ Excel Dataset ] ──► [ 1. Analyze Data ] ──► [ KPI Dashboard ]
 (Default/Custom)      (Python / pandas)      (Revenue, NPS, Risk)
                                                       │
                                                       ▼
[ PowerPoint Export ] ◄── [ 3. Build Deck ] ◄── [ 2. AI Narrative ]
(Download .pptx)         (Zero-scroll CTAs)    (Gemini Copywriting)
                                                       │
                                                       ▼
                                            [ 💬 AI Copilot Chat ]
                                            (Multi-turn live edits)
```

---

## Architecture & Responsibilities

| Layer | Technology | Primary Responsibility |
|---|---|---|
| **Data Ingestion** | `pandas`, `openpyxl` | Excel parsing, schema validation & data grid verification |
| **Analytics** | Python 3.11+ | Deterministic calculations (KPIs, QoQ growth, chart series) |
| **Generative AI** | Google Gemini (`gemini-3.5-flash`), `pydantic` | Evidence-grounded narrative authoring & conversational refinement |
| **PPTX Renderer** | `python-pptx` | Shape text replacement, native chart generation & icon placement |
| **Backend API** | FastAPI, Uvicorn | RESTful endpoints, async file uploads, session state |
| **Frontend UI** | HTML5, CSS3 (Inter font), Vanilla JS | Responsive 2-column workspace, sticky navbar, modals & chat UI |

---

## Project Structure

```
NovaRetail_Capstone - v2/
├── content/
│   └── slide_generator.py          # Gemini prompt builder, schema validation & chat modification
├── data/
│   ├── novaretail_dataset.xlsx     # Default retail dataset
│   └── uploads/                    # Uploaded custom Excel workbooks
├── icons/                          # Approved presentation icons (.png)
├── llm/
│   └── gemini_client.py            # Gemini API client wrapper
├── novaretail_agent/
│   ├── agent.py                    # Google ADK agent definition
│   └── tools/
│       ├── analysis_tool.py        # Analytics tool wrapper
│       ├── build_presentation_tool.py # Orchestrator for content & PPTX rendering
│       ├── content_tool.py         # Narrative generation tool
│       └── render_tool.py          # PowerPoint rendering tool
├── output/
│   ├── presentation.pptx           # Generated PowerPoint deck
│   └── presentation_evidence.json  # Audit log of data & content
├── renderer/
│   ├── ppt_renderer.py             # python-pptx shape, chart, and text manipulation
│   └── ppt_utils.py                # Template inspection & named-shape contracts
├── scripts/
│   ├── analysis.py                 # Core business analytics & data validation engine
│   └── render_presentation.py      # Standalone presentation render script
├── template/
│   └── novaretail_template.pptx    # Master PowerPoint presentation template
├── webapp/
│   ├── server.py                   # FastAPI application & API endpoints
│   ├── static/
│   │   ├── app.js                  # Frontend state management, chat logic & UI sync
│   │   └── style.css               # Modern enterprise design system
│   └── templates/
│       └── index.html              # Main single-page web interface
├── .env.example                    # Environment variable template
├── README.md                       # Project documentation
└── requirements.txt                # Python dependencies
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the main web dashboard |
| `POST` | `/upload-data` | Uploads and validates a custom Excel workbook (`.xlsx`) |
| `POST` | `/analyze` | Computes KPIs, growth regions, and operational risks |
| `POST` | `/generate-content` | Authors initial Gemini executive narrative |
| `POST` | `/chat-modify` | Modifies active slide narrative using conversational instructions |
| `POST` | `/clear-chat` | Resets in-session conversation history |
| `POST` | `/build-presentation` | Renders the `.pptx` presentation using customized slide copy |
| `GET` | `/download-ppt` | Downloads the generated PowerPoint presentation |

---

## Setup & Execution

### 1. Prerequisites
- Python 3.11+
- A valid Google Gemini API Key

### 2. Installation
```powershell
# Clone or navigate to the repository directory
cd "NovaRetail_Capstone - v2"

# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration
Create a `.env` file in the project root:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
```

### 4. Run the Web Application
```powershell
python -m uvicorn webapp.server:app --reload
```
Open **http://127.0.0.1:8000** in your browser.

---

## Summary of Recent Enhancements

- **Custom Excel Upload**: Upload and validate custom `.xlsx` workbooks on the fly with automatic schema verification.
- **AI Chat Copilot**: Interactive multi-turn chat assistant with prompt chips and in-session memory for customizing summaries, slide titles, and recommendations.
- **Modern Zero-Scroll UI**: Responsive 2-column layout (Live Slide Preview + Sticky Chat), unified top navigation buttons (`1. Analyze Data`, `2. AI Narrative`, `3. Build Presentation`), and instant Build CTAs.
- **Text-Based User Guide**: Replaced static image modal with an interactive, step-by-step user guide detailing the entire workflow.
- **Synchronized State**: Multi-button loading synchronization and live presentation build modal with progress tracking and direct download.
