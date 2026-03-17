import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./logger.js', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import fs from 'fs';
import { generateAudioFilename, saveAudioToVault } from './obsidian.js';

// --- generateAudioFilename ---

describe('generateAudioFilename', () => {
  it('generates YYYY-MM-DD-HHMMSS.ogg from a Date', () => {
    // 2026-03-17 14:30:45 UTC
    const date = new Date('2026-03-17T14:30:45.000Z');
    expect(generateAudioFilename(date)).toBe('2026-03-17-143045.ogg');
  });

  it('zero-pads single-digit months, days, hours, minutes, seconds', () => {
    // 2026-01-05 03:07:09 UTC
    const date = new Date('2026-01-05T03:07:09.000Z');
    expect(generateAudioFilename(date)).toBe('2026-01-05-030709.ogg');
  });

  it('handles midnight correctly', () => {
    const date = new Date('2026-06-15T00:00:00.000Z');
    expect(generateAudioFilename(date)).toBe('2026-06-15-000000.ogg');
  });

  it('handles end of day correctly', () => {
    const date = new Date('2026-12-31T23:59:59.000Z');
    expect(generateAudioFilename(date)).toBe('2026-12-31-235959.ogg');
  });
});

// --- saveAudioToVault ---

describe('saveAudioToVault', () => {
  let mkdirSyncSpy: ReturnType<typeof vi.spyOn>;
  let writeFileSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mkdirSyncSpy = vi
      .spyOn(fs, 'mkdirSync')
      .mockImplementation(() => undefined as any);
    writeFileSyncSpy = vi
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(() => {});
  });

  it('accepts a Date parameter and returns a timestamp-based filename', () => {
    const buffer = Buffer.from('fake-audio-data');
    const timestamp = new Date('2026-03-17T14:30:45.000Z');

    const filename = saveAudioToVault(buffer, timestamp);

    expect(filename).toBe('2026-03-17-143045.ogg');
  });

  it('writes the audio buffer to the attachments/audio directory', () => {
    const buffer = Buffer.from('fake-audio-data');
    const timestamp = new Date('2026-03-17T14:30:45.000Z');

    saveAudioToVault(buffer, timestamp);

    expect(mkdirSyncSpy).toHaveBeenCalledWith(
      expect.stringContaining('attachments/audio'),
      { recursive: true },
    );
    expect(writeFileSyncSpy).toHaveBeenCalledWith(
      expect.stringContaining('2026-03-17-143045.ogg'),
      buffer,
    );
  });

  it('produces different filenames for different timestamps on the same day', () => {
    const buffer = Buffer.from('fake-audio-data');
    const morning = new Date('2026-03-17T08:15:00.000Z');
    const afternoon = new Date('2026-03-17T14:30:45.000Z');

    const morningFile = saveAudioToVault(buffer, morning);
    const afternoonFile = saveAudioToVault(buffer, afternoon);

    expect(morningFile).not.toBe(afternoonFile);
    expect(morningFile).toBe('2026-03-17-081500.ogg');
    expect(afternoonFile).toBe('2026-03-17-143045.ogg');
  });
});
