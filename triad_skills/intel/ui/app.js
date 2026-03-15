(function bootstrap() {
  const bundle = window.TRIAD_ARTIFACT_BUNDLE;

  if (!bundle || !Array.isArray(bundle.entries)) {
    return;
  }

  const state = {
    activeTab: "analysis",
    selectedId: bundle.entries[0]?.id ?? null,
  };

  const nodes = {
    runMeta: document.querySelector("#run-meta"),
    fileCount: document.querySelector("#file-count"),
    listHeading: document.querySelector("#list-heading"),
    decisionsSummary: document.querySelector("#decisions-summary"),
    artifactList: document.querySelector("#artifact-list"),
    previewTitle: document.querySelector("#preview-title"),
    previewMeta: document.querySelector("#preview-meta"),
    previewBody: document.querySelector("#preview-body"),
    downloadRunPack: document.querySelector("#download-run-pack"),
    downloadSelected: document.querySelector("#download-selected"),
    tabBar: document.querySelector("#tab-bar"),
  };

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function formatSize(sizeBytes) {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  function downloadTextFile(filename, content, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function activeItems() {
    if (state.activeTab === "analysis") return bundle.entries;
    if (state.activeTab === "trade-plans") return bundle.tradePlans ?? [];
    if (state.activeTab === "risk-reviews") return bundle.riskReviews ?? [];
    return [];
  }

  function selectedEntry() {
    return activeItems().find((entry) => entry.id === state.selectedId) ?? null;
  }

  function renderMarkdown(content) {
    const lines = content.split(/\r?\n/);
    const chunks = [];
    let inList = false;

    const closeList = () => {
      if (inList) {
        chunks.push("</ul>");
        inList = false;
      }
    };

    for (const line of lines) {
      if (line.startsWith("# ")) {
        closeList();
        chunks.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
        continue;
      }

      if (line.startsWith("## ")) {
        closeList();
        chunks.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
        continue;
      }

      if (line.startsWith("- ")) {
        if (!inList) {
          chunks.push("<ul>");
          inList = true;
        }
        chunks.push(`<li>${escapeHtml(line.slice(2))}</li>`);
        continue;
      }

      if (line.trim() === "") {
        closeList();
        chunks.push('<div class="separator"></div>');
        continue;
      }

      closeList();
      chunks.push(`<p>${escapeHtml(line)}</p>`);
    }

    closeList();
    return `<article class="markdown-render">${chunks.join("")}</article>`;
  }

  function renderJson(content) {
    return `<pre class="json-render">${escapeHtml(content)}</pre>`;
  }

  function decisionTagClass(decision) {
    if (decision === "approved") return "file-tag file-tag--approved";
    if (decision === "rejected") return "file-tag file-tag--rejected";
    return "file-tag file-tag--watch";
  }

  function statusTagClass(status) {
    if (status === "approved") return "file-tag file-tag--approved";
    if (status === "rejected") return "file-tag file-tag--rejected";
    if (status === "draft") return "file-tag";
    return "file-tag file-tag--watch";
  }

  function renderMeta(summary) {
    const parts = [];

    if (summary.analysisDate) {
      parts.push(summary.analysisDate);
    }

    if (summary.runId) {
      parts.push(summary.runId);
    }

    if (summary.updatedAt) {
      parts.push(`updated ${new Date(summary.updatedAt).toLocaleString()}`);
    }

    nodes.runMeta.textContent = parts.join(" / ");
  }

  function renderDecisionsSummary() {
    const d = bundle.summary?.decisions;
    if (!d) {
      nodes.decisionsSummary.innerHTML = "";
      return;
    }

    nodes.decisionsSummary.innerHTML = `
      <span class="file-tag file-tag--approved">Approved ${d.approved}</span>
      <span class="file-tag file-tag--watch">Watch ${d.watch}</span>
      <span class="file-tag file-tag--rejected">Rejected ${d.rejected}</span>
    `;
  }

  function renderList() {
    const items = activeItems();
    nodes.fileCount.textContent = `${items.length} files`;

    const headings = {
      "analysis": "Analysis Notes",
      "trade-plans": "Trade Plans",
      "risk-reviews": "Risk Reviews",
    };
    nodes.listHeading.textContent = headings[state.activeTab] ?? "Files";

    nodes.artifactList.innerHTML = items
      .map((entry) => {
        let tagHtml = "";
        if (entry.category === "trade-plan") {
          tagHtml = `<span class="${statusTagClass(entry.status)}">${entry.status}</span>
            <span class="meta-pill">${entry.direction ?? ""}</span>`;
        } else if (entry.category === "risk-review") {
          tagHtml = `<span class="${decisionTagClass(entry.decision)}">${entry.decision}</span>`;
        } else {
          tagHtml = `<span class="file-tag">${entry.route ?? "analysis"}</span>
            <span class="meta-pill">${entry.sizeBytes ? formatSize(entry.sizeBytes) : ""}</span>`;
        }

        return `
          <button class="artifact-card ${entry.id === state.selectedId ? "is-selected" : ""}" data-id="${entry.id}">
            <h3 class="artifact-card__title">${escapeHtml(entry.title)}</h3>
            <div class="artifact-card__path">${escapeHtml(entry.fileName)}</div>
            <div class="artifact-card__meta">${tagHtml}</div>
          </button>
        `;
      })
      .join("");

    nodes.artifactList.querySelectorAll("[data-id]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedId = button.dataset.id;
        renderList();
        renderPreview();
      });
    });
  }

  function renderPreview() {
    const entry = selectedEntry();

    if (!entry) {
      nodes.previewTitle.textContent = "No file selected";
      nodes.previewMeta.innerHTML = "";
      nodes.previewBody.innerHTML = '<div class="empty-state">Select a file from the list.</div>';
      return;
    }

    nodes.previewTitle.textContent = entry.title;

    let metaHtml = "";
    if (entry.category === "trade-plan") {
      metaHtml = `
        <span class="${statusTagClass(entry.status)}">${entry.status}</span>
        <span class="meta-pill">${entry.instrument ?? ""}</span>
        <span class="meta-pill">${entry.direction ?? ""}</span>
        <span class="meta-pill">${entry.confidence ?? ""}</span>
      `;
    } else if (entry.category === "risk-review") {
      metaHtml = `
        <span class="${decisionTagClass(entry.decision)}">${entry.decision}</span>
        <span class="meta-pill">${entry.instrument ?? ""}</span>
      `;
      if (entry.vetoReasons?.length) {
        metaHtml += entry.vetoReasons
          .map((r) => `<span class="meta-pill meta-pill--warn">${escapeHtml(r)}</span>`)
          .join("");
      }
    } else {
      metaHtml = `
        <span class="file-tag">${entry.route ?? "analysis"}</span>
        <span class="meta-pill">${entry.fileName}</span>
        <span class="meta-pill">${entry.sizeBytes ? formatSize(entry.sizeBytes) : ""}</span>
      `;
    }
    nodes.previewMeta.innerHTML = metaHtml;

    if (entry.type === "json") {
      nodes.previewBody.innerHTML = renderJson(entry.content);
    } else {
      nodes.previewBody.innerHTML = renderMarkdown(entry.content);
    }
  }

  // Tab switching
  nodes.tabBar.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      nodes.tabBar.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      state.activeTab = tab.dataset.tab;
      const items = activeItems();
      state.selectedId = items[0]?.id ?? null;
      renderList();
      renderPreview();
    });
  });

  nodes.downloadSelected.addEventListener("click", () => {
    const entry = selectedEntry();
    if (!entry) {
      return;
    }

    const contentType = entry.type === "json"
      ? "application/json;charset=utf-8"
      : "text/markdown;charset=utf-8";
    downloadTextFile(entry.fileName, entry.content, contentType);
  });

  nodes.downloadRunPack.addEventListener("click", () => {
    const filename = `${bundle.summary?.runId ?? "triad"}-full-pack.json`;
    downloadTextFile(filename, JSON.stringify(bundle, null, 2), "application/json;charset=utf-8");
  });

  renderMeta(bundle.summary ?? {});
  renderDecisionsSummary();
  renderList();
  renderPreview();
})();
