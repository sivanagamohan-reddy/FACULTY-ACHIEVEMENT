export function renderPatentPage(app) {
  app.innerHTML = `
    <section>
      <div class="pat-hero-card mb-4 reveal" style="--delay:40ms">
        <div class="d-flex align-items-center gap-4">
          <i class="bi bi-lightbulb-fill" style="font-size:3.1rem"></i>
          <div>
            <h2 class="pub-hero-title mb-1">Add Patent</h2>
            <div class="pub-hero-sub">Ensure all legal records are updated for verification</div>
          </div>
        </div>
      </div>
      <form class="reveal" style="--delay:90ms" id="patent-form">
        <div class="row g-4">
          <div class="col-12"><label class="form-label">Patent Title *</label><input class="form-control pub-input" required placeholder="Enter patent title" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Application Number *</label><input class="form-control pub-input" required placeholder="e.g., 202141012345" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Filing Date</label><input type="date" class="form-control pub-input" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Inventors</label><input class="form-control pub-input" placeholder="Names of all inventors" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Patent Office</label><select class="form-select pub-input"><option>Select office</option><option>Indian Patent Office</option><option>USPTO</option><option>EPO</option></select></div>
          <div class="col-12 col-lg-6"><label class="form-label">Status</label><select class="form-select pub-input"><option>Filed</option><option>Published</option><option>Examined</option><option>Granted</option></select></div>
          <div class="col-12 col-lg-6"><label class="form-label">Grant Date (if granted)</label><input type="date" class="form-control pub-input" /></div>
          <div class="col-12"><label class="form-label">Abstract</label><textarea rows="3" class="form-control pub-input" placeholder="Brief abstract of the patent"></textarea></div>
          <div class="col-12">
            <label class="form-label">Upload Certificate/Proof</label>
            <div class="upload-zone pat-upload">
              <div class="text-center"><i class="bi bi-cloud-arrow-up" style="font-size:4rem;color:#66BB6A"></i><div class="fw-bold mt-2 fs-4" style="color:#64748b">Click to Upload Proof</div></div>
            </div>
          </div>
        </div>
        <div class="d-flex flex-column flex-md-row justify-content-end gap-3 mt-4">
          <button class="pub-btn pub-btn-secondary" type="button" onclick="location.hash='#dashboard'">Cancel</button>
          <button class="pub-btn pat-btn-primary" type="submit">Save Patent</button>
        </div>
      </form>
    </section>
  `;
  document.getElementById('patent-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    location.hash = '#dashboard';
  });
}
