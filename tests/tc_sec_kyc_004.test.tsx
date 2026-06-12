import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  uploadPublicSupport,
  validateKycMagicBytes,
} from '../backend/middleware/uploadMiddleware.js';

// Build vulnerable app (mime-only)
const buildVulnApp = () => {
  const app = express();
  app.post(
    '/api/owners/apply',
    uploadPublicSupport.array('documents', 5), // mime check only
    (req: any, res: any) => res.status(200).json({ success: true })
  );
  return app;
};

// Build secure app (mime + magic-bytes)
const buildSecureApp = () => {
  const app = express();
  app.post(
    '/api/owners/apply',
    uploadPublicSupport.array('documents', 5),
    validateKycMagicBytes,
    (req: any, res: any) => res.status(200).json({ success: true })
  );
  return app;
};

let vulnerableApp: express.Express;
let secureApp: express.Express;

beforeAll(() => {
  vulnerableApp = buildVulnApp();
  secureApp = buildSecureApp();
});

describe('TC-SEC-KYC-004: Brutal MIME-type Spoofing Defense', () => {
  const phpShell = Buffer.from('<?php echo "pwned"; ?>');
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff]); // real JPEG start
  const fakeJpeg = Buffer.concat([jpegHeader, Buffer.alloc(1024, 'A')]); // valid JPEG

  it('VULNERABLE: accepts a PHP web-shell disguised as JPEG', async () => {
    const res = await request(vulnerableApp)
      .post('/api/owners/apply')
      .attach('documents', phpShell, {
        filename: 'evil.jpg',
        contentType: 'image/jpeg',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('SECURE: REJECTS the same payload with 400 & clear message', async () => {
    const res = await request(secureApp)
      .post('/api/owners/apply')
      .attach('documents', phpShell, {
        filename: 'evil.jpg',
        contentType: 'image/jpeg',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/signature mismatch/i);
  });

  it('SECURE: ACCEPTS a genuine JPEG (control)', async () => {
    const res = await request(secureApp)
      .post('/api/owners/apply')
      .attach('documents', fakeJpeg, {
        filename: 'good.jpg',
        contentType: 'image/jpeg',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
