import * as lamejsModule from 'lamejs';

// Get lamejs reference safely
const lamejs = (lamejsModule as any).default || lamejsModule;

/**
 * Converts Web Audio API AudioBuffer to MP3 Blob using lamejs
 */
export async function encodeAudioBufferToMp3(
  audioBuffer: AudioBuffer,
  bitrate: number = 192,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const mp3encoder = new lamejs.Mp3Encoder(channels > 1 ? 2 : 1, sampleRate, bitrate);

  const mp3Data: Uint8Array[] = [];

  const samplesLeft = audioBuffer.getChannelData(0);
  const samplesRight = channels > 1 ? audioBuffer.getChannelData(1) : samplesLeft;

  const sampleCount = samplesLeft.length;

  // Convert Float32 to Int16
  const leftInt16 = new Int16Array(sampleCount);
  const rightInt16 = new Int16Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const sLeft = Math.max(-1, Math.min(1, samplesLeft[i]));
    leftInt16[i] = sLeft < 0 ? sLeft * 0x8000 : sLeft * 0x7fff;

    if (channels > 1) {
      const sRight = Math.max(-1, Math.min(1, samplesRight[i]));
      rightInt16[i] = sRight < 0 ? sRight * 0x8000 : sRight * 0x7fff;
    }
  }

  const sampleBlockSize = 1152;
  for (let i = 0; i < sampleCount; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    let mp3buf: Int8Array;

    if (channels > 1) {
      const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    }

    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }

    if (onProgress && i % (sampleBlockSize * 50) === 0) {
      onProgress(Math.min(100, Math.round((i / sampleCount) * 100)));
    }
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(new Uint8Array(mp3buf));
  }

  if (onProgress) onProgress(100);

  return new Blob(mp3Data, { type: 'audio/mp3' });
}

/**
 * Encodes AudioBuffer to WAV format as fallback
 */
export function encodeAudioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numOfChan = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels: Float32Array[] = [];
  let sampleRate = audioBuffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit resolution

  setUint32(0x61746164); // "data" chunk length
  setUint32(length - pos - 4);

  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  while (offset < audioBuffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
