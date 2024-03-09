export function add(a: number, b: number): number {
  return a + b;
}

function bytes(...blobs: (Uint8Array | Uint16Array | Uint32Array)[]) {
  const size = blobs.reduce((a, b) => a + b.byteLength, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const b of blobs) {
    result.set(b, offset);
    offset += b.byteLength;
  }
  return result;
}

function wav() {
  // https://docs.fileformat.com/audio/wav/
  const rate = 44100;
  const channels = 1;
  const sampleWidth = 2;
  const te = new TextEncoder();
  const f = bytes(
    te.encode('RIFF' + '\0\0\0\0' + 'WAVE' + 'fmt '),
    new Uint32Array([16]),
    new Uint16Array([1, channels]),
    new Uint32Array([rate, rate * channels * sampleWidth]),
    new Uint16Array([channels * sampleWidth, sampleWidth * 8]),
    te.encode('data'),
    new Uint32Array([0]),
  );
  f.set(new Uint32Array([f.byteLength]), 4);
  return f;
}

// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {
  const bytes = wav();
  console.log(bytes.length);
  await Deno.writeFile('out.wav', bytes);
}
