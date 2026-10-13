(function () {
  const panel = document.getElementById('adminAiPanel');
  if (!panel) return;
  const list = document.getElementById('adminAiMessages');
  const form = document.getElementById('adminAiForm');
  const input = document.getElementById('adminAiInput');
  const send = document.getElementById('adminAiSend');
  const status = document.getElementById('adminAiStatus');
  if (!list || !form || !input || !send || !status) return;

  const history = [];
  let busy = false;
  let retryMessage = '';
  let retryHistory = [];
  let thinking = null;

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function addMessage(role, text, isError) {
    const row = make('article', 'admin-ai-message ' + role + (isError ? ' is-error' : ''));
    const title = make('strong', '', role === 'user' ? 'You' : 'AI Copilot');
    const copy = make('p', '', text);
    row.append(title, copy);
    list.append(row);
    list.scrollTop = list.scrollHeight;
    return row;
  }

  function setBusy(value) {
    busy = value;
    input.disabled = value;
    send.disabled = value || !input.value.trim();
    status.textContent = value ? 'Reviewing authorized store data…' : '';
  }

  function setThinking(value) {
    if (value) {
      thinking = make('p', 'admin-ai-thinking', 'The Copilot is working…');
      thinking.setAttribute('role', 'status');
      list.append(thinking);
      list.scrollTop = list.scrollHeight;
    } else if (thinking) {
      thinking.remove();
      thinking = null;
    }
  }

  async function submit(raw, isRetry) {
    const message = String(raw || '').trim();
    if (!message || busy) return;
    const previous = isRetry ? retryHistory : history.slice(-8);
    if (!isRetry) {
      addMessage('user', message, false);
      history.push({ role: 'user', content: message });
      retryMessage = message;
      retryHistory = previous;
    }
    input.value = '';
    setBusy(true);
    setThinking(true);
    try {
      const client = window.PAPERWISE_SUPABASE_CLIENT;
      if (!client) throw new Error('Admin session is unavailable. Reload and sign in again.');
      const result = await client.auth.getSession();
      const token = result && result.data && result.data.session && result.data.session.access_token;
      if (!token) throw new Error('Sign in again and complete multi-factor verification.');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      let response;
      try {
        response = await fetch((window.PAPERWISE_API_BASE || '').replace(/\/$/, '') + '/api/ai/admin-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ message, history: previous }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The Copilot is temporarily unavailable.');
      const reply = typeof data.reply === 'string' && data.reply.trim()
        ? data.reply.trim()
        : 'No reliable answer was returned. Please retry.';
      addMessage('assistant', reply, false);
      history.push({ role: 'assistant', content: reply });
      while (history.length > 12) history.shift();
      retryMessage = '';
      retryHistory = [];
    } catch (error) {
      const messageText = error && error.name === 'AbortError'
        ? 'The request timed out. Your store and payment controls remain unchanged.'
        : (error && error.message) || 'The Copilot is temporarily unavailable.';
      const row = addMessage('assistant', messageText, true);
      const retry = make('button', 'admin-ai-retry', 'Retry');
      retry.type = 'button';
      retry.onclick = () => submit(retryMessage, true);
      row.append(retry);
    } finally {
      setThinking(false);
      setBusy(false);
      input.focus();
    }
  }

  panel.querySelectorAll('[data-ai-prompt]').forEach((button) => {
    button.addEventListener('click', () => submit(button.getAttribute('data-ai-prompt'), false));
  });
  input.addEventListener('input', () => { send.disabled = busy || !input.value.trim(); });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit(input.value, false);
    }
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit(input.value, false);
  });
})();
