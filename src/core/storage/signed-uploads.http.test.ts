import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { createApp } from '@/app';
import { signStorageUrl, SIGNED_URL_TTL_SECONDS } from '@/core/storage/signedUrl';

/**
 * HTTP-level test: `/uploads` access control is Express middleware sitting
 * in front of `express.static`, so only a real request through the real app
 * exercises it.
 *
 * The rule it enforces: files holding paid content (member resources,
 * lesson media) are served only against a valid, unexpired signature, while
 * directory photos stay public because an `<img>` tag cannot carry a
 * credential. Before this, `/uploads` was bare `express.static` -- every
 * uploaded file was fetchable by anyone with the URL, forever, whatever
 * tier they were on.
 */
describe('/uploads access control (integration, real app)', () => {
  const app = createApp();
  const uploadsRoot = path.join(process.cwd(), 'uploads');

  const protectedKey = 'resources/test-resource/signed-fixture.txt';
  const lessonKey = 'lessons/test-lesson/signed-fixture.txt';
  const publicKey = 'leaders/test-leader/photo-fixture.txt';

  function writeFixture(storageKey: string, contents: string) {
    const full = path.join(uploadsRoot, storageKey);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  }

  /** The query string a real caller would receive, taken from the real signer. */
  function signedQueryFor(storageKey: string): string {
    return new URL(signStorageUrl(`http://localhost/uploads/${storageKey}`)).search;
  }

  beforeAll(() => {
    writeFixture(protectedKey, 'paid resource contents');
    writeFixture(lessonKey, 'paid lesson media');
    writeFixture(publicKey, 'a leader headshot');
  });

  afterAll(() => {
    for (const dir of ['resources/test-resource', 'lessons/test-lesson', 'leaders/test-leader']) {
      fs.rmSync(path.join(uploadsRoot, dir), { recursive: true, force: true });
    }
  });

  it('refuses an unsigned request for a resource file', async () => {
    const res = await request(app).get(`/uploads/${protectedKey}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('refuses an unsigned request for lesson media', async () => {
    const res = await request(app).get(`/uploads/${lessonKey}`);
    expect(res.status).toBe(403);
  });

  it('serves a resource file to a correctly signed request', async () => {
    const res = await request(app).get(`/uploads/${protectedKey}${signedQueryFor(protectedKey)}`);
    expect(res.status).toBe(200);
    expect(res.text).toBe('paid resource contents');
  });

  it('refuses an expired signature', async () => {
    // Signed in the past: the same signer, one second of life, already spent.
    const expired = new URL(signStorageUrl(`http://localhost/uploads/${protectedKey}`, -1)).search;
    const res = await request(app).get(`/uploads/${protectedKey}${expired}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('refuses a tampered signature', async () => {
    const query = signedQueryFor(protectedKey);
    const res = await request(app).get(`/uploads/${protectedKey}${query.replace(/sig=./, 'sig=0')}`);
    expect(res.status).toBe(403);
  });

  it("refuses a signature minted for a different file", async () => {
    // The signature covers the storage key, so a link to a Pathway resource
    // cannot be re-pointed at a Mentorship one.
    const res = await request(app).get(`/uploads/${lessonKey}${signedQueryFor(protectedKey)}`);
    expect(res.status).toBe(403);
  });

  it('still serves directory photos without a signature', async () => {
    const res = await request(app).get(`/uploads/${publicKey}`);
    expect(res.status).toBe(200);
    expect(res.text).toBe('a leader headshot');
  });

  it('signs for an hour, so a link left on an open page still works', () => {
    const signed = new URL(signStorageUrl(`http://localhost/uploads/${protectedKey}`));
    const expiresAt = Number(signed.searchParams.get('exp'));
    const lifetime = expiresAt - Math.floor(Date.now() / 1000);
    expect(lifetime).toBeGreaterThan(SIGNED_URL_TTL_SECONDS - 60);
    expect(lifetime).toBeLessThanOrEqual(SIGNED_URL_TTL_SECONDS);
  });

  it('leaves a URL that is not ours alone', () => {
    const cloudinary = 'https://res.cloudinary.com/demo/image/upload/v1/resources/file.pdf';
    expect(signStorageUrl(cloudinary)).toBe(cloudinary);
    expect(signStorageUrl('')).toBe('');
  });
});
