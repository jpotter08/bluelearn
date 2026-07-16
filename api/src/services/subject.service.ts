import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { ServiceError } from "../lib/service-error";
import { slugify } from "../lib/slug";

type DB = SupabaseClient<Database>;

// Published only: draft subjects are unreviewed inline proposals from guide
// drafts and must stay out of browse and the tag picker until their guide lands.
export async function listSubjects(supabase: DB) {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, slug, name")
    .eq("status", "published");

  if (error) {
    console.error(error);
    throw new ServiceError("Failed to load subjects", 500);
  }
  return data ?? [];
}

// Create-or-fetch by slug: subjects are only created through contribution flows,
// where a re-saved draft or a name two drafts share must resolve to the existing
// row. New rows start 'draft' (column default), promoted on guide approval.
export async function createSubject(
  supabase: DB,
  userId: string,
  name: string,
  summary?: string | null
) {
  const slug = slugify(name);
  if (!slug)
    throw new ServiceError(
      "Subject must contain at least one letter or number",
      400
    );

  const { data: existing, error: findError } = await supabase
    .from("subjects")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (findError) {
    console.error(findError);
    throw new ServiceError("Failed to resolve subject", 500);
  }
  if (existing) return existing;

  const { data, error } = await supabase
    .from("subjects")
    .insert({ slug, name, summary: summary ?? null, creator_id: userId })
    .select("id, slug, name")
    .single();

  if (error) {
    console.error(error);
    throw new ServiceError("Failed to create subject", 500);
  }

  return data;
}

export async function getSubjectBySlug(supabase: DB, rawSlug: string) {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, slug, name")
    .eq("slug", rawSlug)
    .maybeSingle();

  if (error) {
    console.error(error);
    throw new ServiceError("Failed to load subject", 500);
  }
  if (!data) throw new ServiceError("Subject not found.", 404);

  return data;
}

export async function listSubjectGuides(supabase: DB, rawSlug: string) {
  const { data: subject, error } = await supabase
    .from("subjects")
    .select("id")
    .eq("slug", rawSlug)
    .maybeSingle();

  if (error) {
    console.error(error);
    throw new ServiceError("Failed to load subject", 500);
  }

  if (!subject) throw new ServiceError("Subject not found", 404);
  const { data, error: guideError } = await supabase
    .from("guide_bases")
    .select(
      `id, slug, title,
       canonical:guides!guide_bases_canonical_guide_id_fkey!inner(
         current:guide_revisions!guides_current_revision_id_fkey!inner(
           summary,
           guide_revision_subjects!inner(subject_id)
         )
       )`
    )
    .eq("canonical.current.guide_revision_subjects.subject_id", subject.id)
    .order("title");

  if (guideError) {
    console.error(guideError);
    throw new ServiceError("Failed to load subject guides", 500);
  }

  return (data ?? []).map(({ canonical, ...base }) => ({
    ...base,
    summary: canonical?.current?.summary ?? null,
  }));
}

export async function listSubjectObjectives(supabase: DB, rawSlug: string) {
  const { data: subject, error } = await supabase
    .from("subjects")
    .select("id")
    .eq("slug", rawSlug)
    .maybeSingle();

  if (error) {
    console.error(error);
    throw new ServiceError("Failed to load subject", 500);
  }

  if (!subject) throw new ServiceError("Subject not found", 404);
  const { data, error: objError } = await supabase
    .from("objectives")
    .select(
      `id, slug,
       current:objective_revisions!objectives_current_revision_id_fkey!inner(
         title, summary,
         objective_revision_subjects!inner(subject_id)
       )`
    )
    .eq("current.objective_revision_subjects.subject_id", subject.id)
    .eq("status", "published");

  if (objError) {
    console.error(objError);
    throw new ServiceError("Failed to load subject objectives", 500);
  }

  // Title lives on the revision and the node -> revision FK is
  // composite (to-many), so PostgREST can't sort the nodes by
  // it. Sort the mapped list here instead.
  return (data ?? [])
    .map(({ current, ...rest }) => ({
      ...rest,
      title: current?.title ?? null,
      summary: current?.summary ?? null,
    }))
    .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
}
