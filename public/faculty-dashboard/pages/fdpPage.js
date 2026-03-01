import { bindAchievementSubmit, parseAttachment } from './achievementSubmit.js';

export function renderFdpPage(app) {
  app.innerHTML = `
    <section>
      <div class="fdp-hero-card mb-4 reveal"><div class="d-flex align-items-center gap-4"><i class="bi bi-mortarboard" style="font-size:3rem"></i><div><h2 class="pub-hero-title mb-1">Add FDP Attended</h2><div class="pub-hero-sub">Update your academic records for verification</div></div></div></div>
      <form id="fdp-form" class="reveal">
        <div class="row g-4">
          <div class="col-12"><label class="form-label">FDP Title *</label><input name="title" class="form-control pub-input" required /></div>
          <div class="col-12"><label class="form-label">Organizing Institution *</label><input name="institution" class="form-control pub-input" required /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Start Date *</label><input name="event_date" type="date" class="form-control pub-input" required /></div>
          <div class="col-12 col-lg-6"><label class="form-label">End Date</label><input name="end_date" type="date" class="form-control pub-input" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Duration (Days)</label><input name="duration_days" class="form-control pub-input" placeholder="e.g., 5" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Mode</label><select name="mode" class="form-select pub-input"><option value="" selected>Select mode</option><option>Online</option><option>Offline</option><option>Hybrid</option></select></div>
          <div class="col-12"><label class="form-label">Sponsoring Agency</label><input name="sponsor" class="form-control pub-input" placeholder="e.g., AICTE, UGC, etc." /></div>
          <div class="col-12"><label class="form-label">Upload Certificate</label><input id="fdp-attachment" type="file" class="form-control mb-2" accept=".jpg,.jpeg,.png,.webp,.pdf" /><div class="form-text mb-2">Optional. JPG/PNG/WEBP/PDF up to 10MB.</div><div class="upload-zone fdp-upload"><div class="text-center"><i class="bi bi-cloud-arrow-up" style="font-size:4rem;color:#9575CD"></i><div class="fw-bold mt-2 fs-4" style="color:#64748b">Upload image or PDF (max 10MB)</div></div></div></div>
        </div>
        <div class="d-flex flex-column flex-md-row justify-content-end gap-3 mt-4"><button class="pub-btn pub-btn-secondary" type="button" onclick="location.hash='#faculty-dashboard'">Cancel</button><button class="pub-btn fdp-btn-primary" type="submit">Save FDP</button></div>
      </form>
    </section>
  `;
  bindAchievementSubmit('fdp-form', async (form) => {
    const fd = new FormData(form);
    const attachment = await parseAttachment(document.getElementById('fdp-attachment'));
    return {
      type: 'fdp',
      title: String(fd.get('title') || ''),
      event_date: String(fd.get('event_date') || new Date().toISOString().slice(0, 10)),
      details: {
        institution: String(fd.get('institution') || ''),
        end_date: String(fd.get('end_date') || ''),
        duration_days: String(fd.get('duration_days') || ''),
        mode: String(fd.get('mode') || ''),
        sponsor: String(fd.get('sponsor') || ''),
        attachment,
      },
    };
  });
}
