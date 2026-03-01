import { bindAchievementSubmit, parseAttachment } from './achievementSubmit.js';

export function renderPatentPage(app) {
  app.innerHTML = `
    <section>
      <div class="pat-hero-card mb-4 reveal"><div class="d-flex align-items-center gap-4"><i class="bi bi-lightbulb-fill" style="font-size:3rem"></i><div><h2 class="pub-hero-title mb-1">Add Patent</h2><div class="pub-hero-sub">Ensure all legal records are updated for verification</div></div></div></div>
      <form id="patent-form" class="reveal">
        <div class="row g-4">
          <div class="col-12"><label class="form-label">Patent Title *</label><input name="title" class="form-control pub-input" required /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Application Number *</label><input name="application_number" class="form-control pub-input" required placeholder="e.g., 202141012345" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Filing Date</label><input name="event_date" type="date" class="form-control pub-input" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Inventors</label><input name="inventors" class="form-control pub-input" placeholder="Names of all inventors" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Patent Office</label><select name="office" class="form-select pub-input"><option>Select office</option><option>Indian Patent Office</option><option>USPTO</option><option>EPO</option></select></div>
          <div class="col-12 col-lg-6"><label class="form-label">Status</label><select name="status" class="form-select pub-input"><option>Filed</option><option>Published</option><option>Examined</option><option>Granted</option></select></div>
          <div class="col-12 col-lg-6"><label class="form-label">Grant Date (if granted)</label><input name="grant_date" type="date" class="form-control pub-input" /></div>
          <div class="col-12"><label class="form-label">Abstract</label><textarea name="abstract" class="form-control pub-input" rows="3"></textarea></div>
          <div class="col-12"><label class="form-label">Upload Certificate/Proof</label><input id="patent-attachment" type="file" class="form-control mb-2" accept=".jpg,.jpeg,.png,.webp,.pdf" /><div class="upload-zone pat-upload"><div class="text-center"><i class="bi bi-cloud-arrow-up" style="font-size:4rem;color:#66BB6A"></i><div class="fw-bold mt-2 fs-4" style="color:#64748b">Upload image or PDF (max 10MB)</div></div></div></div>
        </div>
        <div class="d-flex flex-column flex-md-row justify-content-end gap-3 mt-4"><button class="pub-btn pub-btn-secondary" type="button" onclick="location.hash='#faculty-dashboard'">Cancel</button><button class="pub-btn pat-btn-primary" type="submit">Save Patent</button></div>
      </form>
    </section>
  `;
  bindAchievementSubmit('patent-form', async (form) => {
    const fd = new FormData(form);
    const attachment = await parseAttachment(document.getElementById('patent-attachment'));
    return {
      type: 'patent',
      title: String(fd.get('title') || ''),
      event_date: String(fd.get('event_date') || new Date().toISOString().slice(0, 10)),
      details: {
        application_number: String(fd.get('application_number') || ''),
        inventors: String(fd.get('inventors') || ''),
        office: String(fd.get('office') || ''),
        status: String(fd.get('status') || ''),
        grant_date: String(fd.get('grant_date') || ''),
        abstract: String(fd.get('abstract') || ''),
        attachment,
      },
    };
  });
}
