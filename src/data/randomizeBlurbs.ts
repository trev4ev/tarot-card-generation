import { pickIllustration } from '../ai/mock-client';

export interface RandomBlurb {
  illustrationId: string;
  prompt: string;
}

// Each prompt contains keywords that map to the correct illustration via the
// mock client's pickIllustration regex table.
export const RANDOM_BLURBS: RandomBlurb[] = [
  { illustrationId: 'the-fool',          prompt: 'A fool taking a leap into adventure' },
  { illustrationId: 'the-magician',      prompt: 'A magician channeling power to manifest' },
  { illustrationId: 'the-high-priestess', prompt: 'A veiled woman of mystery and intuition' },
  { illustrationId: 'the-empress',       prompt: 'A fertile empress among nature\'s abundance' },
  { illustrationId: 'the-emperor',       prompt: 'An emperor commanding authority and order' },
  { illustrationId: 'the-hierophant',    prompt: 'A hierophant upholding sacred tradition' },
  { illustrationId: 'the-lovers',        prompt: 'Two people in love facing a choice' },
  { illustrationId: 'the-chariot',       prompt: 'A warrior riding a chariot to victory' },
  { illustrationId: 'strength',          prompt: 'Inner strength, a woman taming a lion' },
  { illustrationId: 'the-hermit',        prompt: 'A hermit alone with lantern and wisdom' },
  { illustrationId: 'wheel-of-fortune',  prompt: 'The wheel of fortune spinning through fate' },
  { illustrationId: 'justice',           prompt: 'Justice, truth, and balance under law' },
  { illustrationId: 'the-hanged-man',    prompt: 'A figure hanging in surrender and new perspective' },
  { illustrationId: 'death',             prompt: 'Death as transformation and rebirth' },
  { illustrationId: 'temperance',        prompt: 'An angel flowing with patient moderation' },
  { illustrationId: 'the-devil',         prompt: 'The devil, shadow, and chains of bondage' },
  { illustrationId: 'the-tower',         prompt: 'Lightning strikes the tower in chaos' },
  { illustrationId: 'the-star',          prompt: 'Stars of hope and renewal after darkness' },
  { illustrationId: 'the-moon',          prompt: 'A wolf howling at the moon in the night' },
  { illustrationId: 'the-sun',           prompt: 'A child riding in radiant sunlight and joy' },
];

export function getRandomBlurb(): RandomBlurb {
  return RANDOM_BLURBS[Math.floor(Math.random() * RANDOM_BLURBS.length)];
}

// ── Validation ────────────────────────────────────────────────────────────────
// Runs in dev mode on startup. Verifies each blurb's prompt contains keywords
// that make the mock client return the declared illustrationId.
export function assertAllBlurbsValid(): void {
  const results = RANDOM_BLURBS.map((blurb) => {
    const actual = pickIllustration(blurb.prompt);
    return { ...blurb, actual, pass: actual === blurb.illustrationId };
  });
  const failures = results.filter((r) => !r.pass);
  if (failures.length === 0) {
    console.info(`[randomizeBlurbs] All ${results.length} blurbs validated ✓`);
    return;
  }
  console.error('[randomizeBlurbs] Illustration mismatch for blurbs:');
  for (const f of failures) {
    console.error(`  expected=${f.illustrationId}  got=${f.actual}  prompt="${f.prompt}"`);
  }
  throw new Error(`${failures.length} blurb(s) failed illustration validation`);
}
