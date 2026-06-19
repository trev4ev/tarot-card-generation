import { create } from 'zustand';
import type { Blueprint, TimelineNode, Branch, ElementRef, SymbolDef, DiffEntry } from '../types/blueprint';
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

// ── Blueprint diff ────────────────────────────────────────────────────────────

function flattenPaths(obj: unknown, prefix: string[]): Map<string, unknown> {
  const result = new Map<string, unknown>();
  // Arrays and primitives are atomic — don't recurse into them
  if (Array.isArray(obj) || obj === null || typeof obj !== 'object') {
    result.set(prefix.join('.'), obj);
    return result;
  }
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    for (const [path, value] of flattenPaths(val, [...prefix, key])) {
      result.set(path, value);
    }
  }
  return result;
}

export function diffBlueprints(a: Blueprint, b: Blueprint): DiffEntry[] {
  const aFlat = flattenPaths(a, []);
  const bFlat = flattenPaths(b, []);
  const entries: DiffEntry[] = [];
  const allKeys = new Set([...aFlat.keys(), ...bFlat.keys()]);
  for (const path of allKeys) {
    if (path === 'id') continue;
    const aVal = aFlat.get(path);
    const bVal = bFlat.get(path);
    if (JSON.stringify(aVal) !== JSON.stringify(bVal)) {
      entries.push({ path: path.split('.'), oldValue: aVal, newValue: bVal });
    }
  }
  return entries;
}

function buildPatchFromDiffs(diffs: DiffEntry[]): DeepPartial<Blueprint> {
  const result: Record<string, unknown> = {};
  for (const diff of diffs) {
    let obj = result;
    for (let i = 0; i < diff.path.length - 1; i++) {
      const key = diff.path[i];
      if (!isPlainObject(obj[key])) obj[key] = {};
      obj = obj[key] as Record<string, unknown>;
    }
    obj[diff.path[diff.path.length - 1]] = diff.newValue;
  }
  return result as DeepPartial<Blueprint>;
}

// ── Store types ──────────────────────────────────────────────────────────────
export interface StoreState {
  // Branches
  branches: Branch[];
  activeBranchId: string;

  // UI state
  isGenerating: boolean;
  prompt: string;

  // Derived selectors
  activeBranch: () => Branch | null;
  activeBlueprint: () => Blueprint | null;

  // Selection
  selectedElement: ElementRef | null;
  setSelectedElement: (el: ElementRef | null) => void;

  // Actions
  setPrompt: (prompt: string) => void;
  addNode: (blueprint: Blueprint, label: string) => TimelineNode;
  setActiveNode: (nodeId: string) => void;
  setActiveBranch: (branchId: string) => void;
  patchBlueprint: (patch: DeepPartial<Blueprint>, label?: string) => void;
  updateLiveBlueprint: (patch: DeepPartial<Blueprint>) => void;
  branchFrom: (nodeId: string, sourceBranchId: string) => Branch | null;
  renameBranch: (branchId: string, label: string) => void;
  toggleBranchCollapse: (branchId: string) => void;
  setIsGenerating: (val: boolean) => void;
  resetToFixture: () => void;
  updateSymbol: (symbolId: string, patch: Partial<SymbolDef>) => void;
  addSymbol: (sym: SymbolDef) => void;
  removeSymbol: (symbolId: string) => void;
  patchBlueprintOnBranch: (branchId: string, patch: DeepPartial<Blueprint>, label: string) => void;
  transferEdit: (fromBranchId: string, nodeId: string, toBranchId: string) => void;
}

// ── Initial state factory ─────────────────────────────────────────────────────
function makeInitialBranch(): Branch {
  const node: TimelineNode = {
    id: crypto.randomUUID(),
    blueprint: { ...theFool, id: crypto.randomUUID() },
    parentId: null,
    label: 'Initial',
    timestamp: Date.now(),
  };
  return {
    id: crypto.randomUUID(),
    label: 'Main',
    nodes: [node],
    activeNodeId: node.id,
    collapsed: false,
    sourceNodeId: null,
    sourceBranchId: null,
  };
}

const initialBranch = makeInitialBranch();

// ── Store ────────────────────────────────────────────────────────────────────
export const useStore = create<StoreState>((set, get) => ({
  branches: [initialBranch],
  activeBranchId: initialBranch.id,
  isGenerating: false,
  prompt: '',
  selectedElement: null,

  activeBranch: () => {
    const { branches, activeBranchId } = get();
    return branches.find((b) => b.id === activeBranchId) ?? null;
  },

  activeBlueprint: () => {
    const branch = get().activeBranch();
    if (!branch) return null;
    return branch.nodes.find((n) => n.id === branch.activeNodeId)?.blueprint ?? null;
  },

  setSelectedElement: (el) => set({ selectedElement: el }),

  setPrompt: (prompt) => set({ prompt }),

  addNode: (blueprint, label) => {
    const state = get();
    const branch = state.activeBranch();
    if (!branch) {
      throw new Error('No active branch');
    }
    const node: TimelineNode = {
      id: crypto.randomUUID(),
      blueprint,
      parentId: branch.activeNodeId,
      label,
      timestamp: Date.now(),
    };
    set((s) => ({
      branches: s.branches.map((b) =>
        b.id === s.activeBranchId
          ? { ...b, nodes: [...b.nodes, node], activeNodeId: node.id }
          : b
      ),
    }));
    return node;
  },

  setActiveNode: (nodeId) => {
    set((s) => {
      for (const branch of s.branches) {
        const found = branch.nodes.find((n) => n.id === nodeId);
        if (found) {
          return {
            activeBranchId: branch.id,
            branches: s.branches.map((b) =>
              b.id === branch.id ? { ...b, activeNodeId: nodeId } : b
            ),
          };
        }
      }
      return s;
    });
  },

  setActiveBranch: (branchId) => set({ activeBranchId: branchId, selectedElement: null }),

  patchBlueprint: (patch, label = 'Manual edit') => {
    const state = get();
    const current = state.activeBlueprint();
    if (!current) return;
    const patched = { ...deepMerge(current, patch), id: crypto.randomUUID() };
    state.addNode(patched, label);
  },

  updateLiveBlueprint: (patch) => {
    set((s) => {
      const branchIdx = s.branches.findIndex((b) => b.id === s.activeBranchId);
      if (branchIdx === -1) return s;
      const branch = s.branches[branchIdx];
      const nodeIdx = branch.nodes.findIndex((n) => n.id === branch.activeNodeId);
      if (nodeIdx === -1) return s;
      const updated = deepMerge(branch.nodes[nodeIdx].blueprint, patch);
      const newNodes = [...branch.nodes];
      newNodes[nodeIdx] = { ...newNodes[nodeIdx], blueprint: updated };
      const newBranches = [...s.branches];
      newBranches[branchIdx] = { ...branch, nodes: newNodes };
      return { branches: newBranches };
    });
  },

  branchFrom: (nodeId, sourceBranchId) => {
    const state = get();
    if (state.branches.length >= 4) return null;
    const sourceBranch = state.branches.find((b) => b.id === sourceBranchId);
    if (!sourceBranch) return null;
    const sourceNode = sourceBranch.nodes.find((n) => n.id === nodeId);
    if (!sourceNode) return null;

    const newNode: TimelineNode = {
      id: crypto.randomUUID(),
      blueprint: { ...sourceNode.blueprint, id: crypto.randomUUID() },
      parentId: nodeId,
      label: 'Branch start',
      timestamp: Date.now(),
    };
    const newBranch: Branch = {
      id: crypto.randomUUID(),
      label: `Branch ${state.branches.length}`,
      nodes: [newNode],
      activeNodeId: newNode.id,
      collapsed: false,
      sourceNodeId: nodeId,
      sourceBranchId: sourceBranchId,
    };
    set((s) => ({
      branches: [...s.branches, newBranch],
      activeBranchId: newBranch.id,
      selectedElement: null,
    }));
    return newBranch;
  },

  renameBranch: (branchId, label) => {
    set((s) => ({
      branches: s.branches.map((b) =>
        b.id === branchId ? { ...b, label } : b
      ),
    }));
  },

  toggleBranchCollapse: (branchId) => {
    set((s) => ({
      branches: s.branches.map((b) =>
        b.id === branchId ? { ...b, collapsed: !b.collapsed } : b
      ),
    }));
  },

  setIsGenerating: (val) => set({ isGenerating: val }),

  resetToFixture: () => {
    const branch = makeInitialBranch();
    set({ branches: [branch], activeBranchId: branch.id, selectedElement: null });
  },

  updateSymbol: (symbolId, patch) => {
    const state = get();
    const current = state.activeBlueprint();
    if (!current) return;
    const symbols = current.symbols.map((s) =>
      s.id === symbolId ? { ...s, ...patch } : s
    );
    state.patchBlueprint({ symbols }, `Symbol: ${Object.keys(patch).join(', ')}`);
  },

  addSymbol: (sym) => {
    const state = get();
    const current = state.activeBlueprint();
    if (!current) return;
    state.patchBlueprint({ symbols: [...current.symbols, sym] }, 'Add symbol');
  },

  removeSymbol: (symbolId) => {
    const state = get();
    const current = state.activeBlueprint();
    if (!current) return;
    const symbols = current.symbols.filter((s) => s.id !== symbolId);
    state.patchBlueprint({ symbols }, 'Remove symbol');
  },

  patchBlueprintOnBranch: (branchId, patch, label) => {
    const state = get();
    const branch = state.branches.find((b) => b.id === branchId);
    if (!branch) return;
    const activeNode = branch.nodes.find((n) => n.id === branch.activeNodeId);
    if (!activeNode) return;
    const patched = { ...deepMerge(activeNode.blueprint, patch), id: crypto.randomUUID() };
    const newNode: TimelineNode = {
      id: crypto.randomUUID(),
      blueprint: patched,
      parentId: branch.activeNodeId,
      label,
      timestamp: Date.now(),
    };
    set((s) => ({
      branches: s.branches.map((b) =>
        b.id === branchId
          ? { ...b, nodes: [...b.nodes, newNode], activeNodeId: newNode.id }
          : b
      ),
    }));
  },

  transferEdit: (fromBranchId, nodeId, toBranchId) => {
    const state = get();
    const fromBranch = state.branches.find((b) => b.id === fromBranchId);
    if (!fromBranch) return;
    const node = fromBranch.nodes.find((n) => n.id === nodeId);
    if (!node || !node.parentId) return;
    // Only transfer when the parent lives in the same branch
    const parentNode = fromBranch.nodes.find((n) => n.id === node.parentId);
    if (!parentNode) return;
    const diffs = diffBlueprints(parentNode.blueprint, node.blueprint);
    if (diffs.length === 0) return;
    const patch = buildPatchFromDiffs(diffs);
    state.patchBlueprintOnBranch(toBranchId, patch, `↩ from ${fromBranch.label}: ${node.label}`);
  },
}));
