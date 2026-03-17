import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

import {
  downloadMediaMessage,
  WAMessage,
  WASocket,
} from '@whiskeysockets/baileys';

import { saveAudioToVault } from './obsidian.js';

const execFileAsync = promisify(execFile);

const WHISPER_BIN = process.env.WHISPER_BIN || 'whisper-cli';
const WHISPER_MODEL =
  process.env.WHISPER_MODEL ||
  path.join(process.cwd(), 'data', 'models', 'ggml-large-v3.bin');

const FALLBACK_MESSAGE = '[Voice Message - transcription unavailable]';

export interface TranscriptionResult {
  transcript: string;
  audioFile?: string; // Filename in vault attachments (e.g., "2026-03-17-143045.ogg")
}

/**
 * Transcribe an audio buffer using local whisper.cpp.
 * Channel-agnostic — any channel can call this with a raw audio buffer.
 * When saveToVault is true, persists the audio to the Obsidian vault attachments.
 * When messageTimestamp is provided, uses it for the audio filename (YYYY-MM-DD-HHMMSS.ogg);
 * otherwise falls back to the current time.
 */
export async function transcribeBuffer(
  audioBuffer: Buffer,
  options?: { saveToVault?: boolean; messageTimestamp?: Date },
): Promise<TranscriptionResult | null> {
  const tmpDir = os.tmpdir();
  const id = `nanoclaw-voice-${Date.now()}`;
  const tmpOgg = path.join(tmpDir, `${id}.ogg`);
  const tmpWav = path.join(tmpDir, `${id}.wav`);

  try {
    fs.writeFileSync(tmpOgg, audioBuffer);

    // Convert ogg/opus to 16kHz mono WAV (required by whisper.cpp)
    await execFileAsync(
      'ffmpeg',
      ['-i', tmpOgg, '-ar', '16000', '-ac', '1', '-f', 'wav', '-y', tmpWav],
      { timeout: 30_000 },
    );

    const { stdout } = await execFileAsync(
      WHISPER_BIN,
      ['-m', WHISPER_MODEL, '-f', tmpWav, '--no-timestamps', '-nt'],
      { timeout: 60_000 },
    );

    const transcript = stdout.trim();
    if (!transcript) return null;

    // Save audio to vault for potential note attachment
    let audioFile: string | undefined;
    if (options?.saveToVault !== false) {
      try {
        audioFile = saveAudioToVault(
          audioBuffer,
          options?.messageTimestamp ?? new Date(),
        );
      } catch (err) {
        console.error('Failed to save audio to vault (non-fatal):', err);
      }
    }

    return { transcript, audioFile };
  } catch (err) {
    console.error('whisper.cpp transcription failed:', err);
    return null;
  } finally {
    for (const f of [tmpOgg, tmpWav]) {
      try {
        fs.unlinkSync(f);
      } catch {
        /* best effort cleanup */
      }
    }
  }
}

export async function transcribeAudioMessage(
  msg: WAMessage,
  sock: WASocket,
): Promise<string | null> {
  try {
    const buffer = (await downloadMediaMessage(
      msg,
      'buffer',
      {},
      {
        logger: console as any,
        reuploadRequest: sock.updateMediaMessage,
      },
    )) as Buffer;

    if (!buffer || buffer.length === 0) {
      console.error('Failed to download audio message');
      return FALLBACK_MESSAGE;
    }

    console.log(`Downloaded audio message: ${buffer.length} bytes`);

    const result = await transcribeBuffer(buffer);

    if (!result) {
      return FALLBACK_MESSAGE;
    }

    console.log(`Transcribed voice message: ${result.transcript.length} chars`);

    // Include audio file reference so notes can embed the original audio
    let text = result.transcript.trim();
    if (result.audioFile) {
      text += `\n[audio-file: ${result.audioFile}]`;
    }
    return text;
  } catch (err) {
    console.error('Transcription error:', err);
    return FALLBACK_MESSAGE;
  }
}

export function isVoiceMessage(msg: WAMessage): boolean {
  return msg.message?.audioMessage?.ptt === true;
}
