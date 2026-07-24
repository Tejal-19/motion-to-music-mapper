// Stand-in for the real beat-detection backend, until that's ready.
// Fires POST /beat at a steady BPM so the choreography can be tested live.
//
// Usage: npm run fake-beats -- [bpm] [port]
//   npm run fake-beats            # 120 BPM against localhost:8080
//   npm run fake-beats -- 90      # 90 BPM
//   npm run fake-beats -- 128 8080

const bpm = Number(process.argv[2]) || 120;
const port = Number(process.argv[3]) || 8080;
const intervalMs = 60_000 / bpm;

console.log(`Sending a beat every ${intervalMs.toFixed(0)}ms (${bpm} BPM) to http://localhost:${port}/beat`);
console.log('Ctrl+C to stop.');

setInterval(async () => {
  try {
    const res = await fetch(`http://localhost:${port}/beat`, { method: 'POST' });
    const body = await res.json();
    console.log(body.ok ? `beat -> ${body.motion}` : `beat failed: ${body.error}`);
  } catch (err) {
    console.error('Could not reach motion-service — is it running?', (err as Error).message);
  }
}, intervalMs);
