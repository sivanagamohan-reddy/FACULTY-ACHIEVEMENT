export function renderConferencePage(app) {
  app.innerHTML = `
    <section>
      <div class="conf-hero-card mb-4 reveal" style="--delay:40ms">
        <div class="d-flex align-items-center gap-4">
          <i class="bi bi-people-fill" style="font-size:3.1rem"></i>
          <div>
            <h2 class="pub-hero-title mb-1">Add Conference</h2>
            <div class="pub-hero-sub">Update your academic records for verification</div>
          </div>
        </div>
      </div>
      <form class="reveal" style="--delay:90ms" id="conference-form">
        <div class="row g-4">
          <div class="col-12"><label class="form-label">Conference Name *</label><input class="form-control pub-input" required placeholder="Enter conference name" /></div>
          <div class="col-12"><label class="form-label">Paper Title (if presented)</label><input class="form-control pub-input" placeholder="Title of paper presented" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Venue/Location *</label><input class="form-control pub-input" required placeholder="City, Country" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Date</label><input type="date" class="form-control pub-input" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Organizer</label><input class="form-control pub-input" placeholder="Organizing institution" /></div>
          <div class="col-12 col-lg-6"><label class="form-label">Your Role</label><select class="form-select pub-input"><option>Select role</option><option>Participant</option><option>Presenter</option><option>Keynote Speaker</option></select></div>
          <div class="col-12 col-lg-6"><label class="form-label">Level</label><select class="form-select pub-input"><option>Select level</option><option>National</option><option>International</option><option>Regional</option></select></div>
          <div class="col-12 col-lg-6"><label class="form-label">Proceedings Indexed In</label><input class="form-control pub-input" placeholder="e.g., Scopus, IEEE Xplore" /></div>
          <div class="col-12">
            <label class="form-label">Upload Certificate</label>
            <div class="upload-zone conf-upload">
              <div class="text-center"><i class="bi bi-cloud-arrow-up" style="font-size:4rem;color:#E91E63"></i><div class="fw-bold mt-2 fs-4" style="color:#64748b">Click to Upload Certificate</div></div>
            </div>
          </div>
        </div>
        <div class="d-flex flex-column flex-md-row justify-content-end gap-3 mt-4">
          <button class="pub-btn pub-btn-secondary" type="button" onclick="location.hash='#dashboard'">Cancel</button>
          <button class="pub-btn conf-btn-primary" type="submit">Save Conference</button>
        </div>
      </form>
    </section>
  `;
  document.getElementById('conference-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    location.hash = '#dashboard';
  });
}
