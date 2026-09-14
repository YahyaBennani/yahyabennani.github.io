// Attachments load only on request; lists never include file payloads.
const certificateViewer = document.createElement('dialog');
certificateViewer.className = 'certificate-dialog bevel-out';
certificateViewer.setAttribute('aria-labelledby', 'certificate-viewer-title');
certificateViewer.innerHTML = `<div class="win-panel-title viewer-title"><span id="certificate-viewer-title">Certificate Viewer</span><button type="button" aria-label="Close certificate viewer">×</button></div><div class="certificate-preview" aria-live="polite"></div><div class="viewer-actions"><a class="btn" hidden>Download</a><span class="muted">Document Viewer</span></div>`;
document.body.append(certificateViewer);
let certificateObjectUrl = null;
let certificateRequest = 0;
certificateViewer.querySelector('button').addEventListener('click', () => certificateViewer.close());
certificateViewer.addEventListener('close', () => {
  certificateRequest++;
  certificateViewer.querySelector('.certificate-preview').replaceChildren();
  if (certificateObjectUrl) URL.revokeObjectURL(certificateObjectUrl);
  certificateObjectUrl = null;
});
async function viewCertificate(id, kind) {
  const request = ++certificateRequest;
  const preview = certificateViewer.querySelector('.certificate-preview');
  const download = certificateViewer.querySelector('a');
  preview.textContent = 'Loading document...';
  download.hidden = true;
  certificateViewer.querySelector('#certificate-viewer-title').textContent = 'Certificate Viewer';
  certificateViewer.showModal();
  try {
    const file = await api.get(`/api/education/${encodeURIComponent(id)}?asset=${kind}`);
    if (request !== certificateRequest) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(file.type)) throw new Error('Unsupported document');
    const bytes = Uint8Array.from(atob(file.data), (char) => char.charCodeAt(0));
    certificateObjectUrl = URL.createObjectURL(new Blob([bytes], { type: file.type }));
    certificateViewer.querySelector('#certificate-viewer-title').textContent = file.name;
    download.href = certificateObjectUrl;
    download.download = file.name;
    download.hidden = false;
    const element = document.createElement(kind === 'pdf' ? 'iframe' : 'img');
    if (kind === 'pdf') {
      element.title = file.name;
      const hint = document.createElement('p');
      hint.className = 'pdf-hint';
      hint.textContent = 'If the PDF preview is unavailable, use Download.';
      preview.replaceChildren(hint, element);
    } else {
      element.alt = file.name;
      preview.replaceChildren(element);
    }
    element.src = certificateObjectUrl;
  } catch {
    if (request === certificateRequest) preview.textContent = 'Could not open this document. Close this window and try again.';
  }
}
function documentButtons(entry) {
  return ['image', 'pdf'].filter((kind) => entry[`${kind}_name`]).map((kind) =>
    `<button type="button" data-document="${kind}" data-entry="${escapeHtml(entry.id)}">${kind === 'pdf' ? 'View PDF' : 'View image'}</button>`).join('');
}
function bindDocumentButtons(container) {
  container.querySelectorAll('[data-document]').forEach((button) => button.addEventListener('click', () => viewCertificate(button.dataset.entry, button.dataset.document)));
}
