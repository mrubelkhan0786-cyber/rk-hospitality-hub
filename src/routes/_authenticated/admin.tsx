import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, LogOut, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel | RK College of Hotel Management" },
      { name: "description", content: "Manage course cards and admission enquiries for RK College of Hotel Management." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin Panel | RK College of Hotel Management" },
      { property: "og:description", content: "Manage course cards and admission enquiries." },
    ],
  }),
  component: AdminPage,
});

type Course = { id: string; name: string; description: string; duration: string; eligibility: string; sort_order: number };
type Enquiry = { id: string; full_name: string; phone: string; email: string | null; course: string | null; message: string | null; handled: boolean; created_at: string };

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"enquiries" | "courses">("enquiries");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!cancelled) setEmail(userData.user?.email ?? "");
      const { data } = await supabase.rpc("claim_first_admin");
      if (!cancelled) setIsAdmin(Boolean(data));
    })();
    return () => { cancelled = true; };
  }, []);

  const coursesQuery = useQuery({
    queryKey: ["admin", "courses"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("sort_order");
      if (error) throw error;
      return data as Course[];
    },
  });

  const enquiriesQuery = useQuery({
    queryKey: ["admin", "enquiries"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("enquiries").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Enquiry[];
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function saveCourse(course: Course) {
    await supabase.from("courses").update({ name: course.name, description: course.description, duration: course.duration, eligibility: course.eligibility, updated_at: new Date().toISOString() }).eq("id", course.id);
    await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    await queryClient.invalidateQueries({ queryKey: ["courses"] });
  }

  async function addCourse() {
    const nextOrder = (coursesQuery.data?.length ?? 0) + 1;
    await supabase.from("courses").insert({ name: "New course", description: "Short description of the programme.", sort_order: nextOrder });
    await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    await queryClient.invalidateQueries({ queryKey: ["courses"] });
  }

  async function deleteCourse(id: string) {
    await supabase.from("courses").delete().eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    await queryClient.invalidateQueries({ queryKey: ["courses"] });
  }

  async function toggleHandled(enquiry: Enquiry) {
    await supabase.from("enquiries").update({ handled: !enquiry.handled }).eq("id", enquiry.id);
    await queryClient.invalidateQueries({ queryKey: ["admin", "enquiries"] });
  }

  async function deleteEnquiry(id: string) {
    await supabase.from("enquiries").delete().eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["admin", "enquiries"] });
  }

  return (
    <div className="page-wash min-h-screen font-sans text-foreground">
      <header className="section-shell flex flex-wrap items-center justify-between gap-3 py-6">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="size-3.5" /> Back to website</Link>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Admin Panel</h1>
          <p className="mt-1 text-xs text-muted-foreground">Signed in as {email}</p>
        </div>
        <Button type="button" variant="outline" onClick={signOut} className="rounded-xl bg-card font-semibold"><LogOut className="size-4" /> Sign out</Button>
      </header>

      <main className="section-shell pb-16">
        {isAdmin === null && <div className="frosted flex items-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Checking your access…</div>}

        {isAdmin === false && (
          <div className="frosted-strong rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold">You do not have admin access</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">The first account to open this page becomes the administrator. Ask the existing administrator to give your account access.</p>
          </div>
        )}

        {isAdmin && (
          <>
            <div className="flex gap-2">
              <Button type="button" variant={tab === "enquiries" ? "default" : "outline"} onClick={() => setTab("enquiries")} className="rounded-xl font-semibold">Enquiries</Button>
              <Button type="button" variant={tab === "courses" ? "default" : "outline"} onClick={() => setTab("courses")} className="rounded-xl font-semibold">Courses</Button>
            </div>

            {tab === "enquiries" && (
              <section className="mt-5 grid gap-3">
                {enquiriesQuery.isLoading && <p className="text-sm text-muted-foreground">Loading enquiries…</p>}
                {enquiriesQuery.data?.length === 0 && <p className="frosted rounded-2xl p-6 text-sm text-muted-foreground">No enquiries yet. Submissions from the website form appear here.</p>}
                {enquiriesQuery.data?.map((enquiry) => (
                  <article key={enquiry.id} className="frosted rounded-2xl p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-base font-bold">{enquiry.full_name}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(enquiry.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant={enquiry.handled ? "default" : "outline"} onClick={() => toggleHandled(enquiry)} className="rounded-xl text-xs font-semibold"><Check className="size-3.5" /> {enquiry.handled ? "Handled" : "Mark handled"}</Button>
                        <Button type="button" size="sm" variant="outline" aria-label="Delete enquiry" onClick={() => deleteEnquiry(enquiry.id)} className="rounded-xl"><Trash2 className="size-3.5" /></Button>
                      </div>
                    </div>
                    <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                      <div><dt className="text-xs text-muted-foreground">Phone</dt><dd className="font-semibold"><a href={`tel:${enquiry.phone}`}>{enquiry.phone}</a></dd></div>
                      <div><dt className="text-xs text-muted-foreground">Email</dt><dd className="font-semibold break-all">{enquiry.email || "—"}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Course</dt><dd className="font-semibold">{enquiry.course || "—"}</dd></div>
                    </dl>
                    {enquiry.message && <p className="mt-3 rounded-xl bg-secondary p-3 text-sm leading-6">{enquiry.message}</p>}
                  </article>
                ))}
              </section>
            )}

            {tab === "courses" && (
              <section className="mt-5 grid gap-3">
                <Button type="button" onClick={addCourse} className="w-fit rounded-xl bg-primary font-semibold text-primary-foreground"><Plus className="size-4" /> Add course</Button>
                {coursesQuery.data?.map((course) => <CourseEditor key={course.id} course={course} onSave={saveCourse} onDelete={deleteCourse} />)}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function CourseEditor({ course, onSave, onDelete }: { course: Course; onSave: (course: Course) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [draft, setDraft] = useState(course);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setDraft(course); }, [course]);

  return (
    <article className="frosted-strong grid gap-3 rounded-2xl p-5">
      <input aria-label="Course name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-11 rounded-xl border border-input bg-card px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring" />
      <textarea aria-label="Course description" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input aria-label="Duration" value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} className="h-11 rounded-xl border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <input aria-label="Eligibility" value={draft.eligibility} onChange={(e) => setDraft({ ...draft, eligibility: e.target.value })} className="h-11 rounded-xl border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={async () => { await onSave(draft); setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="rounded-xl bg-primary font-semibold text-primary-foreground">{saved ? "Saved" : "Save changes"}</Button>
        <Button type="button" variant="outline" onClick={() => onDelete(course.id)} className="rounded-xl"><Trash2 className="size-4" /> Delete</Button>
      </div>
    </article>
  );
}
