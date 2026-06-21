import { pickIllustration } from '../ai/mock-client';

export interface RandomBlurb {
  illustrationId: string;
  prompt: string;
}

// Each prompt contains keywords that trigger the correct illustration via the
// mock client's pickIllustration regex table.  See mock-client.ts for the full
// keyword → illustration mapping.
export const RANDOM_BLURBS: RandomBlurb[] = [
  {
    illustrationId: 'the-fool',
    prompt:
      "A carefree young fool embarks on a new adventure, stepping off the cliff's edge into the unknown with innocent wonder.",
  },
  {
    illustrationId: 'the-magician',
    prompt:
      'A magician stands at his altar, manifesting his intentions through the power of all four elemental tools.',
  },
  {
    illustrationId: 'the-high-priestess',
    prompt:
      'A veiled oracle holds a sacred scroll, her face revealing nothing — only deep intuition and silent mystery.',
  },
  {
    illustrationId: 'the-empress',
    prompt:
      'A crowned empress presides over fertile lands of abundance, where nature provides an endless harvest of grain and bloom.',
  },
  {
    illustrationId: 'the-emperor',
    prompt:
      'An emperor of absolute authority maintains order from his stone throne, his firm leadership shaping the pillars of civilization.',
  },
  {
    illustrationId: 'the-hierophant',
    prompt:
      'A hierophant in sacred robes preserves ancient tradition, teaching his acolytes through solemn ritual and holy ceremony.',
  },
  {
    illustrationId: 'the-lovers',
    prompt:
      'Two lovers stand in blissful union, their hearts entwined beneath divine light as they face a momentous choice together.',
  },
  {
    illustrationId: 'the-chariot',
    prompt:
      'A determined warrior rides his chariot to conquest and victory, commanding opposing forces through focused resolve.',
  },
  {
    illustrationId: 'strength',
    prompt:
      'A gentle woman demonstrates inner strength and courage, calmly taming a fierce lion through compassion and patient grace.',
  },
  {
    illustrationId: 'the-hermit',
    prompt:
      'An aged hermit sage stands alone on a mountain peak in solitude, holding a glowing lantern to light the path of wisdom.',
  },
  {
    illustrationId: 'wheel-of-fortune',
    prompt:
      "A great cosmic wheel of fate turns through endless cycles of karma and fortune, with destiny determining each soul's path.",
  },
  {
    illustrationId: 'justice',
    prompt:
      'A crowned arbiter of justice wields truth and the scales of balance, ensuring law applies equally to all before the throne.',
  },
  {
    illustrationId: 'the-hanged-man',
    prompt:
      'A figure hangs upside down in serene surrender, gaining a profound new perspective through the sacrifice of ego and certainty.',
  },
  {
    illustrationId: 'death',
    prompt:
      'A skeletal horseman heralds transformation and endings, the great transition clearing the way for rebirth and new cycles.',
  },
  {
    illustrationId: 'temperance',
    prompt:
      'A graceful angel pours water in patient moderation, flowing between two vessels with healing purpose on the celestial path.',
  },
  {
    illustrationId: 'the-devil',
    prompt:
      'A goat-headed devil rules through bondage and temptation, his dark shadow binding souls in chains of materialism.',
  },
  {
    illustrationId: 'the-tower',
    prompt:
      'A bolt of lightning strikes a stone tower, unleashing chaos and upheaval that topples false certainty in an instant.',
  },
  {
    illustrationId: 'the-star',
    prompt:
      'A kneeling figure pours water beneath eight guiding stars, offering hope and renewal in peaceful serenity after the storm.',
  },
  {
    illustrationId: 'the-moon',
    prompt:
      'A pale moon casts its glow over a dreamlike night where wolves howl and fears blur the line between vision and reality.',
  },
  {
    illustrationId: 'the-sun',
    prompt:
      "A radiant child rides triumphantly beneath the blazing sun, spreading joy and warmth through life's golden light.",
  },
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
