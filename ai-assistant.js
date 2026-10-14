(() => {
  'use strict';
  const adminMode = document.body.classList.contains('admin');
  const apiBase = (window.PAPERWISE_API_BASE || '').replace(/\/$/, '');
  const sb = window.supabase && window.PAPERWISE_SUPABASE_URL && window.PAPERWISE_SUPABASE_ANON_KEY
    ? window.supabase.createClient(window.PAPERWISE_SUPABASE_URL, window.PAPERWISE_SUPABASE_ANON_KEY) : null;
  let history = [];
  let busy = false;
  let lastMessage = '';
  let lastErrorNode = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function init() {
    if (!apiBase) return;
    let host;
    if (adminMode) {
      host = el('section', 'pw-ai-inline');
      host.id = 'paperwiseAdminCopilot';
      const note = document.querySelector('.admin-note');
      (note?.parentNode || document.querySelector('.admin-main'))?.insertBefore(host, note || null);
    } else {
      host = document.createElement('div');
      host.id = 'paperwiseCustomerAssistant';
      document.body.append(host);
    }
    const panel = el('section', 'pw-ai-panel');
    panel.setAttribute('aria-label', adminMode ? 'PaperWise admin AI copilot' : 'PaperWise customer AI assistant');
    panel.setAttribute('aria-hidden', adminMode ? 'false' : 'true');
    const head = el('header', 'pw-ai-head');
    const heading = el('div');
    heading.append(el('span', 'pw-ai-brand', adminMode ? 'PaperWise AI Copilot' : 'PaperWise Assistant'));
    heading.append(el('small', 'pw-ai-subtitle', adminMode ? 'Private · Read-only tools · Admin MFA required' : 'Product help and order guidance'));
    head.append(heading);
    const close = el('button', 'pw-ai-close', '×');
    close.type = 'button'; close.setAttribute('aria-label', 'Close assistant');
    if (!adminMode) head.append(close);
    const messages = el('div', 'pw-ai-messages');
    messages.id = adminMode ? 'pwAdminAiMessages' : 'pwCustomerAiMessages';
    messages.setAttribute('role', 'log'); messages.setAttribute('aria-live', 'polite'); messages.setAttribute('aria-relevant', 'additions text');
    const quick = el('div', 'pw-ai-quick');
    const suggestions = adminMode
      ? ['Summarize the last 7 days', 'What payments are pending?', 'Find catalogue improvements']
      : ['How does checkout work?', 'Find a PDF for me', 'Where is my order?'];
    suggestions.forEach(label => {
      const chip = el('button', 'pw-ai-chip', label); chip.type = 'button';
      chip.addEventListener('click', () => { input.value = label; send(); });
      quick.append(chip);
    });
    const form = el('form', 'pw-ai-form');
    const input = el('textarea', 'pw-ai-input');
    input.rows = 1; input.maxLength = 2000; input.placeholder = adminMode ? 'Ask about store activity…' : 'Ask a question…';
    input.setAttribute('aria-label', 'Message the PaperWise AI assistant');
    const sendButton = el('button', 'pw-ai-send', 'Send');
    sendButton.type = 'submit';
    form.append(input, sendButton);
    const note = el('div', 'pw-ai-note', adminMode
      ? 'Read-only assistant. Verify all summaries; payment decisions and record changes stay with you.'
      : 'AI can make mistakes. Payment approval and PDF access are always controlled by PaperWise.');
    panel.append(head, messages, quick, form, note);
    let launcher = null;
    if (adminMode) {
      host.append(panel);
    } else {
      launcher = el('button', 'pw-ai-launcher');
      launcher.type = 'button'; launcher.setAttribute('aria-expanded', 'false'); launcher.setAttribute('aria-controls', panel.id = 'pwCustomerAiPanel');
      launcher.append(el('span', 'pw-ai-dot'), document.createTextNode(' Ask PaperWise'));
      host.append(launcher, panel);
      launcher.addEventListener('click', () => {
        const open = panel.getAttribute('aria-hidden') !== 'false';
        panel.setAttribute('aria-hidden', String(!open)); launcher.setAttribute('aria-expanded', String(open));
        if (open) input.focus(); else launcher.focus();
      });
      close.addEventListener('click', () => { panel.setAttribute('aria-hidden', 'true'); launcher.setAttribute('aria-expanded', 'false'); launcher.focus(); });
      panel.addEventListener('keydown', event => { if (event.key === 'Escape') close.click(); });
    }
    addMessage('assistant', adminMode
      ? 'I can summarize verified store metrics, list pending payment submissions without transaction references, and search the catalogue. I cannot approve payments or change records.'
      : 'Hi! I can help you explore real PaperWise editions, understand manual UPI checkout, and troubleshoot your account. Sign in if you need personalized order status.');
    form.addEventListener('submit', event => { event.preventDefault(); send(); });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
    });

    function addMessage(role, text, isError = false) {
      const node = el('div', 'pw-ai-message ' + role + (isError ? ' error' : ''), text);
      node.dataset.role = role;
      messages.append(node); messages.scrollTop = messages.scrollHeight;
      return node;
    }
    async function send(retry = false) {
      if (busy) return;
      const message = retry ? lastMessage : input.value.trim();
      if (!message) return;
      if (message.length > 2000) { addMessage('assistant', 'Please keep each message under 2,000 characters.', true); return; }
      lastMessage = message;
      if (!retry) { addMessage('user', message); input.value = ''; }
      if (lastErrorNode) { lastErrorNode.remove(); lastErrorNode = null; }
      const loading = addMessage('assistant', 'Thinking…');
      busy = true; sendButton.disabled = true; input.disabled = true;
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (sb) {
          const { data } = await sb.auth.getSession();
          if (data?.session?.access_token) headers.Authorization = 'Bearer ' + data.session.access_token;
        }
        const endpoint = adminMode ? '/api/ai/admin-assistant' : '/api/ai/customer-chat';
        const response = await fetch(apiBase + endpoint, {
          method: 'POST', headers, body: JSON.stringify({ message, history: history.slice(-8) }),
          signal: AbortSignal.timeout(16000)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'The assistant is temporarily unavailable.');
        if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('The assistant returned an empty answer. Please try again.');
        loading.textContent = data.answer;
        history.push({ role: 'user', content: message }, { role: 'assistant', content: data.answer });
        history = history.slice(-8);
      } catch (error) {
        loading.remove();
        const text = error.name === 'TimeoutError' || error.name === 'AbortError'
          ? 'That took too long. Please try again.' : (error.message || 'The assistant is temporarily unavailable.');
        lastErrorNode = addMessage('assistant', text + ' Your normal PaperWise features remain available.', true);
        const retryButton = el('button', 'pw-ai-chip', 'Retry last message');
        retryButton.type = 'button'; retryButton.addEventListener('click', () => send(true));
        lastErrorNode.append(document.createTextNode(' '), retryButton);
      } finally {
        busy = false; sendButton.disabled = false; input.disabled = false; input.focus();
        messages.scrollTop = messages.scrollHeight;
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();