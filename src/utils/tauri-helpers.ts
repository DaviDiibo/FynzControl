export const isTauri = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
  );
};

export const OAUTH_SUCCESS_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ControlFynz - Autenticación Exitosa</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #121212;
      background-image: radial-gradient(circle at 50% 30%, rgba(0, 255, 163, 0.08) 0%, rgba(18, 18, 18, 1) 75%);
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background-color: #1E1E1E;
      border: 1px solid #2C2C2E;
      border-top: 1px solid rgba(0, 255, 163, 0.5);
      border-radius: 20px;
      padding: 40px 32px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 255, 163, 0.12);
      animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(0, 255, 163, 0.08);
      border: 1px solid rgba(0, 255, 163, 0.25);
      border-radius: 999px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.5px;
      color: #00FFA3;
      margin-bottom: 24px;
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #00FFA3;
      box-shadow: 0 0 8px #00FFA3;
    }
    .icon-wrapper {
      width: 84px;
      height: 84px;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: rgba(0, 255, 163, 0.1);
      border: 2px solid #00FFA3;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 25px rgba(0, 255, 163, 0.35);
      animation: pulse 2.5s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(0, 255, 163, 0.45); }
      70% { box-shadow: 0 0 0 16px rgba(0, 255, 163, 0); }
      100% { box-shadow: 0 0 0 0 rgba(0, 255, 163, 0); }
    }
    .brand-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #8E8E93;
      margin-bottom: 6px;
    }
    .brand-title span {
      color: #00FFA3;
      text-shadow: 0 0 10px rgba(0, 255, 163, 0.5);
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      color: #00FFA3;
      text-shadow: 0 0 16px rgba(0, 255, 163, 0.35);
      margin-bottom: 12px;
    }
    .description {
      color: #8E8E93;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .description strong {
      color: #FFFFFF;
    }
    .btn-close {
      background-color: #00FFA3;
      color: #121212;
      font-size: 14px;
      font-weight: 700;
      padding: 13px 28px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      box-shadow: 0 0 18px rgba(0, 255, 163, 0.3);
      transition: all 0.2s ease;
      width: 100%;
    }
    .btn-close:hover {
      background-color: #05ffab;
      box-shadow: 0 0 28px rgba(0, 255, 163, 0.55);
      transform: translateY(-1px);
    }
    .status-text {
      margin-top: 16px;
      font-size: 12px;
      color: #8E8E93;
    }
    .status-text kbd {
      background: #2C2C2E;
      color: #FFFFFF;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-family: inherit;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span class="badge-dot"></span>
      <span>CONTROLFYNZ OS // SESIÓN CONFIRMADA</span>
    </div>
    <div class="icon-wrapper">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00FFA3" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    </div>
    <div class="brand-title">Control<span>Fynz</span></div>
    <h1 class="title">¡Sesión Iniciada con Éxito!</h1>
    <p class="description">
      Tu autenticación ha sido confirmada.<br>
      Ya puedes cerrar esta pestaña y volver a <strong>ControlFynz</strong> en tu escritorio.
    </p>
    <button id="close-btn" class="btn-close" onclick="closeTab()">Cerrar esta pestaña</button>
    <p id="countdown-text" class="status-text">
      Cerrando pestaña automáticamente en <span id="countdown" style="color: #00FFA3; font-weight: 700;">3</span>s...
    </p>
    <p id="fallback-text" class="status-text" style="display: none;">
      Si el navegador bloquea el cierre automático, ciérrala con <kbd>Ctrl + W</kbd> o la cruz de la pestaña.
    </p>
  </div>
  <script>
    function closeTab() {
      window.open('', '_self', '');
      window.close();
      setTimeout(function() {
        var fb = document.getElementById('fallback-text');
        if (fb) fb.style.display = 'block';
      }, 300);
    }
    var remaining = 3;
    var timer = setInterval(function() {
      remaining--;
      var el = document.getElementById('countdown');
      if (el) el.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(timer);
        closeTab();
      }
    }, 1000);
  </script>
</body>
</html>`;
