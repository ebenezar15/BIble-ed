"use client";

// Notes and content edits live in this browser (localStorage). Export them to keep a copy or move them elsewhere.
import { useSyncExternalStore } from "react";
import { validateBlockInput, type BlockInput } from "@/lib/edit/validate";

export type LocalNote = {
  id: string;
  subject: string;
  body: string;
  workId: string | null;
  workTitle: string | null;
  page: string | null;
  updatedAt: string;
};

export type LocalCitation = { id: string; ref: string; url: string | null; workId: string | null; workTitle: string | null; verified: boolean };

/** A block written or changed in this browser. key = the library block's key it replaces, or local-… for a new one. */
export type LocalEdit = {
  key: string;
  subject: string;
  deleted?: boolean;
  section: string;
  type: string;
  title: string | null;
  by: { id: string; name: string } | null;
  consensus: string;
  bodyMd: string;
  reviewed: boolean;
  citations: LocalCitation[];
  updatedAt: string;
};

const NOTES = "logos.notes.v1";
const EDITS = "logos.edits.v1";

const listeners = new Set<() => void>();
const snapshots = new Map<string, unknown>();

function read<T>(key: string, fallback: T): T {
  if (snapshots.has(key)) return snapshots.get(key) as T;
  let value = fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) value = JSON.parse(raw) as T;
  } catch {
    // Private mode or corrupt data: start empty.
  }
  snapshots.set(key, value);
  return value;
}

function save(key: string, value: unknown) {
  snapshots.set(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error("This browser would not save it (storage is full or blocked).");
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === NOTES || e.key === EDITS) {
      snapshots.delete(e.key);
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY_NOTES: LocalNote[] = [];
const EMPTY_EDITS: Record<string, LocalEdit> = {};

export const getNotes = () => read<LocalNote[]>(NOTES, EMPTY_NOTES);
export const getEdits = () => read<Record<string, LocalEdit>>(EDITS, EMPTY_EDITS);

export function useNotes(): LocalNote[] {
  return useSyncExternalStore(subscribe, getNotes, () => EMPTY_NOTES);
}

export function useEdits(): Record<string, LocalEdit> {
  return useSyncExternalStore(subscribe, getEdits, () => EMPTY_EDITS);
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();

export function addNote(n: { subject: string; body: string; workId?: string | null; workTitle?: string | null; page?: string | null }) {
  if (!n.body.trim()) throw new Error("Write something before saving.");
  const note: LocalNote = {
    id: newId("note"), subject: n.subject, body: n.body, workId: n.workId || null, workTitle: n.workTitle || null,
    page: n.page || null, updatedAt: now(),
  };
  save(NOTES, [note, ...getNotes()]);
}

export function deleteNote(id: string) {
  save(NOTES, getNotes().filter((n) => n.id !== id));
}

export function saveEdit(input: BlockInput & { key?: string; byName?: string | null; citations?: LocalCitation[] }) {
  const err = validateBlockInput(input);
  if (err) throw new Error(err);
  const key = input.key ?? newId("local");
  const edit: LocalEdit = {
    key, subject: input.subject, section: input.section, type: input.type, title: input.title || null,
    by: input.by ? { id: input.by, name: input.byName ?? input.by } : null, consensus: input.consensus ?? "n/a",
    bodyMd: input.body, reviewed: Boolean(input.reviewed), citations: input.citations ?? getEdits()[key]?.citations ?? [],
    updatedAt: now(),
  };
  save(EDITS, { ...getEdits(), [key]: edit });
  return key;
}

export function updateEdit(key: string, change: (e: LocalEdit) => LocalEdit) {
  const current = getEdits()[key];
  if (current) save(EDITS, { ...getEdits(), [key]: { ...change(current), updatedAt: now() } });
}

/** Hide a library block (or remove a block written here). */
export function deleteEdit(key: string, subject: string, original?: Omit<LocalEdit, "deleted" | "updatedAt">) {
  const edits = { ...getEdits() };
  if (key.startsWith("local-")) delete edits[key];
  else edits[key] = { ...(original ?? edits[key]), key, subject, deleted: true, updatedAt: now() } as LocalEdit;
  save(EDITS, edits);
}

/** Undo every change to one library block. */
export function revertEdit(key: string) {
  const edits = { ...getEdits() };
  delete edits[key];
  save(EDITS, edits);
}

export function citationId() {
  return newId("cite");
}

export type Backup = { app: "logos-relational"; version: 1; exportedAt: string; notes: LocalNote[]; edits: LocalEdit[] };

export function exportBackup(): Backup {
  return { app: "logos-relational", version: 1, exportedAt: now(), notes: getNotes(), edits: Object.values(getEdits()) };
}

/** Merge a backup into this browser; existing items with the same id or key are replaced. Returns counts. */
export function importBackup(raw: unknown): { notes: number; edits: number } {
  const b = raw as Partial<Backup>;
  if (!b || b.app !== "logos-relational" || !Array.isArray(b.notes) || !Array.isArray(b.edits)) {
    throw new Error("That file is not a Logos Relational backup.");
  }
  const notes = new Map(getNotes().map((n) => [n.id, n]));
  for (const n of b.notes) if (n && typeof n.id === "string" && typeof n.body === "string") notes.set(n.id, n);
  const edits = { ...getEdits() };
  for (const e of b.edits) if (e && typeof e.key === "string" && typeof e.subject === "string") edits[e.key] = e;
  save(NOTES, [...notes.values()].sort((a, c) => c.updatedAt.localeCompare(a.updatedAt)));
  save(EDITS, edits);
  return { notes: b.notes.length, edits: b.edits.length };
}

export function notesToMarkdown(notes: LocalNote[], label: (subject: string) => string): string {
  const lines = ["# My notes (Logos Relational)", ""];
  for (const n of notes) {
    lines.push(`## ${label(n.subject)}`);
    const src = [n.workTitle, n.page].filter(Boolean).join(", ");
    if (src) lines.push(`*${src}*`);
    lines.push("", n.body, "", `<sub>Updated ${n.updatedAt.slice(0, 10)}</sub>`, "");
  }
  return lines.join("\n");
}

/** Offer a file to save. */
export function download(filename: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
