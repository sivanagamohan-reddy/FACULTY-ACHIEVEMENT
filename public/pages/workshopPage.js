export function renderWorkshopPage(app) {
  app.innerHTML = `
    <section>
      <div class="wrk-hero-card mb-4 reveal" style="--delay:40ms">
        <div class="d-flex align-items-center gap-4">
          <i class="bi bi-wrench-adjustable" style="font-size:3.1rem"></i>
          <div>
            <h2 class="pub-hero-title mb-1">Add Workshop</h2>
            <div class="pub-hero-sub">Ensure all academic records are updated for verification</div>
          </div>
        </div>
      </div>
      <form class="reveal" style="--delay:90ms" id="workshop-form">
        <div class="row g-4">
          <div class="col-12"><label class="form-label">Workshop Title *</label><input class="form-control pub-input" required placeholder="Enter workshop title" /></div>
          <div class="col-12"><label class="form-label">Organizing Institution *</label><input class="form-control pub-input" required placeholder="Enter institution name" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Date</label><input type="date" class="form-control pub-input" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Duration (Hours)</label><input class="form-control pub-input" placeholder="e.g., 8" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Mode</label><select class="form-select pub-input"><option>Select mode</option><option>Online</option><option>Offline</option><option>Hybrid</option></select></div>
          <div class="col-12 col-lg-6"><label class="form-label">Your Role</label><select class="form-select pub-input"><option>Select role</option><option>Participant</option><option>Resource Person</option><option>Coordinator</option></select></div>
          <div class="col-12"><label class="form-label">Topics Covered</label><textarea rows="3" class="form-control pub-input" placeholder="Key topics covered in the workshop"></textarea></div>
          <div class="col-12">
            <label class="form-label">Upload Certificate</label>
            <div class="upload-zone wrk-upload">
              <div class="text-center"><i class="bi bi-cloud-arrow-up" style="font-size:4rem;color:#FFA726"></i><div class="fw-bold mt-2 fs-4" style="color:#64748b">Click to Upload Certificate</div></div>
            </div>
          </div>
        </div>
        <div class="d-flex flex-column flex-md-row justify-content-end gap-3 mt-4">
          <button class="pub-btn pub-btn-secondary" type="button" onclick="location.hash='#dashboard'">Cancel</button>
          <button class="pub-btn wrk-btn-primary" type="submit">Save Workshop</button>
        </div>
      </form>
    </section>
  `;
  document.getElementById('workshop-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    location.hash = '#dashboard';
  });
}
