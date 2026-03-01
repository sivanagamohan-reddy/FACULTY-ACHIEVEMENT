import { bindAchievementSubmit, parseAttachment } from './achievementSubmit.js';

export function renderPublicationPage(app) {
  app.innerHTML = `
    <section>
      <div class="pub-hero-card mb-4 reveal"><div class="d-flex align-items-center gap-4"><i class="bi bi-file-earmark-text" style="font-size:3rem"></i><div><h2 class="pub-hero-title mb-1">Add Paper Publication</h2><div class="pub-hero-sub">Ensure all academic records are up to date</div></div></div></div>
      <form id="publication-form" class="reveal">
        <div class="row g-4">
          <div class="col-12 col-lg-6"><label class="form-label">Paper Title *</label><input name="title" class="form-control pub-input" required /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Journal/Conference Name *</label><input name="journal" class="form-control pub-input" required /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Publication Date *</label><input name="event_date" type="date" class="form-control pub-input" required /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Authors</label><input name="authors" class="form-control pub-input" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">DOI / URL</label><input name="doi_url" class="form-control pub-input" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Impact Factor</label><input name="impact_factor" class="form-control pub-input" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Indexing</label><select name="indexing" class="form-select pub-input"><option value="" selected>Select indexing</option><option>Scopus</option><option>WoS</option><option>UGC Care</option></select></div>
          <div class="col-12 col-lg-6"><label class="form-label">Status</label><select name="status" class="form-select pub-input"><option>Published</option><option>Accepted</option><option>Under Review</option></select></div>
          <div class="col-12"><label class="form-label">Upload Certificate/Proof</label><input id="publication-attachment" type="file" class="form-control mb-2" accept=".jpg,.jpeg,.png,.webp,.pdf" /><div class="form-text mb-2">Optional. JPG/PNG/WEBP/PDF up to 10MB.</div><div class="upload-zone pub-upload"><div class="text-center"><i class="bi bi-cloud-arrow-up" style="font-size:4rem;color:#42A5F5"></i><div class="fw-bold mt-2 fs-4" style="color:#64748b">Upload image or PDF (max 10MB)</div></div></div></div>
        </div>
        <div class="d-flex flex-column flex-md-row justify-content-end gap-3 mt-4"><button class="pub-btn pub-btn-secondary" type="button" onclick="location.hash='#faculty-dashboard'">Cancel</button><button class="pub-btn pub-btn-primary" type="submit">Save Publication</button></div>
      </form>
    </section>
  `;
  bindAchievementSubmit('publication-form', async (form) => {
    const fd = new FormData(form);
    const attachment = await parseAttachment(document.getElementById('publication-attachment'));
    return {
      type: 'publication',
      title: String(fd.get('title') || ''),
      event_date: String(fd.get('event_date') || new Date().toISOString().slice(0, 10)),
      details: {
        journal: String(fd.get('journal') || ''),
        authors: String(fd.get('authors') || ''),
        doi_url: String(fd.get('doi_url') || ''),
        impact_factor: String(fd.get('impact_factor') || ''),
        indexing: String(fd.get('indexing') || ''),
        status: String(fd.get('status') || ''),
        attachment,
      },
    };
  });
}
