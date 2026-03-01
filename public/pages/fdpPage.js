export function renderFdpPage(app) {
  app.innerHTML = `
    <section>
      <div class="fdp-hero-card mb-4 reveal" style="--delay:40ms">
        <div class="d-flex align-items-center gap-4">
          <i class="bi bi-mortarboard" style="font-size:3.1rem"></i>
          <div>
            <h2 class="pub-hero-title mb-1">Add FDP Attended</h2>
            <div class="pub-hero-sub">Update your academic records for verification</div>
          </div>
        </div>
      </div>
      <form class="reveal" style="--delay:90ms" id="fdp-form">
        <div class="row g-4">
          <div class="col-12"><label class="form-label">FDP Title *</label><input class="form-control pub-input" required placeholder="Enter FDP title" /></div>
          <div class="col-12"><label class="form-label">Organizing Institution *</label><input class="form-control pub-input" required placeholder="Enter institution name" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Start Date</label><input type="date" class="form-control pub-input" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">End Date</label><input type="date" class="form-control pub-input" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Duration (Days)</label><input class="form-control pub-input" placeholder="e.g., 5" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Mode</label><select class="form-select pub-input"><option>Select mode</option><option>Online</option><option>Offline</option><option>Hybrid</option></select></div>
          <div class="col-12"><label class="form-label">Sponsoring Agency</label><input class="form-control pub-input" placeholder="e.g., AICTE, UGC, etc." /></div>
          <div class="col-12">
            <label class="form-label">Upload Certificate</label>
            <div class="upload-zone fdp-upload">
              <div class="text-center"><i class="bi bi-cloud-arrow-up" style="font-size:4rem;color:#9575CD"></i><div class="fw-bold mt-2 fs-4" style="color:#64748b">Click to Upload Certificate</div></div>
            </div>
          </div>
        </div>
        <div class="d-flex flex-column flex-md-row justify-content-end gap-3 mt-4">
          <button class="pub-btn pub-btn-secondary" type="button" onclick="location.hash='#dashboard'">Cancel</button>
          <button class="pub-btn fdp-btn-primary" type="submit">Save FDP</button>
        </div>
      </form>
    </section>
  `;
  document.getElementById('fdp-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    location.hash = '#dashboard';
  });
}
