export type IllustrationEntry = {
  id: string;
  name: string;
  description: string;
  tags: string[];
};

export const ILLUSTRATIONS: IllustrationEntry[] = [
  {
    id: 'the-fool',
    name: 'The Fool',
    description: 'A joyful young wanderer stepping off a cliff edge, knapsack over shoulder, small dog at heel, gazing upward into endless sky.',
    tags: ['journey', 'adventure', 'innocence', 'freedom', 'new beginnings', 'leap of faith'],
  },
  {
    id: 'the-magician',
    name: 'The Magician',
    description: 'A robed figure standing at an altar bearing wand, cup, sword, and pentacle; one arm raised skyward, the other pointing to earth.',
    tags: ['power', 'skill', 'willpower', 'manifestation', 'mastery', 'creation'],
  },
  {
    id: 'the-high-priestess',
    name: 'The High Priestess',
    description: 'A serene veiled woman seated between two pillars, a crescent moon at her feet, a scroll of hidden wisdom in her hands.',
    tags: ['mystery', 'intuition', 'hidden knowledge', 'duality', 'stillness', 'subconscious'],
  },
  {
    id: 'the-empress',
    name: 'The Empress',
    description: 'A crowned queen reclining on lush cushions amid wheat fields and flowing water, adorned with stars and the symbols of Venus.',
    tags: ['fertility', 'abundance', 'nature', 'beauty', 'nurturing', 'creation'],
  },
  {
    id: 'the-emperor',
    name: 'The Emperor',
    description: 'An armored patriarch on a stone throne, eagle-carved rams on each arm, holding an ankh scepter with mountains behind him.',
    tags: ['authority', 'structure', 'leadership', 'stability', 'power', 'order'],
  },
  {
    id: 'the-hierophant',
    name: 'The Hierophant',
    description: 'A robed high priest enthroned between two ornate pillars, two acolytes kneeling before him, one hand raised in benediction.',
    tags: ['tradition', 'religion', 'teaching', 'conformity', 'ritual', 'guidance'],
  },
  {
    id: 'the-lovers',
    name: 'The Lovers',
    description: 'Two figures in a lush garden, an angelic being hovering above in radiant light, the man gazing at the woman who looks upward.',
    tags: ['love', 'union', 'choice', 'harmony', 'relationships', 'alignment'],
  },
  {
    id: 'the-chariot',
    name: 'The Chariot',
    description: 'A crowned warrior in a canopied chariot drawn by two sphinxes of opposing colors, holding a wand aloft against a starry sky.',
    tags: ['willpower', 'victory', 'determination', 'control', 'conquest', 'direction'],
  },
  {
    id: 'strength',
    name: 'Strength',
    description: 'A woman with an infinity symbol above her brow gently holds the jaws of a lion, taming it with calm compassion rather than force.',
    tags: ['courage', 'patience', 'compassion', 'inner strength', 'control', 'resilience'],
  },
  {
    id: 'the-hermit',
    name: 'The Hermit',
    description: 'An aged cloaked sage stands alone on a snow-capped mountain peak, lantern in one hand and long staff in the other.',
    tags: ['solitude', 'introspection', 'wisdom', 'guidance', 'searching', 'enlightenment'],
  },
  {
    id: 'wheel-of-fortune',
    name: 'Wheel of Fortune',
    description: 'A great cosmic wheel inscribed with alchemical symbols, surrounded by a sphinx, an Anubis, and a serpent, turning in the clouds.',
    tags: ['fate', 'cycles', 'luck', 'destiny', 'change', 'karma'],
  },
  {
    id: 'justice',
    name: 'Justice',
    description: 'A crowned figure in red robes seated between pillars, holding a double-edged sword aloft in one hand and balanced scales in the other.',
    tags: ['fairness', 'truth', 'law', 'balance', 'cause and effect', 'clarity'],
  },
  {
    id: 'the-hanged-man',
    name: 'The Hanged Man',
    description: 'A serene figure suspended upside-down by one ankle from a living T-shaped cross, halo of light surrounding a calm, contemplative face.',
    tags: ['sacrifice', 'surrender', 'new perspective', 'pause', 'release', 'wisdom'],
  },
  {
    id: 'death',
    name: 'Death',
    description: 'A skeletal knight in black armor rides a white horse past fallen figures of all stations; a rising sun glows behind two towers on the horizon.',
    tags: ['transformation', 'endings', 'change', 'transition', 'release', 'rebirth'],
  },
  {
    id: 'temperance',
    name: 'Temperance',
    description: 'A winged angel with one foot on land and one in water pours liquid between two golden cups; a path leads toward a distant crown of light.',
    tags: ['balance', 'patience', 'moderation', 'purpose', 'healing', 'flow'],
  },
  {
    id: 'the-tower',
    name: 'The Tower',
    description: 'A stone tower is shattered by a bolt of lightning; a golden crown topples from its summit as two figures fall through stormy darkness.',
    tags: ['upheaval', 'chaos', 'revelation', 'sudden change', 'destruction', 'awakening'],
  },
  {
    id: 'the-star',
    name: 'The Star',
    description: 'A kneeling woman pours water from two urns — one into a pool, one onto the earth — beneath eight radiant stars in a serene night sky.',
    tags: ['hope', 'renewal', 'inspiration', 'serenity', 'healing', 'faith'],
  },
  {
    id: 'the-moon',
    name: 'The Moon',
    description: 'A full moon with a stern face shines between two towers; a wolf and a dog howl at its light while a crayfish emerges from a still pool.',
    tags: ['illusion', 'fear', 'the unconscious', 'dreams', 'mystery', 'anxiety'],
  },
  {
    id: 'the-sun',
    name: 'The Sun',
    description: 'A naked child on a white horse rides triumphantly beneath a blazing sun, waving a red banner, with sunflowers blooming over the garden wall.',
    tags: ['joy', 'success', 'vitality', 'clarity', 'warmth', 'optimism'],
  },
];

export const ILLUSTRATION_MAP = new Map(ILLUSTRATIONS.map((ill) => [ill.id, ill]));
