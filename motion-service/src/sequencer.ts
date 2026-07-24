import { MOTIONS, Motion } from './motions';

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Each full cycle uses all 3 motions exactly once, in a freshly shuffled
// order — so beat 1 isn't always "nod", and the sequence doesn't feel like
// a fixed loop even though every motion appears equally often.
let cycle: Motion[] = shuffle(MOTIONS);
let position = 0;

export function nextMotion(): Motion {
  if (position >= cycle.length) {
    cycle = shuffle(MOTIONS);
    position = 0;
  }
  return cycle[position++];
}
