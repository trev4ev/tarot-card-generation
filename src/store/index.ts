import { create } from 'zustand';
import type { Blueprint, TimelineNode, BlueprintDiff, DiffEntry } from '../types/blueprint';
import { theFool } from '../fixtures/cards';

// ── DeepPartial ──────────────────────────────────────────────────────────────
type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

// ── deepMerge ────────────────────────────────────────────────────────────────
function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function deepMerge<T>(base: T, patch: DeepPartial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return (patch as T) ?? base;
  }
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(patch)) {
    const patchVal = (patch as Record<string, unknown>)[key];
    const baseVal = (base as Record<string, unknown>)[key];
    if (patchVal === undefined) continue;
    result[key] = isPlainObject(baseVal) && isPlainObject(patchVal)
      ? deepMerge(baseVal, patchVal)
      : patchVal;
  }
  return result as T;
}

// ── diff helpers ─────────────────────────────────────────────────────────────
function diffBlueprints(a: Blueprint, b: Blueprint): DiffEntry[] {
  const entries: DiffEntry[] = [];

  function walk(oldVal: unknown, newVal: unknown, path: string[]): void {
    if (isPlainObject(oldVal) && isPlainObject(newVal)) {
      const keys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);
      for (const k of keys) {
        walk(oldVal[k], newVal[k], [...path, k]);
      }
    } else if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      const len = Math.max(oldVal.length, newVal.length);
      for (let i = 0; i < len; i++) {
        walk(oldVal[i], newVal[i], [...path, String(i)]);
      }
    } else if (oldVal !== newVal) {
      entries.push({ path, oldValue: oldVal, newValue: newVal });
    }
  }

  walk(a, b, []);
  return entries;
}

// ── Store types ──────────────────────────────────────────────────────────────
export interface StoreState {
  // Timeline
  nodes: TimelineNode[];
  activeNodeId: string | null;
  diffs: BlueprintDiff[];

  // UI state
  isGenerating: boolean;
  prompt: string;

  // Derived selectors
  activeBlueprint: () => Blueprint | null;

  // Actions
  setPrompt: (prompt: string) => void;
  addNode: (blueprint: Blueprint, label: string, parentId?: string | null) => TimelineNode;
  setActiveNode: (id: string) => void;
  patchBlueprint: (patch: DeepPartial<Blueprint>) => void;
  setIsGenerating: (val: boolean) => void;
  resetToFixture: () => void;
}

// ── Store ────────────────────────────────────────────────────────────────────
const initialNode: TimelineNode = {
  id: crypto.randomUUID(),
  blueprint: { ...theFool, id: crypto.randomUUID() },
  parentId: null,
  label: 'Initial',
  timestamp: Date.now(),
};

export const useStore = create<StoreState>((set, get) => ({
  nodes: [initialNode],
  activeNodeId: initialNode.id,
  diffs: [],
  isGenerating: false,
  prompt: '',

  activeBlueprint: () => {
    const { nodes, activeNodeId } = get();
    return nodes.find((n) => n.id === activeNodeId)?.blueprint ?? null;
  },

  setPrompt: (prompt) => set({ prompt }),

  addNode: (blueprint, label, parentId = null) => {
    const state = get();
    const resolvedParentId = parentId ?? state.activeNodeId;
    const node: TimelineNode = {
      id: crypto.randomUUID(),
      blueprint,
      parentId: resolvedParentId,
      label,
      timestamp: Date.now(),
    };

    // Compute diff if there's a parent
    const newDiffs = [...state.diffs];
    if (resolvedParentId) {
      const parentNode = state.nodes.find((n) => n.id === resolvedParentId);
      if (parentNode) {
        const entries = diffBlueprints(parentNode.blueprint, blueprint);
        if (entries.length > 0) {
          const diff: BlueprintDiff = {
            id: crypto.randomUUID(),
            sourceNodeId: resolvedParentId,
            targetNodeId: node.id,
            entries,
            label,
          };
          newDiffs.push(diff);
        }
      }
    }

    set({
      nodes: [...state.nodes, node],
      activeNodeId: node.id,
      diffs: newDiffs,
    });
    return node;
  },

  setActiveNode: (id) => set({ activeNodeId: id }),

  patchBlueprint: (patch) => {
    const state = get();
    const current = state.activeBlueprint();
    if (!current) return;
    const patched = deepMerge(current, patch);
    state.addNode(patched, 'Manual edit');
  },

  setIsGenerating: (val) => set({ isGenerating: val }),

  resetToFixture: () => {
    const node: TimelineNode = {
      id: crypto.randomUUID(),
      blueprint: { ...theFool, id: crypto.randomUUID() },
      parentId: null,
      label: 'Reset',
      timestamp: Date.now(),
    };
    set({ nodes: [node], activeNodeId: node.id, diffs: [] });
  },
}));
