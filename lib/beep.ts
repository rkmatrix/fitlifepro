/**
 * Beep sound utility — generates a short 880 Hz WAV tone on first call,
 * caches it in the device's temp directory, and plays it via expo-av.
 * Falls back silently (no crash) on web or if audio is unavailable.
 */
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

let cachedUri: string | null = null;

/** Build a minimal PCM WAV buffer for a sine-wave beep. */
function buildBeepWav(frequency = 880, durationSec = 0.12, sampleRate = 8000): Uint8Array {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buf = new Uint8Array(44 + numSamples);
  const view = new DataView(buf.buffer);

  // RIFF header
  buf.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  view.setUint32(4, 36 + numSamples, true);
  buf.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

  // fmt sub-chunk
  buf.set([0x66, 0x6D, 0x74, 0x20], 12); // "fmt "
  view.setUint32(16, 16, true);           // PCM chunk size
  view.setUint16(20, 1, true);            // AudioFormat = PCM
  view.setUint16(22, 1, true);            // NumChannels = 1
  view.setUint32(24, sampleRate, true);   // SampleRate
  view.setUint32(28, sampleRate, true);   // ByteRate (8-bit mono)
  view.setUint16(32, 1, true);            // BlockAlign
  view.setUint16(34, 8, true);            // BitsPerSample = 8

  // data sub-chunk
  buf.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  view.setUint32(40, numSamples, true);

  // 8-bit unsigned PCM samples (centre = 128) with simple fade envelope
  for (let i = 0; i < numSamples; i++) {
    const t = i / numSamples;
    const envelope = t < 0.1 ? t / 0.1 : t > 0.7 ? (1 - t) / 0.3 : 1.0;
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    buf[44 + i] = Math.round(sample * envelope * 100 + 128);
  }
  return buf;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Ensure the beep WAV is written to cache and return its file URI. */
async function ensureBeepFile(): Promise<string | null> {
  if (cachedUri) return cachedUri;
  try {
    const uri = `${FileSystem.cacheDirectory}fitlife_beep.wav`;
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      const base64 = uint8ToBase64(buildBeepWav());
      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
    cachedUri = uri;
    return uri;
  } catch {
    return null;
  }
}

/** Play a short beep. Safe to call rapidly — each call creates and auto-unloads its own Sound. */
export async function playBeep(): Promise<void> {
  if (Platform.OS === 'web') return; // Web AudioContext not supported via expo-av WAV URI
  try {
    const uri = await ensureBeepFile();
    if (!uri) return;
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: 1 });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch {
    // Fail silently — beep is supplementary feedback
  }
}
