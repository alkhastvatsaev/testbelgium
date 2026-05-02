/**
 * @jest-environment node
 */

import { bodyLooksLikeAndroidPathText, readAudioUploadBody } from '../read-audio-upload-body';

describe('bodyLooksLikeAndroidPathText', () => {
  it('détecte un chemin /storage', () => {
    expect(bodyLooksLikeAndroidPathText(Buffer.from('/storage/emulated/0/x.m4a'))).toBe(true);
  });
  it('ne détecte pas un faux positif sur binaire court', () => {
    expect(bodyLooksLikeAndroidPathText(Buffer.from([0, 1, 2, 3, 4, 5, 0xff]))).toBe(false);
  });
});

describe('readAudioUploadBody', () => {
  it('retourne une erreur si le corps brut est vide', async () => {
    const req = new Request('http://localhost/api', { method: 'POST', body: '' });
    const r = await readAudioUploadBody(req);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.hint).toBeDefined();
    }
  });

  it('refuse un corps = chemin texte (MacroDroid mode Texte)', async () => {
    const pathStr = '/storage/emulated/0/Documents/CubeCallRecorder/All/call.m4a';
    const req = new Request('http://localhost/api', {
      method: 'POST',
      body: pathStr,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    const r = await readAudioUploadBody(req);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.error).toContain('chemin');
    }
  });

  it('accepte le corps brut (octets)', async () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 4]);
    const req = new Request('http://localhost/api', {
      method: 'POST',
      body: bytes,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    const r = await readAudioUploadBody(req);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.buffer.length).toBe(5);
      expect(r.fileName).toBe('audio.m4a');
    }
  });

  it('Multipart/FORM-DATA (casse) : prend le plus gros blob', async () => {
    const fd = new FormData();
    fd.append('a', new Blob([new Uint8Array(100)]));
    fd.append('b', new Blob([new Uint8Array(400)]));
    const req = new Request('http://localhost/api', {
      method: 'POST',
      body: fd,
    });
    const r = await readAudioUploadBody(req);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.buffer.length).toBe(400);
    }
  });
});
