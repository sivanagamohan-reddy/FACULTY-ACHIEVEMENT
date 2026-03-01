import { apiGet, apiPost, apiPut, setAuthState, clearAuthState, getAuthState } from './services/api.js';
import { renderLoginPage } from './auth/loginPage.js';

const app = document.getElementById('app');
const headerBack = document.getElementById('header-back');
const headerMenu = document.getElementById('header-menu');
const headerAvatar = document.getElementById('header-avatar');
const headerAdminActions = document.getElementById('header-admin-actions');
const brandEl = document.querySelector('.brand');
const topbar = document.querySelector('.topbar');
const LAST_LOGOUT_AT_KEY = 'faculty_tracker_last_logout_at';
const FALLBACK_DEPARTMENTS = ['CSE', 'CSE(DS)', 'CSE(AI)', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'MBA'];
let adminModalHost = null;
let metaOptionsCache = null;
let appBootstrapped = false;
const moduleCache = {};

const routes = {
  login: { role: 'public', render: showLogin },
  'faculty-dashboard': { role: 'faculty', render: showFacultyDashboard },
  'achievement-list': { role: 'auth', render: showAchievementList },
  publication: { role: 'faculty', render: showPublicationPage },
  fdp: { role: 'faculty', render: showFdpPage },
  conference: { role: 'faculty', render: showConferencePage },
  workshop: { role: 'faculty', render: showWorkshopPage },
  patent: { role: 'faculty', render: showPatentPage },
  reports: { role: 'faculty', render: () => showInfo('Reports & Analytics') },
  search: { role: 'auth', render: () => showInfo('Global Search') },
  ai: { role: 'faculty', render: () => showInfo('AI Assistant') },
  'hod-dashboard': { role: 'hod', render: showHodDashboard },
  'principal-dashboard': { role: 'principal', render: showPrincipalDashboard },
};

window.addEventListener('hashchange', renderRoute);
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
window.addEventListener('error', (event) => {
  showFatalStartupError(event?.error?.message || event?.message || 'Unexpected startup error');
});
window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event?.reason?.message || event?.reason || 'Unexpected promise rejection');
  showFatalStartupError(msg);
});
headerBack?.addEventListener('click', () => {
  const auth = getAuthState();
  if (!auth?.user) {
    location.hash = '#login';
    return;
  }
  if (auth.user.role === 'faculty') location.hash = '#faculty-dashboard';
  if (auth.user.role === 'hod') location.hash = '#hod-dashboard';
  if (auth.user.role === 'principal') location.hash = '#principal-dashboard';
});
headerAvatar?.addEventListener('click', async () => {
  const auth = getAuthState();
  if (!auth?.user) return;
  await openProfileModal(auth.user);
});
headerMenu?.addEventListener('click', () => {
  const bootstrapApi = window.bootstrap;
  if (!bootstrapApi) return;
  const navEl = document.getElementById('mobileActionNav');
  if (!navEl) return;
  const offcanvas = bootstrapApi.Offcanvas.getOrCreateInstance(navEl);
  offcanvas.show();
});

async function bootstrap() {
  if (appBootstrapped) return;
  appBootstrapped = true;
  await fetchSession();
  await renderRoute();
}

function showFatalStartupError(message) {
  if (!app || app.innerHTML?.trim()) return;
  app.innerHTML = `
    <section class="py-4">
      <div class="white-card border border-danger-subtle">
        <h5 class="text-danger fw-bold mb-2">Application failed to start</h5>
        <p class="subtle mb-3">${escapeHtml(String(message || 'Unknown error'))}</p>
        <button class="btn btn-outline-primary" onclick="location.reload()">Reload</button>
      </div>
    </section>
  `;
}

async function fetchSession() {
  try {
    const data = await apiGet('/api/auth/me');
    setAuthState({ user: data.user });
  } catch (_err) {
    clearAuthState();
  }
}

async function renderRoute() {
  const { routeKey } = parseHashState();
  const route = routes[routeKey] || routes.login;
  const auth = getAuthState();
  const isLogin = routeKey === 'login';

  document.body.classList.toggle('login-mode', isLogin);
  if (topbar) {
    topbar.classList.toggle('d-none', isLogin);
  }

  if (route.role !== 'public') {
    if (!auth?.user) {
      location.hash = '#login';
      return;
    }
    if (route.role !== 'auth' && auth.user.role !== route.role) {
      location.hash = roleDefaultRoute(auth.user.role);
      return;
    }
  }

  setHeaderState(routeKey, auth?.user);
  app.innerHTML = loadingTemplate();
  try {
    await route.render();
    runReveal();
  } catch (error) {
    handleRenderError(error, auth?.user);
  }
}

function parseHashState() {
  const raw = (location.hash || '#login').replace(/^#/, '');
  const [key, query] = raw.split('?');
  const routeKey = key || 'login';
  const params = {};
  const search = new URLSearchParams(query || '');
  for (const [k, v] of search.entries()) {
    params[k] = v;
  }
  return { routeKey, params };
}

function setHeaderState(routeKey, user) {
  if (!brandEl || !headerBack || !headerAvatar || !headerMenu) return;
  const showBack = routeKey !== 'login' && routeKey !== roleDefaultRoute(user?.role).replace('#', '');
  headerBack.classList.toggle('d-none', !showBack);
  headerAvatar.classList.toggle('d-none', !user);
  headerMenu.classList.toggle('d-none', !user);
  headerAvatar.textContent = getUserInitials(user);
  brandEl.textContent = user ? `${capitalize(user.role)} Dashboard` : 'Faculty Tracker';
  renderHeaderAdminActions(routeKey, user);
  renderMobileActionNav(routeKey, user);
}

function renderHeaderAdminActions(routeKey, user) {
  if (!headerAdminActions) return;
  const isAdmin = user?.role === 'hod' || user?.role === 'principal';
  const isOwnDashboard = routeKey === `${user?.role}-dashboard`;

  if (!isAdmin || !isOwnDashboard) {
    headerAdminActions.classList.add('d-none');
    headerAdminActions.innerHTML = '';
    return;
  }

  headerAdminActions.classList.remove('d-none');
  headerAdminActions.innerHTML = `
    <button class="btn admin-btn admin-btn-secondary" id="btn-open-search" type="button">Search</button>
    <div class="dropdown">
      <button class="btn admin-btn admin-btn-primary dropdown-toggle" data-bs-toggle="dropdown" type="button">Create</button>
      <ul class="dropdown-menu dropdown-menu-end shadow-sm">
        <li><button class="dropdown-item" id="btn-create-single" type="button">Single User</button></li>
        <li><button class="dropdown-item" id="btn-create-bulk" type="button">Bulk Upload</button></li>
      </ul>
    </div>
    <button class="btn admin-btn admin-btn-secondary" id="btn-update-user" type="button">Update</button>
    <button class="btn admin-btn admin-btn-danger" id="btn-remove-user" type="button">Remove</button>
  `;

  bindHeaderAdminActions(user.role);
}

function bindHeaderAdminActions(role) {
  const bootstrapApi = window.bootstrap;
  if (!bootstrapApi) return;

  ensureAdminModalShell(role);
  const singleModal = new bootstrapApi.Modal(document.getElementById('singleUserModal'));
  const bulkModal = new bootstrapApi.Modal(document.getElementById('bulkUserModal'));
  const updateModal = new bootstrapApi.Modal(document.getElementById('updateUserModal'));
  const removeModal = new bootstrapApi.Modal(document.getElementById('removeUserModal'));

  document.getElementById('btn-create-single')?.addEventListener('click', () => singleModal.show());
  document.getElementById('btn-create-bulk')?.addEventListener('click', () => bulkModal.show());
  document.getElementById('btn-open-search')?.addEventListener('click', () => {
    location.hash = '#search';
  });
  document.getElementById('btn-update-user')?.addEventListener('click', async () => {
    updateModal.show();
  });
  document.getElementById('btn-remove-user')?.addEventListener('click', () => {
    removeModal.show();
  });

  document.getElementById('single-user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const submitBtn = form?.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      const result = await apiPost('/api/admin/users/single', {
        full_name: String(fd.get('full_name') || ''),
        username: String(fd.get('username') || ''),
        email: String(fd.get('email') || ''),
        password: String(fd.get('password') || ''),
        role: role === 'principal' ? String(fd.get('role') || 'faculty') : 'faculty',
        department: String(fd.get('department') || ''),
      });
      singleModal.hide();
      if (form) form.reset();
      alert(`User created successfully: ${result?.user?.username || 'new user'}`);
    } catch (error) {
      alert(`Create failed: ${String(error?.message || 'Unexpected error')}`);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  document.getElementById('download-bulk-template')?.addEventListener('click', () => {
    downloadBulkTemplate(role);
  });

  document.getElementById('bulk-user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form?.querySelector('#bulk-file-input');
    const file = fileInput?.files?.[0];
    if (!file) {
      alert('Please choose an Excel/CSV file first.');
      return;
    }

    const submitBtn = form?.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      const users = await parseBulkUsersFromFile(file, role);
      if (!users.length) {
        throw new Error('No valid rows found in uploaded file');
      }
      const result = await apiPost('/api/admin/users/bulk', { users });
      bulkModal.hide();
      if (form) form.reset();
      const errors = Array.isArray(result?.errors) ? result.errors : [];
      const errorPreview = errors
        .slice(0, 8)
        .map((entry) => `Row ${entry.row || '-'}: ${entry.reason || 'Validation failed'}`)
        .join('\n');
      const moreErrors = errors.length > 8 ? `\n...and ${errors.length - 8} more.` : '';
      const summary = `Bulk completed.\nCreated: ${result.created}\nSkipped: ${result.skipped}`;
      alert(errors.length ? `${summary}\n\nIssues:\n${errorPreview}${moreErrors}` : summary);
    } catch (error) {
      alert(`Bulk create failed: ${String(error?.message || 'Unexpected error')}`);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  document.getElementById('update-user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const submitBtn = form?.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (role === 'hod') {
        const username = String(fd.get('username') || '');
        const password = String(fd.get('password') || '');
        await updateHodUserPasswordByUsername(username, password);
      } else if (role === 'principal') {
        await apiPost('/api/admin/users/update-by-username', {
          username: String(fd.get('username') || ''),
          password: String(fd.get('password') || ''),
          role: String(fd.get('role') || ''),
          department: String(fd.get('department') || ''),
        });
      } else {
        const id = String(fd.get('id') || '');
        await apiPut(`/api/admin/users/${encodeURIComponent(id)}`, {
          full_name: String(fd.get('full_name') || ''),
          email: String(fd.get('email') || ''),
          password: String(fd.get('password') || ''),
          role: role === 'principal' ? String(fd.get('role') || '') : undefined,
          department: role === 'principal' ? String(fd.get('department') || '') : undefined,
          is_active: Boolean(fd.get('is_active')),
        });
      }

      updateModal.hide();
      if (form) form.reset();
      alert('User updated successfully.');
    } catch (error) {
      alert(`Update failed: ${String(error?.message || 'Unexpected error')}`);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  document.getElementById('remove-user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const submitBtn = form?.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      await apiPost('/api/admin/users/remove', {
        username: String(fd.get('username') || ''),
      });
      removeModal.hide();
      if (form) form.reset();
      alert('User moved to removed list successfully.');
    } catch (error) {
      alert(`Remove failed: ${String(error?.message || 'Unexpected error')}`);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  hydrateDynamicDropdowns(role).catch(() => {
    // non-blocking UI enhancement
  });
}

function renderMobileActionNav(routeKey, user) {
  const existing = document.getElementById('mobile-action-nav-host');
  if (!user) {
    if (existing) existing.remove();
    return;
  }

  const isAdmin = user.role === 'hod' || user.role === 'principal';
  const isOwnDashboard = routeKey === `${user.role}-dashboard`;
  const showAdminActions = isAdmin && isOwnDashboard;

  const host = existing || document.createElement('div');
  host.id = 'mobile-action-nav-host';
  host.innerHTML = `
      <div class="offcanvas offcanvas-start mobile-action-nav" tabindex="-1" id="mobileActionNav" aria-labelledby="mobileActionNavLabel">
      <div class="offcanvas-header">
        <h5 class="offcanvas-title" id="mobileActionNavLabel">Navigation</h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body d-flex flex-column gap-2">
        ${showAdminActions ? `
          <button class="btn admin-btn admin-btn-secondary w-100 text-start" id="m-nav-search" type="button">Search</button>
          <button class="btn admin-btn admin-btn-primary w-100 text-start" id="m-nav-create-single" type="button">Create Single User</button>
          <button class="btn admin-btn admin-btn-primary w-100 text-start" id="m-nav-create-bulk" type="button">Bulk Upload</button>
          <button class="btn admin-btn admin-btn-secondary w-100 text-start" id="m-nav-update-user" type="button">Update User</button>
          <button class="btn admin-btn admin-btn-danger w-100 text-start" id="m-nav-remove-user" type="button">Remove User</button>
          <hr class="my-2" />
        ` : ''}
        <button class="btn admin-btn admin-btn-secondary w-100 text-start" id="m-nav-profile" type="button">My Profile</button>
        <button class="btn btn-outline-danger w-100 text-start" id="m-nav-logout" type="button">Logout</button>
      </div>
    </div>
  `;

  if (!existing) document.body.appendChild(host);

  bindMobileActionNav(user, showAdminActions);
}

function bindMobileActionNav(user, showAdminActions) {
  const bootstrapApi = window.bootstrap;
  const navEl = document.getElementById('mobileActionNav');
  if (!navEl || !bootstrapApi) return;
  const offcanvas = bootstrapApi.Offcanvas.getOrCreateInstance(navEl);

  const closeNav = () => offcanvas.hide();

  document.getElementById('m-nav-create-single')?.addEventListener('click', () => {
    closeNav();
    document.getElementById('btn-create-single')?.click();
  });
  document.getElementById('m-nav-create-bulk')?.addEventListener('click', () => {
    closeNav();
    document.getElementById('btn-create-bulk')?.click();
  });
  document.getElementById('m-nav-update-user')?.addEventListener('click', () => {
    closeNav();
    document.getElementById('btn-update-user')?.click();
  });
  document.getElementById('m-nav-remove-user')?.addEventListener('click', () => {
    closeNav();
    document.getElementById('btn-remove-user')?.click();
  });
  document.getElementById('m-nav-search')?.addEventListener('click', () => {
    closeNav();
    location.hash = '#search';
  });
  document.getElementById('m-nav-profile')?.addEventListener('click', async () => {
    closeNav();
    await openProfileModal(user);
  });
  document.getElementById('m-nav-logout')?.addEventListener('click', async () => {
    closeNav();
    await performLogout();
  });

  if (!showAdminActions) {
    ['m-nav-search', 'm-nav-create-single', 'm-nav-create-bulk', 'm-nav-update-user', 'm-nav-remove-user'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }
}

function ensureAdminModalShell(role) {
  if (adminModalHost) adminModalHost.remove();

  const roleFieldForSingle = role === 'principal'
    ? `<div class="mb-2"><label class="form-label">Role</label><select class="form-select" name="role"><option value="faculty">Faculty</option><option value="hod">HOD</option><option value="principal">Principal</option></select></div>`
    : '<input type="hidden" name="role" value="faculty" />';
  const departmentFieldForSingle = role === 'principal'
    ? `
              <div class="mb-2">
                <label class="form-label">Department</label>
                <select class="form-select" name="department" id="single-department-select" required>
                  ${departmentOptions()}
                </select>
              </div>
      `
    : '<input type="hidden" name="department" id="single-department-hidden" />';

  const roleFieldForUpdate = role === 'principal'
    ? `<div class="mb-2"><label class="form-label">Role</label><select class="form-select" name="role" required><option value="faculty">Faculty</option><option value="hod">HOD</option></select></div>`
    : '';
  const departmentFieldForUpdate = role === 'principal'
    ? `
              <div class="mb-2">
                <label class="form-label">Department</label>
                <select class="form-select" name="department" id="update-department-select" required>
                  ${departmentOptions()}
                </select>
              </div>
      `
    : '';
  const updateModalBody = role === 'hod'
    ? `
              <div class="mb-2"><label class="form-label">Username</label><input class="form-control" name="username" autocomplete="off" required /></div>
              <div class="mb-2"><label class="form-label">New Password</label><input class="form-control" name="password" type="password" minlength="8" required /></div>
              <p class="small text-muted mb-0">HOD can reset password for Faculty users only.</p>
      `
    : `
              <div class="mb-2"><label class="form-label">Username</label><input class="form-control" name="username" required /></div>
              <div class="mb-2"><label class="form-label">New Password</label><input class="form-control" name="password" type="password" minlength="8" required /></div>
              ${roleFieldForUpdate}
              ${departmentFieldForUpdate}
              <p class="small text-muted mb-0">Principal can update username-matched user role, department and password.</p>
      `;

  const bulkHint = role === 'principal'
    ? 'Upload Excel with columns: Faculty Name, ID, Mail, Password, Username, Role, Department'
    : 'Upload Excel with columns: Faculty Name, ID, Mail, Password, Username, Department';

  const templateNote = role === 'principal'
    ? 'Principal can set role and department columns. Missing role defaults to Faculty.'
    : 'HOD upload will always create Faculty users in HOD department.';

  const roleNote = role === 'hod' ? '<p class="small text-muted mb-0">HOD can create and update Faculty users only.</p>' : '';

  adminModalHost = document.createElement('div');
  adminModalHost.id = 'admin-modal-host';
  adminModalHost.innerHTML = `
    <div class="modal fade" id="singleUserModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title">Create Single User</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <form id="single-user-form">
            <div class="modal-body">
              <div class="mb-2"><label class="form-label">Full Name</label><input class="form-control" name="full_name" required /></div>
              <div class="mb-2"><label class="form-label">Username</label><input class="form-control" name="username" required /></div>
              <div class="mb-2"><label class="form-label">Email</label><input class="form-control" name="email" type="email" required /></div>
              <div class="mb-2"><label class="form-label">Password</label><input class="form-control" name="password" type="password" required /></div>
              ${roleFieldForSingle}
              ${departmentFieldForSingle}
              ${roleNote}
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary">Create User</button></div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="bulkUserModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title">Bulk Create Users</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <form id="bulk-user-form">
            <div class="modal-body">
              <p class="small text-muted">${bulkHint}</p>
              <div class="d-flex flex-wrap gap-2 mb-3">
                <button class="btn btn-outline-primary btn-sm" type="button" id="download-bulk-template">Download Template</button>
                <span class="small text-muted align-self-center">${templateNote}</span>
              </div>
              <input class="form-control" id="bulk-file-input" name="bulk_file" type="file" accept=".xlsx,.xls,.csv" required />
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary">Create Bulk</button></div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="updateUserModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title">Update User</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <form id="update-user-form">
            <div class="modal-body">
              ${updateModalBody}
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary">Update User</button></div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="removeUserModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title">Remove User</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <form id="remove-user-form">
            <div class="modal-body">
              <div class="mb-2"><label class="form-label">Username</label><input class="form-control" name="username" required /></div>
              <p class="small text-muted mb-0">${role === 'principal' ? 'Principal can remove Faculty and HOD users.' : 'HOD can remove Faculty users from own department only.'}</p>
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-danger">Remove User</button></div>
          </form>
        </div>
      </div>
    </div>

  `;

  document.body.appendChild(adminModalHost);
}

async function openProfileModal(authUser) {
  ensureProfileModalShell();
  const profileBody = document.getElementById('profile-body');
  if (!profileBody) return;

  profileBody.innerHTML = `<div class="subtle">Loading profile...</div>`;

  const profile = await loadCurrentProfile(authUser);
  const lastLogout = formatLastLogout(getLastLogoutAt());
  profileBody.innerHTML = `
    <div class="d-flex flex-column gap-2">
      <div><strong>Name:</strong> ${escapeHtml(profile.full_name || profile.name || '-')}</div>
      <div><strong>Username:</strong> ${escapeHtml(profile.username || '-')}</div>
      <div><strong>Email:</strong> ${escapeHtml(profile.email || '-')}</div>
      <div><strong>Role:</strong> ${escapeHtml(profile.role || '-')}</div>
      <div><strong>Department:</strong> ${escapeHtml(profile.department || '-')}</div>
      <div><strong>Last Logout:</strong> ${escapeHtml(lastLogout)}</div>
    </div>
  `;

  const bootstrapApi = window.bootstrap;
  if (!bootstrapApi) return;
  const profileModalEl = document.getElementById('profileModal');
  const profileModal = new bootstrapApi.Modal(profileModalEl);
  document.getElementById('profile-logout-btn')?.addEventListener('click', async () => {
    profileModal.hide();
    await performLogout();
  }, { once: true });
  profileModal.show();
}

function ensureProfileModalShell() {
  if (document.getElementById('profileModal')) return;
  const host = document.createElement('div');
  host.id = 'profile-modal-host';
  host.innerHTML = `
    <div class="modal fade" id="profileModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title">My Profile</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body" id="profile-body">Loading...</div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-danger" id="profile-logout-btn">Logout</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(host);
}

async function loadCurrentProfile(authUser) {
  try {
    const res = await apiGet('/api/profile');
    if (res?.profile) return res.profile;
  } catch (_error) {
    try {
      const adminRes = await apiGet('/api/admin/profile');
      if (adminRes?.profile) return adminRes.profile;
    } catch (_ignored) {
      // ignore and use auth payload fallback
    }
  }
  return {
    full_name: authUser?.name || '',
    username: authUser?.username || '',
    email: authUser?.email || '',
    role: authUser?.role || '',
    department: authUser?.department || '',
  };
}

function getUserInitials(user) {
  const source = String(user?.name || user?.username || user?.email || 'AA').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function setLastLogoutAt(isoString) {
  try {
    localStorage.setItem(LAST_LOGOUT_AT_KEY, String(isoString || ''));
  } catch (_err) {
    // ignore storage failures
  }
}

function getLastLogoutAt() {
  try {
    return localStorage.getItem(LAST_LOGOUT_AT_KEY) || '';
  } catch (_err) {
    return '';
  }
}

function formatLastLogout(isoString) {
  if (!isoString) return 'No logout record yet';
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return 'No logout record yet';
  return dt.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function getMetaOptions() {
  if (metaOptionsCache) return metaOptionsCache;
  try {
    const raw = await apiGet('/api/meta/options');
    const currentYear = new Date().getFullYear();
    const fallbackYears = [];
    for (let y = currentYear - 3; y <= currentYear + 2; y += 1) {
      fallbackYears.push(`${y}-${String((y + 1) % 100).padStart(2, '0')}`);
    }
    const years = Array.isArray(raw?.academic_years) && raw.academic_years.length ? raw.academic_years : fallbackYears;
    const departments = Array.isArray(raw?.departments) && raw.departments.length ? raw.departments : FALLBACK_DEPARTMENTS;
    metaOptionsCache = {
      academic_years: years,
      default_academic_year: raw?.default_academic_year || years[Math.min(3, years.length - 1)],
      departments,
      default_department: raw?.default_department || 'CSE(DS)',
    };
    return metaOptionsCache;
  } catch (_error) {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear - 3; y <= currentYear + 2; y += 1) {
      years.push(`${y}-${String((y + 1) % 100).padStart(2, '0')}`);
    }
    return {
      academic_years: years,
      default_academic_year: years[3],
      departments: FALLBACK_DEPARTMENTS,
      default_department: 'CSE(DS)',
    };
  }
}

function departmentOptions(departments = FALLBACK_DEPARTMENTS, selected = 'CSE(DS)') {
  return departments
    .map((dept) => `<option value="${escapeHtml(dept)}"${dept === selected ? ' selected' : ''}>${escapeHtml(dept)}</option>`)
    .join('');
}

async function updateHodUserPasswordByUsername(usernameRaw, passwordRaw) {
  const username = String(usernameRaw || '').trim().toLowerCase();
  const password = String(passwordRaw || '');
  if (!username || !password) {
    throw new Error('Username and new password are required');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  try {
    await apiPost('/api/admin/users/password-reset', { username, password });
    return;
  } catch (error) {
    const msg = String(error?.message || '').toLowerCase();
    const endpointMissing = msg.includes('cannot post /api/admin/users/password-reset') || msg.includes('not found');
    if (!endpointMissing) throw error;
  }

  const res = await apiGet('/api/admin/users');
  const users = Array.isArray(res?.users) ? res.users : [];
  const target = users.find((u) => String(u?.username || '').trim().toLowerCase() === username);
  if (!target?.id) {
    throw new Error('User not found for the entered username');
  }

  await apiPut(`/api/admin/users/${encodeURIComponent(String(target.id))}`, {
    password,
  });
}

async function hydrateDynamicDropdowns(role) {
  const opts = await getMetaOptions();
  const departments = Array.isArray(opts?.departments) && opts.departments.length ? opts.departments : FALLBACK_DEPARTMENTS;
  const defaultDepartment = opts?.default_department || 'CSE(DS)';

  const singleSelect = document.getElementById('single-department-select');
  if (singleSelect) {
    singleSelect.innerHTML = departmentOptions(departments, defaultDepartment);
  }

  const updateSelect = document.getElementById('update-department-select');
  if (updateSelect) {
    updateSelect.innerHTML = departmentOptions(departments, defaultDepartment);
  }

  if (role === 'hod') {
    const hidden = document.getElementById('single-department-hidden');
    if (hidden) hidden.value = defaultDepartment;
  }
}

async function loadUsersIntoSelect() {
  const select = document.getElementById('update-user-id');
  if (!select) return;
  const res = await apiGet('/api/admin/users');
  select.innerHTML = (res.users || [])
    .map((u) => `<option value="${u.id}">${escapeHtml(u.username)} (${escapeHtml(u.role)})</option>`)
    .join('');
}

function downloadBulkTemplate(role) {
  const xlsx = window.XLSX;
  const headers = role === 'principal'
    ? ['Faculty Name', 'ID', 'Mail', 'Password', 'Username', 'Role', 'Department']
    : ['Faculty Name', 'ID', 'Mail', 'Password', 'Username', 'Department'];

  const sampleRows = role === 'principal'
    ? [
        { 'Faculty Name': 'Faculty One', ID: 'FAC001', Mail: 'faculty1@college.edu', Password: 'Faculty@123', Username: 'faculty1', Role: 'faculty', Department: 'CSE(DS)' },
        { 'Faculty Name': 'HOD One', ID: 'HOD001', Mail: 'hod2@college.edu', Password: 'Hod@12345', Username: 'hod2', Role: 'hod', Department: 'CSE' },
      ]
    : [
        { 'Faculty Name': 'Faculty One', ID: 'FAC001', Mail: 'faculty1@college.edu', Password: 'Faculty@123', Username: 'faculty1', Department: 'CSE(DS)' },
        { 'Faculty Name': 'Faculty Two', ID: 'FAC002', Mail: 'faculty2@college.edu', Password: 'Faculty@456', Username: 'faculty2', Department: 'CSE(DS)' },
      ];

  if (xlsx) {
    const sheet = xlsx.utils.json_to_sheet(sampleRows, { header: headers });
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'Users');
    xlsx.writeFile(workbook, role === 'principal' ? 'principal_bulk_template.xlsx' : 'hod_bulk_template.xlsx');
    return;
  }

  const csv = [headers.join(','), ...sampleRows.map((row) => headers.map((h) => `"${String(row[h] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = role === 'principal' ? 'principal_bulk_template.csv' : 'hod_bulk_template.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

async function parseBulkUsersFromFile(file, role) {
  const rows = await parseSpreadsheetRows(file);
  const users = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const normalized = normalizeRowKeys(row);
    const fullName = pickFirst(normalized, ['facultyname', 'name', 'fullname']);
    const email = pickFirst(normalized, ['mail', 'email']);
    const password = pickFirst(normalized, ['password']);
    const usernameRaw = pickFirst(normalized, ['username']);
    const idValue = pickFirst(normalized, ['id', 'facultyid', 'employeeid']);
    const department = pickFirst(normalized, ['department', 'dept']);
    const derivedUsername = usernameRaw || idValue || '';

    if (!fullName && !email && !password && !derivedUsername) continue;

    const user = {
      row_number: i + 2,
      full_name: String(fullName || '').trim(),
      email: String(email || '').trim().toLowerCase(),
      password: String(password || '').trim(),
      username: String(derivedUsername || '').trim().toLowerCase(),
      department: String(department || '').trim(),
    };

    if (role === 'principal') {
      const roleVal = String(pickFirst(normalized, ['role']) || '').trim().toLowerCase();
      user.role = roleVal || 'faculty';
    }

    users.push(user);
  }

  return users;
}

async function parseSpreadsheetRows(file) {
  const ext = String(file.name || '').toLowerCase();
  if (ext.endsWith('.csv')) {
    const text = await file.text();
    return parseCsvRows(text);
  }

  const xlsx = window.XLSX;
  if (!xlsx) throw new Error('Excel parser is not available. Refresh and try again.');

  const buffer = await file.arrayBuffer();
  const wb = xlsx.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  return xlsx.utils.sheet_to_json(ws, { defval: '' });
}

function parseCsvRows(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function normalizeRowKeys(row) {
  const out = {};
  Object.keys(row || {}).forEach((key) => {
    const normalizedKey = String(key || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    out[normalizedKey] = row[key];
  });
  return out;
}

function pickFirst(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
}

function roleDefaultRoute(role) {
  if (role === 'faculty') return '#faculty-dashboard';
  if (role === 'hod') return '#hod-dashboard';
  if (role === 'principal') return '#principal-dashboard';
  return '#login';
}

function showLogin() {
  renderLoginPage(app, async ({ username, password, remember }) => {
    const result = await apiPost('/api/auth/login', { username, password });
    setAuthState({ user: result.user, remember });
    location.hash = result.redirect || roleDefaultRoute(result.user?.role);
  });
}

async function showFacultyDashboard() {
  const { renderFacultyDashboard } = await getModule(
    'facultyDashboard',
    () => import('./faculty-dashboard/facultyDashboardPage.js')
  );
  const options = await getMetaOptions();
  const selectedAcademicYear = getSavedDashboardFilter('faculty_academic_year') || options.default_academic_year;
  const data = await apiGet(`/api/faculty-dashboard/summary?academic_year=${encodeURIComponent(selectedAcademicYear)}`);
  renderFacultyDashboard(app, {
    ...data,
    filter_options: {
      academic_years: options.academic_years || [],
      selected_academic_year: selectedAcademicYear,
    },
  });
  bindFacultyDashboardFilters();
}

async function showPublicationPage() {
  const { renderPublicationPage } = await getModule(
    'publicationPage',
    () => import('./faculty-dashboard/pages/publicationPage.js')
  );
  return renderPublicationPage(app);
}

async function showFdpPage() {
  const { renderFdpPage } = await getModule(
    'fdpPage',
    () => import('./faculty-dashboard/pages/fdpPage.js')
  );
  return renderFdpPage(app);
}

async function showConferencePage() {
  const { renderConferencePage } = await getModule(
    'conferencePage',
    () => import('./faculty-dashboard/pages/conferencePage.js')
  );
  return renderConferencePage(app);
}

async function showWorkshopPage() {
  const { renderWorkshopPage } = await getModule(
    'workshopPage',
    () => import('./faculty-dashboard/pages/workshopPage.js')
  );
  return renderWorkshopPage(app);
}

async function showPatentPage() {
  const { renderPatentPage } = await getModule(
    'patentPage',
    () => import('./faculty-dashboard/pages/patentPage.js')
  );
  return renderPatentPage(app);
}

async function showHodDashboard() {
  const { renderHodDashboard } = await getModule(
    'hodDashboard',
    () => import('./hod-dashboard/hodDashboardPage.js')
  );
  const options = await getMetaOptions();
  const selectedAcademicYear = getSavedDashboardFilter('hod_academic_year') || options.default_academic_year;
  const data = await apiGet(`/api/hod-dashboard/summary?academic_year=${encodeURIComponent(selectedAcademicYear)}`);
  renderHodDashboard(app, {
    ...data,
    filter_options: {
      academic_years: options.academic_years || [],
      selected_academic_year: selectedAcademicYear,
      department: options.default_department || '',
    },
  });
  bindHodDashboardFilters();
}

async function showPrincipalDashboard() {
  const { renderPrincipalDashboard } = await getModule(
    'principalDashboard',
    () => import('./principal-dashboard/principalDashboardPage.js')
  );
  const options = await getMetaOptions();
  const selectedAcademicYear = getSavedDashboardFilter('principal_academic_year') || options.default_academic_year;
  const selectedDepartment = getSavedDashboardFilter('principal_department') || options.default_department || 'CSE(DS)';
  const data = await apiGet(
    `/api/principal-dashboard/summary?academic_year=${encodeURIComponent(selectedAcademicYear)}&department=${encodeURIComponent(selectedDepartment)}`
  );
  renderPrincipalDashboard(app, {
    ...data,
    filter_options: {
      academic_years: options.academic_years || [],
      departments: options.departments || FALLBACK_DEPARTMENTS,
      selected_academic_year: selectedAcademicYear,
      selected_department: selectedDepartment,
    },
  });
  bindPrincipalDashboardFilters();
}

function bindHodDashboardFilters() {
  const form = document.getElementById('hod-filter-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const year = String(fd.get('academic_year') || '');
    setSavedDashboardFilter('hod_academic_year', year);
    renderRoute();
  });
}

function bindFacultyDashboardFilters() {
  const form = document.getElementById('faculty-filter-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const year = String(fd.get('academic_year') || '');
    setSavedDashboardFilter('faculty_academic_year', year);
    renderRoute();
  });
}

function bindPrincipalDashboardFilters() {
  const form = document.getElementById('principal-filter-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const year = String(fd.get('academic_year') || '');
    const dept = String(fd.get('department') || '');
    setSavedDashboardFilter('principal_academic_year', year);
    setSavedDashboardFilter('principal_department', dept);
    renderRoute();
  });
}

async function showAchievementList() {
  const auth = getAuthState();
  const { params } = parseHashState();
  const rawType = String(params.type || 'publication').toLowerCase();
  const validTypes = ['publication', 'fdp', 'conference', 'workshop', 'patent'];
  const type = validTypes.includes(rawType) ? rawType : 'publication';

  const options = await getMetaOptions();
  const selectedYearFromHash = String(params.year || '');
  const selectedDepartmentFromHash = String(params.department || '');
  const selectedYearByRole = auth?.user?.role === 'faculty'
    ? (getSavedDashboardFilter('faculty_academic_year') || options.default_academic_year)
    : (auth?.user?.role === 'hod'
      ? (getSavedDashboardFilter('hod_academic_year') || options.default_academic_year)
      : (getSavedDashboardFilter('principal_academic_year') || options.default_academic_year));
  const academicYear = selectedYearFromHash || selectedYearByRole;
  const selectedDepartment = auth?.user?.role === 'principal'
    ? (selectedDepartmentFromHash || getSavedDashboardFilter('principal_department') || options.default_department || 'CSE(DS)')
    : '';
  const res = await apiGet(
    `/api/achievements?type=${encodeURIComponent(type)}&academic_year=${encodeURIComponent(academicYear)}&department=${encodeURIComponent(selectedDepartment)}`
  );
  const items = Array.isArray(res?.items) ? res.items : [];

  app.innerHTML = `
    <section>
      <div class="white-card mb-3 reveal">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h2 class="page-title mb-1">${escapeHtml(type.toUpperCase())} Uploads</h2>
            <p class="subtle mb-0">Academic Year: ${escapeHtml(academicYear)}${selectedDepartment ? ` | Department: ${escapeHtml(selectedDepartment)}` : ''}</p>
          </div>
          ${auth?.user?.role === 'faculty' ? `<a class="btn btn-primary" href="#${type}">Add New</a>` : ''}
        </div>
      </div>
      <div class="white-card reveal">
        ${items.length ? `
          <div class="table-responsive">
            <table class="table align-middle">
              <thead><tr><th>Title</th><th>Date</th><th>Uploader Name</th><th>Username</th><th>User ID</th><th class="text-end">Action</th></tr></thead>
              <tbody>
                ${items.map((item, idx) => `
                  <tr>
                    <td>${escapeHtml(item.title || '-')}</td>
                    <td>${escapeHtml(item.event_date || '-')}</td>
                    <td>${escapeHtml(item.owner_name || '-')}</td>
                    <td>${escapeHtml(item.owner_username || '-')}</td>
                    <td>${escapeHtml(item.owner_id || '-')}</td>
                    <td class="text-end"><button class="btn btn-outline-primary btn-sm" data-view-item="${idx}">View</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p class="subtle mb-0">No uploads found for this filter.</p>'}
      </div>
    </section>
  `;
  ensureAchievementDetailModal();
  bindAchievementRowActions(items);
}

function bindAchievementRowActions(items) {
  const buttons = app.querySelectorAll('[data-view-item]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-view-item'));
      const item = items[idx];
      if (!item) return;
      openAchievementDetail(item);
    });
  });
}

function ensureAchievementDetailModal() {
  if (document.getElementById('achievementDetailModal')) return;
  const host = document.createElement('div');
  host.id = 'achievement-detail-modal-host';
  host.innerHTML = `
    <div class="modal fade" id="achievementDetailModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header"><h5 class="modal-title">Uploaded Data</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body" id="achievement-detail-body">Loading...</div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" id="achievement-download-pdf">Download PDF</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(host);
}

function openAchievementDetail(item) {
  const body = document.getElementById('achievement-detail-body');
  if (!body) return;
  const details = item?.details && typeof item.details === 'object' ? item.details : {};
  const rows = Object.entries(details)
    .filter(([key]) => !['attachment', 'owner_id', 'owner_role', 'owner_name', 'owner_username', 'department'].includes(key))
    .map(([key, val]) => `<div><strong>${escapeHtml(prettyLabel(key))}:</strong> ${escapeHtml(String(val ?? '-'))}</div>`)
    .join('');
  const attachment = details.attachment && typeof details.attachment === 'object' ? details.attachment : null;
  const attachmentHtml = renderAttachmentPreview(attachment);
  body.innerHTML = `
    <div class="d-flex flex-column gap-2">
      <div><strong>Title:</strong> ${escapeHtml(item?.title || '-')}</div>
      <div><strong>Type:</strong> ${escapeHtml(item?.type || '-')}</div>
      <div><strong>Date:</strong> ${escapeHtml(item?.event_date || '-')}</div>
      <div><strong>Uploaded By:</strong> ${escapeHtml(item?.owner_name || item?.owner_username || '-')}</div>
      <div><strong>Username:</strong> ${escapeHtml(item?.owner_username || '-')}</div>
      <div><strong>User ID:</strong> ${escapeHtml(item?.owner_id || '-')}</div>
      ${rows || '<div><strong>Details:</strong> -</div>'}
      ${attachmentHtml}
    </div>
  `;
  const downloadBtn = document.getElementById('achievement-download-pdf');
  if (downloadBtn) {
    downloadBtn.onclick = () => downloadAchievementPdf(item);
  }

  const bootstrapApi = window.bootstrap;
  if (!bootstrapApi) return;
  const modal = new bootstrapApi.Modal(document.getElementById('achievementDetailModal'));
  modal.show();
}

function renderAttachmentPreview(attachment) {
  if (!attachment?.data_url) return '';
  const type = String(attachment.type || '').toLowerCase();
  if (type.startsWith('image/')) {
    return `
      <div class="mt-3">
        <strong>Attachment Preview:</strong>
        <div class="mt-2">
          <img src="${escapeHtml(attachment.data_url)}" alt="Uploaded attachment" class="img-fluid rounded border" style="max-height:320px" />
        </div>
      </div>
    `;
  }
  if (type === 'application/pdf') {
    return `
      <div class="mt-3">
        <strong>PDF Preview:</strong>
        <div class="mt-2 border rounded overflow-hidden" style="height:360px">
          <iframe src="${escapeHtml(attachment.data_url)}" title="PDF Preview" style="width:100%;height:100%;border:0"></iframe>
        </div>
      </div>
    `;
  }
  return `<div class="mt-3"><strong>Attachment:</strong> <a href="${escapeHtml(attachment.data_url)}" target="_blank" rel="noopener">${escapeHtml(attachment.name || 'file')}</a></div>`;
}

function prettyLabel(key) {
  return String(key || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

async function downloadAchievementPdf(item) {
  const jspdfApi = window.jspdf;
  if (!jspdfApi?.jsPDF) {
    alert('PDF library not loaded. Please refresh and try again.');
    return;
  }
  const doc = new jspdfApi.jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = 50;

  doc.setFontSize(16);
  doc.text('Faculty Tracker - Achievement Report', margin, y);
  y += 24;
  doc.setFontSize(11);
  const details = item?.details && typeof item.details === 'object' ? item.details : {};
  const fields = [
    ['Title', item?.title || '-'],
    ['Type', item?.type || '-'],
    ['Date', item?.event_date || '-'],
    ['Uploader Name', item?.owner_name || '-'],
    ['Username', item?.owner_username || '-'],
    ['User ID', item?.owner_id || '-'],
  ];
  Object.entries(details)
    .filter(([key]) => !['attachment', 'owner_id', 'owner_role', 'owner_name', 'owner_username', 'department'].includes(key))
    .forEach(([key, val]) => fields.push([prettyLabel(key), String(val ?? '-')]));

  for (const [label, val] of fields) {
    const line = `${label}: ${val}`;
    const lines = doc.splitTextToSize(line, 510);
    lines.forEach((part) => {
      if (y > 770) {
        doc.addPage();
        y = 50;
      }
      doc.text(part, margin, y);
      y += 16;
    });
  }

  const attachment = details.attachment && typeof details.attachment === 'object' ? details.attachment : null;
  if (attachment?.data_url) {
    const type = String(attachment.type || '').toLowerCase();
    if (type.startsWith('image/')) {
      if (y > 620) {
        doc.addPage();
        y = 50;
      }
      y += 12;
      doc.text('Attachment Image:', margin, y);
      y += 8;
      try {
        const pdfImageType = type.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(attachment.data_url, pdfImageType, margin, y, 520, 300);
        y += 312;
      } catch (_err) {
        doc.text('Unable to embed image preview in PDF.', margin, y + 18);
      }
    } else if (type === 'application/pdf') {
      if (y > 740) {
        doc.addPage();
        y = 50;
      }
      y += 18;
      doc.text('Attachment: PDF uploaded (see in-app preview).', margin, y);
    }
  }

  const fileNameBase = String(item?.title || 'achievement').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'achievement';
  doc.save(`${fileNameBase}_report.pdf`);
}

function showInfo(title) {
  app.innerHTML = `
    <section>
      <h2 class="page-title reveal" style="--delay:20ms">${title}</h2>
      <p class="subtle reveal" style="--delay:80ms">This module is connected and ready for integration.</p>
      <div class="white-card reveal" style="--delay:120ms">
        <div class="subtle">Use the profile menu to logout or manage your account.</div>
      </div>
    </section>
  `;
}

async function performLogout() {
  await apiPost('/api/auth/logout', {});
  setLastLogoutAt(new Date().toISOString());
  clearAuthState();
  location.hash = '#login';
}

function getSavedDashboardFilter(key) {
  try {
    return sessionStorage.getItem(`ft_filter_${key}`) || '';
  } catch (_error) {
    return '';
  }
}

function setSavedDashboardFilter(key, value) {
  try {
    sessionStorage.setItem(`ft_filter_${key}`, String(value || ''));
  } catch (_error) {
    // ignore storage failures
  }
}

function handleRenderError(error, user) {
  const msg = String(error?.message || 'Unexpected error');
  if (msg.toLowerCase().includes('authentication required') || msg.toLowerCase().includes('invalid or expired session')) {
    clearAuthState();
    location.hash = '#login';
    return;
  }
  if (msg.toLowerCase().includes('do not have access')) {
    location.hash = roleDefaultRoute(user?.role);
    return;
  }
  app.innerHTML = `
    <section class="py-4">
      <div class="white-card border border-danger-subtle">
        <h5 class="text-danger fw-bold">Unable to load page</h5>
        <p class="subtle mb-3">${escapeHtml(msg)}</p>
        <button class="btn btn-outline-primary" onclick="location.reload()">Retry</button>
      </div>
    </section>
  `;
}

function loadingTemplate() {
  return `
    <section class="py-4">
      <div class="white-card">
        <div class="d-flex align-items-center gap-2">
          <div class="spinner-border spinner-border-sm" role="status"></div>
          <span class="subtle">Loading...</span>
        </div>
      </div>
    </section>
  `;
}

function runReveal() {
  const elements = document.querySelectorAll('.reveal');
  elements.forEach((el) => requestAnimationFrame(() => el.classList.add('in')));
}

function capitalize(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function getModule(cacheKey, importer) {
  if (!moduleCache[cacheKey]) {
    moduleCache[cacheKey] = importer();
  }
  return moduleCache[cacheKey];
}
