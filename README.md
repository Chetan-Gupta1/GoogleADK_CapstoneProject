# NovaRetail Google ADK Capstone

Create an executive review from an Excel workbook, a named-shape PowerPoint
template of any positive slide count, and eight local icons. The supplied template
currently has five slides, but this is not a project limit. Python computes the facts and renders the deck;
Gemini interprets the evidence and writes the narrative. Google ADK provides the
conversational agent and tool orchestration.

## 1. Prepare the Python environment

Run these PowerShell commands from the project root. Python 3.11 or newer is
recommended. The existing `.venv` can be reused; create it only if absent.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

In VS Code, use **Python: Select Interpreter** and select the project `.venv`.
Activation is optional because the commands here use its executable directly.

## 2. Check the input assets

Keep these files at the project-relative paths used by the pipeline:

| Asset | Path |
| --- | --- |
| PowerPoint template | `template/novaretail_template.pptx` |
| Three-sheet workbook | `data/novaretail_dataset.xlsx` |
| Eight PNG icons | `icons/` |

The icon repository is already unpacked into `icons/`. Filenames carry semantic
meaning, such as `growth_chart.png`, `risk_alert.png`, and `shield_security.png`.
They are not assigned by directory order.

## 3. Understand the template contract

Inspect `shape.name`, not shape indexes or visible instruction text. The real
template has these fillable shapes:

| Slide | Text shapes | Chart | Icon |
| --- | --- | --- | --- |
| 1 | `deck_title`, `subtitle_1`, `summary_text`, `kpi1_value` through `kpi3_value`, corresponding `kpi*_label` | None | `icon_1` |
| 2 | `title_2`, `insights_performance` | `chart_performance` | `icon_2` |
| 3 | `title_3`, `insights_customer` | `chart_customer` | `icon_3` |
| 4 | `title_4`, `insights_risk` | `chart_risk` | `icon_4` |
| 5 | `title_5`, `recommendations_text`, `closing_statement` | None | `icon_5` |

Each chart/icon also has a separate instruction shape ending in `_label`.
Remove that label AND the dashed placeholder when inserting the replacement.
Keep legitimate labels such as `summary_label`, KPI labels, page numbers, and
KPI background panels. Replace the template footer with a data-source footer.

### Changing the number of slides

Add, remove, duplicate or reorder slides in `template/novaretail_template.pptx`.
No code change is required for supported slide themes. Both generation and
rendering discover the actual physical slides and their named shapes each run.
The output preserves the template's slide count, and page numbers are refreshed
to reflect the physical order rather than old shape-name suffixes.

- Use `deck_title` or `title_<number>` for headlines, `summary_text` for summaries,
  `recommendations_text` for actions, and `closing_statement` for closing text.
  The last three names can also have a numeric suffix, such as `summary_text_6`.
- Use `insights_performance`, `insights_customer` or `insights_risk` and matching
  `chart_performance`, `chart_customer` or `chart_risk`. Numeric suffixes such as
  `chart_performance_6` and `insights_performance_6` are supported.
- Use `icon_<number>`, `subtitle_<number>`, `footer_<number>` and `page_num_<number>`.
  The suffix does not have to match the current physical slide position.
- Shape names must be unique within a slide; the same names may repeat on
  different slides. Each slide supports one data theme, with optional summary
  and action fields. Static slides with no fillable shapes are preserved.
- Chart/icon instruction labels, when present, should be named after their
  placeholder plus `_label`, for example `chart_performance_6_label`.
- Existing KPI mappings remain `kpi1` = revenue, `kpi2` = QoQ growth and `kpi3` =
  mean regional NPS. They can appear on any slide. New KPI metrics or chart themes
  require explicit dataset mappings; the project rejects unknown fillable shapes
  instead of guessing their meaning or leaving instructions in the final deck.

The AI response schema is generated from this discovered contract, so it requires
exactly the template's slides and fields, not a fixed `slide_1` through `slide_5`.
Run the offline command and regression suite after changing the template.

Read the [shapes API](https://python-pptx.readthedocs.io/en/latest/api/shapes.html),
[text guide](https://python-pptx.readthedocs.io/en/latest/user/text.html), and
[chart guide](https://python-pptx.readthedocs.io/en/latest/user/charts.html).
For your capstone explanation, investigate these points in the installed source:

- Positions and dimensions are in EMUs. Reuse `left`, `top`, `width`, and `height`
  directly, without converting to pixels.
- `slide.shapes.add_chart()` returns a `GraphicFrame`; its `.chart` property
  exposes the editable native chart. Categories are on `chart.plots[0]`.
- `CategoryChartData` needs one value per category in every series. A pivot
  produces four quarter categories, not sixteen duplicated quarter labels.
- Text frames contain paragraphs and runs. Clearing text can discard run
  formatting; the renderer retains template paragraph/run styling and removes
  italics. Copied `a:rPr` must precede `a:t` in XML or PowerPoint ignores it.
- Setting both picture dimensions can stretch an icon. The renderer instead
  centers an aspect-ratio-preserving image inside the original icon bounds.
- There is no public shape-delete method here. `remove_shape()` isolates the
  private XML removal, so its dependency is easy to test when upgrading.

## 4. Compute facts before prompting the model

`scripts/analysis.py` validates required sheets/columns, numeric values, unique
region-quarter pairs, matching keys between sheets, and a complete 4-by-4 grid.
It sorts quarters explicitly and returns regional metrics, changes, KPIs and
chart specifications as JSON-compatible values.

```powershell
.\.venv\Scripts\python.exe -m scripts.analysis
```

For the supplied workbook, the reporting quarter is **2026-Q2**:

- Total latest-quarter revenue: **USD 1,280M**.
- Revenue growth versus 2026-Q1: **4.49%**.
- Unweighted mean of the four regional NPS scores: **49.75**.
- APAC revenue grows **26.92% from 2025-Q3 to 2026-Q2**, while warehouse utilization reaches **92%**.
- Latin America revenue falls **6.67% over that same period**; NPS falls from
  **38 to 29**, stockouts rise to **12.5%**, and delivery takes **7.5 days**.

The story is to protect APAC's growth through capacity readiness while prioritizing
Latin America's operational and customer recovery. This is an interpretation,
not proof that any one operational issue caused revenue decline.

Do not label observed-period growth as YoY: comparable prior-year quarters are
absent. Do not label the mean regional NPS as customer-weighted company NPS:
survey sample counts are absent. Marketing spend alone cannot establish ROI.

## 5. Generate structured, evidence-led content

`content/slide_generator.py` sends the analysis and discovered template specification
to Gemini and validates its JSON against a schema built by `content_schema()`.
It requires exactly the discovered slides and text fields, concise text, 3-4 bullets on
the detail/action slides, and icon filenames from the eight-file allowlist.
The prompt asks for implications, supporting metrics and proposed actions,
without inventing budgets, deadlines, causes or approved commitments.

`llm/gemini_client.py` uses the current `google-genai` SDK and sends the Pydantic
model's `model_json_schema()` through `response_json_schema`, alongside
`GEMINI_MODEL`. The older `response_schema` serialization can cause HTTP 400
errors for `additional_properties` when strict dynamic schemas are used.
All KPI arithmetic and chart values stay outside the model.
Schema validation checks structure and length, not factual truth. Review the
AI text against the evidence file before submitting the presentation.

## 6. Render the presentation programmatically

`renderer/ppt_renderer.py` owns named-shape lookup/replacement, paragraph/run
formatting, text fitting, native charts, icon insertion and cleanup validation.
`novaretail_agent/tools/render_tool.py` maps each discovered slide's content to its
actual named shapes and writes computed KPI values wherever they appear.

In the supplied template, three native line charts show revenue, NPS, and stockout rates by region
across four quarters. Lines make diverging trends visible; the same region uses
the same line color across slides. Any slide with a supported chart placeholder
receives the corresponding chart; there is no hard-coded list of chart slide numbers.
Charts retain the exact original bounds. Icons fit within the original bounds
without distortion. Recommendations have bold leading action verbs.

On Windows, text fitting uses the template's local font (Calibri or Cambria),
including its bold font file, when available. On other systems it retains fixed
template-sized text; visually check fit or provide a local font path before
relying on that environment.

## 7. Create the ADK agent

The project already has the ADK discovery layout:

```text
novaretail_agent/
    __init__.py        # imports agent
    agent.py           # exports root_agent
    tools/
        analysis_tool.py
        content_tool.py
        render_tool.py
        build_presentation_tool.py
```

`root_agent` is an ADK `Agent` with a Gemini model, business-review instructions
and two Python tools:

1. `analyze_dataset()` answers questions using computed workbook evidence.
2. `build_presentation(use_ai=True)` runs analysis -> content -> render -> evidence
   output in a fixed order. It returns success only after saving, or a failed
   stage and next step. Its annotation and docstring supply the ADK tool schema.

Keep the content/render helpers inside the build tool. This avoids asking the
agent to reproduce large nested objects across separate tool calls or render
before validated analysis/content exist. The model decides when to build;
Python controls calculations and file operations.

## 8. Configure Gemini privately

Get a Gemini API key through [Google AI Studio](https://aistudio.google.com/apikey).
Update your existing project `.env` locally; never paste the key into chat or
commit it. `.env.example` shows the expected variable names without credentials.

```dotenv
GOOGLE_GENAI_USE_VERTEXAI=FALSE
GOOGLE_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash
```

The agent and content client explicitly load the root `.env` without overriding
existing process environment variables. Choose a model available to your account
that supports function calling and structured output. Change `GEMINI_MODEL` to
change both agent and content generation. Vertex AI authentication is not the
documented configuration for this project.

## 9. Run the offline checks first

```powershell
.\.venv\Scripts\python.exe -m unittest scripts.renderer_test -v
.\.venv\Scripts\python.exe -m scripts.render_presentation --offline
```

This makes `output/offline_preview.pptx` and `output/offline_preview_evidence.json`.
Offline copy is a deterministic, data-derived draft, NOT AI-generated. Its footer
is visibly labelled. It verifies the pipeline but does not satisfy the AI-copy
requirement of the final submission. There is no silent offline fallback.

## 10. Run the real agent and build the final deck

From the project root, start ADK's local development UI:

```powershell
.\.venv\Scripts\adk.exe web --port 8000
```

Open `http://localhost:8000`, select `novaretail_agent`, and send:

> Create the complete NovaRetail executive review from the local dataset and
> template. Generate AI-written insights and return the saved deck path.

Alternatively, use ADK's terminal interface:

```powershell
.\.venv\Scripts\adk.exe run novaretail_agent
```

For a direct build that bypasses the conversational agent but uses the same tool
and real Gemini content generation:

```powershell
.\.venv\Scripts\python.exe -m scripts.render_presentation
```

The AI build writes `output/presentation.pptx` and
`output/presentation_evidence.json`. The evidence file contains computed facts,
chart data, generated text, selected icons and content provenance. The returned
path is local; ADK does not automatically convert it into a download attachment.
Each build replaces its corresponding output files. Close the output deck in
PowerPoint before rebuilding, and avoid simultaneous builds.

## 11. Review and submit

Check the presentation's flow. The supplied template follows summary/KPIs ->
growth -> customers -> risk -> actions, but other template lengths/orders are supported.
Open the finished deck to check clipping, line wrapping, chart legends and icon
alignment. Native charts must remain editable. Compare every AI claim and
recommendation with the evidence file; schema validation does not prove those
claims. Include your architecture explanation, verified test output, model
configuration without the key, final AI-generated deck, and the evidence file.

Troubleshooting: API failures include a sanitized `message` and `http_status`.
For HTTP 400, inspect request/schema compatibility; 401/403 indicates key or
permission issues; 404 indicates model availability; 429 indicates quota or rate
limits. A `content` failure does not indicate that PowerPoint is locking a file.
`analysis` failure means inspect workbook structure.
`render` failure means check named shapes, icon files, font fitting or a locked
output deck. Do not submit an old deck after a failed build; inspect the tool's
status and content provenance.

References: [ADK documentation](https://google.github.io/adk-docs/),
[Gen AI SDK](https://googleapis.github.io/python-genai/),
[Gemini models](https://ai.google.dev/gemini-api/docs/models),
[python-pptx documentation](https://python-pptx.readthedocs.io/en/latest/).