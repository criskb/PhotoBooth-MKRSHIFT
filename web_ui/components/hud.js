export function renderHud() {
  return `
    <div class="hud">
      <div class="brand brand-card">
        <span class="brand__title">AI PHOTOBOOTH</span>
        <span class="brand__subtitle">
          <span class="brand__subtitle-accent">MKR</span><span class="brand__subtitle-neutral">Shift</span>
        </span>
      </div>
      <div class="status">
        <span class="status__label">Ready</span>
        <span class="status__meta">Select a style, then tap or shake to shoot</span>
        <span class="status__connection">ComfyUI: Checking…</span>
      </div>
    </div>
    <section class="debate-spark" aria-live="polite">
      <div class="debate-spark__header">
        <span class="debate-spark__title">Debate Spark</span>
        <span class="debate-spark__streak">🔥 Streak 0</span>
      </div>
      <p class="debate-spark__prompt">Is AI creativity more honest than human creativity?</p>
      <div class="debate-spark__meter" aria-hidden="true">
        <div class="debate-spark__meter-fill"></div>
        <span class="debate-spark__meter-emoji" aria-hidden="true">😐</span>
      </div>
      <div class="debate-spark__meta">
        <span class="debate-spark__votes">0 votes</span>
        <span class="debate-spark__split">50% agree · 50% disagree</span>
        <span class="debate-spark__heat">Heat 0%</span>
      </div>
      <div class="debate-spark__actions">
        <button class="debate-spark__button debate-spark__button--yes" type="button">Agree</button>
        <button class="debate-spark__button debate-spark__button--no" type="button">Disagree</button>
        <button class="debate-spark__button debate-spark__button--next" type="button">Next take ↻</button>
      </div>
    </section>
  `;
}
