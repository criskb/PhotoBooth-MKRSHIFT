export function renderDiagnosticsModal() {
  return `
    <div class="diagnostics-modal" role="dialog" aria-modal="true" aria-labelledby="diagnostics-title">
      <div class="diagnostics-card">
        <div class="diagnostics-header">
          <h2 id="diagnostics-title">Diagnostics</h2>
          <button class="diagnostics-close btn btn--secondary" aria-label="Close diagnostics">Close</button>
        </div>
        <div class="diagnostics-grid">
          <div class="diagnostics-item">
            <span class="diagnostics-label">ComfyUI Server</span>
            <span class="diagnostics-value diagnostics-value--server">Unknown</span>
          </div>
          <div class="diagnostics-item">
            <span class="diagnostics-label">WebSocket</span>
            <span class="diagnostics-value diagnostics-value--socket">Unknown</span>
          </div>
          <div class="diagnostics-item">
            <span class="diagnostics-label">API Key</span>
            <span class="diagnostics-value diagnostics-value--api">Unknown</span>
          </div>
          <div class="diagnostics-item">
            <span class="diagnostics-label">Server Uptime</span>
            <span class="diagnostics-value diagnostics-value--uptime">Unknown</span>
          </div>
        </div>
        <div class="diagnostics-actions">
          <button class="diagnostics-refresh">Refresh</button>
        </div>
      </div>
    </div>
  `;
}
