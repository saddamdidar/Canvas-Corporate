/**
 * Canvas Assistant - floating AI chat widget for canvastemplate.com.
 *
 * Vanilla JS port of the docs/support PublicChatWidget (dashboard-app
 * src/components/chat/PublicChatWidget.tsx). Same backend, same limits:
 * talks to /api/chat/public which nginx proxies to the dashboard app, so
 * anonymous visitors share the same lifetime free-question budget across
 * docs.canvastemplate.com, support.canvastemplate.com, and this site.
 *
 * Loaded by a small loader appended to js/functions.bundle.js.
 * Position: bottom-left (the demo style switcher lives bottom-right).
 */
(function () {
  "use strict";
  if (window.__cnvsChatLoaded) return;
  window.__cnvsChatLoaded = true;
  // Skip inside iframes (demo browser embeds, live previews) and headless
  // browsers (thumbnail screenshots must not capture the launcher).
  try { if (window.top !== window.self) return; } catch (e) { return; }
  if (navigator.webdriver) return;

  var API = "/api/chat/public";
  var LS_CONV = "ct-public-chat-conv";
  var LS_DISMISS = "ct-public-chat-dismissed";
  var DISMISS_DAYS = 7;
  var MAX_CHARS = 1000;

  // Dismissed recently? Don't render anything at all.
  try {
    var until = Number(localStorage.getItem(LS_DISMISS) || 0);
    if (until && Date.now() < until) return;
  } catch (e) {}

  /* ── styles ──────────────────────────────────────────────────────────── */
  var css = [
    ".cnvsw-launcher{position:fixed;left:20px;bottom:20px;z-index:99990;width:52px;height:52px;border-radius:50%;border:0;cursor:pointer;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(0,0,0,.22);transition:transform .15s ease}",
    ".cnvsw-launcher:hover{transform:scale(1.06)}",
    ".cnvsw-panel{position:fixed;left:20px;bottom:84px;z-index:99991;width:360px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);background:#fff;border:1px solid #e5e5e5;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.18);display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}",
    ".cnvsw-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:14px 16px;border-bottom:1px solid #eee;background:#fafafa}",
    ".cnvsw-title{margin:0;font-size:14px;font-weight:700;color:#111;line-height:1.3}",
    ".cnvsw-sub{margin:2px 0 0;font-size:11.5px;color:#777;line-height:1.35}",
    ".cnvsw-headright{display:flex;align-items:center;gap:8px;flex-shrink:0}",
    ".cnvsw-count{font-size:10.5px;color:#999;white-space:nowrap}",
    ".cnvsw-close{border:0;background:none;cursor:pointer;color:#999;padding:4px;line-height:0}",
    ".cnvsw-close:hover{color:#111}",
    ".cnvsw-list{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}",
    ".cnvsw-empty{margin:auto;text-align:center;padding:0 18px}",
    ".cnvsw-empty-title{margin:0;font-size:13.5px;font-weight:600;color:#111}",
    ".cnvsw-empty-sub{margin:6px 0 0;font-size:12px;color:#888;line-height:1.5}",
    ".cnvsw-msg{max-width:85%;border-radius:12px;padding:9px 12px;font-size:13px;line-height:1.55}",
    ".cnvsw-user{align-self:flex-end;background:#111;color:#fff}",
    ".cnvsw-user p{margin:0;white-space:pre-wrap}",
    ".cnvsw-ai{align-self:flex-start;background:#f3f3f3;color:#222}",
    ".cnvsw-ai p{margin:0 0 8px}.cnvsw-ai p:last-child{margin-bottom:0}",
    ".cnvsw-ai pre{background:#111;color:#eee;border-radius:8px;padding:10px;overflow-x:auto;font-size:12px;margin:8px 0}",
    ".cnvsw-ai code{font-family:SFMono-Regular,Consolas,Menlo,monospace;font-size:12px}",
    ".cnvsw-ai p code,.cnvsw-ai li code{background:#e7e7e7;border-radius:4px;padding:1px 5px}",
    ".cnvsw-ai ul,.cnvsw-ai ol{margin:6px 0;padding-left:20px}",
    ".cnvsw-ai a{color:#0b7285;text-decoration:underline}",
    ".cnvsw-sources{margin:8px 0 0;display:flex;flex-wrap:wrap;gap:6px}",
    ".cnvsw-sources a{font-size:10.5px;color:#666;background:#e9e9e9;border-radius:999px;padding:3px 9px;text-decoration:none}",
    ".cnvsw-sources a:hover{background:#ddd;color:#111}",
    ".cnvsw-dots{display:inline-flex;gap:4px;padding:4px 2px}",
    ".cnvsw-dots i{width:6px;height:6px;border-radius:50%;background:#999;animation:cnvswB 1.2s infinite}",
    ".cnvsw-dots i:nth-child(2){animation-delay:.15s}.cnvsw-dots i:nth-child(3){animation-delay:.3s}",
    "@keyframes cnvswB{0%,80%,100%{opacity:.25}40%{opacity:1}}",
    ".cnvsw-notice{align-self:center;font-size:11.5px;color:#b45309;background:#fef3c7;border-radius:8px;padding:6px 10px;margin:0}",
    ".cnvsw-wall{align-self:center;text-align:center;background:#fafafa;border:1px solid #eee;border-radius:12px;padding:14px 16px}",
    ".cnvsw-wall p{margin:0 0 10px;font-size:12.5px;color:#555}",
    ".cnvsw-wall-btn{display:inline-block;background:#111;color:#fff!important;border-radius:8px;padding:8px 14px;font-size:12.5px;font-weight:600;text-decoration:none}",
    ".cnvsw-wall-link{display:block;margin-top:8px;font-size:11.5px;color:#888!important;text-decoration:underline}",
    ".cnvsw-inputrow{display:flex;align-items:flex-end;gap:8px;padding:10px 12px;border-top:1px solid #eee;background:#fff}",
    ".cnvsw-input{flex:1;resize:none;border:1px solid #ddd;border-radius:10px;padding:8px 11px;font-size:13px;font-family:inherit;line-height:1.4;max-height:96px;outline:none;color:#111;background:#fff}",
    ".cnvsw-input:focus{border-color:#999}",
    ".cnvsw-input:disabled{background:#f5f5f5;color:#999}",
    ".cnvsw-send{border:0;border-radius:10px;background:#111;color:#fff;width:38px;height:38px;flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center}",
    ".cnvsw-send:disabled{opacity:.4;cursor:default}",
    ".cnvsw-dismiss{position:fixed;left:60px;bottom:56px;z-index:99992;width:20px;height:20px;border-radius:50%;border:0;cursor:pointer;background:#666;color:#fff;font-size:13px;line-height:1;display:none;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 8px rgba(0,0,0,.25)}",
    ".cnvsw-dismiss:hover{background:#c0392b}",
    ".cnvsw-launcher:hover ~ .cnvsw-dismiss,.cnvsw-dismiss:hover{display:flex}",
    "@media (max-width:480px){.cnvsw-panel{left:10px;right:10px;width:auto;bottom:78px}.cnvsw-launcher{left:14px;bottom:14px}.cnvsw-dismiss{display:flex;left:54px;bottom:50px}}",
  ].join("");
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  /* ── tiny safe markdown (mirror of chat/md.ts) ───────────────────────── */
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function md(src) {
    var blocks = [];
    var s = src.replace(/```(\w*)\n?([\s\S]*?)(?:```|$)/g, function (_, l, code) {
      var i = blocks.push("<pre><code>" + esc(code.replace(/\n$/, "")) + "</code></pre>") - 1;
      return "\u0000C" + i + "\u0000";
    });
    s = esc(s);
    s = s.replace(/`([^`\n]+)`/g, function (_, c) { return "<code>" + c + "</code>"; });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    s = s.replace(/^#{1,4}\s+(.+)$/gm, "<strong>$1</strong>");
    s = s.replace(/((?:^[ \t]*(?:[-*]|\d+\.)\s+.+\n?)+)/gm, function (block) {
      var ordered = /^\s*\d+\./.test(block);
      var items = block.trim().split(/\n/).map(function (l) {
        return "<li>" + l.replace(/^[ \t]*(?:[-*]|\d+\.)\s+/, "") + "</li>";
      }).join("");
      return ordered ? "<ol>" + items + "</ol>" : "<ul>" + items + "</ul>";
    });
    s = s.split(/\n{2,}/).map(function (p) {
      var t = p.trim();
      if (!t) return "";
      if (/^<(pre|ul|ol)/.test(t) || t.indexOf("\u0000") === 0) return t;
      return "<p>" + t.replace(/\n/g, "<br/>") + "</p>";
    }).join("");
    return s.replace(/\u0000C(\d+)\u0000/g, function (_, i) { return blocks[+i] || ""; });
  }

  /* ── dom helpers ─────────────────────────────────────────────────────── */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  var ICON_CHAT = '<svg width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M216 48H40a16 16 0 0 0-16 16v160a15.8 15.8 0 0 0 9.2 14.5A16.1 16.1 0 0 0 40 240a15.9 15.9 0 0 0 10.2-3.7L82 208h134a16 16 0 0 0 16-16V64a16 16 0 0 0-16-16Zm0 144H79.1a16.1 16.1 0 0 0-10.2 3.7L40 220V64h176Z"/></svg>';
  var ICON_X = '<svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M205.7 194.3a8.1 8.1 0 0 1-11.4 11.4L128 139.3l-66.3 66.4a8.1 8.1 0 0 1-11.4-11.4l66.4-66.3-66.4-66.3a8.1 8.1 0 0 1 11.4-11.4l66.3 66.4 66.3-66.4a8.1 8.1 0 0 1 11.4 11.4L139.3 128Z"/></svg>';
  var ICON_SEND = '<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M231.4 44.3a16.3 16.3 0 0 0-18.5-5.7L28.5 106.2a16 16 0 0 0 1.9 30.8l80.3 17.2 17.2 80.3a16 16 0 0 0 30.8 1.9l67.6-184.4a16.3 16.3 0 0 0-4.9-17.7ZM145 219.5l-16.6-77.4 51.3-51.3a8 8 0 0 0-11.3-11.3l-51.3 51.3-77.5-16.6 183.8-67.4Z"/></svg>';

  var state = {
    open: false, busy: false, loaded: false,
    convId: null, remaining: null, msgs: [],
  };

  var launcher = el("button", "cnvsw-launcher", ICON_CHAT);
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Ask AI about Canvas");
  document.body.appendChild(launcher);

  // Dismiss chip: hides launcher + panel for DISMISS_DAYS.
  var dismiss = el("button", "cnvsw-dismiss", "&times;");
  dismiss.type = "button";
  dismiss.setAttribute("aria-label", "Hide chat");
  dismiss.title = "Hide chat";
  dismiss.addEventListener("click", function (e) {
    e.stopPropagation();
    try {
      localStorage.setItem(LS_DISMISS, String(Date.now() + DISMISS_DAYS * 864e5));
    } catch (err) {}
    if (panel) panel.style.display = "none";
    launcher.style.display = "none";
    dismiss.style.display = "none";
  });
  document.body.appendChild(dismiss);

  var panel = null, list = null, input = null, sendBtn = null, countEl = null;

  function contextSlug() {
    var m = window.location.pathname.match(/^\/(demo-[a-z0-9-]+)\.html$/);
    return m ? m[1] : undefined;
  }

  function scroll() {
    requestAnimationFrame(function () { if (list) list.scrollTop = list.scrollHeight; });
  }

  function renderCount() {
    if (!countEl) return;
    if (state.remaining === null || state.remaining === 0) { countEl.textContent = ""; return; }
    countEl.textContent = state.remaining + " free " + (state.remaining === 1 ? "question" : "questions") + " left";
  }

  function addMsg(m) {
    if (!list) return null;
    var empty = list.querySelector(".cnvsw-empty");
    if (empty) empty.remove();
    var div = el("div", "cnvsw-msg " + (m.role === "user" ? "cnvsw-user" : "cnvsw-ai"));
    if (m.role === "user") {
      var p = el("p"); p.textContent = m.body; div.appendChild(p);
    } else if (m.body === "") {
      div.innerHTML = '<span class="cnvsw-dots"><i></i><i></i><i></i></span>';
    } else {
      div.innerHTML = md(m.body);
    }
    if (m.sources && m.sources.length) appendSources(div, m.sources);
    list.appendChild(div);
    scroll();
    return div;
  }

  function appendSources(div, sources) {
    var wrap = el("p", "cnvsw-sources");
    sources.slice(0, 3).forEach(function (s) {
      var a = el("a");
      a.href = /^https?:\/\//.test(s.url) ? s.url : "https://" + s.url;
      a.target = "_blank"; a.rel = "noopener noreferrer";
      a.textContent = s.title;
      wrap.appendChild(a);
    });
    div.appendChild(wrap);
  }

  function notice(text) {
    if (!list) return;
    var n = el("p", "cnvsw-notice");
    n.textContent = text;
    list.appendChild(n);
    scroll();
    setTimeout(function () { n.remove(); }, 6000);
  }

  function wall() {
    if (!list || list.querySelector(".cnvsw-wall")) return;
    var w = el("div", "cnvsw-wall",
      "<p>You have used your free questions.</p>" +
      '<a class="cnvsw-wall-btn" href="https://dashboard.canvastemplate.com/login">Sign in for unlimited chat</a>' +
      '<a class="cnvsw-wall-link" href="https://dashboard.canvastemplate.com/support">or open a support topic</a>');
    list.appendChild(w);
    if (input) { input.disabled = true; input.placeholder = "Free questions used"; }
    if (sendBtn) sendBtn.disabled = true;
    renderCount();
    scroll();
  }

  function buildPanel() {
    panel = el("div", "cnvsw-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "AI assistant");

    var head = el("div", "cnvsw-head");
    var hl = el("div", "", '<p class="cnvsw-title">Canvas Assistant</p><p class="cnvsw-sub">Answers from the official docs and support forum</p>');
    var hr = el("div", "cnvsw-headright");
    countEl = el("span", "cnvsw-count");
    var closeBtn = el("button", "cnvsw-close", ICON_X);
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.addEventListener("click", toggle);
    hr.appendChild(countEl); hr.appendChild(closeBtn);
    head.appendChild(hl); head.appendChild(hr);

    list = el("div", "cnvsw-list",
      '<div class="cnvsw-empty"><p class="cnvsw-empty-title">Hi! Ask me anything about Canvas.</p>' +
      '<p class="cnvsw-empty-sub">Demos, setup, shortcodes, customization. I cite the docs I use.</p></div>');

    var row = el("div", "cnvsw-inputrow");
    input = document.createElement("textarea");
    input.className = "cnvsw-input";
    input.rows = 1; input.maxLength = MAX_CHARS;
    input.placeholder = "Ask about Canvas\u2026";
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });
    sendBtn = el("button", "cnvsw-send", ICON_SEND);
    sendBtn.type = "button";
    sendBtn.setAttribute("aria-label", "Send");
    sendBtn.addEventListener("click", send);
    row.appendChild(input); row.appendChild(sendBtn);

    panel.appendChild(head); panel.appendChild(list); panel.appendChild(row);
    document.body.appendChild(panel);
  }

  function restore() {
    if (state.loaded) return;
    state.loaded = true;
    var saved = null;
    try { saved = localStorage.getItem(LS_CONV); } catch (e) {}
    fetch(API + (saved ? "?id=" + encodeURIComponent(saved) : ""), { credentials: "same-origin" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        state.remaining = typeof d.remaining === "number" ? d.remaining : null;
        renderCount();
        if (d.conversation) {
          state.convId = d.conversation.id;
          (d.messages || []).forEach(function (m) { addMsg(m); });
        } else if (saved) {
          try { localStorage.removeItem(LS_CONV); } catch (e) {}
        }
        if (state.remaining === 0) wall();
      })
      .catch(function () {});
  }

  function toggle() {
    state.open = !state.open;
    if (state.open) {
      if (!panel) buildPanel();
      panel.style.display = "flex";
      launcher.innerHTML = ICON_X;
      restore();
      if (input && !input.disabled) input.focus();
    } else {
      if (panel) panel.style.display = "none";
      launcher.innerHTML = ICON_CHAT;
    }
  }
  launcher.addEventListener("click", toggle);

  function send() {
    var message = (input.value || "").trim();
    if (!message || state.busy) return;
    input.value = "";
    state.busy = true;
    sendBtn.disabled = true;
    addMsg({ role: "user", body: message });
    var streamDiv = addMsg({ role: "assistant", body: "" });

    var payload = {
      message: message,
      conversationId: state.convId,
      contextSlug: contextSlug(),
      website: "",
    };

    fetch(API, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return null; }).then(function (d) {
          streamDiv.remove();
          if (d && d.error === "limit") { state.remaining = 0; wall(); }
          else notice((d && (d.message || d.error)) || "Something went wrong. Please try again.");
        });
      }
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buf = "", full = "", sources = [];
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return finish();
          buf += decoder.decode(r.value, { stream: true });
          var events = buf.split("\n\n");
          buf = events.pop() || "";
          events.forEach(function (ev) {
            var line = ev.split("\n").find(function (l) { return l.indexOf("data: ") === 0; });
            if (!line) return;
            var d;
            try { d = JSON.parse(line.slice(6)); } catch (e) { return; }
            if (typeof d.conversationId === "string") {
              state.convId = d.conversationId;
              try { localStorage.setItem(LS_CONV, d.conversationId); } catch (e) {}
            }
            if (typeof d.remaining === "number") { state.remaining = d.remaining; renderCount(); }
            if (typeof d.delta === "string") {
              full += d.delta;
              streamDiv.innerHTML = md(full);
              scroll();
            }
            if (Object.prototype.toString.call(d.sources) === "[object Array]") sources = d.sources;
            if (typeof d.error === "string") notice(d.error);
          });
          return pump();
        });
      }
      function finish() {
        if (full) {
          streamDiv.innerHTML = md(full);
          if (sources.length) appendSources(streamDiv, sources);
        } else {
          streamDiv.remove();
        }
        if (state.remaining === 0) wall();
        scroll();
      }
      return pump();
    }).catch(function () {
      streamDiv.remove();
      notice("Network error. Please try again.");
    }).then(function () {
      state.busy = false;
      if (state.remaining !== 0) sendBtn.disabled = false;
      if (input && !input.disabled) input.focus();
    });
  }
})();
