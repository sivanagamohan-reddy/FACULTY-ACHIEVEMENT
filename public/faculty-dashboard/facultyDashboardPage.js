const colors = {
  publication: '#42A5F5',
  fdp: '#9575CD',
  conference: '#E91E63',
  workshop: '#FFA726',
  patent: '#66BB6A',
};

const iconByType = {
  publication: 'bi-file-earmark-text',
  fdp: 'bi-mortarboard',
  conference: 'bi-people',
  workshop: 'bi-tools',
  patent: 'bi-lightbulb',
};

export function renderFacultyDashboard(app, data) {
  const stats = data?.stats || { publications: 0, fdps: 0, conferences: 0, workshops: 0, patents: 0 };
  const recent = data?.recent || [];
  const years = data?.filter_options?.academic_years || [];
  const selectedYear = data?.filter_options?.selected_academic_year || '';

  app.innerHTML = `
    <section class="mb-4">
      <h1 class="hero reveal" style="--delay:30ms">Faculty Achievement<br/>Tracker</h1>
      <p class="subtle mb-4 reveal" style="--delay:80ms">Track and manage your academic achievements efficiently</p>
      <div class="white-card mb-3 reveal" style="--delay:95ms">
        <form id="faculty-filter-form" class="dashboard-filter-grid dashboard-filter-grid-hod">
          <div class="dashboard-filter-item">
            <label class="form-label mb-1">Academic Year</label>
            <select class="form-select" name="academic_year" required>
              ${years.map((y) => `<option value="${escapeHtml(y)}"${y === selectedYear ? ' selected' : ''}>${escapeHtml(y)}</option>`).join('')}
            </select>
          </div>
          <div class="dashboard-filter-action">
            <button class="btn btn-primary" type="submit">Submit</button>
          </div>
        </form>
      </div>

      <div class="dashboard-grid mb-4">
        ${statCard('Publications', stats.publications, 'publication', 0, selectedYear)}
        ${statCard('FDPs', stats.fdps, 'fdp', 1, selectedYear)}
        ${statCard('Conferences', stats.conferences, 'conference', 2, selectedYear)}
        ${statCard('Workshops', stats.workshops, 'workshop', 3, selectedYear)}
        ${statCard('Patents', stats.patents, 'patent', 4, selectedYear)}
      </div>

      <div class="action-stack mb-5">
        ${actionCard('Reports & Analytics', 'View detailed insights and statistics', '#9575CD', '#reports', 'bi-bar-chart-line')}
        ${actionCard('Global Search', 'Find records across all categories', '#66BB6A', '#search', 'bi-search')}
        ${actionCard('AI Assistant', 'Summarize and showcase achievements', '#AB47BC', '#ai', 'bi-stars')}
      </div>

      <div class="white-card reveal" style="--delay:220ms">
        <h2 class="page-title mb-3">Recent Activity</h2>
        ${recent.length ? recent.map(activityRow).join('') : '<p class="subtle">No activity found.</p>'}
      </div>
    </section>
  `;
}

function statCard(label, count, type, idx, year) {
  const color = colors[type];
  const icon = iconByType[type];
  const target = `#achievement-list?type=${encodeURIComponent(type)}&year=${encodeURIComponent(year || '')}`;
  return `
    <div class="stat-col reveal" style="--delay:${110 + idx * 45}ms">
      <a href="${target}" class="stat-card" style="background:${color}">
        <i class="bi ${icon} stat-ghost"></i>
        <div class="stat-title">${label}</div>
        <div class="d-flex align-items-center justify-content-between mt-3">
          <div class="stat-number">${count ?? 0}</div>
          <i class="bi ${icon} stat-icon"></i>
        </div>
      </a>
    </div>
  `;
}

function actionCard(title, subtitle, color, route, icon) {
  return `
    <a href="${route}" class="action-card reveal" style="background:linear-gradient(90deg, ${color}, ${color}d4)">
      <div class="d-flex align-items-center gap-3">
        <i class="bi ${icon} action-leading"></i>
        <div>
          <div class="action-title">${title}</div>
          <div class="action-sub">${subtitle}</div>
        </div>
      </div>
      <i class="bi bi-chevron-right action-chevron"></i>
    </a>
  `;
}

function activityRow(item) {
  const color = colors[item.type] || '#42A5F5';
  const icon = iconByType[item.type] || 'bi-file-earmark-text';
  return `
    <div class="activity-item d-flex align-items-center justify-content-between gap-3">
      <div class="d-flex align-items-center gap-3">
        <div class="activity-icon" style="background:${color}22;color:${color}">
          <i class="bi ${icon}"></i>
        </div>
        <div>
          <div class="activity-title">${escapeHtml(item.title || '')}</div>
          <div class="subtle">${escapeHtml(item.display_date || '')}</div>
        </div>
      </div>
      <span class="chip" style="background:${color}22;color:${color}">${escapeHtml(item.type || '')}</span>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
