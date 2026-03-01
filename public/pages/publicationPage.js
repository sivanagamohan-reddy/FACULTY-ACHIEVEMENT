export function renderPublicationPage(app) {
  app.innerHTML = `
    <section>
      <div class="pub-hero-card mb-4 reveal" style="--delay:40ms">
        <div class="d-flex align-items-center gap-4">
          <i class="bi bi-file-earmark-text" style="font-size:3.1rem"></i>
          <div>
            <h2 class="pub-hero-title mb-1">Add Paper Publication</h2>
            <div class="pub-hero-sub">Ensure all academic records are up to date</div>
          </div>
        </div>
      </div>
      <form class="reveal" style="--delay:90ms" id="publication-form">
        <div class="row g-4">
          <div class="col-12 col-lg-6"><label class="form-label">Paper Title *</label><input class="form-control pub-input" required placeholder="Enter the full paper title" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Journal/Conference Name *</label><input class="form-control pub-input" required placeholder="Enter journal name" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Publication Date</label><input type="date" class="form-control pub-input" required /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Authors</label><input class="form-control pub-input" placeholder="Co-authors separated by commas" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">DOI / URL</label><input class="form-control pub-input" placeholder="https://doi.org/..." /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Impact Factor</label><input class="form-control pub-input" placeholder="e.g., 3.5" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Indexing</label><select class="form-select pub-input"><option>Select indexing</option><option>Scopus</option><option>WoS</option><option>UGC Care</option></select></div>
          <div class="col-12 col-lg-6"><label class="form-label">Status</label><select class="form-select pub-input"><option>Published</option><option>Accepted</option><option>Under Review</option></select></div>
          <div class="col-12">
            <label class="form-label">Upload Certificate/Proof</label>
            <div class="upload-zone pub-upload">
              <div class="text-center"><i class="bi bi-cloud-arrow-up" style="font-size:4rem;color:#42A5F5"></i><div class="fw-bold mt-2 fs-4" style="color:#64748b">Click to Upload Certificate</div></div>
            </div>
          </div>
        </div>
        <div class="d-flex flex-column flex-md-row justify-content-end gap-3 mt-4">
          <button class="pub-btn pub-btn-secondary" type="button" onclick="location.hash='#dashboard'">Cancel</button>
          <button class="pub-btn pub-btn-primary" type="submit">Save Publication</button>
        </div>
      </form>
    </section>
  `;
  document.getElementById('publication-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    location.hash = '#dashboard';
  });
}
