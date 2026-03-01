export function renderLoginPage(app, onSubmit) {
  app.innerHTML = `
    <section class="login-wrap">
      <div class="login-card reveal" style="--delay:40ms">
        <div class="login-head">
          <h1 class="login-title">Welcome Back</h1>
          <p class="subtle">Sign in to continue to your dashboard.</p>
        </div>
        <form id="login-form" class="mt-3">
          <div class="mb-3">
            <label class="form-label">Username or Email</label>
            <input required type="text" name="username" class="form-control login-input" placeholder="Enter username or email" />
          </div>
          <div class="mb-3">
            <label class="form-label">Password</label>
            <input required type="password" name="password" class="form-control login-input" placeholder="Enter password" />
          </div>
          <button class="btn login-btn w-100 mt-2" type="submit">Sign In Securely</button>
          <p id="login-error" class="text-danger small mt-2 d-none"></p>
        </form>
      </div>
    </section>
  `;

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl?.classList.add('d-none');
    const fd = new FormData(form);
    try {
      await onSubmit({
        username: String(fd.get('username') || ''),
        password: String(fd.get('password') || ''),
        remember: true,
      });
    } catch (error) {
      if (errorEl) {
        errorEl.textContent = error.message || 'Login failed';
        errorEl.classList.remove('d-none');
      }
    }
  });
}
