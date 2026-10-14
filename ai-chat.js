(function () {
  if (document.getElementById('paperwiseAiLauncher')) return;

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const launcher = make('button', '', '');
  launcher.id = 'paperwiseAiLauncher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Open Paperwise AI help');
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-controls', 'paperwiseAiPanel');
  const mark = make('span', 'pw-ai-mark', '✦');
  mark.setAttribute('aria-hidden', 'true');
  launcher.append(mark, document.createTextNode('Ask Paperwise'));

  const panel = make('section', 'pw-ai-panel');
  panel.id = 'paperwiseAiPanel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Paperwise customer AI assistant');
  panel.hidden = true;
  const header = make('div', 'pw-ai-header');
  const brand = make('div', 'pw-ai-brand');
  brand.append(make('span', 'pw-ai-brand-mark', '✦'));
  const brandText = make('div');
  brandText.append(make('strong', '', 'Paperwise Help'), make('small', '', 'Your reading companion'));
  brand.append(brandText);
  const close = make('button', 'pw-ai-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close assistant');
  header.append(brand, close);

  const body = make('div', 'pw-ai-body');
  body.id = 'paperwiseAiMessages';
  body.setAttribute('aria-live', 'polite');
  body.setAttribute('aria-relevant', 'additions text');
  body.append(make('p', 'pw-ai-intro', 'Ask about editions, checkout, account access, or your own order status. I use Paperwise records for current catalogue and order facts.'));
  const suggestions = make('div', 'pw-ai-suggestions');
  const suggestionItems = [
    'Find PDFs about habits',
    'How does UPI verification work?',
    'Help me access my library',
    'Check my order status'
  ];
  const textarea = make('textarea', '');
  textarea.rows = 2;
  textarea.maxLength = 1800;
  textarea.placeholder = 'Ask a question…';
  textarea.setAttribute('aria-label', 'Message Paperwise AI');
  textarea.autocomplete = 'off';
  const sendButton = make('button', '', 'Send');
  sendButton.type = 'submit';
  sendButton.disabled = true;
  const form = make('form', 'pw-ai-form');
  form.append(textarea, sendButton);
  const footer = make('div', 'pw-ai-footer');
  footer.append(make('p', 'pw-ai-privacy', 'Never share passwords, email codes, UPI PINs, or payment references. This assistant cannot approve payments or unlock files.'));
  footer.append(form);
  panel.append(header, body, footer);
  document.body.append(launcher, panel);

  const history = [];
  let busy = false;
  let retryMessage = '';
  let retryHistory = [];
  let thinking = null;

  function showMessage(role, text, isError) {
    const row = make('div', 'pw-ai-message' + (role === 'user' ? ' user' : '') + (isError ? ' error' : ''));
    row.append(make('span', 'pw-ai-speaker', role === 'user' ? 'You' : 'Paperwise'));
    row.append(make('p', 'pw-ai-copy', text));
    body.append(row);
    body.scrollTop = body.scrollHeight;
    return row;
  }

  function setBusy(value) {
    busy = value;
    textarea.disabled = value;
    sendButton.disabled = value || !textarea.value.trim();
  }

  function setThinking(value) {
    if (value) {
      thinking = make('p', 'pw-ai-thinking', 'Paperwise is looking that up…');
      thinking.setAttribute('role', 'status');
      body.append(thinking);
      body.scrollTop = body.scrollHeight;
    } else if (thinking) {
      thinking.remove();
      thinking = null;
    }
  }

  async function submitMessage(raw, retry) {
    const text = String(raw || '').trim();
    if (!text || busy) return;
    const previous = retry ? retryHistory : history.slice(-8);
    if (!retry) {
      showMessage('user', text, false);
      history.push({ role: 'user', content: text });
      retryMessage = text;
      retryHistory = previous;
    }
    textarea.value = '';
    setBusy(true);
    setThinking(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      const client = window.PAPERWISE_SUPABASE_CLIENT;
      if (client) {
        try {
          const result = await client.auth.getSession();
          const token = result && result.data && result.data.session && result.data.session.access_token;
          if (token) headers.Authorization = 'Bearer ' + token;
        } catch (_) {
          // General guest help remains available if session refresh is temporarily unavailable.
        }
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      let response;
      try {
        response = await fetch((window.PAPERWISE_API_BASE || '').replace(/\/$/, '') + '/api/ai/customer-chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({ message: text, history: previous }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'AI help is temporarily unavailable.');
      const reply = typeof data.reply === 'string' && data.reply.trim()
        ? data.reply.trim()
        : 'I could not produce a reliable answer just now. Please retry.';
      showMessage('assistant', reply, false);
      history.push({ role: 'assistant', content: reply });
      while (history.length > 12) history.shift();
      retryMessage = '';
      retryHistory = [];
    } catch (error) {
      const message = error && error.name === 'AbortError'
        ? 'The assistant took too long to respond. Your bag, checkout, account, and downloads are unaffected.'
        : (error && error.message) || 'AI help is temporarily unavailable. Please retry.';
      const row = showMessage('assistant', message, true);
      const retry = make('button', 'pw-ai-retry', 'Retry');
      retry.type = 'button';
      retry.onclick = () => submitMessage(retryMessage, true);
      row.append(retry);
    } finally {
      setThinking(false);
      setBusy(false);
      textarea.focus();
    }
  }

  suggestionItems.forEach((label) => {
    const button = make('button', '', label);
    button.type = 'button';
    button.onclick = () => submitMessage(label, false);
    suggestions.append(button);
  });
  body.append(suggestions);

  launcher.onclick = () => {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    textarea.focus();
  };
  close.onclick = () => {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  };
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      panel.hidden = true;
      launcher.setAttribute('aria-expanded', 'false');
      launcher.focus();
    }
  });
  textarea.addEventListener('input', () => {
    sendButton.disabled = busy || !textarea.value.trim();
  });
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage(textarea.value, false);
    }
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitMessage(textarea.value, false);
  });
})();
