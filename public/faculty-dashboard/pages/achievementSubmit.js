import { apiPost } from '../../services/api.js';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export function bindAchievementSubmit(formId, buildPayload) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      const payload = await buildPayload(form);
      await apiPost('/api/achievements', payload);
      alert('Saved successfully.');
      location.hash = '#faculty-dashboard';
    } catch (error) {
      alert(`Save failed: ${String(error?.message || 'Unexpected error')}`);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

export async function parseAttachment(fileInputEl) {
  const file = fileInputEl?.files?.[0];
  if (!file) return null;
  if (!ALLOWED_ATTACHMENT_TYPES.has(String(file.type || '').toLowerCase())) {
    throw new Error('Only JPG, PNG, WEBP or PDF files are allowed');
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error('Attachment size must be below 10MB');
  }

  const dataUrl = await fileToDataUrl(file);
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    data_url: dataUrl,
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read attachment file'));
    reader.readAsDataURL(file);
  });
}
