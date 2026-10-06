// ============================================================
// ROTARACT CLUB OF COIMBATORE UNITY
// Unity AI Assistant | File: js/chatbot.js | Version: 6.0.0
// General-knowledge AI + Rotary/Rotaract expert
// Streaming | Web grounding | Calculator | Weather | Voice
// Self-contained: builds its own UI, icons and styles
// ============================================================
(function () {
    'use strict';

    if (window._unityChatbotLoaded) return;
    window._unityChatbotLoaded = true;

    /* ----------------------------------------------------------
       0. INLINE SVG ICONS (no icon font needed, always renders)
       ---------------------------------------------------------- */
    const ICONS = {
        sparkles: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
        bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
        send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
        stop: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
        mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v4"/>',
        close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
        refresh: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
        trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
        check: '<path d="M20 6 9 17l-5-5"/>',
        alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
        globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
        userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
        shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
        target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
        star: '<path d="M11.53 2.3a.53.53 0 0 1 .95 0l2.31 4.68a2.12 2.12 0 0 0 1.6 1.16l5.16.76a.53.53 0 0 1 .3.9l-3.74 3.64a2.12 2.12 0 0 0-.61 1.88l.88 5.14a.53.53 0 0 1-.77.56l-4.62-2.43a2.12 2.12 0 0 0-1.97 0L6.4 21.01a.53.53 0 0 1-.77-.56l.88-5.14a2.12 2.12 0 0 0-.61-1.88L2.16 9.8a.53.53 0 0 1 .3-.91l5.16-.75a2.12 2.12 0 0 0 1.6-1.16z"/>',
        droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
        scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
        coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
        history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
        download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
        calc: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M8 6h8"/><path d="M16 14v4"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
        weather: '<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.95 12.65a4 4 0 0 0-5.93-4.13"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
        book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
        search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
        heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
        external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
        bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
        clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'
    };
    const icon = (name, cls) =>
        '<svg class="ub-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || ICONS.info) + '</svg>';

    /* ----------------------------------------------------------
       1. STYLES (kept in sync with css/styles.css section 19)
       ---------------------------------------------------------- */
    const UB_CSS = `/* ================================================================
   UNITY AI ASSISTANT : premium glass chat (ub-*)
   ================================================================ */
:root { --ub-ready: 1; }

.ub-launcher {
    position: fixed; right: 22px; bottom: 22px; z-index: var(--z-chatbot, 2000);
    width: 62px; height: 62px; border-radius: 22px; display: grid; place-items: center;
    color: #fff; cursor: pointer; border: 1px solid rgba(255,255,255,.55);
    background:
        radial-gradient(120% 120% at 20% 0%, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 46%),
        linear-gradient(140deg, #1a73e8 0%, #5b4bf0 55%, #7c3aed 100%);
    box-shadow: 0 1px 0 rgba(255,255,255,.7) inset, 0 -10px 18px rgba(30,20,110,.25) inset,
        0 18px 40px -8px rgba(60,60,230,.55), 0 4px 12px rgba(20,30,90,.25);
    transition: transform .35s cubic-bezier(.34,1.56,.64,1), box-shadow .3s, opacity .25s;
    -webkit-tap-highlight-color: transparent;
}
.ub-launcher:hover { transform: translateY(-3px) scale(1.06); }
.ub-launcher:active { transform: scale(.96); }
.ub-launcher .ub-ic { width: 28px; height: 28px; filter: drop-shadow(0 2px 4px rgba(10,20,80,.35)); transition: transform .4s cubic-bezier(.34,1.56,.64,1); }
.ub-launcher:hover .ub-ic { transform: rotate(12deg) scale(1.08); }
.ub-launcher-ring { position: absolute; inset: -6px; border-radius: 26px; border: 2px solid rgba(124,92,255,.55); animation: ubRing 2.6s ease-out infinite; pointer-events: none; }
@keyframes ubRing { 0% { transform: scale(.92); opacity: .8; } 100% { transform: scale(1.28); opacity: 0; } }
.ub-launcher[aria-expanded="true"] { opacity: 0; pointer-events: none; transform: scale(.7); }

.ub-panel {
    position: fixed; right: 22px; bottom: 22px; z-index: calc(var(--z-chatbot, 2000) + 1);
    width: min(430px, calc(100vw - 28px)); height: min(700px, calc(100dvh - 44px));
    display: flex; flex-direction: column; overflow: hidden; isolation: isolate;
    border-radius: 30px; color: var(--text-primary, #0f172a);
    background:
        linear-gradient(180deg, rgba(255,255,255,.70) 0%, rgba(255,255,255,0) 22%),
        linear-gradient(150deg, rgba(255,255,255,.80) 0%, rgba(240,246,255,.62) 55%, rgba(236,232,255,.58) 100%);
    -webkit-backdrop-filter: blur(34px) saturate(190%); backdrop-filter: blur(34px) saturate(190%);
    border: 1px solid rgba(255,255,255,.78);
    box-shadow: 0 1px 0 rgba(255,255,255,.95) inset, 0 0 0 1px rgba(20,60,160,.05),
        0 30px 80px -10px rgba(20,40,120,.38), 0 12px 30px rgba(20,40,120,.14);
    transform-origin: bottom right; transform: translateY(18px) scale(.94); opacity: 0; visibility: hidden;
    transition: transform .42s cubic-bezier(.22,1,.36,1), opacity .28s ease, visibility 0s linear .42s;
}
.ub-panel[data-open="true"] { transform: none; opacity: 1; visibility: visible; transition-delay: 0s; }
.ub-panel::before { content: ''; position: absolute; z-index: -1; inset: 0; pointer-events: none;
    background: radial-gradient(60% 40% at 90% 0%, rgba(124,58,237,.18), transparent 70%), radial-gradient(60% 40% at 0% 100%, rgba(26,115,232,.16), transparent 70%); }
.dark .ub-panel {
    color: #e8eefc;
    background:
        linear-gradient(180deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,0) 20%),
        linear-gradient(150deg, rgba(16,24,48,.80) 0%, rgba(10,16,34,.76) 60%, rgba(20,14,44,.78) 100%);
    border-color: rgba(255,255,255,.12);
    box-shadow: 0 1px 0 rgba(255,255,255,.14) inset, 0 30px 90px -10px rgba(0,0,0,.75), 0 12px 30px rgba(0,0,0,.4);
}

.ub-head { display: flex; align-items: center; gap: 12px; padding: 16px 16px 14px; border-bottom: 1px solid rgba(20,40,100,.08); background: linear-gradient(180deg, rgba(255,255,255,.35), rgba(255,255,255,0)); }
.dark .ub-head { border-bottom-color: rgba(255,255,255,.07); background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,0)); }
.ub-avatar { flex: 0 0 auto; width: 44px; height: 44px; border-radius: 15px; display: grid; place-items: center; color: #fff;
    background: radial-gradient(120% 120% at 20% 0%, rgba(255,255,255,.5), transparent 50%), linear-gradient(140deg, #1a73e8, #7c3aed);
    box-shadow: 0 1px 0 rgba(255,255,255,.6) inset, 0 10px 22px -6px rgba(80,70,230,.6); }
.ub-avatar .ub-ic { width: 22px; height: 22px; }
.ub-title { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.ub-title strong { font-size: 14px; font-weight: 800; letter-spacing: -.01em; line-height: 1.2; }
.ub-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--text-secondary, #475569); }
.ub-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.2); }
.ub-dot.limited { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,.22); }
.ub-head-actions { display: flex; gap: 6px; }
.ub-icon-btn { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; cursor: pointer; color: var(--text-secondary, #475569);
    background: rgba(255,255,255,.5); border: 1px solid rgba(255,255,255,.7); box-shadow: 0 1px 0 rgba(255,255,255,.8) inset, 0 2px 6px rgba(20,40,100,.06); transition: all .2s; }
.dark .ub-icon-btn { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.1); color: #b6c4e0; box-shadow: none; }
.ub-icon-btn:hover { color: #1a73e8; transform: translateY(-1px); background: rgba(255,255,255,.85); }
.dark .ub-icon-btn:hover { background: rgba(255,255,255,.12); color: #8ab8ff; }
.ub-icon-btn .ub-ic { width: 16px; height: 16px; }

.ub-ic { width: 1em; height: 1em; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }

.ub-logs { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 16px 16px 8px; display: flex; flex-direction: column; gap: 14px; scroll-behavior: smooth; }
.ub-welcome { padding: 18px; border-radius: 22px; background: linear-gradient(145deg, rgba(255,255,255,.7), rgba(255,255,255,.35));
    border: 1px solid rgba(255,255,255,.8); box-shadow: 0 1px 0 rgba(255,255,255,.9) inset, 0 10px 30px -12px rgba(30,60,160,.2); }
.dark .ub-welcome { background: linear-gradient(145deg, rgba(255,255,255,.07), rgba(255,255,255,.02)); border-color: rgba(255,255,255,.1); box-shadow: none; }
.ub-welcome h4 { font-size: 16px; font-weight: 800; letter-spacing: -.01em; margin: 0 0 6px; }
.ub-welcome p { font-size: 12.5px; line-height: 1.6; color: var(--text-secondary, #475569); margin: 0; }
.ub-caps { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }
.ub-cap { display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 13px; font-size: 11px; font-weight: 600; color: var(--text-primary, #0f172a);
    background: rgba(255,255,255,.55); border: 1px solid rgba(255,255,255,.75); }
.dark .ub-cap { background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.08); color: #dbe6fb; }
.ub-cap .ub-ic { width: 15px; height: 15px; color: #1a73e8; }
.dark .ub-cap .ub-ic { color: #8ab8ff; }
.ub-divider { text-align: center; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--text-tertiary, #94a3b8); display: flex; align-items: center; justify-content: center; gap: 6px; }
.ub-divider .ub-ic { width: 12px; height: 12px; }

.ub-msg { display: flex; gap: 10px; max-width: 94%; animation: ubIn .32s cubic-bezier(.22,1,.36,1); }
.ub-msg.user { margin-left: auto; flex-direction: column; align-items: flex-end; max-width: 86%; gap: 4px; }
@keyframes ubIn { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
.ub-mini { flex: 0 0 auto; width: 28px; height: 28px; border-radius: 10px; display: grid; place-items: center; color: #fff; margin-top: 2px;
    background: linear-gradient(140deg, #1a73e8, #7c3aed); box-shadow: 0 6px 14px -4px rgba(80,70,230,.55); }
.ub-mini .ub-ic { width: 14px; height: 14px; }
.ub-mini.err { background: linear-gradient(140deg, #f97316, #ef4444); }
.ub-col { min-width: 0; flex: 1; }
.ub-bubble { font-size: 13px; line-height: 1.65; padding: 12px 15px; border-radius: 6px 20px 20px 20px; word-wrap: break-word; overflow-wrap: anywhere;
    background: linear-gradient(160deg, rgba(255,255,255,.88), rgba(255,255,255,.62)); border: 1px solid rgba(255,255,255,.85);
    box-shadow: 0 1px 0 rgba(255,255,255,.9) inset, 0 8px 22px -10px rgba(30,60,140,.22); color: var(--text-primary, #0f172a); }
.dark .ub-bubble { background: linear-gradient(160deg, rgba(255,255,255,.09), rgba(255,255,255,.04)); border-color: rgba(255,255,255,.1); box-shadow: 0 8px 22px -10px rgba(0,0,0,.5); color: #e6edfb; }
.ub-msg.user .ub-bubble { color: #fff; border-radius: 20px 20px 6px 20px; border: 1px solid rgba(255,255,255,.35);
    background: radial-gradient(120% 140% at 10% 0%, rgba(255,255,255,.28), transparent 50%), linear-gradient(140deg, #1a73e8, #6d3df0);
    box-shadow: 0 1px 0 rgba(255,255,255,.4) inset, 0 12px 26px -10px rgba(80,70,230,.65); }
.ub-bubble > :first-child { margin-top: 0; } .ub-bubble > :last-child { margin-bottom: 0; }
.ub-bubble p { margin: 0 0 9px; } .ub-bubble ul, .ub-bubble ol { margin: 6px 0 10px; padding-left: 20px; } .ub-bubble li { margin: 3px 0; }
.ub-bubble li::marker { color: #6d5cf0; font-weight: 700; }
.ub-bubble strong { font-weight: 700; } .ub-bubble em { font-style: italic; }
.ub-bubble h1, .ub-bubble h2, .ub-bubble h3, .ub-bubble h4 { margin: 12px 0 6px; font-weight: 800; letter-spacing: -.01em; line-height: 1.3; }
.ub-bubble h1 { font-size: 16px; } .ub-bubble h2 { font-size: 14.5px; } .ub-bubble h3, .ub-bubble h4 { font-size: 13px; color: #3b6fe0; }
.dark .ub-bubble h3, .dark .ub-bubble h4 { color: #8ab8ff; }
.ub-bubble a { color: #1a5fd0; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; } .dark .ub-bubble a { color: #8ab8ff; }
.ub-bubble code { font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; font-size: 11.5px; padding: 2px 6px; border-radius: 6px; background: rgba(26,115,232,.10); color: #1b4fb8; }
.dark .ub-bubble code { background: rgba(138,184,255,.14); color: #a9ccff; }
.ub-bubble pre { margin: 8px 0; padding: 12px; border-radius: 14px; overflow-x: auto; background: rgba(10,18,40,.88); color: #e5edff; font-size: 11.5px; line-height: 1.55; }
.ub-bubble pre code { background: transparent; color: inherit; padding: 0; }
.ub-bubble blockquote { margin: 8px 0; padding: 6px 12px; border-left: 3px solid #7c5cff; border-radius: 0 10px 10px 0; background: rgba(124,92,255,.08); color: var(--text-secondary, #475569); }
.ub-bubble hr { border: 0; border-top: 1px solid rgba(20,40,100,.12); margin: 10px 0; }
.ub-tablewrap { overflow-x: auto; margin: 8px 0; border-radius: 12px; border: 1px solid rgba(20,40,100,.1); }
.ub-bubble table { border-collapse: collapse; width: 100%; font-size: 12px; }
.ub-bubble th, .ub-bubble td { padding: 7px 10px; text-align: left; border-bottom: 1px solid rgba(20,40,100,.08); }
.ub-bubble th { font-weight: 700; background: rgba(26,115,232,.08); }
.ub-cursor::after { content: ''; display: inline-block; width: 7px; height: 14px; margin-left: 2px; vertical-align: -2px; border-radius: 2px; background: linear-gradient(#1a73e8, #7c3aed); animation: ubBlink 1s steps(2) infinite; }
@keyframes ubBlink { 50% { opacity: 0; } }

.ub-meta { display: flex; align-items: center; gap: 10px; margin-top: 5px; padding: 0 4px; font-size: 10px; color: var(--text-tertiary, #94a3b8); }
.ub-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 99px; font-weight: 700; background: rgba(245,158,11,.14); color: #b45309; }
.ub-actions { display: flex; gap: 4px; margin-left: auto; opacity: 0; transition: opacity .2s; }
.ub-msg:hover .ub-actions, .ub-msg:focus-within .ub-actions { opacity: 1; }
@media (hover: none) { .ub-actions { opacity: 1; } }
.ub-act { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 8px; font-size: 10px; font-weight: 700; cursor: pointer; color: var(--text-secondary, #475569); background: transparent; border: 1px solid rgba(20,40,100,.12); transition: all .15s; }
.dark .ub-act { border-color: rgba(255,255,255,.12); color: #b6c4e0; }
.ub-act:hover { color: #1a73e8; border-color: #1a73e8; background: rgba(26,115,232,.06); }
.ub-act .ub-ic { width: 12px; height: 12px; }
.ub-sources { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.ub-source { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 99px; font-size: 10px; font-weight: 700; text-decoration: none; color: #1a5fd0; background: rgba(26,115,232,.08); border: 1px solid rgba(26,115,232,.18); }
.dark .ub-source { color: #8ab8ff; background: rgba(138,184,255,.1); border-color: rgba(138,184,255,.2); }
.ub-source .ub-ic { width: 11px; height: 11px; }
.ub-err { padding: 11px 13px; border-radius: 6px 18px 18px 18px; font-size: 12px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; color: #b42318; background: rgba(239,68,68,.09); border: 1px solid rgba(239,68,68,.22); }
.dark .ub-err { color: #fda4a4; }

.ub-typing { display: inline-flex; gap: 5px; padding: 14px 16px; border-radius: 6px 18px 18px 18px; background: linear-gradient(160deg, rgba(255,255,255,.88), rgba(255,255,255,.62)); border: 1px solid rgba(255,255,255,.85); }
.dark .ub-typing { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.1); }
.ub-typing span { width: 7px; height: 7px; border-radius: 50%; background: linear-gradient(140deg, #1a73e8, #7c3aed); animation: ubDots 1.3s ease-in-out infinite; }
.ub-typing span:nth-child(2) { animation-delay: .18s; } .ub-typing span:nth-child(3) { animation-delay: .36s; }
@keyframes ubDots { 0%, 60%, 100% { transform: translateY(0); opacity: .45; } 30% { transform: translateY(-6px); opacity: 1; } }
.ub-thinking { font-size: 11px; color: var(--text-secondary, #475569); margin: 0 0 6px 38px; display: flex; align-items: center; gap: 6px; font-weight: 600; }

.ub-chips { display: flex; gap: 8px; padding: 6px 16px 10px; overflow-x: auto; scrollbar-width: none; flex: 0 0 auto; -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 20px), transparent 100%); mask-image: linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 20px), transparent 100%); }
.ub-chips::-webkit-scrollbar { display: none; } .ub-chips:empty { display: none; }
.ub-chip { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 99px; font-size: 11px; font-weight: 700; white-space: nowrap; cursor: pointer; color: var(--text-secondary, #475569);
    background: linear-gradient(160deg, rgba(255,255,255,.85), rgba(255,255,255,.55)); border: 1px solid rgba(255,255,255,.9); box-shadow: 0 1px 0 rgba(255,255,255,.9) inset, 0 4px 12px -6px rgba(30,60,140,.25); transition: all .2s; }
.dark .ub-chip { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.1); color: #c7d4ee; box-shadow: none; }
.ub-chip:hover { color: #1a73e8; transform: translateY(-2px); box-shadow: 0 10px 20px -8px rgba(26,115,232,.4); }
.ub-chip .ub-ic { width: 13px; height: 13px; color: #6d5cf0; }

.ub-composer { display: flex; align-items: flex-end; gap: 8px; margin: 0 14px 6px; padding: 8px; border-radius: 22px; flex: 0 0 auto;
    background: linear-gradient(160deg, rgba(255,255,255,.9), rgba(255,255,255,.6)); border: 1px solid rgba(255,255,255,.95);
    box-shadow: 0 1px 0 rgba(255,255,255,.95) inset, 0 10px 28px -12px rgba(30,60,160,.3); transition: box-shadow .2s, border-color .2s; }
.dark .ub-composer { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.12); box-shadow: none; }
.ub-composer:focus-within { border-color: rgba(26,115,232,.5); box-shadow: 0 0 0 4px rgba(26,115,232,.14), 0 10px 28px -12px rgba(30,60,160,.3); }
.ub-composer textarea { flex: 1; min-width: 0; resize: none; border: 0; background: transparent; font: inherit; font-size: 13px; line-height: 1.5; max-height: 120px; padding: 9px 8px 9px 10px; color: var(--text-primary, #0f172a) !important; box-shadow: none !important; border-radius: 0; }
.dark .ub-composer textarea { color: #f1f5f9 !important; }
.ub-composer textarea::placeholder { color: var(--text-tertiary, #94a3b8) !important; }
.ub-composer textarea:focus { border: 0 !important; box-shadow: none !important; }
.ub-btn { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 14px; display: grid; place-items: center; cursor: pointer; transition: all .2s; }
.ub-btn .ub-ic { width: 18px; height: 18px; }
.ub-btn.voice { color: var(--text-secondary, #475569); background: rgba(20,40,100,.06); }
.dark .ub-btn.voice { background: rgba(255,255,255,.08); color: #c7d4ee; }
.ub-btn.voice:hover { color: #1a73e8; }
.ub-btn.voice.listening { color: #fff; background: #ef4444; animation: ubMic 1.4s ease-in-out infinite; }
@keyframes ubMic { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,.55); } 50% { box-shadow: 0 0 0 9px rgba(239,68,68,0); } }
.ub-btn.send { color: #fff; border: 1px solid rgba(255,255,255,.4); background: radial-gradient(120% 120% at 20% 0%, rgba(255,255,255,.4), transparent 50%), linear-gradient(140deg, #1a73e8, #7c3aed); box-shadow: 0 1px 0 rgba(255,255,255,.5) inset, 0 10px 20px -6px rgba(80,70,230,.6); }
.ub-btn.send:hover:not(:disabled) { transform: translateY(-2px); }
.ub-btn.send:disabled { opacity: .4; cursor: not-allowed; box-shadow: none; }
.ub-btn.send.stop { background: linear-gradient(140deg, #ef4444, #f97316); }
.ub-foot { padding: 2px 16px 12px; text-align: center; font-size: 10px; color: var(--text-tertiary, #94a3b8); }

@media (max-width: 640px) {
    .ub-launcher { right: 14px; bottom: 14px; width: 58px; height: 58px; border-radius: 20px; }
    .ub-panel { right: 0; bottom: 0; left: 0; width: 100%; height: min(100dvh, 100vh); max-height: 100dvh; border-radius: 0; border-width: 0; }
    .ub-composer textarea { font-size: 16px; }
    .ub-caps { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) { .ub-panel, .ub-msg, .ub-launcher, .ub-launcher-ring, .ub-typing span { animation: none !important; transition-duration: .01ms !important; } }
@media print { .ub-launcher, .ub-panel { display: none !important; } }
`;

    /* ----------------------------------------------------------
       2. CLUB KNOWLEDGE BASE (prompt + offline answers)
       ---------------------------------------------------------- */
    const KB = [
        { id: 'club', title: 'Our club', keys: ['about the club', 'about our club', 'your club', 'our club', 'coimbatore unity', 'charter', 'motto', 'club id', 'service above self'],
          text: '**Rotaract Club of Coimbatore Unity** is a youth-led service club in the Family of **Rotary Club of Coimbatore East**.\n- Club ID: 91594\n- Charter date: 21.04.2014\n- District: Rotary International District 3206 (Coimbatore | Palakkad)\n- Motto: **Service Above Self**\n- Contact: **rc.cbeunity@gmail.com**' },
        { id: 'rotaract', title: 'Rotaract', keys: ['rotaract', 'what is rotaract', 'avenues', 'avenue of service', 'youth'],
          text: '**Rotaract** is a youth-led service organisation for adults aged 18 and above, sponsored by Rotary clubs worldwide. It builds fellowship, leadership, professional growth, community service and international understanding.\n\nThe four **Avenues of Service** are Club Service, Community Service, Professional Service and International Service.' },
        { id: 'rotary', title: 'Rotary International', keys: ['rotary', 'rotary international', 'paul harris', 'evanston', 'founded', 'rotarian'],
          text: '**Rotary International** is a global network of about 1.4 million neighbours, friends and leaders in 46,000+ clubs across 200+ countries and regions. It was founded in 1905 in Chicago by **Paul P. Harris** and is headquartered in Evanston, Illinois, USA.' },
        { id: 'district', title: 'District 3206', keys: ['district', '3206', 'drc', 'district conference', 'palakkad'],
          text: '**Rotary International District 3206** covers the Coimbatore and Palakkad regions. It oversees clubs including Rotaract Club of Coimbatore Unity, runs training programmes and signature events, and hosts the annual **District Rotaract Conference (DRC)**.' },
        { id: 'rsamdio', title: 'RSAMDIO', keys: ['rsamdio', 'south asia', 'multi district'],
          text: '**RSAMDIO** (Rotaract South Asia Multi District Information Organisation) connects Rotaract districts across South Asia, supports cross-border collaboration and shares best practices.' },
        { id: 'focus', title: 'Seven areas of focus', keys: ['focus', 'areas of focus', 'seven', '7 areas', 'wash', 'peace', 'environment'],
          text: 'The seven **areas of focus** of The Rotary Foundation:\n1. Peace and conflict prevention/resolution\n2. Disease prevention and treatment\n3. Water, sanitation and hygiene (WASH)\n4. Maternal and child health\n5. Basic education and literacy\n6. Economic and community development\n7. Supporting the environment' },
        { id: 'polio', title: 'End Polio Now', keys: ['polio', 'end polio', 'polioplus', 'vaccine'],
          text: '**End Polio Now** is Rotary\'s flagship global programme, active since 1985. With partners such as WHO, UNICEF, the US CDC and the Gates Foundation, it has helped reduce polio cases by more than 99 percent. Wild polio remains endemic only in Afghanistan and Pakistan. The Gates Foundation matches Rotary\'s polio contributions 2-to-1.' },
        { id: 'fourway', title: 'Four-Way Test', keys: ['four way', 'four-way', '4 way', 'herbert taylor', 'test'],
          text: 'The **Four-Way Test** (Herbert J. Taylor, 1932). Of the things we think, say or do:\n1. Is it the **truth**?\n2. Is it **fair** to all concerned?\n3. Will it build **goodwill** and better friendships?\n4. Will it be **beneficial** to all concerned?' },
        { id: 'trf', title: 'The Rotary Foundation', keys: ['trf', 'foundation', 'global grant', 'district grant', 'polioplus', 'peace fellowship'],
          text: '**The Rotary Foundation (TRF)** is the charitable arm of Rotary International. It turns contributions into service projects through PolioPlus, Global Grants, District Grants and Rotary Peace Fellowships.' },
        { id: 'dpp', title: 'District Priority Projects', keys: ['dpp', 'district priority', 'pillar', 'priority project', 'category a', 'category b', 'category c'],
          text: '**District Priority Projects (DPP)** are organised under eight pillars: Peace and Conflict Prevention, Disease Prevention and Treatment, Water and Sanitation, Maternal and Child Health, Basic Education and Literacy, Economic and Community Development, Environment, and Mental Health.\n\nCategories: **A** awareness programmes, **B** hands-on service, **C** sustainable impact (needs a follow-up plan).' },
        { id: 'features', title: 'Portal features', keys: ['blood', 'donation', 'bulletin', 'newsletter', 'game', 'portal', 'birthday', 'feature'],
          text: 'Club portal features:\n- Emergency **blood donation request** system with alerts to donor chairs\n- Monthly bulletin and newsletter\n- Multiplayer game zone for fellowship\n- Admin portal for events, meetings, reports and treasury\n- Automatic birthday wishes for members\n- Project tracking across the avenues of service' },
        { id: 'join', title: 'How to join', keys: ['join', 'membership', 'become a member', 'apply', 'enroll', 'enrol', 'register'],
          text: '**How to join** (age 18+):\n1. Open the **Join Us** section on the website.\n2. Fill in the form: full name, email, phone, date of birth, blood group, profession and photo.\n3. The Membership Chair reviews your application.\n4. Approved applicants receive a welcome email with portal access.' },
        { id: 'roles', title: 'Club roles', keys: ['role', 'president', 'secretary', 'treasurer', 'chair', 'director', 'board', 'office bearer', 'ipp'],
          text: 'Key roles: President, Immediate Past President, Vice President, Secretary, Treasurer, Advisor, Avenue Directors (one per avenue), specialised chairs (DPP, Blood Donor, Club Editor, Public Image, Membership, TRF), board members and general members.' }
    ];

    const STOP = new Set('the a an is are was were be to of in on for and or with at by from this that what who how when where why do does did can could would should i me my you your we our it its about tell please give show'.split(' '));
    const tokens = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w));

    /* ----------------------------------------------------------
       3. SMALL UTILITIES
       ---------------------------------------------------------- */
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const clamp = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

    function fetchJSON(url, opts, ms) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), ms || 7000);
        return fetch(url, Object.assign({ signal: ctrl.signal }, opts || {}))
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .finally(() => clearTimeout(t));
    }

    function getDB() {
        return window.DB_ADMIN || window.DB || window.supabaseClient || window.sb || window.supabaseDb || null;
    }

    function rotaryYear(d) {
        d = d || new Date();
        const y = d.getFullYear();
        const start = d.getMonth() >= 6 ? y : y - 1;
        return start + '-' + String(start + 1).slice(2);
    }

    /* ----------------------------------------------------------
       4. LOCAL TOOLS: math, units, time, weather, Wikipedia
       ---------------------------------------------------------- */
    const Tools = {
        // ---- safe math evaluator (shunting-yard, no eval) ----
        evalMath(expr) {
            const src = expr.toLowerCase()
                .replace(/×|\bx\b(?=\s*\d)/g, '*').replace(/÷/g, '/').replace(/\^/g, '^')
                .replace(/(\d),(?=\d{3}\b)/g, '$1').replace(/\s+/g, '');
            const FN = { sqrt: Math.sqrt, sin: x => Math.sin(x * Math.PI / 180), cos: x => Math.cos(x * Math.PI / 180), tan: x => Math.tan(x * Math.PI / 180),
                         log: Math.log10, ln: Math.log, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil, exp: Math.exp };
            const out = [], ops = [];
            const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 4, 'u': 3 };
            const right = { '^': true, 'u': true };
            let i = 0, prev = null;
            const apply = (op) => {
                if (op === 'u') { out.push(-out.pop()); return; }
                const b = out.pop(), a = out.pop();
                if (a === undefined || b === undefined) throw new Error('bad');
                out.push(op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : op === '/' ? a / b : op === '%' ? a % b : Math.pow(a, b));
            };
            while (i < src.length) {
                const ch = src[i];
                if (/[0-9.]/.test(ch)) {
                    let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++;
                    out.push(parseFloat(src.slice(i, j))); i = j; prev = 'n'; continue;
                }
                if (/[a-z]/.test(ch)) {
                    let j = i; while (j < src.length && /[a-z]/.test(src[j])) j++;
                    const w = src.slice(i, j);
                    if (w === 'pi') { out.push(Math.PI); prev = 'n'; }
                    else if (w === 'e') { out.push(Math.E); prev = 'n'; }
                    else if (FN[w]) { ops.push(w); prev = 'f'; }
                    else throw new Error('unknown');
                    i = j; continue;
                }
                if (ch === '(') { ops.push('('); prev = '('; i++; continue; }
                if (ch === ')') {
                    while (ops.length && ops[ops.length - 1] !== '(') apply(ops.pop());
                    if (!ops.length) throw new Error('paren');
                    ops.pop();
                    if (ops.length && FN[ops[ops.length - 1]]) out.push(FN[ops.pop()](out.pop()));
                    prev = 'n'; i++; continue;
                }
                if ('+-*/%^'.includes(ch)) {
                    let op = ch;
                    if ((ch === '-' || ch === '+') && (prev === null || prev === '(' || prev === 'o' || prev === 'f')) {
                        if (ch === '+') { i++; continue; }
                        op = 'u';
                    }
                    while (ops.length) {
                        const top = ops[ops.length - 1];
                        if (top === '(' || FN[top]) break;
                        if (prec[top] > prec[op] || (prec[top] === prec[op] && !right[op])) apply(ops.pop()); else break;
                    }
                    ops.push(op); prev = 'o'; i++; continue;
                }
                throw new Error('char');
            }
            while (ops.length) { const o = ops.pop(); if (o === '(') throw new Error('paren'); if (FN[o]) out.push(FN[o](out.pop())); else apply(o); }
            if (out.length !== 1 || !isFinite(out[0])) throw new Error('result');
            return out[0];
        },

        fmtNum(n) {
            if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toLocaleString('en-IN');
            return parseFloat(n.toPrecision(10)).toLocaleString('en-IN', { maximumFractionDigits: 8 });
        },

        tryMath(text) {
            let t = text.trim().replace(/\?+$/, '');
            const pct = t.match(/^(?:what\s+is\s+|calculate\s+|compute\s+)?(\d+(?:\.\d+)?)\s*%\s*of\s*(\d[\d,]*(?:\.\d+)?)$/i);
            if (pct) {
                const r = parseFloat(pct[1]) * parseFloat(pct[2].replace(/,/g, '')) / 100;
                return '**' + pct[1] + '% of ' + pct[2] + '** = **' + Tools.fmtNum(r) + '**';
            }
            t = t.replace(/^(what\s+is|what's|whats|calculate|compute|solve|evaluate|find|how much is)\s+/i, '').replace(/\s*=\s*$/, '');
            if (!/\d/.test(t) || !/[+\-*/^%×÷()]|\bsqrt\b|\b(sin|cos|tan|log|ln)\b|\bx\b/i.test(t)) return null;
            if (/[a-z]{2,}/i.test(t.replace(/\b(sqrt|sin|cos|tan|log|ln|abs|round|floor|ceil|exp|pi)\b/gi, ''))) return null;
            if (/^\d{1,4}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{1,4}$/.test(t) || /^[\d\s-]{8,}$/.test(t)) return null;
            try {
                const v = Tools.evalMath(t);
                return '**' + t + '** = **' + Tools.fmtNum(v) + '**';
            } catch (e) { return null; }
        },

        // ---- unit conversion ----
        UNITS: {
            length: { m: 1, meter: 1, meters: 1, metre: 1, metres: 1, km: 1000, kilometer: 1000, kilometers: 1000, kilometre: 1000, kilometres: 1000, cm: .01, mm: .001, mi: 1609.344, mile: 1609.344, miles: 1609.344, ft: .3048, foot: .3048, feet: .3048, in: .0254, inch: .0254, inches: .0254, yd: .9144, yard: .9144, yards: .9144 },
            mass: { kg: 1, kilogram: 1, kilograms: 1, kgs: 1, g: .001, gram: .001, grams: .001, mg: 1e-6, lb: .45359237, lbs: .45359237, pound: .45359237, pounds: .45359237, oz: .028349523, ounce: .028349523, ounces: .028349523, tonne: 1000, tonnes: 1000, ton: 1000 },
            volume: { l: 1, liter: 1, liters: 1, litre: 1, litres: 1, ml: .001, gal: 3.785411784, gallon: 3.785411784, gallons: 3.785411784, cup: .2365882365, cups: .2365882365 },
            speed: { 'km/h': 1, kmh: 1, kph: 1, 'mph': 1.609344, 'm/s': 3.6, knot: 1.852, knots: 1.852 },
            data: { b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776 }
        },
        tryConvert(text) {
            const m = text.toLowerCase().replace(/[?,]/g, ' ').match(/(-?\d+(?:\.\d+)?)\s*(?:°\s*)?([a-z/]+)\s+(?:to|in|into|as)\s+(?:°\s*)?([a-z/]+)/);
            if (!m) return null;
            const v = parseFloat(m[1]); let a = m[2], b = m[3];
            const temp = { c: 'c', celsius: 'c', f: 'f', fahrenheit: 'f', k: 'k', kelvin: 'k' };
            if (temp[a] && temp[b]) {
                const A = temp[a], B = temp[b];
                const c = A === 'c' ? v : A === 'f' ? (v - 32) * 5 / 9 : v - 273.15;
                const r = B === 'c' ? c : B === 'f' ? c * 9 / 5 + 32 : c + 273.15;
                return '**' + v + ' °' + A.toUpperCase() + '** = **' + Tools.fmtNum(parseFloat(r.toFixed(4))) + ' °' + B.toUpperCase() + '**';
            }
            for (const cat of Object.keys(Tools.UNITS)) {
                const U = Tools.UNITS[cat];
                if (U[a] !== undefined && U[b] !== undefined) {
                    const r = v * U[a] / U[b];
                    return '**' + v + ' ' + a + '** = **' + Tools.fmtNum(parseFloat(r.toPrecision(8))) + ' ' + b + '**';
                }
            }
            return null;
        },

        // ---- date and time (IST) ----
        tryTime(text) {
            const t = text.toLowerCase();
            if (!/\b(time|date|day|today|month|year)\b/.test(t)) return null;
            if (!/^(what('?s| is)|tell me|current|now|today|which|whats)\b|what time|what date|what day|today'?s date|current time/.test(t.trim())) return null;
            if (/\b(rotary|rotaract|event|club|holiday|festival|meeting)\b/.test(t)) return null;
            const now = new Date();
            const d = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
            const tm = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
            return 'It is **' + tm + '** IST on **' + d + '**.\n\nThe current Rotary year is **' + rotaryYear(now) + '**.';
        },

        // ---- weather (Open-Meteo, keyless) ----
        WMO: { 0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Rain showers', 81: 'Heavy showers', 82: 'Violent showers', 95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm' },
        async weather(text) {
            if (!/\b(weather|temperature|forecast|rain(ing)?|humid(ity)?|hot|cold)\b/i.test(text)) return null;
            let place = (text.match(/\b(?:in|at|for|of)\s+([A-Za-z][A-Za-z\s.'-]{2,40}?)(?:\s+(?:today|now|tomorrow|tonight|this|right|currently)\b|[?.!,]|$)/i) || [])[1];
            place = (place || 'Coimbatore').trim();
            try {
                const g = await fetchJSON('https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=' + encodeURIComponent(place));
                const loc = g.results && g.results[0];
                if (!loc) return null;
                const w = await fetchJSON('https://api.open-meteo.com/v1/forecast?latitude=' + loc.latitude + '&longitude=' + loc.longitude +
                    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m' +
                    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=3');
                const c = w.current, d = w.daily;
                let s = '**Weather in ' + loc.name + (loc.admin1 ? ', ' + loc.admin1 : '') + (loc.country ? ', ' + loc.country : '') + '**\n\n';
                s += '- Now: **' + Math.round(c.temperature_2m) + '°C** (feels like ' + Math.round(c.apparent_temperature) + '°C), ' + (Tools.WMO[c.weather_code] || 'Unknown') + '\n';
                s += '- Humidity: ' + c.relative_humidity_2m + '%  |  Wind: ' + Math.round(c.wind_speed_10m) + ' km/h  |  Rain now: ' + c.precipitation + ' mm\n\n';
                s += '| Day | Condition | Low / High | Rain chance |\n|---|---|---|---|\n';
                d.time.forEach((day, i) => {
                    const label = new Date(day + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                    s += '| ' + label + ' | ' + (Tools.WMO[d.weather_code[i]] || '-') + ' | ' + Math.round(d.temperature_2m_min[i]) + '° / ' + Math.round(d.temperature_2m_max[i]) + '°C | ' + (d.precipitation_probability_max[i] ?? '-') + '% |\n';
                });
                return { text: s, source: { label: 'Open-Meteo', url: 'https://open-meteo.com' } };
            } catch (e) { return null; }
        },

        // ---- Wikipedia grounding (keyless) ----
        wantsFacts(text) {
            const t = text.trim();
            if (t.length < 6 || t.split(/\s+/).length < 2) return false;
            if (/\b(rotary|rotaract|our club|coimbatore unity|district 3206|portal|member|treasur|admin)\b/i.test(t)) return false;
            if (/\b(write|draft|compose|poem|story|essay|code|script|translate|rewrite|summari[sz]e|email|letter|caption|joke|brainstorm|idea|plan my|help me)\b/i.test(t)) return false;
            return /\b(who|what|when|where|which|define|meaning of|capital|population|history of|founder|inventor|invented|discovered|born|died|president|prime minister|explain|tell me about|how (many|much|far|old|tall|long|big)|difference between)\b/i.test(t) || /\?$/.test(t);
        },
        async wiki(text) {
            const q = text.replace(/[?!.]+$/g, '')
                .replace(/^(please\s+)?(tell me|can you tell me|do you know|explain|describe|define|what('?s| is| are| was| were)|who('?s| is| was| are)|when (was|did|is)|where (is|was)|how (many|much|far|old|tall|long|big) (is|are|was|were)?)\s+(about\s+)?(the\s+)?/i, '').trim();
            if (q.length < 2) return null;
            try {
                const s = await fetchJSON('https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=2&srsearch=' + encodeURIComponent(q));
                const hits = (s.query && s.query.search) || [];
                if (!hits.length) return null;
                const items = [];
                for (const h of hits.slice(0, 2)) {
                    try {
                        const p = await fetchJSON('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(h.title.replace(/ /g, '_')));
                        if (p.extract && p.type !== 'disambiguation') items.push({ title: p.title, extract: p.extract, url: (p.content_urls && p.content_urls.desktop && p.content_urls.desktop.page) || ('https://en.wikipedia.org/wiki/' + encodeURIComponent(h.title)) });
                    } catch (e) { /* skip */ }
                }
                return items.length ? items : null;
            } catch (e) { return null; }
        }
    };

    /* ----------------------------------------------------------
       5. MARKDOWN RENDERER (escape first, safe links, tables)
       ---------------------------------------------------------- */
    function inline(s) {
        s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
        s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
        s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
        s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|tel:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        s = s.replace(/(^|[\s(>])(https?:\/\/[^\s<)]+[^\s<).,;:!?])/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
        s = s.replace(/(^|[\s(>])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '$1<a href="mailto:$2">$2</a>');
        return s;
    }

    function renderMarkdown(src) {
        if (!src) return '';
        const lines = esc(src).replace(/\r/g, '').split('\n');
        const out = [];
        let i = 0;
        const isTableSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l || '');
        const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        while (i < lines.length) {
            let line = lines[i];
            if (/^```/.test(line)) {
                const buf = []; i++;
                while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
                i++;
                out.push('<pre><code>' + buf.join('\n') + '</code></pre>');
                continue;
            }
            if (!line.trim()) { i++; continue; }
            let m;
            if ((m = line.match(/^(#{1,4})\s+(.+)$/))) { const n = Math.min(m[1].length + 0, 4); out.push('<h' + n + '>' + inline(m[2]) + '</h' + n + '>'); i++; continue; }
            if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
            if (/^&gt;\s?/.test(line)) {
                const buf = [];
                while (i < lines.length && /^&gt;\s?/.test(lines[i])) buf.push(lines[i++].replace(/^&gt;\s?/, ''));
                out.push('<blockquote>' + inline(buf.join('<br>')) + '</blockquote>');
                continue;
            }
            if (line.includes('|') && isTableSep(lines[i + 1])) {
                const head = cells(line); i += 2;
                const rows = [];
                while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
                out.push('<div class="ub-tablewrap"><table><thead><tr>' + head.map(h => '<th>' + inline(h) + '</th>').join('') + '</tr></thead><tbody>' +
                    rows.map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
                continue;
            }
            if (/^\s*[-*•]\s+/.test(line)) {
                const buf = [];
                while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) buf.push(inline(lines[i++].replace(/^\s*[-*•]\s+/, '')));
                out.push('<ul>' + buf.map(b => '<li>' + b + '</li>').join('') + '</ul>');
                continue;
            }
            if (/^\s*\d+[.)]\s+/.test(line)) {
                const buf = [];
                const start = parseInt(line, 10) || 1;
                while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) buf.push(inline(lines[i++].replace(/^\s*\d+[.)]\s+/, '')));
                out.push('<ol' + (start > 1 ? ' start="' + start + '"' : '') + '>' + buf.map(b => '<li>' + b + '</li>').join('') + '</ol>');
                continue;
            }
            const buf = [];
            while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*[-*•]\s+|\s*\d+[.)]\s+|&gt;)/.test(lines[i]) && !(lines[i].includes('|') && isTableSep(lines[i + 1]))) buf.push(inline(lines[i++]));
            out.push('<p>' + buf.join('<br>') + '</p>');
        }
        return out.join('');
    }

    /* ----------------------------------------------------------
       6. THE CHATBOT
       ---------------------------------------------------------- */
    const Chatbot = {
        isOpen: false, isBusy: false, isListening: false,
        history: [], MAX_HISTORY: 24, CONTEXT_MESSAGES: 12,
        voice: null, abort: null, lastUser: '', degraded: false,
        ctx: { events: [], past: [], bearers: [], knowledge: [], loadedAt: 0 },
        profile: { name: '' },

        // Provider defaults (override via AppConfig or site_settings)
        OPENROUTER_URL: 'https://openrouter.ai/api/v1/chat/completions',
        KEYLESS_URL: 'https://text.pollinations.ai/openai',
        DEFAULT_MODEL: 'openai/gpt-4o-mini',
        FALLBACK_MODELS: ['google/gemini-2.0-flash-001', 'meta-llama/llama-3.3-70b-instruct'],
        MAX_TOKENS: 1400, TEMPERATURE: 0.6, TIMEOUT_MS: 45000,

        QUICK: [
            { label: 'About our club', icon: 'info', q: 'Tell me about Rotaract Club of Coimbatore Unity.' },
            { label: 'How to join', icon: 'userplus', q: 'How can I join Rotaract Club of Coimbatore Unity?' },
            { label: 'Upcoming events', icon: 'calendar', q: 'What are the upcoming events?' },
            { label: 'Ask anything', icon: 'bulb', q: 'Give me an interesting fact I probably do not know.' },
            { label: 'Weather', icon: 'weather', q: 'What is the weather in Coimbatore?' },
            { label: 'Calculator', icon: 'calc', q: 'What is 18% of 2450?' },
            { label: 'District 3206', icon: 'globe', q: 'What is Rotary International District 3206?' },
            { label: 'End Polio Now', icon: 'shield', q: 'Tell me about the End Polio Now campaign.' },
            { label: 'DPP pillars', icon: 'star', q: 'What are District Priority Projects and the eight pillars?' },
            { label: 'Blood donation', icon: 'droplet', q: 'How does the blood donation request system work?' },
            { label: 'Four-Way Test', icon: 'scale', q: 'What is the Four-Way Test of Rotary?' },
            { label: 'Rotary Foundation', icon: 'coins', q: 'What is The Rotary Foundation?' }
        ],

        /* ---------- init ---------- */
        async init() {
            this.injectStyles();
            this.loadStorage();
            this.buildUI();
            this.setupVoice();
            this.bindGlobal();
            this.loadContext();           // non-blocking
            window.addEventListener('storage', (e) => { if (e.key === 'unity_chat_history') { this.loadStorage(); } });
            console.log('[Chatbot] Ready v6.0.0');
        },

        injectStyles() {
            if (getComputedStyle(document.documentElement).getPropertyValue('--ub-ready').trim() === '1') return;
            if (document.getElementById('ub-inline-styles')) return;
            const st = document.createElement('style');
            st.id = 'ub-inline-styles';
            st.textContent = UB_CSS;
            document.head.appendChild(st);
        },

        /* ---------- UI ---------- */
        buildUI() {
            ['chatbot-launcher', 'chatbot-panel', 'chatbot-container'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });
            const launcher = document.createElement('button');
            launcher.id = 'chatbot-launcher';
            launcher.type = 'button';
            launcher.className = 'ub-launcher';
            launcher.setAttribute('aria-label', 'Open Unity AI assistant');
            launcher.setAttribute('aria-expanded', 'false');
            launcher.setAttribute('aria-controls', 'chatbot-panel');
            launcher.innerHTML = '<span class="ub-launcher-ring"></span>' + icon('sparkles');

            const panel = document.createElement('section');
            panel.id = 'chatbot-panel';
            panel.className = 'ub-panel';
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-label', 'Unity AI assistant');
            panel.setAttribute('aria-hidden', 'true');
            panel.setAttribute('data-open', 'false');
            panel.innerHTML =
                '<header class="ub-head">' +
                    '<div class="ub-avatar">' + icon('sparkles') + '</div>' +
                    '<div class="ub-title"><strong>Unity AI</strong><span class="ub-status"><i class="ub-dot" id="chatbot-dot"></i><span id="chatbot-status">Online</span></span></div>' +
                    '<div class="ub-head-actions">' +
                        '<button type="button" class="ub-icon-btn" id="chatbot-export" title="Download conversation" aria-label="Download conversation">' + icon('download') + '</button>' +
                        '<button type="button" class="ub-icon-btn" id="chatbot-clear" title="Clear conversation" aria-label="Clear conversation">' + icon('trash') + '</button>' +
                        '<button type="button" class="ub-icon-btn" id="chatbot-close" title="Close" aria-label="Close assistant">' + icon('close') + '</button>' +
                    '</div>' +
                '</header>' +
                '<div class="ub-logs" id="chatbot-logs" aria-live="polite"></div>' +
                '<div class="ub-chips" id="chatbot-chips"></div>' +
                '<form class="ub-composer" id="chatbot-form" autocomplete="off">' +
                    '<textarea id="chatbot-input" rows="1" maxlength="2000" placeholder="Ask about our club, or anything at all..." aria-label="Message"></textarea>' +
                    '<button type="button" class="ub-btn voice" id="chatbot-voice-btn" title="Voice input" aria-label="Voice input">' + icon('mic') + '</button>' +
                    '<button type="submit" class="ub-btn send" id="chatbot-submit" aria-label="Send message" disabled>' + icon('send') + '</button>' +
                '</form>' +
                '<div class="ub-foot">AI can make mistakes. Please verify important information.</div>';

            document.body.appendChild(launcher);
            document.body.appendChild(panel);
            this.el = {
                launcher, panel,
                logs: panel.querySelector('#chatbot-logs'),
                chips: panel.querySelector('#chatbot-chips'),
                input: panel.querySelector('#chatbot-input'),
                form: panel.querySelector('#chatbot-form'),
                submit: panel.querySelector('#chatbot-submit'),
                voice: panel.querySelector('#chatbot-voice-btn'),
                dot: panel.querySelector('#chatbot-dot'),
                status: panel.querySelector('#chatbot-status')
            };
            this.renderChips(this.QUICK);
            this.renderWelcome();

            launcher.addEventListener('click', () => this.open());
            panel.querySelector('#chatbot-close').addEventListener('click', () => this.close());
            panel.querySelector('#chatbot-clear').addEventListener('click', () => this.clearConversation());
            panel.querySelector('#chatbot-export').addEventListener('click', () => this.exportConversation());
            this.el.form.addEventListener('submit', (e) => { e.preventDefault(); this.onSubmit(); });
            this.el.voice.addEventListener('click', () => this.toggleVoice());
            this.el.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); this.onSubmit(); }
            });
            this.el.input.addEventListener('input', () => this.syncInput());
            this.el.logs.addEventListener('click', (e) => this.onLogClick(e));
            this.el.chips.addEventListener('click', (e) => {
                const b = e.target.closest('[data-q]');
                if (b) this.ask(b.getAttribute('data-q'));
            });
            if (!this.voice) this.el.voice.style.display = 'none';
        },

        bindGlobal() {
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen) this.close(); });
            document.addEventListener('click', (e) => {
                const t = e.target.closest && e.target.closest('[data-chatbot-open]');
                if (t) { e.preventDefault(); this.open(); const q = t.getAttribute('data-chatbot-open'); if (q && q !== 'true') this.ask(q); }
            });
        },

        syncInput() {
            const i = this.el.input;
            i.style.height = 'auto';
            i.style.height = Math.min(i.scrollHeight, 120) + 'px';
            this.el.submit.disabled = !this.isBusy && !i.value.trim();
        },

        renderChips(list) {
            this.el.chips.innerHTML = list.map(c =>
                '<button type="button" class="ub-chip" data-q="' + esc(c.q) + '">' + icon(c.icon || 'sparkles') + esc(c.label) + '</button>').join('');
        },

        renderWelcome() {
            const logs = this.el.logs;
            logs.innerHTML = '';
            const name = this.profile.name ? ', ' + esc(this.profile.name) : '';
            const w = document.createElement('div');
            w.className = 'ub-welcome';
            w.innerHTML =
                '<h4>Hello' + name + '. I am Unity AI.</h4>' +
                '<p>I can answer questions about <strong>Rotaract Club of Coimbatore Unity</strong>, Rotary and District 3206, and also general knowledge, maths, science, weather, writing help and more.</p>' +
                '<div class="ub-caps">' +
                    '<div class="ub-cap">' + icon('book') + 'General knowledge</div>' +
                    '<div class="ub-cap">' + icon('calendar') + 'Club events and roles</div>' +
                    '<div class="ub-cap">' + icon('calc') + 'Maths and conversions</div>' +
                    '<div class="ub-cap">' + icon('weather') + 'Live weather</div>' +
                '</div>';
            logs.appendChild(w);
            if (this.history.length) {
                const d = document.createElement('div');
                d.className = 'ub-divider';
                d.innerHTML = icon('history') + 'Earlier in this conversation';
                logs.appendChild(d);
                this.history.forEach(m => {
                    if (m.role === 'user') this.addUser(m.content, m.t);
                    else this.addBot(m.content, { t: m.t, restored: true, tag: m.tag, sources: m.sources });
                });
            }
            this.scrollDown(true);
        },

        open() {
            this.isOpen = true;
            this.el.panel.setAttribute('data-open', 'true');
            this.el.panel.setAttribute('aria-hidden', 'false');
            this.el.launcher.setAttribute('aria-expanded', 'true');
            if (Date.now() - this.ctx.loadedAt > 5 * 60 * 1000) this.loadContext();
            setTimeout(() => { this.el.input.focus({ preventScroll: true }); this.scrollDown(true); }, 320);
        },
        close() {
            this.isOpen = false;
            this.el.panel.setAttribute('data-open', 'false');
            this.el.panel.setAttribute('aria-hidden', 'true');
            this.el.launcher.setAttribute('aria-expanded', 'false');
            if (this.isListening && this.voice) try { this.voice.stop(); } catch (e) { /* ignore */ }
        },
        toggle() { this.isOpen ? this.close() : this.open(); },

        /* ---------- message DOM ---------- */
        timeStr(t) { return new Date(t || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); },

        addUser(text, t) {
            const d = document.createElement('div');
            d.className = 'ub-msg user';
            d.innerHTML = '<div class="ub-bubble">' + esc(text).replace(/\n/g, '<br>') + '</div><div class="ub-meta">' + this.timeStr(t) + '</div>';
            this.el.logs.appendChild(d);
            this.scrollDown();
            return d;
        },

        addBot(markdown, opts) {
            opts = opts || {};
            const d = document.createElement('div');
            d.className = 'ub-msg bot';
            d.innerHTML =
                '<div class="ub-mini">' + icon('sparkles') + '</div>' +
                '<div class="ub-col"><div class="ub-bubble"></div>' +
                    '<div class="ub-meta"><span class="ub-time">' + this.timeStr(opts.t) + '</span>' +
                        (opts.tag ? '<span class="ub-tag">' + icon('info', '') + esc(opts.tag) + '</span>' : '') +
                        '<span class="ub-actions">' +
                            '<button type="button" class="ub-act" data-act="copy">' + icon('copy') + 'Copy</button>' +
                            '<button type="button" class="ub-act" data-act="regen">' + icon('refresh') + 'Retry</button>' +
                        '</span></div></div>';
            d.querySelector('.ub-bubble').innerHTML = renderMarkdown(markdown);
            if (opts.sources && opts.sources.length) this.setSources(d, opts.sources);
            this.el.logs.appendChild(d);
            if (!opts.restored) this.scrollDown();
            return d;
        },

        setSources(node, sources) {
            let box = node.querySelector('.ub-sources');
            if (!box) { box = document.createElement('div'); box.className = 'ub-sources'; node.querySelector('.ub-col').insertBefore(box, node.querySelector('.ub-meta')); }
            box.innerHTML = sources.map(s => '<a class="ub-source" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + icon('external') + esc(s.label) + '</a>').join('');
        },

        addError(message) {
            const d = document.createElement('div');
            d.className = 'ub-msg bot ub-error';
            d.innerHTML = '<div class="ub-mini err">' + icon('alert') + '</div><div class="ub-col"><div class="ub-err"><span>' + esc(message) + '</span><button type="button" class="ub-act" data-act="retry">' + icon('refresh') + 'Try again</button></div></div>';
            this.el.logs.appendChild(d);
            this.scrollDown();
        },

        showTyping(label) {
            this.hideTyping();
            const d = document.createElement('div');
            d.id = 'chatbot-typing-indicator';
            d.className = 'ub-msg bot';
            d.innerHTML = '<div class="ub-mini">' + icon('sparkles') + '</div><div class="ub-col">' +
                (label ? '<div class="ub-thinking" style="margin:0 0 6px">' + icon(label.icon || 'search') + esc(label.text) + '</div>' : '') +
                '<div class="ub-typing"><span></span><span></span><span></span></div></div>';
            this.el.logs.appendChild(d);
            this.scrollDown();
        },
        hideTyping() { const t = document.getElementById('chatbot-typing-indicator'); if (t) t.remove(); },

        scrollDown(force) {
            const l = this.el.logs;
            const near = l.scrollHeight - l.scrollTop - l.clientHeight < 140;
            if (force || near) requestAnimationFrame(() => { l.scrollTop = l.scrollHeight; });
        },

        setBusy(b) {
            this.isBusy = b;
            const s = this.el.submit;
            s.classList.toggle('stop', b);
            s.innerHTML = icon(b ? 'stop' : 'send');
            s.setAttribute('aria-label', b ? 'Stop generating' : 'Send message');
            s.disabled = b ? false : !this.el.input.value.trim();
        },

        setStatus(limited) {
            this.degraded = !!limited;
            this.el.dot.classList.toggle('limited', !!limited);
            this.el.status.textContent = limited ? 'Limited mode' : 'Online';
        },

        onLogClick(e) {
            const b = e.target.closest('[data-act]');
            if (!b) return;
            const act = b.getAttribute('data-act');
            if (act === 'copy') this.copy(b);
            else if (act === 'regen') this.regenerate();
            else if (act === 'retry') { this.el.logs.querySelectorAll('.ub-error').forEach(n => n.remove()); this.run(this.lastUser, { reuseUser: true }); }
            else if (act === 'follow') this.ask(b.getAttribute('data-q'));
        },

        copy(btn) {
            const bubble = btn.closest('.ub-msg').querySelector('.ub-bubble');
            const text = bubble.innerText;
            const done = () => { const o = btn.innerHTML; btn.innerHTML = icon('check') + 'Copied'; setTimeout(() => { btn.innerHTML = o; }, 1400); };
            if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => this.fallbackCopy(text, done));
            else this.fallbackCopy(text, done);
        },
        fallbackCopy(text, cb) {
            const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); cb(); } catch (e) { /* ignore */ }
            ta.remove();
        },

        clearConversation() {
            if (this.isBusy && this.abort) this.abort.abort();
            if (!window.confirm('Clear this conversation?')) return;
            this.history = [];
            this.saveStorage();
            this.renderWelcome();
            this.renderChips(this.QUICK);
        },

        exportConversation() {
            if (!this.history.length) { this.toast('Nothing to download yet'); return; }
            const lines = ['Unity AI conversation', 'Rotaract Club of Coimbatore Unity', new Date().toLocaleString('en-IN'), ''];
            this.history.forEach(m => lines.push((m.role === 'user' ? 'You' : 'Unity AI') + ':\n' + m.content + '\n'));
            const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = 'unity-ai-conversation.txt';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        },

        toast(msg) { if (window.AppToast && window.AppToast.info) window.AppToast.info(msg); else console.log('[Chatbot]', msg); },
        toastErr(msg) { if (window.AppToast && window.AppToast.error) window.AppToast.error(msg); else console.warn('[Chatbot]', msg); },

        /* ---------- voice ---------- */
        setupVoice() {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) return;
            const v = this.voice = new SR();
            v.continuous = false; v.interimResults = true; v.lang = 'en-IN';
            let finalText = '';
            v.onresult = (ev) => {
                let interim = ''; finalText = '';
                for (let i = 0; i < ev.results.length; i++) {
                    const r = ev.results[i];
                    if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
                }
                this.el.input.value = (finalText + interim).trim();
                this.syncInput();
            };
            v.onend = () => {
                this.isListening = false;
                this.el.voice.classList.remove('listening');
                this.el.voice.innerHTML = icon('mic');
                if (finalText.trim() && this.el.input.value.trim()) setTimeout(() => this.onSubmit(), 250);
            };
            v.onerror = (ev) => {
                this.isListening = false; this.el.voice.classList.remove('listening'); this.el.voice.innerHTML = icon('mic');
                if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') this.toastErr('Microphone access was denied');
            };
        },
        toggleVoice() {
            if (!this.voice) return this.toastErr('Voice input is not supported in this browser');
            if (this.isListening) { this.voice.stop(); return; }
            try {
                this.el.input.value = '';
                this.voice.start();
                this.isListening = true;
                this.el.voice.classList.add('listening');
                this.el.voice.innerHTML = icon('stop');
            } catch (e) { this.toastErr('Could not start voice input'); }
        },

        /* ---------- storage ---------- */
        loadStorage() {
            try {
                const raw = localStorage.getItem('unity_chat_history');
                if (raw) {
                    const d = JSON.parse(raw);
                    if (Date.now() - (d.timestamp || 0) < 24 * 3600 * 1000 && Array.isArray(d.history)) this.history = d.history.filter(m => m && m.content && (m.role === 'user' || m.role === 'assistant'));
                    else localStorage.removeItem('unity_chat_history');
                }
                const p = localStorage.getItem('unity_chat_profile');
                if (p) this.profile = Object.assign(this.profile, JSON.parse(p));
            } catch (e) { this.history = []; }
        },
        saveStorage() {
            try {
                localStorage.setItem('unity_chat_history', JSON.stringify({ history: this.history.slice(-this.MAX_HISTORY), timestamp: Date.now() }));
                localStorage.setItem('unity_chat_profile', JSON.stringify(this.profile));
            } catch (e) { /* storage full or blocked */ }
        },

        /* ---------- club context from Supabase ---------- */
        async loadContext() {
            this.ctx.loadedAt = Date.now();
            const db = getDB();
            try {
                let user = null;
                if (window.AuthManager && typeof window.AuthManager.isLoggedIn === 'function' && window.AuthManager.isLoggedIn()) user = window.AuthManager.currentUser;
                this.user = user || null;
            } catch (e) { this.user = null; }

            if (db && db.from) {
                const today = new Date().toISOString().split('T')[0];
                const plus30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
                const minus45 = new Date(Date.now() - 45 * 86400000).toISOString().split('T')[0];
                const tasks = [
                    db.from('events').select('event_name, date, start_time, venue, avenue_slug').eq('status', 'approved').gte('date', today).lte('date', plus30).order('date', { ascending: true }).limit(8)
                        .then(r => { if (r && r.data) this.ctx.events = r.data; }),
                    db.from('events').select('event_name, date, venue, avenue_slug').eq('status', 'approved').gte('date', minus45).lt('date', today).order('date', { ascending: false }).limit(5)
                        .then(r => { if (r && r.data) this.ctx.past = r.data; }),
                    db.from('chatbot_knowledge').select('title, content, keywords').eq('is_active', true).limit(200)
                        .then(r => { if (r && r.data) this.ctx.knowledge = r.data; })
                ];
                await Promise.allSettled(tasks.map(p => Promise.resolve(p).catch(() => null)));
            }
            try {
                if (typeof window.getOfficeBearers === 'function') {
                    const ob = await window.getOfficeBearers();
                    this.ctx.bearers = Object.keys(ob || {}).map(role => ({ role, name: ob[role] && ob[role].full_name, portfolio: ob[role] && ob[role].portfolio })).filter(b => b.name);
                }
            } catch (e) { /* optional */ }
        },

        /* ---------- config ---------- */
        setting(key) {
            try {
                const cfg = window.AppConfig || {};
                const map = { api_key: cfg.CHATBOT_API_KEY, model: cfg.CHATBOT_MODEL, api_url: cfg.CHATBOT_API_URL };
                if (map[key]) return map[key];
                const S = window.SiteSettings;
                if (S && typeof S.get === 'function') { const v = S.get('chatbot_' + key); if (v) return String(v).trim(); }
            } catch (e) { /* ignore */ }
            return '';
        },

        providers() {
            const list = [];
            const key = this.setting('api_key');
            const url = this.setting('api_url') || this.OPENROUTER_URL;
            const model = this.setting('model') || this.DEFAULT_MODEL;
            if (key) {
                list.push({ name: 'primary', url, key, model });
                if (url === this.OPENROUTER_URL) this.FALLBACK_MODELS.filter(m => m !== model).forEach(m => list.push({ name: 'fallback', url, key, model: m }));
            }
            list.push({ name: 'keyless', url: this.KEYLESS_URL, key: '', model: 'openai', keyless: true });
            return list;
        },

        /* ---------- prompt ---------- */
        relevantKnowledge(q) {
            const qt = new Set(tokens(q));
            if (!qt.size) return [];
            const scored = [];
            (this.ctx.knowledge || []).forEach(k => {
                const kt = new Set(tokens((k.title || '') + ' ' + (k.keywords || []).join(' ') + ' ' + (k.content || '').slice(0, 300)));
                let s = 0; qt.forEach(w => { if (kt.has(w)) s++; });
                if (s) scored.push({ s, k });
            });
            return scored.sort((a, b) => b.s - a.s).slice(0, 4).map(x => x.k);
        },

        buildSystemPrompt(userText, toolNotes) {
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
            const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
            let live = '';
            if (this.ctx.events.length) live += '\nUPCOMING CLUB EVENTS (next 30 days):\n' + this.ctx.events.map(e => '- "' + e.event_name + '" on ' + e.date + (e.start_time ? ' at ' + e.start_time : '') + (e.venue ? ', venue: ' + e.venue : '')).join('\n') + '\n';
            else live += '\nUPCOMING CLUB EVENTS: none are published in the next 30 days.\n';
            if (this.ctx.past.length) live += '\nRECENT CLUB EVENTS:\n' + this.ctx.past.map(e => '- "' + e.event_name + '" on ' + e.date + (e.venue ? ', ' + e.venue : '')).join('\n') + '\n';
            if (this.ctx.bearers.length) live += '\nCURRENT OFFICE BEARERS:\n' + this.ctx.bearers.map(b => '- ' + (b.portfolio || b.role) + ': ' + b.name).join('\n') + '\n';
            const custom = this.relevantKnowledge(userText);
            if (custom.length) live += '\nCLUB-SPECIFIC KNOWLEDGE (maintained by admins, trust this over general knowledge):\n' + custom.map(k => '### ' + k.title + '\n' + k.content).join('\n\n') + '\n';

            const who = this.user ? '\nThe user is signed in to the portal as ' + (this.user.name || 'a member') + (this.user.portfolio || this.user.role ? ' (' + (this.user.portfolio || this.user.role) + ')' : '') + '.' : '';
            const nm = this.profile.name ? '\nThe user told you their name is ' + this.profile.name + '; use it sparingly.' : '';
            const kb = KB.map(k => '## ' + k.title + '\n' + k.text).join('\n\n');

            return 'You are **Unity AI**, the assistant of the Rotaract Club of Coimbatore Unity (always write the full club name, never just "Coimbatore Unity"). ' +
                'You are a brilliant, warm, general-purpose assistant first and a Rotary/Rotaract expert second. You answer ANY question the user asks: general knowledge, science, history, geography, current concepts, maths, coding, career and study advice, health basics, writing and editing, translation, brainstorming, planning, riddles and casual conversation. Never refuse a harmless topic just because it is not about Rotary.\n\n' +
                'HOW TO ANSWER\n' +
                '- Start with the answer itself. No filler such as "Sure" or "Great question".\n' +
                '- Be accurate. If you are not sure, say so plainly; never invent facts, dates, names, statistics, links or quotes. For anything that changes over time (news, prices, scores, office holders) say your information may be out of date unless a REFERENCE or LIVE section below provides it.\n' +
                '- Match depth to the question: one or two sentences for simple facts, structured detail for complex ones. Use markdown (short paragraphs, bullets, numbered steps, **bold** key terms, tables for comparisons, fenced code blocks for code).\n' +
                '- Reply in the language the user writes in (English, Tamil, Hindi, Malayalam, etc.).\n' +
                '- Never use emojis.\n' +
                '- For medical, legal or financial topics give helpful general information and recommend a qualified professional for decisions. If someone seems in crisis, respond with care and suggest contacting local emergency services or a trusted person.\n' +
                '- Decline only genuinely harmful requests, briefly and politely.\n' +
                '- Questions about club facts must come from the CLUB DATA below. If it is not there, say you do not have it and suggest contacting rc.cbeunity@gmail.com. Do not guess member details or private information.\n' +
                '- After your answer, on a new final line write exactly: FOLLOWUPS: question one | question two | question three (short, natural follow-up questions the user might ask next, max 60 characters each). Never mention this line.\n\n' +
                'CURRENT DATE AND TIME (IST): ' + dateStr + ', ' + timeStr + '\nCURRENT ROTARY YEAR: ' + rotaryYear(now) + who + nm + '\n' +
                (toolNotes ? '\n' + toolNotes + '\n' : '') +
                '\nLIVE CLUB DATA' + live +
                '\nCLUB REFERENCE KNOWLEDGE\n' + kb;
        },

        /* ---------- orchestration ---------- */
        ask(q) {
            if (!q) return;
            if (!this.isOpen) this.open();
            this.el.input.value = q;
            this.syncInput();
            this.onSubmit();
        },

        onSubmit() {
            if (this.isBusy) { if (this.abort) this.abort.abort(); return; }
            const text = this.el.input.value.trim();
            if (!text) return;
            this.el.input.value = '';
            this.syncInput();
            this.run(text, {});
        },

        regenerate() {
            if (this.isBusy) return;
            const last = this.history[this.history.length - 1];
            if (!last || last.role !== 'assistant') return;
            this.history.pop();
            const bots = this.el.logs.querySelectorAll('.ub-msg.bot');
            if (bots.length) bots[bots.length - 1].remove();
            this.run(this.lastUser || (this.history[this.history.length - 1] || {}).content, { reuseUser: true });
        },

        learnName(text) {
            const m = text.match(/\b(?:my name is|i am called|call me)\s+([A-Za-z][A-Za-z'.-]{1,24})\b/i);
            if (m) { this.profile.name = m[1].charAt(0).toUpperCase() + m[1].slice(1); this.saveStorage(); }
        },

        async run(text, opts) {
            if (!text) return;
            opts = opts || {};
            this.lastUser = text;
            this.learnName(text);
            if (!opts.reuseUser) {
                this.addUser(text);
                this.history.push({ role: 'user', content: text, t: Date.now() });
            }
            this.setBusy(true);
            this.abort = new AbortController();
            const signal = this.abort.signal;

            try {
                // 1. Instant local answers (no network, no AI)
                const quick = Tools.tryMath(text) || Tools.tryConvert(text) || Tools.tryTime(text) || this.tryGreeting(text);
                if (quick) {
                    await sleep(220);
                    this.finish(quick, { tag: '', sources: [] });
                    return;
                }

                // 2. Tool grounding in parallel
                const notes = [], sources = [];
                let weatherDirect = null;
                this.showTyping({ icon: 'search', text: 'Thinking' });
                const [wx, wk] = await Promise.all([
                    Tools.weather(text),
                    Tools.wantsFacts(text) ? Tools.wiki(text) : Promise.resolve(null)
                ]);
                if (signal.aborted) throw new DOMException('aborted', 'AbortError');
                if (wx) {
                    weatherDirect = wx;
                    notes.push('LIVE WEATHER DATA (Open-Meteo, fetched just now). Present it clearly and add brief practical advice:\n' + wx.text);
                    sources.push(wx.source);
                }
                if (wk) {
                    notes.push('REFERENCE FROM WIKIPEDIA (may be unrelated to the question; ignore anything that is not relevant, and do not copy wording verbatim):\n' + wk.map(x => '- ' + x.title + ': ' + x.extract).join('\n'));
                    wk.slice(0, 2).forEach(x => sources.push({ label: clamp(x.title, 28), url: x.url }));
                }

                // 3. LLM chain with streaming
                const sys = this.buildSystemPrompt(text, notes.join('\n\n'));
                const ctxMsgs = this.history.slice(-this.CONTEXT_MESSAGES).map(m => ({ role: m.role, content: m.content }));
                const messages = [{ role: 'system', content: sys }].concat(ctxMsgs);

                let node = null, bubble = null, acc = '', raf = 0;
                const paint = () => {
                    raf = 0;
                    if (!bubble) return;
                    const shown = acc.replace(/\n?FOLLOWUPS:[\s\S]*$/i, '').replace(/\n?FOLLOW\w*$/i, '');
                    bubble.innerHTML = renderMarkdown(shown);
                    bubble.classList.add('ub-cursor');
                    this.scrollDown();
                };
                const onDelta = (d) => {
                    acc += d;
                    if (!node) {
                        this.hideTyping();
                        node = this.addBot('', {});
                        bubble = node.querySelector('.ub-bubble');
                        node.querySelector('.ub-actions').style.visibility = 'hidden';
                    }
                    if (!raf) raf = requestAnimationFrame(paint);
                };

                let result = null, lastErr = null;
                for (const p of this.providers()) {
                    if (signal.aborted) break;
                    try {
                        acc = '';
                        result = await this.callProvider(p, messages, onDelta, signal);
                        if (result) break;
                    } catch (e) {
                        if (e.name === 'AbortError' && signal.aborted) throw e;
                        lastErr = e;
                        console.warn('[Chatbot] provider failed:', p.name, p.model, e.message);
                        if (node && !acc) { node.remove(); node = null; bubble = null; }
                        if (acc && node) { result = acc; break; }
                    }
                }
                if (raf) cancelAnimationFrame(raf);

                if (result) {
                    this.setStatus(false);
                    this.hideTyping();
                    const { body, follow } = this.splitFollowups(result);
                    if (!node) node = this.addBot('', {});
                    bubble = node.querySelector('.ub-bubble');
                    bubble.classList.remove('ub-cursor');
                    bubble.innerHTML = renderMarkdown(body);
                    node.querySelector('.ub-actions').style.visibility = '';
                    if (sources.length) this.setSources(node, sources);
                    this.history.push({ role: 'assistant', content: body, t: Date.now(), sources: sources.length ? sources : undefined });
                    this.afterAnswer(follow);
                    return;
                }

                // 4. Offline brain: never leave the user with a dead end
                this.hideTyping();
                this.setStatus(true);
                const off = this.offlineAnswer(text, weatherDirect, wk);
                this.finish(off.text, { tag: 'Offline knowledge mode', sources: off.sources.concat(sources.filter(s => !off.sources.find(o => o.url === s.url))) });
                if (!off.confident && lastErr) console.warn('[Chatbot] all providers failed:', lastErr);
            } catch (err) {
                this.hideTyping();
                if (err && err.name === 'AbortError') {
                    this.toast('Stopped');
                } else {
                    console.error('[Chatbot]', err);
                    this.addError('Something went wrong while preparing the answer. Please try again.');
                }
            } finally {
                this.hideTyping();
                this.setBusy(false);
                this.abort = null;
                this.saveStorage();
                this.trim();
            }
        },

        finish(markdown, opts) {
            opts = opts || {};
            this.hideTyping();
            const { body, follow } = this.splitFollowups(markdown);
            this.addBot(body, { tag: opts.tag, sources: opts.sources });
            this.history.push({ role: 'assistant', content: body, t: Date.now(), tag: opts.tag || undefined, sources: opts.sources && opts.sources.length ? opts.sources : undefined });
            this.afterAnswer(follow);
        },

        splitFollowups(text) {
            const m = text.match(/\n?\s*FOLLOWUPS:\s*([^\n]+)\s*$/i);
            if (!m) return { body: text.trim(), follow: [] };
            const follow = m[1].split('|').map(s => s.replace(/^[\s\-*\d.)]+/, '').trim()).filter(s => s.length > 3 && s.length < 90).slice(0, 3);
            return { body: text.slice(0, m.index).trim(), follow };
        },

        afterAnswer(follow) {
            if (follow && follow.length) this.renderChips(follow.map(q => ({ label: clamp(q, 44), q, icon: 'sparkles' })));
            else this.renderChips(this.QUICK);
            this.scrollDown(true);
        },

        trim() { if (this.history.length > this.MAX_HISTORY) this.history = this.history.slice(-this.MAX_HISTORY); },

        tryGreeting(text) {
            const t = text.trim().toLowerCase().replace(/[!.?]+$/g, '');
            const nm = this.profile.name ? ', ' + this.profile.name : '';
            if (/^(hi|hii+|hello|hey|hola|vanakkam|namaste|good (morning|afternoon|evening)|yo|sup)\b.{0,12}$/.test(t))
                return 'Hello' + nm + '. I am **Unity AI**. Ask me about Rotaract Club of Coimbatore Unity, or anything else: general knowledge, maths, science, weather, writing help and more.\n\nFOLLOWUPS: What events are coming up? | Tell me something interesting | How do I join the club?';
            if (/^(thanks|thank you|thx|ty|thank u|nandri)\b/.test(t)) return 'You are welcome' + nm + '. Ask me anything whenever you like.';
            if (/^(who are you|what are you|what can you do|help)$/.test(t))
                return 'I am **Unity AI**, the assistant of Rotaract Club of Coimbatore Unity.\n\n- Club: events, roles, membership, DPP projects, Rotary and District 3206\n- Knowledge: science, history, geography, current concepts, careers and studies\n- Tools: maths, unit conversion, live weather, date and time\n- Writing: emails, captions, speeches, summaries, translations\n\nFOLLOWUPS: Write a short welcome speech | What is the weather in Coimbatore? | Convert 5 km to miles';
            const nameQ = /^(what('?s| is) my name|who am i)$/.test(t);
            if (nameQ) return this.profile.name ? 'You told me your name is **' + this.profile.name + '**.' : 'I do not know your name yet. Tell me with "My name is ...".';
            return null;
        },

        /* ---------- LLM transport (OpenAI-compatible, SSE) ---------- */
        async callProvider(p, messages, onDelta, outerSignal) {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), this.TIMEOUT_MS);
            const onOuter = () => ctrl.abort();
            outerSignal.addEventListener('abort', onOuter);
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (p.key) headers.Authorization = 'Bearer ' + p.key;
                if (p.url === this.OPENROUTER_URL) { headers['HTTP-Referer'] = location.origin; headers['X-Title'] = 'Rotaract Unity Portal'; }
                const body = { model: p.model, messages, temperature: this.TEMPERATURE, stream: true };
                if (!p.keyless) body.max_tokens = this.MAX_TOKENS;
                const res = await fetch(p.url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
                if (!res.ok) {
                    let detail = ''; try { detail = (await res.text()).slice(0, 160); } catch (e) { /* ignore */ }
                    throw new Error('HTTP ' + res.status + ' ' + detail);
                }
                const type = (res.headers.get('content-type') || '').toLowerCase();
                if (!res.body || type.indexOf('json') !== -1) {
                    const data = await res.json();
                    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
                    if (!text) throw new Error('Empty response');
                    onDelta(text);
                    return text.trim();
                }
                const reader = res.body.getReader();
                const dec = new TextDecoder();
                let buf = '', full = '';
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buf += dec.decode(value, { stream: true });
                    const parts = buf.split('\n');
                    buf = parts.pop();
                    for (const raw of parts) {
                        const line = raw.trim();
                        if (!line || line.startsWith(':') || !line.startsWith('data:')) continue;
                        const payload = line.slice(5).trim();
                        if (payload === '[DONE]') continue;
                        try {
                            const j = JSON.parse(payload);
                            if (j.error) throw new Error(j.error.message || 'Provider error');
                            const d = j.choices && j.choices[0] && (j.choices[0].delta && j.choices[0].delta.content);
                            if (d) { full += d; onDelta(d); }
                        } catch (e) { if (e.message && e.message !== 'Unexpected end of JSON input' && !/JSON/.test(e.message)) throw e; }
                    }
                }
                if (!full.trim()) throw new Error('Empty response');
                return full.trim();
            } finally {
                clearTimeout(timer);
                outerSignal.removeEventListener('abort', onOuter);
            }
        },

        /* ---------- offline brain ---------- */
        offlineAnswer(text, weather, wiki) {
            const t = text.toLowerCase();
            const sources = [];
            if (weather) return { text: weather.text, sources: [weather.source], confident: true };

            // live club data first
            if (/\b(event|events|program|programme|project|upcoming|schedule|happening)\b/.test(t) && /\b(upcoming|next|coming|week|month|today|schedule|happening|list)\b|events\b/.test(t)) {
                if (this.ctx.events.length) {
                    const rows = this.ctx.events.map(e => '- **' + e.event_name + '**: ' + e.date + (e.start_time ? ', ' + e.start_time : '') + (e.venue ? ', ' + e.venue : '')).join('\n');
                    return { text: '**Upcoming events of Rotaract Club of Coimbatore Unity**\n\n' + rows, sources: [], confident: true };
                }
                return { text: 'No events are published for the next 30 days right now. Please check the **Events** section of the website soon, or write to **rc.cbeunity@gmail.com**.', sources: [], confident: true };
            }
            if (/\b(office bearer|president|secretary|treasurer|who leads|leadership|board)\b/.test(t) && this.ctx.bearers.length) {
                return { text: '**Current office bearers**\n\n' + this.ctx.bearers.map(b => '- ' + (b.portfolio || b.role) + ': **' + b.name + '**').join('\n'), sources: [], confident: true };
            }

            // admin-maintained knowledge, then built-in KB
            const custom = this.relevantKnowledge(text);
            const qt = new Set(tokens(text));
            const scored = KB.map(k => {
                let s = 0;
                k.keys.forEach(key => { if (t.includes(key)) s += key.split(' ').length * 3; });
                tokens(k.title).forEach(w => { if (qt.has(w)) s += 1; });
                return { s, k };
            }).filter(x => x.s >= 3).sort((a, b) => b.s - a.s);
            const top = scored.length ? scored[0].s : 0;
            const best = scored.filter(x => x.s >= top);
            const parts = [];
            if (custom.length) parts.push(custom.slice(0, 2).map(c => '**' + c.title + '**\n' + c.content).join('\n\n'));
            if (best.length) parts.push(best.slice(0, 2).map(x => x.k.text).join('\n\n'));
            if (parts.length) return { text: parts.join('\n\n'), sources: [], confident: true };

            // general knowledge from Wikipedia
            if (wiki && wiki.length) {
                const w = wiki[0];
                sources.push({ label: clamp(w.title, 28), url: w.url });
                return { text: '**' + w.title + '**\n\n' + w.extract + '\n\nThis summary is from Wikipedia. My full AI service is temporarily unavailable, so I could not tailor the answer further.', sources, confident: true };
            }
            return {
                text: 'My full AI service is not reachable at the moment, so I can only answer club questions, maths, unit conversions, date and time, and weather right now.\n\nPlease try again in a minute. For anything urgent, write to **rc.cbeunity@gmail.com**.',
                sources: [], confident: false
            };
        }
    };

    Chatbot._tools = Tools;
    Chatbot._render = renderMarkdown;
    window.Chatbot = Chatbot;

    function boot() { try { Chatbot.init(); } catch (e) { console.error('[Chatbot] init failed', e); } }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
