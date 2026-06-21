import type { ChatSessionRow, MessageRow } from "@/lib/db/types";
import { ENTITY_CATALOG, extractEntitiesFromCatalog } from "@/lib/config/entity-catalog";

export interface ShortTermMessage {
  role: string;
  content: string;
}

export interface SessionMemory {
  lastIntent: string | null;
  lastEntities: string[];
  lastOrigin: string | null;
  lastDestination: string | null;
  lastOpportunity: string | null;
  comprehensionStateHistory: string[];
}

export interface ShortTermBuffer {
  messages: ShortTermMessage[];
}

export interface SemanticMemory {
  entityAssociations: Record<string, string[]>;
}

export interface Memory {
  sessionMemory: SessionMemory;
  shortTermMemory: ShortTermBuffer;
  semanticMemory: SemanticMemory;
}

const DEFAULT_SEMANTIC_MEMORY: SemanticMemory = {
  entityAssociations: Object.fromEntries(
    ENTITY_CATALOG.map((e) => [e.key, e.semanticAssociations]),
  ),
};

function extractEntities(text: string): string[] {
  return extractEntitiesFromCatalog(text);
}

export function buildShortTermBuffer(history: MessageRow[], limit = 5): ShortTermBuffer {
  const recent = history.slice(-limit);
  return { messages: recent.map((m) => ({ role: m.role, content: m.content })) };
}

export function buildSessionMemory(session: ChatSessionRow | null, history: MessageRow[]): SessionMemory {
  const userMessages = history.filter((m) => m.role === "user");
  const allUserContent = userMessages.map((m) => m.content).join(" ");

  let lastIntent: string | null = null;
  let lastEntities: string[] = extractEntities(allUserContent);

  let lastOrigin: string | null = null;
  let lastDestination: string | null = null;
  if (session?.slots) {
    try {
      const slots = JSON.parse(session.slots);
      lastIntent = slots.intent ?? null;
      lastOrigin = slots.origin ?? null;
      lastDestination = slots.destination ?? null;
    } catch {}
  }

  const lastOpportunity: string | null = session?.pending_opportunity
    ? (() => { try { const p = JSON.parse(session.pending_opportunity); return p.label ?? null; } catch { return null; } })()
    : null;

  const comprehensionStateHistory: string[] = session?.comprehension_state ? [session.comprehension_state] : [];

  return { lastIntent, lastEntities, lastOrigin, lastDestination, lastOpportunity, comprehensionStateHistory };
}

export function buildMemory(session: ChatSessionRow | null, history: MessageRow[]): Memory {
  return {
    sessionMemory: buildSessionMemory(session, history),
    shortTermMemory: buildShortTermBuffer(history),
    semanticMemory: DEFAULT_SEMANTIC_MEMORY,
  };
}

export function getEntityBias(memory: Memory): string[] {
  const fromSession = memory.sessionMemory.lastEntities;
  const fromAssociations: string[] = [];
  for (const entity of fromSession) {
    const assocs = memory.semanticMemory.entityAssociations[entity];
    if (assocs) fromAssociations.push(...assocs);
  }
  return [...new Set([...fromSession, ...fromAssociations])];
}


