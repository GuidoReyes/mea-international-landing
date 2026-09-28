/* Login page: trades the access key for a session cookie. The key is never stored in the
   browser (no storage, no URL): it only travels once, in a request header. */
const form = document.getElementById('loginForm');
const input = document.getElementById('keyInput');
const button = document.getElementById('submitBtn');
const errorEl = document.getElementById('loginError');

const MESSAGES = {
  403: 'Incorrect access key.',
  429: 'Too many failed attempts. Try again in a few minutes.',
};

function showError(message) {
  errorEl.textContent = message; // textContent, never innerHTML
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const key = input.value.trim();
  if (!key) return;

  button.disabled = true;
  showError('');
  try {
    const response = await fetch('/api/security/login', {
      method: 'POST',
      headers: { 'X-Security-Key': key },
      credentials: 'same-origin',
    });
    if (response.ok) {
      location.replace('/security');
      return;
    }
    showError(MESSAGES[response.status] || 'Could not sign in. Try again.');
  } catch (_) {
    showError('Could not reach the server.');
  } finally {
    input.value = '';
    button.disabled = false;
  }
});
