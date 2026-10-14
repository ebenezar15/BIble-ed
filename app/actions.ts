"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, authToken } from "@/lib/auth";
import { subjectHref } from "@/lib/content/subject";
import {
  addCitation, addNote, deleteBlock, deleteCitation, deleteNote, saveBlock, setCitationVerified, updateNote,
} from "@/lib/db/edit";
import { requireOwner } from "@/lib/owner";

const str = (f: FormData, k: string) => String(f.get(k) ?? "");

export async function login(form: FormData) {
  const pw = process.env.SITE_PASSWORD;
  const next = str(form, "next") || "/";
  if (!pw || str(form, "password") !== pw) redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  (await cookies()).set(AUTH_COOKIE, await authToken(pw), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 180, path: "/",
  });
  redirect(next.startsWith("/") ? next : "/");
}

export async function saveBlockAction(form: FormData) {
  await requireOwner();
  const subject = str(form, "subject");
  await saveBlock({
    id: Number(form.get("id")) || undefined,
    subject,
    section: str(form, "section"),
    type: str(form, "type"),
    title: str(form, "title") || null,
    by: str(form, "by") || null,
    consensus: str(form, "consensus") || "n/a",
    body: str(form, "body"),
    reviewed: form.get("reviewed") === "on",
  });
  revalidatePath(subjectHref(subject));
  revalidatePath("/edit");
}

export async function deleteBlockAction(form: FormData) {
  await requireOwner();
  await deleteBlock(Number(form.get("id")));
  revalidatePath("/edit");
}

export async function addCitationAction(form: FormData) {
  await requireOwner();
  await addCitation(Number(form.get("blockId")), {
    ref: str(form, "ref"), workId: str(form, "workId") || null, url: str(form, "url") || null,
  });
  revalidatePath("/edit");
}

export async function verifyCitationAction(form: FormData) {
  await requireOwner();
  await setCitationVerified(Number(form.get("id")), form.get("verified") === "true");
  revalidatePath("/edit");
}

export async function deleteCitationAction(form: FormData) {
  await requireOwner();
  await deleteCitation(Number(form.get("id")));
  revalidatePath("/edit");
}

export async function addNoteAction(form: FormData) {
  await requireOwner();
  const subject = str(form, "subject");
  await addNote({ subject, body: str(form, "body"), page: str(form, "page") || null, workId: str(form, "workId") || null });
  revalidatePath(subjectHref(subject));
  revalidatePath("/notes");
}

export async function updateNoteAction(form: FormData) {
  await requireOwner();
  await updateNote(Number(form.get("id")), str(form, "body"), str(form, "page") || null);
  revalidatePath("/notes");
}

export async function deleteNoteAction(form: FormData) {
  await requireOwner();
  await deleteNote(Number(form.get("id")));
  revalidatePath("/notes");
  const subject = str(form, "subject");
  if (subject) revalidatePath(subjectHref(subject));
}
