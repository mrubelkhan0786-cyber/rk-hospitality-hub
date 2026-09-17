import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff Sign In | RK College of Hotel Management" },
      { name: "description", content: "Sign in to the RK College of Hotel Management admin area to manage courses and admission enquiries." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Staff Sign In | RK College of Hotel Management" },
      { property: "og:description", content: "Admin sign in for RK College of Hotel Management." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      setBusy(false);
      if (error) return setMessage(error.message);
      if (!data.session) return setMessage("Account created. Please check your email and confirm your address, then sign in.");
      navigate({ to: "/admin", replace: true });
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMessage(error.message);
    navigate({ to: "/admin", replace: true });
  }

  return (
    <div className="page-wash grid min-h-screen place-items-center px-4 py-10">
      <div className="frosted-strong w-full max-w-md rounded-3xl p-7 sm:p-9">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="size-3.5" /> Back to website</Link>
        <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight">{mode === "signin" ? "Staff sign in" : "Create staff account"}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Only college staff should use this page. It opens the admin area for courses and admission enquiries.</p>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
          <input required type="email" aria-label="Email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl border border-input bg-card px-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input required type="password" minLength={6} aria-label="Password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl border border-input bg-card px-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <Button type="submit" disabled={busy} className="h-12 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90">{busy ? <Loader2 className="animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}</Button>
        </form>
        {message && <p className="mt-4 rounded-xl bg-secondary p-3 text-xs leading-5 text-secondary-foreground">{message}</p>}
        <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(null); }} className="mt-5 text-xs font-semibold text-primary hover:underline">
          {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
