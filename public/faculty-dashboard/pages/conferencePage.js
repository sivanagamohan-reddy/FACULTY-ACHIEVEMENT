import { bindAchievementSubmit, parseAttachment } from './achievementSubmit.js';

export function renderConferencePage(app) {
  app.innerHTML = `
    <section>
      <div class="conf-hero-card mb-4 reveal"><div class="d-flex align-items-center gap-4"><i class="bi bi-people-fill" style="font-size:3rem"></i><div><h2 class="pub-hero-title mb-1">Add Conference</h2><div class="pub-hero-sub">Update your academic records for verification</div></div></div></div>
      <form id="conference-form" class="reveal">
        <div class="row g-4">
          <div class="col-12"><label class="form-label">Conference Name *</label><input name="title" class="form-control pub-input" required /></div>
          <div class="col-12"><label class="form-label">Paper Title (if presented)</label><input name="paper_title" class="form-control pub-input" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Venue/Location *</label><input name="location" class="form-control pub-input" placeholder="City, Country" required /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Date *</label><input name="event_date" type="date" class="form-control pub-input" required /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Organizer</label><input name="organizer" class="form-control pub-input" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Your Role</label><select name="role" class="form-select pub-input"><option value="" selected>Select role</option><option>Participant</option><option>Presenter</option><option>Keynote Speaker</option></select></div>
          <div class="col-12 col-lg-6"><label class="form-label">Level</label><select name="level" class="form-select pub-input"><option value="" selected>Select level</option><option>National</option><option>International</option><option>Regional</option></select></div>
          <div class="col-12 col-lg-6"><label class="form-label">Proceedings Indexed In</label><input name="indexed_in" class="form-control pub-input" placeholder="e.g., Scopus, IEEE Xplore" /></div>
          <div class="col-12"><label class="form-label">Upload Certificate</label><input id="conference-attachment" type="file" class="form-control mb-2" accept=".jpg,.jpeg,.png,.webp,.pdf" /><div class="form-text mb-2">Optional. JPG/PNG/WEBP/PDF up to 10MB.</div><div class="upload-zone conf-upload"><div class="text-center"><i class="bi bi-cloud-arrow-up" style="font-size:4rem;color:#E91E63"></i><div class="fw-bold mt-2 fs-4" style="color:#64748b">Upload image or PDF (max 10MB)</div></div></div></div>
        </div>
        <div class="d-flex flex-column flex-md-row justify-content-end gap-3 mt-4"><button class="pub-btn pub-btn-secondary" type="button" onclick="location.hash='#faculty-dashboard'">Cancel</button><button class="pub-btn conf-btn-primary" type="submit">Save Conference</button></div>
      </form>
    </section>
  `;
  bindAchievementSubmit('conference-form', async (form) => {
    const fd = new FormData(form);
    const attachment = await parseAttachment(document.getElementById('conference-attachment'));
    return {
      type: 'conference',
      title: String(fd.get('title') || ''),
      event_date: String(fd.get('event_date') || new Date().toISOString().slice(0, 10)),
      details: {
        paper_title: String(fd.get('paper_title') || ''),
        location: String(fd.get('location') || ''),
        organizer: String(fd.get('organizer') || ''),
        role: String(fd.get('role') || ''),
        level: String(fd.get('level') || ''),
        indexed_in: String(fd.get('indexed_in') || ''),
        attachment,
      },
    };
  });
}
