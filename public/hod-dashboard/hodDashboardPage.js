export function renderHodDashboard(app, data) {
  const stats = data?.stats || {};
  const years = (data?.filter_options?.academic_years || []).length
    ? data.filter_options.academic_years
    : defaultAcademicYears();
  const selectedYear = data?.filter_options?.selected_academic_year || '';
  app.innerHTML = `
    <section>
      <div class="white-card mb-3 reveal" style="--delay:20ms">
        <form id="hod-filter-form" class="dashboard-filter-grid dashboard-filter-grid-hod">
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
      <p class="subtle reveal" style="--delay:60ms">${data?.headline || 'Department overview'}</p>
      <div class="dashboard-grid mt-4 mb-4">
        ${tile('Publications', stats.publications || 0, '#42A5F5', 'publication', selectedYear)}
        ${tile('FDPs', stats.fdps || 0, '#9575CD', 'fdp', selectedYear)}
        ${tile('Conferences', stats.conferences || 0, '#E91E63', 'conference', selectedYear)}
        ${tile('Workshops', stats.workshops || 0, '#FFA726', 'workshop', selectedYear)}
        ${tile('Patents', stats.patents || 0, '#66BB6A', 'patent', selectedYear)}
      </div>
      <div class="white-card reveal" style="--delay:120ms">
        <div class="activity-title">Faculty Count: ${data?.facultyCount ?? '-'}</div>
        <div class="subtle">Compliance Rate: ${data?.complianceRate ?? '-'}%</div>
      </div>
    </section>
  `;
}

function tile(label, value, color, type, year) {
  const target = `#achievement-list?type=${encodeURIComponent(type)}&year=${encodeURIComponent(year || '')}`;
  return `<div class="stat-col reveal"><a href="${target}" class="metric-tile d-block text-decoration-none" style="background:${color}"><div class="stat-title">${label}</div><div class="stat-number">${value}</div></a></div>`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function defaultAcademicYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 3; y <= currentYear + 2; y += 1) {
    years.push(`${y}-${String((y + 1) % 100).padStart(2, '0')}`);
  }
  return years;
}
