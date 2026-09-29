// 1. SİSTEM BAŞLATMA VE GLOBAL TANIMLAMALAR
// Diğer dosyalarla çakışmaması için window objesi üzerinden güvenli kontrol yapıyoruz
if (!window.scenarios) {
  window.scenarios = {};
}

const CHAT_SESSIONS_KEY = "cassandra_soc_history_v4";
let pendingPassOriginalPrompt = null;

// BACKEND URLSİ (Render üzerindeki yeni backend'e yönlendiriyor)
const BACKEND_URL = "";

function initSystem() {
  setInterval(() => {
    const now = new Date();
    const local = document.getElementById("clock-local");
    const utc = document.getElementById("clock-utc");
    if (local) local.textContent = `LOCAL ${now.toLocaleTimeString("tr-TR")}`;
    if (utc) utc.textContent = `UTC ${now.toISOString().substr(11, 8)}`;
  }, 1000);

  setTimeout(() => {
    const intro = document.getElementById("intro-overlay");
    if (intro) {
      intro.style.opacity = "0";
      setTimeout(() => {
        intro.style.display = "none";
        const pin = document.getElementById("prompt-in");
        if (pin) pin.focus();
      }, 800);
    }
  }, 2500);

  const updateDisplay = () => {
    const secVal = document.getElementById("sector-select")?.value || "-";
    const vakVal = document.getElementById("vaka-select")?.value || "-";
    const expEl = document.querySelector('input[name="exp"]:checked');

    const rawExp = expEl ? expEl.value.trim().toLowerCase() : "red team expert";
    let fullAnalystName = "";

    // Sadece Red Team için özel SVG kalkanı, diğerleri emojili kararlı tasarım
    if (rawExp.includes("red team")) {
      fullAnalystName = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#ff4d6d" style="vertical-align: middle; margin-right: 5px;"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg> RED TEAM EXPERT`;
    } else if (rawExp.includes("blue team")) {
      fullAnalystName = "🛡️ BLUE TEAM RESPONDER";
    } else if (rawExp.includes("chief")) {
      fullAnalystName = "🧠 CHIEF STRATEGIST";
    } else if (rawExp.includes("osint")) {
      fullAnalystName = "🔍 OSINT SPECIALIST";
    } else if (rawExp.includes("threat")) {
      fullAnalystName = "🕵️‍♀️ THREAT INTELLIGENCE";
    } else if (rawExp.includes("forensics")) {
      fullAnalystName = "🧪 FORENSICS SPECIALIST";
    } else if (rawExp.includes("compliance")) {
      fullAnalystName = "⚖️ COMPLIANCE OFFICER";
    } else {
      fullAnalystName = `🛡️ ${rawExp.toUpperCase()}`;
    }

    if (document.getElementById("display-sector"))
      document.getElementById("display-sector").textContent = secVal;
    if (document.getElementById("display-vaka"))
      document.getElementById("display-vaka").textContent = vakVal;

    // Uzman adını güncelliyoruz, böylece kullanıcı seçimine göre dinamik olarak değişiyor
    if (document.getElementById("display-analyst"))
      document.getElementById("display-analyst").innerHTML = fullAnalystName;
  };

  document
    .getElementById("sector-select")
    ?.addEventListener("change", updateDisplay);
  document
    .getElementById("vaka-select")
    ?.addEventListener("change", updateDisplay);
  document
    .querySelectorAll('input[name="exp"]')
    .forEach((r) => r.addEventListener("change", updateDisplay));

  const histBtn = document.getElementById("history-toggle-btn");
  if (histBtn)
    histBtn.onclick = () =>
      document.getElementById("history-content").classList.toggle("active");

  const clearBtn = document.getElementById("clear-history-btn");
  if (clearBtn)
    clearBtn.onclick = () => {
      if (confirm("Tüm geçmiş silinecek. Emin misin?")) {
        localStorage.removeItem(CHAT_SESSIONS_KEY);
        renderHistory();
      }
    };
  setTimeout(updateDisplay, 500);
}

// 2. SENARYO YÜKLEME
async function loadScenarios() {
  const fallbacks = {
    "Ağ Güvenliği": ["Port Tarama", "DDoS Analizi"],
    "Web Uygulama": ["SQL Injection", "XSS", "IDOR"],
    "Sistem Sızma": ["Privilege Escalation", "Lateral Movement"],
  };

  let targetScenarios = fallbacks;

  try {
    const res = await fetch(`${BACKEND_URL}/api/scenarios`);
    const data = await res.json();
    if (data.scenarios && Object.keys(data.scenarios).length > 0) {
      targetScenarios = data.scenarios;
    }
  } catch (e) {
    targetScenarios = fallbacks;
  }

  // Global senaryoları güncelleyoruz, böylece diğer fonksiyonlar güncel verilere erişebilir
  Object.keys(window.scenarios).forEach((key) => delete window.scenarios[key]);
  Object.assign(window.scenarios, targetScenarios);

  const sector = document.getElementById("sector-select");
  const vaka = document.getElementById("vaka-select");
  if (!sector || !vaka) return;

  sector.innerHTML = [
    `<option value="__GENERAL__">💬 Genel Sohbet</option>`,
    ...Object.keys(window.scenarios).map(
      (s) => `<option value="${s}">${s}</option>`,
    ),
  ].join("");

  sector.onchange = () => {
    const generalMode = sector.value === "__GENERAL__";
    if (generalMode) {
      vaka.innerHTML = `<option value="__NONE__">Vaka Yok • Genel Soru</option>`;
      vaka.disabled = true;
    } else {
      vaka.disabled = false;
      vaka.innerHTML = (window.scenarios[sector.value] || [])
        .map((v) => `<option value="${v}">${v}</option>`)
        .join("");
    }
    const pdfCase = document.getElementById("pdf-use-case-title");
    if (pdfCase) {
      pdfCase.disabled = generalMode;
      if (generalMode) pdfCase.checked = false;
    }

  };
  sector.value = "__GENERAL__";
  sector.onchange();
}

// 3. MESAJLAŞMA VE ANALİZ
async function runAnalysis() {
  const input = document.getElementById("prompt-in");
  const btn = document.getElementById("analyze-btn");
  const fileInput = document.getElementById("file-input");
  const text = input && input.value ? input.value.trim() : "";

  if (!text && (!fileInput || !fileInput.files[0])) return;

  const savedKey = localStorage.getItem("cassandra_groq_key");
  if (!savedKey) {
    alert("Lütfen önce giriş ekranından geçerli bir API Key girin! 🔑");
    const modal = document.getElementById("apiKeyModal");
    if (modal) modal.style.display = "flex";
    return;
  }

  const expertElement = document.querySelector('input[name="exp"]:checked');
  const expert = expertElement ? expertElement.value : "RED TEAM";
  const vaka = document.getElementById("vaka-select")
    ? document.getElementById("vaka-select").value
    : "-";
  const sector = document.getElementById("sector-select")
    ? document.getElementById("sector-select").value
    : "-";

  const selectedFile = fileInput?.files?.[0] || null;
  const attachmentMeta = selectedFile
    ? {
        name: selectedFile.name,
        type: selectedFile.type || "application/octet-stream",
        size: selectedFile.size,
        kind: selectedFile.type?.startsWith("image/") ? "image" : "text",
      }
    : null;

  appendMsg(
    "user",
    text ||
      (attachmentMeta?.kind === "image"
        ? "Görsel analiz talebi"
        : "Dosya analiz talebi"),
    "",
    null,
    attachmentMeta,
  );
  if (input) input.value = "";
  if (btn) {
    btn.disabled = true;
    btn.innerText = "RUNNING...";
  }

  try {
    let base64Image = null;
    let finalPrompt = text;

    if (fileInput && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (file.size > 2 * 1024 * 1024)
        throw new Error("Dosya çok büyük (Maks 2MB)");

      const lowerName = file.name.toLowerCase();
      const textExtensions = [".txt", ".log", ".json", ".csv", ".md"];
      const isTextFile =
        file.type.startsWith("text/") ||
        file.type === "application/json" ||
        textExtensions.some((ext) => lowerName.endsWith(ext));

      if (isTextFile) {
        const fileContent = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });

        // Groq on-demand TPM limitini aşmamak için dosyayı kontrollü örnekliyoruz.
        // Baş + son bölüm log/TXT analizinde bağlamı korurken tek isteği makul boyutta tutar.
        const MAX_FILE_CHARS = 12000;
        let safeFileContent = String(fileContent || "");
        let truncationNote = "";
        if (safeFileContent.length > MAX_FILE_CHARS) {
          const half = Math.floor(MAX_FILE_CHARS / 2);
          safeFileContent = `${safeFileContent.slice(0, half)}\n\n[... DOSYANIN ORTA BÖLÜMÜ TPM SINIRI İÇİN ATLANDI ...]\n\n${safeFileContent.slice(-half)}`;
          truncationNote = `\n\nNOT: Dosya ${fileContent.length.toLocaleString("tr-TR")} karakter. Bu analizde ilk ve son bölümler örneklendi.`;
        }

        finalPrompt = finalPrompt
          ? `${finalPrompt}\n\n--- EKLENEN DOSYA: ${file.name} ---\n${safeFileContent}${truncationNote}`
          : sector === "__GENERAL__"
            ? `Aşağıdaki ${file.name} dosyasının içeriğini kullanıcının istediği şekilde açıkla veya analiz et. Dosyada olmayan bilgi uydurma.\n\n--- DOSYA İÇERİĞİ ---\n${safeFileContent}${truncationNote}`
            : `Aşağıdaki ${file.name} dosyasını siber güvenlik açısından analiz et. Bulguları kanıt, risk ve aksiyon başlıklarıyla raporla.\n\n--- DOSYA İÇERİĞİ ---\n${safeFileContent}${truncationNote}`;
      } else if (file.type.startsWith("image/")) {
        // MIME bilgisini koruyan tam data URL gönderiyoruz. PNG/JPEG/WebP ayrımı backend'de kaybolmaz.
        base64Image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        finalPrompt =
          finalPrompt ||
          `Eklenen ${file.name} görselini ayrıntılı biçimde analiz et. Görselde gerçekten görülen kanıtları belirt; görünmeyen ayrıntıları uydurma.`;
      } else {
        throw new Error(
          "Desteklenmeyen dosya türü. TXT/LOG/JSON/CSV veya PNG/JPG/WEBP yükleyin.",
        );
      }
    }

    const res = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: finalPrompt,
        expert: expert,
        attackVector: vaka,
        sector: sector,
        mode: sector === "__GENERAL__" ? "general" : "operation",
        image: base64Image,
        userApiKey: savedKey,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Sunucu hatası kodu: ${res.status}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const report = {
      reportId: data.reportId || Math.floor(Math.random() * 9000 + 1000),
      expert,
      sector,
      mode: sector === "__GENERAL__" ? "general" : "operation",
      attackVector: vaka,
      analysis: data.analysis,
      sourceFile: attachmentMeta,
      userPrompt: pendingPassOriginalPrompt || text,
      timestamp: new Date().toISOString(),
    };

    appendMsg(
      "assistant",
      data.analysis,
      `${expert} // CAS-${report.reportId}`,
      report,
    );
    saveHistory(report);
    pendingPassOriginalPrompt = null;
  } catch (e) {
    appendMsg("assistant", `⚠️ Hata: ${e.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = "ANALYZE";
    }
    if (fileInput) fileInput.value = "";
    const preview = document.getElementById("attachment-preview");
    if (preview) preview.textContent = "";
    if (input) input.focus();
  }
}

// 4. MESAJ EKLEME VE YENİ PASLAMA SİSTEMİ
function appendMsg(role, text, meta = "", report = null, attachment = null) {
  const flow = document.getElementById("chat-flow");
  if (!flow) return;
  const div = document.createElement("div");
  div.className = `msg ${role === "user" ? "user-msg" : "ai-msg"}`;

  if (role === "user") {
    div.innerHTML = `<div class="msg-body user-message-content"></div>`;
    const body = div.querySelector(".msg-body");
    const textNode = document.createElement("div");
    textNode.className = "user-message-text";
    textNode.textContent = text;
    body.appendChild(textNode);

    if (attachment) {
      const chip = document.createElement("div");
      chip.className = `attachment-chip ${attachment.kind === "image" ? "image-attachment" : "text-attachment"}`;
      const icon = attachment.kind === "image" ? "IMG" : "TXT";
      const size =
        attachment.size < 1024
          ? `${attachment.size} B`
          : attachment.size < 1024 * 1024
            ? `${(attachment.size / 1024).toFixed(1)} KB`
            : `${(attachment.size / 1024 / 1024).toFixed(2)} MB`;
      chip.innerHTML = `<span class="attachment-icon">${icon}</span><span class="attachment-info"><b></b><small></small></span>`;
      chip.querySelector("b").textContent = attachment.name;
      chip.querySelector("small").textContent =
        `${attachment.kind === "image" ? "Görsel" : "Metin dosyası"} • ${size}`;
      body.appendChild(chip);
    }
  } else {
    // AI çıktısını ham <br> metni yerine güvenli Markdown olarak render et.
    // Modelden gelebilecek HTML'i önce escape ederek script/HTML enjeksiyonunu engelliyoruz.
    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const safeMarkdown = escapeHtml(text);
    const rendered =
      typeof marked !== "undefined"
        ? marked.parse(safeMarkdown, { breaks: true, gfm: true })
        : safeMarkdown.replace(/\n/g, "<br>");
    const safeMeta = escapeHtml(meta);

    div.innerHTML = `
            <div class="msg-head assistant">
                <span class="chat-avatar assistant gold">CSA</span>
                <span class="expert-tag">${safeMeta}</span>
            </div>
            <div class="msg-body cassandra-report">${rendered}</div>
        `;

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "msg-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "action-btn copy-btn";
    copyBtn.innerText = "COPY";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text);
      copyBtn.innerText = "✔️";
      setTimeout(() => {
        copyBtn.innerText = "COPY";
      }, 2000);
    };
    actionsDiv.appendChild(copyBtn);

    if (report) {
      const pdfBtn = document.createElement("button");
      pdfBtn.className = "action-btn report-btn";
      pdfBtn.innerText = "STRATEGIC REPORT (PDF)";
      pdfBtn.onclick = () => {
        downloadPdf(report);
      };
      actionsDiv.appendChild(pdfBtn);

      const allExpertsList = [
        "Red Team Expert",
        "Blue Team Responder",
        "Chief Strategist",
        "OSINT Specialist",
        "Threat Intelligence",
        "Forensics Specialist",
        "Compliance Officer",
      ];

      if (allExpertsList.length > 1) {
        const passContainer = document.createElement("div");
        passContainer.style.display = "inline-flex";
        passContainer.style.alignItems = "center";
        passContainer.style.gap = "5px";
        passContainer.style.marginLeft = "10px";

        const selectTarget = document.createElement("select");
        selectTarget.style.background = "#1f2937";
        selectTarget.style.color = "#22d3ee";
        selectTarget.style.border = "1px solid #374151";
        selectTarget.style.padding = "4px 8px";
        selectTarget.style.borderRadius = "4px";
        selectTarget.style.fontSize = "11px";
        selectTarget.style.cursor = "pointer";

        const currentExpert = (report.expert || "").trim().toLowerCase();

        allExpertsList.forEach((exp) => {
          if (exp.toLowerCase() !== currentExpert) {
            const opt = document.createElement("option");
            opt.value = exp;
            opt.innerText = exp;
            selectTarget.appendChild(opt);
          }
        });

        const passBtn = document.createElement("button");
        passBtn.className = "action-btn pass-btn";
        passBtn.style.color = "#10b981";
        passBtn.innerText = "🔄 PASLA";
        passBtn.onclick = () => {
          const targetExpert = selectTarget.value;
          const radios = document.querySelectorAll('input[name="exp"]');
          radios.forEach((r) => {
            if (r.value.trim().toLowerCase() === targetExpert.toLowerCase()) {
              r.checked = true;
              r.dispatchEvent(new Event("change"));
            }
          });

          const cleanPreviousAnalysis = String(text || "")
            .replace(/<think>[\s\S]*?<\/think>/gi, "")

            // Kod bloklarını çıkar
            .replace(/```[\s\S]*?```/g, "[Teknik kod örneği çıkarıldı]")

            // Inline kod işaretlerini kaldır
            .replace(/`/g, "")

            // Path traversal benzeri literal örnekleri nötrleştir
            .replace(/(?:\.\.\/)+[^\s]*/gi, "[PATH_TRAVERSAL_ÖRNEĞİ]")

            // Basit SQLi literal örneklerini nötrleştir
            .replace(
              /(?:'|"|\b)\s*OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?(?:--)?/gi,
              "[SQL_INJECTION_ÖRNEĞİ]",
            )

            .replace(/[<>]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 6000);

          const passText = `
CASSANDRA AI UZMAN DEVİR PROTOKOLÜ

Önceki Uzman:
${report.expert}

Yeni Uzman:
${targetExpert}

Önceki Uzmanın Bulguları:
--- BAŞLANGIÇ ---
${cleanPreviousAnalysis}
--- BİTİŞ ---

GÖREV:
Önceki uzmanın raporunu aynen tekrar etme.

${targetExpert} rolünün uzmanlık alanına göre:

1. Önceki analizde eksik kalan noktaları tespit et.
2. Bulguları kendi uzmanlık perspektifinden değerlendir.
3. Öncelikli riskleri belirt.
4. Uygulanabilir bir aksiyon planı oluştur.
5. Yeterli veri veya kanıt yoksa bunu açıkça belirt.
6. Önceki uzman rolünü taklit etme.

Yanıtını Türkçe, düzenli ve profesyonel biçimde oluştur.
`.trim();

          const input = document.getElementById("prompt-in");

          if (input) {
            // Paslaşma sırasında PDF başlığında devir protokolünü değil,
            // ilk kullanıcının gerçek konusunu koru.
            pendingPassOriginalPrompt =
              String(report.userPrompt || "").trim() ||
              String(report.attackVector || "").trim() ||
              "Cassandra Raporu";

            input.value = passText;
            runAnalysis();
          }
        };

        passContainer.appendChild(selectTarget);
        passContainer.appendChild(passBtn);
        actionsDiv.appendChild(passContainer);
      }
    }

    div.appendChild(actionsDiv);
  }
  flow.appendChild(div);
  flow.scrollTop = flow.scrollHeight;
}

// 5. GEÇMİŞ YÖNETİMİ
function saveHistory(report) {
  const history = JSON.parse(localStorage.getItem(CHAT_SESSIONS_KEY) || "[]");
  history.push(report);
  localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById("history-list");
  if (!list) return;
  const history = JSON.parse(
    localStorage.getItem(CHAT_SESSIONS_KEY) || "[]",
  ).reverse();
  list.innerHTML = history.length ? "" : "<small>Geçmiş temiz.</small>";

  history.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<b>CAS-${item.reportId}</b><br><small>${item.attackVector}</small><span class="delete-history-btn">✖</span>`;
    div.onclick = (e) => {
      if (e.target.className === "delete-history-btn") {
        deleteHistoryItem(history.length - 1 - idx);
      } else {
        appendMsg("assistant", item.analysis, `ARŞİV: ${item.reportId}`, item);
      }
    };
    list.appendChild(div);
  });
}

function deleteHistoryItem(index) {
  const history = JSON.parse(localStorage.getItem(CHAT_SESSIONS_KEY) || "[]");
  history.splice(index, 1);
  localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(history));
  renderHistory();
}

// 6. PDF ÇIKTISI
function downloadPdf(data) {
  if (typeof pdfMake === "undefined") return alert("PDF modülü yüklenemedi.");

  const generalMode = data.mode === "general" || data.sector === "__GENERAL__";
  const useCaseTitle =
    !generalMode &&
    (document.getElementById("pdf-use-case-title")?.checked ?? false);
  const rawPromptTitle = String(data.userPrompt || "").trim();
  const fallbackTopic = data.sourceFile?.name
    ? data.sourceFile.name.replace(/\.[^.]+$/, "")
    : "Cassandra Raporu";
  const topicTitle = (rawPromptTitle || fallbackTopic)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
  const reportTitle = useCaseTitle
    ? String(data.attackVector || "Cassandra Raporu")
    : topicTitle;
  const safeReportTitle =
    reportTitle.replace(/[\/\\?%*:|"<>]/g, "-").trim() || "Cassandra Raporu";
  const fileName = `${safeReportTitle} - CAS-${data.reportId}.pdf`;
  const generatedAt = new Date(data.timestamp || Date.now()).toLocaleString(
    "tr-TR",
  );

  const C = {
    bg: "#020b12",
    panel: "#071722",
    panel2: "#091d29",
    cyan: "#27e5ff",
    text: "#e8f7fb",
    muted: "#7d9aa8",
    line: "#164355",
    red: "#ff476f",
  };
  const inlineParts = (value) =>
    String(value || "")
      .split(/(\*\*.*?\*\*|`.*?`)/g)
      .filter(Boolean)
      .map((part) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return { text: part.slice(2, -2), bold: true, color: C.text };
        if (part.startsWith("`") && part.endsWith("`"))
          return {
            text: part.slice(1, -1),
            font: "Roboto",
            color: C.cyan,
            background: C.panel2,
          };
        return { text: part, color: C.text };
      });

  function markdownToPdf(markdown) {
    const lines = String(markdown || "")
      .replace(/\r/g, "")
      .split("\n");
    const out = [];
    let inCode = false;
    let code = [];
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (line.trim().startsWith("```")) {
        if (inCode) {
          out.push({
            text: code.join("\n"),
            font: "Roboto",
            fontSize: 8.5,
            color: "#b9f5ff",
            background: "#06131d",
            margin: [10, 8, 10, 10],
            preserveLeadingSpaces: true,
          });
          code = [];
        }
        inCode = !inCode;
        continue;
      }
      if (inCode) {
        code.push(raw);
        continue;
      }
      if (!line.trim()) {
        out.push({ text: "", margin: [0, 2] });
        continue;
      }
      if (/^##\s+/.test(line))
        out.push({
          text: line.replace(/^##\s+/, ""),
          fontSize: 17,
          bold: true,
          color: C.text,
          margin: [0, 13, 0, 7],
        });
      else if (/^###\s+/.test(line))
        out.push({
          text: line.replace(/^###\s+/, "").toUpperCase(),
          fontSize: 10,
          bold: true,
          color: C.cyan,
          characterSpacing: 0.8,
          margin: [0, 12, 0, 5],
        });
      else if (/^[-*]\s+/.test(line))
        out.push({
          ul: [{ text: inlineParts(line.replace(/^[-*]\s+/, "")) }],
          margin: [8, 1, 0, 4],
          color: C.text,
        });
      else if (/^\d+\.\s+/.test(line))
        out.push({
          ol: [{ text: inlineParts(line.replace(/^\d+\.\s+/, "")) }],
          margin: [8, 1, 0, 4],
          color: C.text,
        });
      else if (/^>\s?/.test(line))
        out.push({
          text: inlineParts(line.replace(/^>\s?/, "")),
          italics: true,
          color: "#a7c8d4",
          background: C.panel2,
          margin: [8, 6, 8, 8],
        });
      else
        out.push({
          text: inlineParts(line),
          fontSize: 10,
          lineHeight: 1.35,
          margin: [0, 0, 0, 6],
        });
    }
    return out;
  }

  const metaRows = [
    [
      { text: "REPORT ID", bold: true, color: C.cyan },
      { text: `CAS-${data.reportId}`, color: C.text },
    ],
    [
      { text: "ACTIVE AGENT", bold: true, color: C.cyan },
      { text: data.expert || "-", color: C.text },
    ],
    [
      { text: "MODE", bold: true, color: C.cyan },
      {
        text: generalMode ? "GENERAL INTELLIGENCE" : "CYBER OPERATIONS",
        color: C.text,
      },
    ],
    ...(!generalMode
      ? [
          [
            { text: "SECTOR", bold: true, color: C.cyan },
            { text: data.sector || "-", color: C.text },
          ],
          [
            { text: "CASE", bold: true, color: C.cyan },
            { text: data.attackVector || "-", color: C.text },
          ],
        ]
      : []),
    ...(data.sourceFile
      ? [
          [
            { text: "SOURCE", bold: true, color: C.cyan },
            {
              text: `${data.sourceFile.name} • ${(data.sourceFile.size / 1024).toFixed(1)} KB`,
              color: C.text,
            },
          ],
        ]
      : []),
    [
      { text: "GENERATED", bold: true, color: C.cyan },
      { text: generatedAt, color: C.text },
    ],
  ];

  const docDef = {
    pageSize: "A4",
    pageMargins: [38, 64, 38, 48],
    background: () => ({
      canvas: [{ type: "rect", x: 0, y: 0, w: 595.28, h: 841.89, color: C.bg }],
    }),
    info: {
      title: `${reportTitle} - CAS-${data.reportId}`,
      subject: generalMode
        ? "Cassandra Intelligence Report"
        : "Cassandra Cyber Operations Report",
      author: "Cassandra AI",
    },
    header: () => ({
      margin: [38, 20, 38, 0],
      columns: [
        {
          stack: [
            {
              text: "CASSANDRA // OPS CENTER",
              bold: true,
              fontSize: 8,
              color: C.cyan,
            },
            {
              text: "Autonomous Cyber Intelligence",
              fontSize: 7,
              color: C.text,
            },
          ],
        },
        {
          text: generalMode ? "GENERAL INTELLIGENCE" : "CYBER OPERATIONS",
          alignment: "right",
          fontSize: 7,
          color: C.muted,
        },
      ],
    }),
    footer: (currentPage, pageCount) => ({
      margin: [38, 0, 38, 16],
      columns: [
        {
          text: `CAS-${data.reportId} // CASSANDRA AI`,
          fontSize: 7,
          color: C.muted,
        },
        {
          text: `${currentPage} / ${pageCount}`,
          alignment: "right",
          fontSize: 7,
          color: C.cyan,
        },
      ],
    }),
    content: [
      {
        table: {
          widths: [5, "*"],
          body: [
            [
              { text: "", fillColor: C.cyan },
              {
                stack: [
                  {
                    text: generalMode
                      ? "CASSANDRA INTELLIGENCE REPORT"
                      : "CASSANDRA CYBER OPERATIONS REPORT",
                    fontSize: 10,
                    bold: true,
                    color: C.cyan,
                    characterSpacing: 1,
                  },
                  {
                    text: reportTitle.toUpperCase(),
                    fontSize: 23,
                    bold: true,
                    color: C.text,
                    margin: [0, 7, 0, 4],
                  },
                  {
                    text: `COMMAND NODE // CAS-${data.reportId}`,
                    fontSize: 8,
                    color: C.muted,
                  },
                ],
                fillColor: C.panel,
                margin: [14, 14, 14, 14],
              },
            ],
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 14],
      },
      {
        table: { widths: [92, "*"], body: metaRows },
        layout: {
          hLineColor: () => C.line,
          vLineColor: () => C.line,
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
          fillColor: () => C.panel,
        },
        margin: [0, 0, 0, 16],
      },
      {
        text: "ANALYSIS CONSOLE",
        fontSize: 9,
        bold: true,
        color: C.cyan,
        characterSpacing: 1.2,
        margin: [0, 0, 0, 5],
      },
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 519,
            y2: 0,
            lineWidth: 1,
            lineColor: C.line,
          },
        ],
        margin: [0, 0, 0, 10],
      },
      ...markdownToPdf(data.analysis),
    ],
    defaultStyle: { font: "Roboto", fontSize: 10, color: C.text },
  };
  pdfMake.createPdf(docDef).download(fileName);
}

// 7. YENİ SOHBET
function startNewChat() {
  const flow = document.getElementById("chat-flow");
  if (!flow) return;
  flow.innerHTML = `
    <div class="msg ai-msg system-welcome">
      <div class="msg-head assistant">
        <span class="chat-avatar assistant gold">CSA</span>
        <span class="expert-tag">SYSTEM INITIALIZER</span>
      </div>
      <div class="msg-body"><strong>Cassandra Core çevrimiçi.</strong><br>Bir ajan seç, vakayı belirle ve analiz komutunu gönder.</div>
    </div>`;
  const input = document.getElementById("prompt-in");
  const fileInput = document.getElementById("file-input");
  const preview = document.getElementById("attachment-preview");
  if (input) {
    input.value = "";
    input.focus();
  }
  if (fileInput) fileInput.value = "";
  if (preview) preview.textContent = "";
}

// GİRİŞ EKRANI (MODAL) YÖNETİMİ
document.addEventListener("DOMContentLoaded", () => {
  const savedKey = localStorage.getItem("cassandra_groq_key");
  const modal = document.getElementById("apiKeyModal");

  if (!savedKey && modal) {
    modal.style.display = "flex";
  } else if (modal) {
    modal.style.display = "none";
  }
  // API Key kaydetme işlemi
  const saveBtn = document.getElementById("saveKeyBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const keyInput = document.getElementById("modalApiKeyInput").value.trim();

      if (!keyInput.startsWith("gsk_")) {
        alert(
          "Lütfen 'gsk_' ile başlayan geçerli bir Groq API Key girin usta! ❌",
        );
        return;
      }

      localStorage.setItem("cassandra_groq_key", keyInput);
      if (modal) modal.style.display = "none";
      window.location.reload();
    });
  }
});

// BAŞLATICILAR
window.onload = async () => {
  initSystem();
  await loadScenarios();
  renderHistory();
};

if (document.getElementById("analyze-btn")) {
  document.getElementById("analyze-btn").onclick = runAnalysis;
}
if (document.getElementById("new-chat-btn")) {
  document.getElementById("new-chat-btn").onclick = startNewChat;
}
if (document.getElementById("prompt-in")) {
  document.getElementById("prompt-in").onkeydown = (e) => {
    if (e.key === "Enter") runAnalysis();
  };
}
if (document.getElementById("attach-btn")) {
  document.getElementById("attach-btn").onclick = () => {
    document.getElementById("file-input").click();
  };
}
if (document.getElementById("file-input")) {
  document.getElementById("file-input").onchange = (e) => {
    const prev = document.getElementById("attachment-preview");
    if (prev)
      prev.textContent = e.target.files[0]
        ? `📁 ${e.target.files[0].name}`
        : "";
  };
}

// 7. PANO RESİM YAPIŞTIRMA DESTEĞİ
document.addEventListener("paste", (event) => {
  const items = (event.clipboardData || event.originalEvent.clipboardData)
    .items;

  for (let index in items) {
    const item = items[index];

    if (item.kind === "file" && item.type.includes("image")) {
      const blob = item.getAsFile();
      const fileInput = document.querySelector('input[type="file"]');

      if (fileInput) {
        const dataTransfer = new DataTransfer();
        const file = new File([blob], `Ekran_Goruntusu_${Date.now()}.png`, {
          type: item.type,
        });
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;

        const promptIn = document.getElementById("prompt-in");
        if (promptIn && promptIn.value === "") {
          promptIn.value =
            "[📸 Ekran görüntüsü eklendi, analiz için butona basın...]";
          setTimeout(() => {
            if (
              promptIn.value ===
              "[📸 Ekran görüntüsü eklendi, analiz için butona basın...]"
            ) {
              promptIn.value = "";
            }
          }, 2000);
        }
        console.log("📸 Resim panodan başarıyla eklendi!");
      }
    }
  }
});



