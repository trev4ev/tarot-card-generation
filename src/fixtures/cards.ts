import type { Blueprint } from '../types/blueprint';

export const theFool: Blueprint = {
  id: 'fixture-the-fool',
  seed: 'seed-the-fool',
  illustration: 'the-fool',
  identity: {
    name: 'The Fool',
    archetype: 'The Innocent Adventurer',
    number: 0,
    suit: null,
  },
  palette: {
    background: '#fffde7',
    primaryAccent: '#ffd54f',
    secondaryAccent: '#81c784',
    text: '#3e2723',
    border: '#a1887f',
  },
  typography: {
    fontFamily: 'Cinzel',
    titleSize: 24,
    titleWeight: '700',
    bodySize: 14,
    bodyWeight: '400',
    letterSpacing: 2,
    titleCase: 'upper',
    titleAlign: 'center',

  },
  frame: {
    style: 'simple',
    thickness: 6,
    cornerMotif: 'star',
    color: '#a1887f',
    innerMargin: 12,
  },
  background: {
    baseColor: '#fffde7',
    texture: 'parchment',
    textureDensity: 0.3,
    pattern: 'stars',
    patternOpacity: 0.15,
  },
  symbols: [
    {
      id: 'fool-sun',
      kind: 'sun',
      x: 0.75,
      y: 0.2,
      scale: 0.8,
      opacity: 0.9,
      flipX: false,
      flipY: false,
    },
    {
      id: 'fool-flower',
      kind: 'flower',
      x: 0.15,
      y: 0.65,
      scale: 0.5,
      opacity: 0.8,
      flipX: false,
      flipY: false,
    },
  ],
  footer: {
    text: '0 · THE FOOL',
    fontFamily: 'Cinzel',
    size: 11,
    visible: true,
  },
  layout: {

    illustrationArea: { x: 0.05, y: 0.15, width: 0.9, height: 0.65 },
  },
};

export const theMoon: Blueprint = {
  id: 'fixture-the-moon',
  seed: 'seed-the-moon',
  illustration: 'the-moon',
  identity: {
    name: 'The Moon',
    archetype: 'The Dreamer',
    number: 18,
    suit: null,
  },
  palette: {
    background: '#0d1b2a',
    primaryAccent: '#90caf9',
    secondaryAccent: '#7986cb',
    text: '#e3f2fd',
    border: '#546e7a',
  },
  typography: {
    fontFamily: 'UnifrakturMaguntia',
    titleSize: 26,
    titleWeight: '400',
    bodySize: 13,
    bodyWeight: '300',
    letterSpacing: 3,
    titleCase: 'title',
    titleAlign: 'center',

  },
  frame: {
    style: 'gothic',
    thickness: 8,
    cornerMotif: 'moon',
    color: '#546e7a',
    innerMargin: 14,
  },
  background: {
    baseColor: '#0d1b2a',
    texture: 'watercolor',
    textureDensity: 0.5,
    pattern: 'stars',
    patternOpacity: 0.4,
  },
  symbols: [
    {
      id: 'moon-crescent',
      kind: 'crescent',
      x: 0.5,
      y: 0.25,
      scale: 1.0,
      opacity: 1.0,
      flipX: false,
      flipY: false,
    },
  ],
  footer: {
    text: 'XVIII · THE MOON',
    fontFamily: 'UnifrakturMaguntia',
    size: 11,
    visible: true,
  },
  layout: {

    illustrationArea: { x: 0.06, y: 0.15, width: 0.88, height: 0.65 },
  },
};

export const aceOfWands: Blueprint = {
  id: 'fixture-ace-of-wands',
  seed: 'seed-ace-of-wands',
  illustration: 'the-magician',
  identity: {
    name: 'Ace of Wands',
    archetype: 'The Spark of Creation',
    number: 1,
    suit: 'Wands',
  },
  palette: {
    background: '#3e1a00',
    primaryAccent: '#ff6f00',
    secondaryAccent: '#ffd54f',
    text: '#fff3e0',
    border: '#bf360c',
  },
  typography: {
    fontFamily: 'Pirata One',
    titleSize: 22,
    titleWeight: '400',
    bodySize: 13,
    bodyWeight: '400',
    letterSpacing: 1.5,
    titleCase: 'title',
    titleAlign: 'center',

  },
  frame: {
    style: 'ornate',
    thickness: 10,
    cornerMotif: 'fleur',
    color: '#bf360c',
    innerMargin: 16,
  },
  background: {
    baseColor: '#3e1a00',
    texture: 'canvas',
    textureDensity: 0.4,
    pattern: 'vines',
    patternOpacity: 0.25,
  },
  symbols: [
    {
      id: 'wands-flame-1',
      kind: 'flame',
      x: 0.3,
      y: 0.3,
      scale: 0.6,
      opacity: 0.85,
      flipX: false,
      flipY: false,
    },
    {
      id: 'wands-flame-2',
      kind: 'flame',
      x: 0.7,
      y: 0.3,
      scale: 0.6,
      opacity: 0.85,
      flipX: true,
      flipY: false,
    },
  ],
  footer: {
    text: 'ACE OF WANDS',
    fontFamily: 'Pirata One',
    size: 12,
    visible: true,
  },
  layout: {

    illustrationArea: { x: 0.07, y: 0.1, width: 0.86, height: 0.72 },
  },
};

export const fixtureCards: Blueprint[] = [theFool, theMoon, aceOfWands];
