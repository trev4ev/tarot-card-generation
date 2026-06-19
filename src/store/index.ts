import { create } from 'zustand';
import type { Blueprint, TimelineNode, Branch } from '../types/blueprint';
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

  activeBranch: () => {
    const { branches, activeBranchId } = get();
    return branches.find((b) => b.id === activeBranchId) ?? null;
  },

  activeBlueprint: () => {
    const branch = get().activeBranch();
    if (!branch) return null;
    return branch.nodes.find((n) => n.id === branch.activeNodeId)?.blueprint ?? null;
  },

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

  setActiveBranch: (branchId) => set({ activeBranchId: branchId }),

  patchBlueprint: (patch, label = 'Manual edit') => {
    const state = get();
    const current = state.activeBlueprint();
    if (!current) return;
    const patched = deepMerge(current, patch);
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
    set({ branches: [branch], activeBranchId: branch.id });
  },
}));
