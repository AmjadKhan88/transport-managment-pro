import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AmbientBackground from "@/components/layout/AmbientBackground";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { inputClass, labelClass, primaryBtn } from "@/components/ui/styles";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AmbientBackground />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="grid min-h-screen place-items-center p-4">
        <div className="w-full max-w-[400px]">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-green-700 shadow-lg shadow-emerald-600/25">
              <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7h11v9H3z" />
                <path d="M14 10h4l3 3v3h-7z" />
                <circle cx="7" cy="18" r="1.8" />
                <circle cx="17" cy="18" r="1.8" />
              </svg>
            </div>
            <h1 className="mt-4 text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white">Geo Shalmani</h1>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              Every vehicle, trip, expense &amp; rupee — one complete system.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <h2 className="text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-white">Sign in</h2>
              <p className="mt-0.5 text-[12px] text-slate-400">Use your company account to continue.</p>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 px-3 py-2.5 text-[12.5px] font-medium text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <input id="email" name="email" type="email" required autoComplete="username" autoFocus
                value={form.email} onChange={onChange} placeholder="you@company.com" className={inputClass} />
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>Password</label>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? "text" : "password"} required
                  autoComplete="current-password" value={form.password} onChange={onChange}
                  placeholder="••••••••" className={`${inputClass} pr-16`} />
                <button type="button" onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 transition hover:text-emerald-600 dark:hover:text-emerald-400">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" disabled={submitting} className={`${primaryBtn}  w-full`}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-[11.5px] text-slate-400">
            © {new Date().getFullYear()} Geo Shalmani Company
          </p>
        </div>
      </div>
    </>
  );
}