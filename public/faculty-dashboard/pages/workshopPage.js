import { bindAchievementSubmit, parseAttachment } from './achievementSubmit.js';

export function renderWorkshopPage(app) {
  app.innerHTML = `
    <section>
      <div class="wrk-hero-card mb-4 reveal"><div class="d-flex align-items-center gap-4"><i class="bi bi-wrench-adjustable" style="font-size:3rem"></i><div><h2 class="pub-hero-title mb-1">Add Workshop</h2><div class="pub-hero-sub">Ensure all academic records are updated for verification</div></div></div></div>
      <form id="workshop-form" class="reveal">
        <div class="row g-4">
          <div class="col-12"><label class="form-label">Workshop Title *</label><input name="title" class="form-control pub-input" required /></div>
          <div class="col-12"><label class="form-label">Organizing Institution *</label><input name="institution" class="form-control pub-input" required /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Date</label><input name="event_date" type="date" class="form-control pub-input" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Duration (Hours)</label><input name="duration_hours" class="form-control pub-input" placeholder="e.g., 8" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Mode</label><select name="mode" class="form-select pub-input"><option>Select mode</option><option>Online</option><option>Offline</option><option>Hybrid</option></select></div>
          <div class="col-12 col-lg-6"><label class="form-label">Your Role</label><select name="role" class="form-select pub-input"><option>Select role</option><option>Participant</option><option>Resource Person</option><option>Coordinator</option></select></div>
          <div class="col-12"><label class="form-label">Topics Covered</label><textarea name="topics" class="form-control pub-input" rows="3"></textarea></div>
          <div class="col-12"><label class="form-label">Upload Certificate</label><input id="workshop-attachment" type="file" class="form-control mb-2" accept=".jpg,.jpeg,.png,.webp,.pdf" /><div class="upload-zone wrk-upload"><div class="text-center"><i class="bi bi-cloud-arrow-up" style="font-size:4rem;color:#FFA726"></i><div class="fw-bold mt-2 fs-4" style="color:#64748b">Upload image or PDF (max 10MB)</div></div></div></div>
        </div>
        <div class="d-flex flex-column flex-md-row justify-content-end gap-3 mt-4"><button class="pub-btn pub-btn-secondary" type="button" onclick="location.hash='#faculty-dashboard'">Cancel</button><button class="pub-btn wrk-btn-primary" type="submit">Save Workshop</button></div>
      </form>
    </section>
  `;
  bindAchievementSubmit('workshop-form', async (form) => {
    const fd = new FormData(form);
    const attachment = await parseAttachment(document.getElementById('workshop-attachment'));
    return {
      type: 'workshop',
      title: String(fd.get('title') || ''),
      event_date: String(fd.get('event_date') || new Date().toISOString().slice(0, 10)),
      details: {
        institution: String(fd.get('institution') || ''),
        duration_hours: String(fd.get('duration_hours') || ''),
        mode: String(fd.get('mode') || ''),
        role: String(fd.get('role') || ''),
        topics: String(fd.get('topics') || ''),
        attachment,
      },
    };
  });
}
