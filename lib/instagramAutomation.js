const API_BASE_URL = process.env.IG_AUTOMATION_BASE_URL || 'https://mgautomation.le0.uk';
const API_TOKEN = process.env.API_TOKEN;
const DEFAULT_TIMEOUT_MS = (() => {
  const raw = process.env.IG_AUTOMATION_TIMEOUT_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return 30000;
})();

async function callAutomation(path, searchParams, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!API_TOKEN) {
    throw new Error('Missing API_TOKEN for Instagram automation.');
  }

  const url = `${API_BASE_URL}${path}?${searchParams.toString()}`;
  const resolvedTimeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller =
    Number.isFinite(resolvedTimeoutMs) && resolvedTimeoutMs > 0 ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), resolvedTimeoutMs) : null;

  try {
    const response = await fetch(url, {
      headers: {
        'x-api-key': API_TOKEN
      },
      method: 'GET',
      signal: controller?.signal
    });

    const body = await response.text();

    if (!response.ok) {
      const reason = body || response.statusText;
      throw new Error(`Automation request failed (${response.status}): ${reason}`);
    }

    return body;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Automation request timed out after ${resolvedTimeoutMs}ms`);
    }
    throw error;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function addUserToInstagramThread({ threadId, username, confirmationMessage }) {
  if (!threadId || !username) {
    return { skipped: true, reason: !threadId ? 'Missing threadId' : 'Missing username' };
  }

  const addParams = new URLSearchParams({ threadid: threadId, user: username });
  const addResponse = await callAutomation('/api/addtogroup', addParams);

  let dmError = null;
  let dmResponse = null;
  if (confirmationMessage) {
    const dmParams = new URLSearchParams({ user: username, message: confirmationMessage });
    try {
      dmResponse = await callAutomation('/api/senddm', dmParams);
    } catch (error) {
      dmError = error;
    }
  }

  return { added: true, dmError, addResponse, dmResponse };
}

export async function sendInstagramDm({ username, message }) {
  if (!username || !message) {
    return { skipped: true, reason: !username ? 'Missing username' : 'Missing message' };
  }
  const params = new URLSearchParams({ user: username, message });
  const response = await callAutomation('/api/senddm', params);
  return { ok: true, response };
}

export async function syncAttendeesToInstagramThread({ threadId, attendees = [], addMissing = false }) {
  if (!threadId) {
    throw new Error('Missing threadId for attendee sync.');
  }

  if (!API_TOKEN) {
    throw new Error('Missing API_TOKEN for Instagram automation.');
  }

  const url = `${API_BASE_URL}/sync-attendees`;
  const controller =
    Number.isFinite(DEFAULT_TIMEOUT_MS) && DEFAULT_TIMEOUT_MS > 0 ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS) : null;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_TOKEN
      },
      body: JSON.stringify({
        threadId,
        attendees,
        addMissing: Boolean(addMissing)
      }),
      signal: controller?.signal
    });

    const bodyText = await response.text();
    const body = bodyText
      ? (() => {
          try {
            return JSON.parse(bodyText);
          } catch {
            return { message: bodyText };
          }
        })()
      : {};

    if (!response.ok) {
      const reason = body?.error || body?.message || response.statusText;
      const error = new Error(`Automation request failed (${response.status}): ${reason}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }

    return body;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Automation request timed out after ${DEFAULT_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
