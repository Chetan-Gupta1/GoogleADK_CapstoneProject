console.log("NOVARETAIL APP JS LOADED");

/*
=========================================
GLOBAL STATE & STEPPER
=========================================
*/
let currentContent = null;
let chatHistory = [];

function updateStepper(stepIndex) {
    const steps = ["step-data", "step-metrics", "step-narrative", "step-presentation"];
    steps.forEach((stepId, idx) => {
        const el = document.getElementById(stepId);
        if (!el) return;
        if (idx < stepIndex) {
            el.className = "step step-completed";
        } else if (idx === stepIndex) {
            el.className = "step step-active";
        } else {
            el.className = "step";
        }
    });
}

/*
=========================================
BUTTON SYNCHRONIZATION HELPERS
=========================================
*/

/**
 * Puts an array of buttons into loading state simultaneously
 * and returns a function to restore them all.
 */
function setMultiButtonLoading(btnIds, loadingText) {
    const originalStates = [];
    btnIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            originalStates.push({ id, originalHtml: btn.innerHTML, disabled: btn.disabled });
            btn.disabled = true;
            btn.innerHTML = loadingText;
        }
    });

    return () => {
        originalStates.forEach(state => {
            const btn = document.getElementById(state.id);
            if (btn) {
                btn.disabled = state.disabled;
                btn.innerHTML = state.originalHtml;
            }
        });
    };
}


/*
=========================================
DATASET UPLOAD & DRAWER
=========================================
*/

function toggleUploadDrawer() {
    const drawer = document.getElementById("uploadDrawer");
    const toggleBtn = document.getElementById("toggleUploadBtn");
    if (!drawer) return;

    if (drawer.style.display === "none" || drawer.style.display === "") {
        drawer.style.display = "block";
        if (toggleBtn) toggleBtn.innerText = "Close Upload Drawer ▴";
    } else {
        drawer.style.display = "none";
        if (toggleBtn) toggleBtn.innerText = "📂 Change / Upload Excel ▾";
    }
}

async function uploadExcel() {
    const input = document.getElementById("excelFileInput");
    const statusDiv = document.getElementById("upload-status");

    if (!input.files || input.files.length === 0) {
        statusDiv.innerHTML = `
            <p class="upload-error">
                ⚠️ Please select an Excel workbook (.xlsx / .xls) first.
            </p>
        `;
        return;
    }

    const file = input.files[0];
    const formData = new FormData();
    formData.append("file", file);

    const restore = setMultiButtonLoading(["uploadBtn"], "⏳ Uploading & Validating...");

    statusDiv.innerHTML = `
        <p class="upload-info">
            ⏳ Validating sheets and regional grid in <strong>${file.name}</strong>…
        </p>
    `;

    try {
        const response = await fetch("/upload-data", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            statusDiv.innerHTML = `
                <p class="upload-success">
                    ✅ ${data.message}
                </p>
            `;
            const activeLabel = document.getElementById("activeDatasetLabel");
            if (activeLabel) {
                activeLabel.innerHTML = `<strong>${data.filename}</strong> (Custom Uploaded)`;
            }
            // Invalidate cached content
            currentContent = null;
            updateStepper(1);
        } else {
            statusDiv.innerHTML = `
                <p class="upload-error">
                    ❌ Upload failed: ${data.detail || "Validation error"}
                </p>
            `;
        }

    } catch (error) {
        console.error(error);
        statusDiv.innerHTML = `
            <p class="upload-error">
                ❌ Upload failed: ${error.message}
            </p>
        `;
    } finally {
        restore();
    }
}


/*
=========================================
ANALYZE DATASET
=========================================
*/

async function analyzeDataset() {
    const restore = setMultiButtonLoading(
        ["navAnalyzeBtn", "mainAnalyzeBtn"],
        "⏳ Analyzing Data..."
    );

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = `
        <div class="card" style="text-align: center; padding: 32px;">
            <div class="build-spinner" style="margin-bottom: 12px;"></div>
            <h3>Computing Quarterly Business Metrics…</h3>
            <p style="color: var(--slate-light); margin: 0;">Calculating QoQ growth, regional NPS, stockouts and capacity headroom.</p>
        </div>
    `;

    try {
        console.log("Analyze initiated");
        const response = await fetch("/analyze", { method: "POST" });
        const data = await response.json();

        console.log("Analysis results:", data);

        resultsDiv.innerHTML = `
            <div class="card" style="padding: 24px;">
                <h3 class="kpi-section-title">📊 Executive Business Overview</h3>

                <div class="kpi-container">
                    <div class="kpi-card">
                        <div class="kpi-title">Total Revenue</div>
                        <div class="kpi-value">$${Number(data.kpis.total_revenue_usd_m).toLocaleString()}M</div>
                        <span class="kpi-badge kpi-badge-growth">Latest Quarter</span>
                    </div>

                    <div class="kpi-card">
                        <div class="kpi-title">QoQ Growth</div>
                        <div class="kpi-value">${data.kpis.revenue_qoq_growth_pct >= 0 ? '+' : ''}${data.kpis.revenue_qoq_growth_pct.toFixed(2)}%</div>
                        <span class="kpi-badge kpi-badge-growth">vs Previous Quarter</span>
                    </div>

                    <div class="kpi-card">
                        <div class="kpi-title">Regional Mean NPS</div>
                        <div class="kpi-value">${data.kpis.unweighted_regional_nps.toFixed(1)}</div>
                        <span class="kpi-badge">Points (Unweighted)</span>
                    </div>

                    <div class="kpi-card">
                        <div class="kpi-title">Top Growth Region</div>
                        <div class="kpi-value" style="color: #16a34a;">${data.growth_region}</div>
                        <span class="kpi-badge kpi-badge-growth">Paces Revenue Expansion</span>
                    </div>

                    <div class="kpi-card">
                        <div class="kpi-title">Operational Risk</div>
                        <div class="kpi-value" style="color: #dc2626;">${data.risk_region}</div>
                        <span class="kpi-badge kpi-badge-risk">Highest Stockout Rate</span>
                    </div>
                </div>
            </div>
        `;

        updateStepper(2);

        // Smooth scroll to KPI cards
        resultsDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });

    } catch (error) {
        console.error(error);
        resultsDiv.innerHTML = `
            <div class="card" style="border-color: var(--danger); padding: 24px;">
                <h3 style="color: var(--danger); margin: 0 0 8px 0;">❌ Analysis Failed</h3>
                <p style="margin: 0; color: var(--slate);">${error.message}</p>
            </div>
        `;
    } finally {
        restore();
    }
}


/*
=========================================
RENDER NARRATIVE PREVIEW CARDS
=========================================
*/

function renderNarrative(content, isModifiedByChat = false) {
    const narrativeDiv = document.getElementById("narrative");
    const tag = document.getElementById("narrativeTag");
    if (!content) return;

    if (tag) {
        if (isModifiedByChat) {
            tag.innerText = "✨ Customized via AI Chat";
            tag.className = "narrative-tag narrative-tag-modified";
        } else {
            tag.innerText = "✨ AI Generated";
            tag.className = "narrative-tag";
        }
    }

    const slideMeta = {
        slide_1: { badge: "Slide 1 • Strategic Overview", icon: "🌐" },
        slide_2: { badge: "Slide 2 • Regional Performance", icon: "📈" },
        slide_3: { badge: "Slide 3 • Customer Experience", icon: "⭐" },
        slide_4: { badge: "Slide 4 • Operational Risk", icon: "⚠️" },
        slide_5: { badge: "Slide 5 • Action Plan", icon: "💡" }
    };

    let html = "";

    for (const slideKey in content) {
        const slide = content[slideKey];
        const meta = slideMeta[slideKey] || { badge: slideKey.toUpperCase(), icon: "📄" };

        html += `
            <div class="slide-card" id="card-${slideKey}">
                <div class="slide-card-header">
                    <div>
                        <span class="slide-badge">${meta.icon} ${meta.badge}</span>
                        <h3 class="slide-card-title">${escapeHtml(slide.title || "Executive Review")}</h3>
                    </div>
                </div>
        `;

        if (slide.summary) {
            html += `
                <div class="slide-summary-box">
                    <strong>Executive Summary:</strong> ${escapeHtml(slide.summary)}
                </div>
            `;
        }

        if (slide.insights && slide.insights.length > 0) {
            html += `
                <div class="slide-insights-title">Key Insights</div>
                <ul class="slide-list">
            `;
            slide.insights.forEach(insight => {
                html += `<li>${escapeHtml(insight)}</li>`;
            });
            html += `</ul>`;
        }

        if (slide.recommendations && slide.recommendations.length > 0) {
            html += `
                <div class="slide-recommendations-title">Prioritized Recommendations</div>
                <ul class="slide-list">
            `;
            slide.recommendations.forEach(item => {
                html += `<li>${escapeHtml(item)}</li>`;
            });
            html += `</ul>`;
        }

        if (slide.closing) {
            html += `
                <div class="slide-closing-box">
                    <strong>Takeaway:</strong> ${escapeHtml(slide.closing)}
                </div>
            `;
        }

        html += `</div>`;
    }

    narrativeDiv.innerHTML = html;
}


/*
=========================================
GENERATE AI NARRATIVE
=========================================
*/

async function generateContent() {
    const restore = setMultiButtonLoading(
        ["navGenerateBtn", "mainGenerateBtn"],
        "⏳ Generating Narrative..."
    );

    const workspace = document.getElementById("workspaceContainer");
    workspace.style.display = "grid";

    const narrativeDiv = document.getElementById("narrative");
    narrativeDiv.innerHTML = `
        <div class="card" style="text-align: center; padding: 48px 24px;">
            <div class="build-spinner" style="margin-bottom: 16px;"></div>
            <h3>Gemini is Analyzing Evidence & Drafting Slides…</h3>
            <p style="color: var(--slate-light); margin: 0;">Generating executive titles, concise metrics interpretation, and board recommendations.</p>
        </div>
    `;

    try {
        const response = await fetch("/generate-content", { method: "POST" });
        const data = await response.json();
        console.log("Narrative data:", data);

        currentContent = data.content;
        renderNarrative(currentContent, false);

        // Show sticky chat card and bottom CTA
        const chatSection = document.getElementById("chat-section");
        if (chatSection) chatSection.style.display = "flex";

        const bottomCta = document.getElementById("narrativeBottomCta");
        if (bottomCta) bottomCta.style.display = "block";

        if (chatHistory.length === 0) {
            appendChatMessage(
                "assistant",
                "👋 Hello! I've drafted the 5 executive slides on the left. You can ask me to revise the summary, adjust the tone, or alter recommendations. When you're ready, click **Build Presentation**!"
            );
        }

        updateStepper(3);

        // Smooth scroll to workspace
        workspace.scrollIntoView({ behavior: "smooth", block: "start" });

    } catch (error) {
        console.error(error);
        narrativeDiv.innerHTML = `
            <div class="card" style="border-color: var(--danger); padding: 24px;">
                <h3 style="color: var(--danger); margin: 0 0 8px 0;">❌ Narrative Generation Failed</h3>
                <p style="margin: 0; color: var(--slate);">${error.message}</p>
            </div>
        `;
    } finally {
        restore();
    }
}


/*
=========================================
STICKY AI CHAT ASSISTANT
=========================================
*/

function appendChatMessage(role, text) {
    const messagesDiv = document.getElementById("chat-messages");
    if (!messagesDiv) return;

    const msgEl = document.createElement("div");
    msgEl.className = `chat-msg chat-msg-${role}`;

    const senderName = role === "user" ? "You" : "🤖 NovaRetail AI Copilot";
    msgEl.innerHTML = `
        <div class="chat-sender-name">${senderName}</div>
        <div class="chat-bubble">${escapeHtml(text)}</div>
    `;

    messagesDiv.appendChild(msgEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.innerText = text;
    return div.innerHTML;
}

function applySuggestion(suggestionText) {
    const input = document.getElementById("chatInput");
    if (input) {
        input.value = suggestionText;
    }
    sendChatMessage();
}

async function sendChatMessage() {
    const input = document.getElementById("chatInput");
    const userText = input ? input.value.trim() : "";
    if (!userText) return;

    // Append user message
    appendChatMessage("user", userText);
    chatHistory.push({ role: "user", content: userText });
    if (input) input.value = "";

    const restoreBtn = setMultiButtonLoading(["chatSendBtn"], "⏳ Updating...");

    // Temporary loading bubble
    const messagesDiv = document.getElementById("chat-messages");
    const loadingEl = document.createElement("div");
    loadingEl.id = "chat-loading-indicator";
    loadingEl.className = "chat-msg chat-msg-assistant";
    loadingEl.innerHTML = `
        <div class="chat-sender-name">🤖 NovaRetail AI Copilot</div>
        <div class="chat-bubble"><em>Refining narrative and updating slides...</em></div>
    `;
    messagesDiv.appendChild(loadingEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
        const response = await fetch("/chat-modify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: userText,
                content: currentContent,
                history: chatHistory
            })
        });

        const data = await response.json();

        // Remove loading indicator
        const indicator = document.getElementById("chat-loading-indicator");
        if (indicator) indicator.remove();

        if (response.ok && data.status === "success") {
            currentContent = data.content;
            renderNarrative(currentContent, true);

            appendChatMessage("assistant", data.reply);
            chatHistory.push({ role: "assistant", content: data.reply });

            // Highlight narrative column briefly
            const column = document.getElementById("narrativeColumn");
            if (column) {
                column.style.transition = "background-color 0.3s";
                column.style.backgroundColor = "#faf5ff";
                setTimeout(() => { column.style.backgroundColor = "transparent"; }, 700);
            }
        } else {
            appendChatMessage("assistant", `❌ Could not modify narrative: ${data.detail || "Unexpected error"}`);
        }

    } catch (error) {
        console.error(error);
        const indicator = document.getElementById("chat-loading-indicator");
        if (indicator) indicator.remove();
        appendChatMessage("assistant", `❌ Request failed: ${error.message}`);
    } finally {
        restoreBtn();
    }
}

async function resetChatSession() {
    chatHistory = [];
    const messagesDiv = document.getElementById("chat-messages");
    if (messagesDiv) messagesDiv.innerHTML = "";
    appendChatMessage(
        "assistant",
        "🔄 In-session chat history has been reset. You can provide new instructions to modify the current slides anytime!"
    );
    try {
        await fetch("/clear-chat", { method: "POST" });
    } catch (e) {
        console.error(e);
    }
}


/*
=========================================
BUILD PRESENTATION (ACCESSIBLE FROM EVERYWHERE!)
=========================================
*/

const ALL_BUILD_BUTTONS = [
    "navBuildBtn",
    "mainBuildBtn",
    "chatBuildBtn",
    "bottomNarrativeBuildBtn"
];

function openBuildModal(initialHtml) {
    const modal = document.getElementById("buildModal");
    const body = document.getElementById("buildModalBody");
    if (modal && body) {
        body.innerHTML = initialHtml;
        modal.style.display = "block";
    }
}

function closeBuildModal() {
    const modal = document.getElementById("buildModal");
    if (modal) modal.style.display = "none";
}

async function buildPresentation() {
    // 1. Put all build buttons across the entire page into synced loading state!
    const restoreAll = setMultiButtonLoading(
        ALL_BUILD_BUTTONS,
        "⏳ Building PowerPoint..."
    );

    // 2. Open modern animated modal right in front of the user (NO SCROLLING NEEDED!)
    openBuildModal(`
        <div class="build-modal-body">
            <div class="build-spinner"></div>
            <h2 class="build-modal-title">Assembling Executive Presentation</h2>
            <p class="build-modal-desc">Compiling your 5-slide PowerPoint deck with customized AI narrative and charts.</p>

            <div class="build-steps-list">
                <div class="build-step-item">✅ <span>1. Verified quarterly metrics & regional tables</span></div>
                <div class="build-step-item">✅ <span>2. Applied customized AI narrative copy</span></div>
                <div class="build-step-item">⏳ <span>3. Formatting slide shapes, KPI callouts & charts…</span></div>
                <div class="build-step-item">⏳ <span>4. Saving presentation to output/presentation.pptx…</span></div>
            </div>
        </div>
    `);

    try {
        const response = await fetch("/build-presentation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: currentContent })
        });

        const data = await response.json();
        console.log("Build response:", data);

        if (data.status === "success") {
            const body = document.getElementById("buildModalBody");
            if (body) {
                body.innerHTML = `
                    <div class="build-modal-body">
                        <div class="build-success-badge">✅</div>
                        <h2 class="build-modal-title">Presentation Built Successfully!</h2>
                        <p class="build-modal-desc">Your board-ready PowerPoint presentation is generated and ready to present.</p>

                        <div class="build-meta-grid">
                            <div class="build-meta-item">
                                <span class="build-meta-label">Quarter</span>
                                <span class="build-meta-value">${escapeHtml(data.quarter)}</span>
                            </div>
                            <div class="build-meta-item">
                                <span class="build-meta-label">Deck Length</span>
                                <span class="build-meta-value">${data.slide_count} Slides</span>
                            </div>
                            <div class="build-meta-item">
                                <span class="build-meta-label">Narrative</span>
                                <span class="build-meta-value">${data.content_source === "gemini_chat" ? "✨ AI Customized" : "Gemini AI"}</span>
                            </div>
                        </div>

                        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                            <a href="/download-ppt" class="btn btn-accent btn-lg" style="text-decoration: none;">
                                📥 Download Presentation (.pptx)
                            </a>
                            <button class="btn btn-outline btn-lg" onclick="closeBuildModal()">
                                Close
                            </button>
                        </div>
                    </div>
                `;
            }

            updateStepper(4);

        } else {
            const body = document.getElementById("buildModalBody");
            if (body) {
                body.innerHTML = `
                    <div class="build-modal-body">
                        <div style="font-size: 48px; margin-bottom: 12px;">❌</div>
                        <h2 class="build-modal-title" style="color: var(--danger);">Build Failed</h2>
                        <p class="build-modal-desc">Stage: <strong>${escapeHtml(data.stage || "build")}</strong></p>
                        <p style="color: var(--slate); font-size: 13px; text-align: left; background: #fef2f2; padding: 12px; border-radius: 6px;">
                            ${escapeHtml(data.next_step || data.message || "An error occurred.")}
                        </p>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-secondary" onclick="closeBuildModal()">Close</button>
                        </div>
                    </div>
                `;
            }
        }

    } catch (error) {
        console.error(error);
        const body = document.getElementById("buildModalBody");
        if (body) {
            body.innerHTML = `
                <div class="build-modal-body">
                    <div style="font-size: 48px; margin-bottom: 12px;">❌</div>
                    <h2 class="build-modal-title" style="color: var(--danger);">Build Failed</h2>
                    <p style="color: var(--slate); font-size: 14px;">${escapeHtml(error.message)}</p>
                    <div style="margin-top: 20px;">
                        <button class="btn btn-secondary" onclick="closeBuildModal()">Close</button>
                    </div>
                </div>
            `;
        }
    } finally {
        restoreAll();
    }
}


/*
=========================================
INSTRUCTIONS MODAL & KEYBOARD LISTENERS
=========================================
*/

function showInstructions() {
    const modal = document.getElementById("instructionsModal");
    if (modal) modal.style.display = "block";
}

function closeInstructions() {
    const modal = document.getElementById("instructionsModal");
    if (modal) modal.style.display = "none";
}

// Global click & keyboard handling
window.addEventListener("click", (e) => {
    const buildModal = document.getElementById("buildModal");
    const instructionsModal = document.getElementById("instructionsModal");
    if (e.target === buildModal) closeBuildModal();
    if (e.target === instructionsModal) closeInstructions();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeBuildModal();
        closeInstructions();
    }
});

// Chat textarea Enter key
document.addEventListener("DOMContentLoaded", () => {
    const chatInput = document.getElementById("chatInput");
    if (chatInput) {
        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
});