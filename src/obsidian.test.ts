import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./logger.js', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import fs from 'fs';
import {
  generateAudioFilename,
  saveAudioToVault,
  formatJournalEntry,
  getJournalNotePath,
} from './obsidian.js';

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

// --- formatJournalEntry ---

describe('formatJournalEntry', () => {
  it('formats entry with ### HH:MM heading and content, no audio', () => {
    const timestamp = new Date('2026-03-17T14:30:00.000Z');
    const content = 'Had a great meeting about the API migration today.';

    const result = formatJournalEntry(timestamp, content);

    expect(result).toBe(
      '### 14:30\n\nHad a great meeting about the API migration today.',
    );
  });

  it('uses 24-hour format for the heading', () => {
    // 3:05 PM UTC → 15:05
    const timestamp = new Date('2026-03-17T15:05:00.000Z');
    const content = 'Afternoon note.';

    const result = formatJournalEntry(timestamp, content);

    expect(result).toMatch(/^### 15:05\n/);
  });

  it('zero-pads single-digit hours and minutes', () => {
    // 3:07 AM UTC → 03:07
    const timestamp = new Date('2026-03-17T03:07:00.000Z');
    const content = 'Early morning thought.';

    const result = formatJournalEntry(timestamp, content);

    expect(result).toMatch(/^### 03:07\n/);
  });

  it('handles midnight correctly', () => {
    const timestamp = new Date('2026-03-17T00:00:00.000Z');
    const content = 'Midnight journal entry.';

    const result = formatJournalEntry(timestamp, content);

    expect(result).toMatch(/^### 00:00\n/);
  });

  it('formats entry with ### HH:MM heading, content, and audio embed line', () => {
    const timestamp = new Date('2026-03-17T14:30:45.000Z');
    const content = 'Discussed the API migration strategy.';
    const audioFile = '2026-03-17-143045.ogg';

    const result = formatJournalEntry(timestamp, content, audioFile);

    expect(result).toBe(
      '### 14:30\n\nDiscussed the API migration strategy.\n\n![[2026-03-17-143045.ogg]]',
    );
  });

  it('omits audio embed when audioFile is undefined', () => {
    const timestamp = new Date('2026-03-17T09:15:00.000Z');
    const content = 'Text-only entry.';

    const result = formatJournalEntry(timestamp, content);

    expect(result).not.toContain('![[');
    expect(result).toBe('### 09:15\n\nText-only entry.');
  });

  it('places audio embed on its own line after content', () => {
    const timestamp = new Date('2026-03-17T22:00:00.000Z');
    const content = 'Late night thoughts.';
    const audioFile = '2026-03-17-220000.ogg';

    const result = formatJournalEntry(timestamp, content, audioFile);

    const lines = result.split('\n');
    // Last line should be the audio embed
    expect(lines[lines.length - 1]).toBe('![[2026-03-17-220000.ogg]]');
    // Second-to-last line should be blank (separator)
    expect(lines[lines.length - 2]).toBe('');
    // Content is before the blank separator
    expect(lines[lines.length - 3]).toBe('Late night thoughts.');
  });
});

// --- getJournalNotePath ---

describe('getJournalNotePath', () => {
  it('derives YYYY-MM-DD from a Date and returns Journal/YYYY-MM-DD.md', () => {
    const timestamp = new Date('2026-03-17T14:30:45.000Z');

    const result = getJournalNotePath(timestamp);

    expect(result).toBe('Journal/2026-03-17.md');
  });

  it('uses the date from the timestamp, not the current date', () => {
    // Use a date in the past to ensure it's not using Date.now()
    const timestamp = new Date('2025-01-15T08:00:00.000Z');

    const result = getJournalNotePath(timestamp);

    expect(result).toBe('Journal/2025-01-15.md');
  });

  it('zero-pads single-digit months and days', () => {
    const timestamp = new Date('2026-01-05T03:07:00.000Z');

    const result = getJournalNotePath(timestamp);

    expect(result).toBe('Journal/2026-01-05.md');
  });

  it('handles end of year correctly', () => {
    const timestamp = new Date('2026-12-31T23:59:59.000Z');

    const result = getJournalNotePath(timestamp);

    expect(result).toBe('Journal/2026-12-31.md');
  });
});
