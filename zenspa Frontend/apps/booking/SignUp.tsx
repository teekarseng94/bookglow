import React, { useState } from "react";
import { Logo } from "../../constants";
import {
  register,
  registerWithGoogle,
  registerWithFacebook,
  getAuthErrorMessage,
  DASHBOARD_URL,
} from "../../services/authService";

const THREE_PEOPLE_IMAGE =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop";

export default function SignUp() {
  const [continueWithEmail, setContinueWithEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setSocialLoading("google");
    try {
      await registerWithGoogle();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebook = async () => {
    setError(null);
    setSocialLoading("facebook");
    try {
      await registerWithFacebook();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSocialLoading(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({ email, password });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="hover:opacity-80 transition-opacity">
            <Logo />
          </a>
          <div className="flex items-center gap-6">
            <a
              href="tel:+60169929123"
              className="text-slate-700 font-medium text-sm hover:text-slate-900"
            >
              +60169929123
            </a>
            <a
              href={DASHBOARD_URL}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 font-medium text-sm hover:bg-slate-100 transition-colors"
            >
              Login
            </a>
          </div>
        </div>
      </header>

      {/* Main: split layout */}
      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: headline + illustration */}
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight mb-6">
              Create your own{" "}
              <span className="text-slate-800">booking calendar</span>
            </h1>
            <p className="text-slate-600 text-lg leading-relaxed max-w-lg mb-10">
              Schedule appointments, manage your calendar and accept payments
              anywhere, with free online booking software.
            </p>
            <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-100 bg-white aspect-[4/3] max-w-xl">
              <img
                src={THREE_PEOPLE_IMAGE}
                alt="Professionals using booking software"
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>

          {/* Right: white card form */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 lg:p-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-8">
                Get your FREE account
              </h2>

              {error && (
                <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={!!socialLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {socialLoading === "google" ? "Signing up…" : "Continue with Google"}
                </button>

                <button
                  type="button"
                  onClick={handleFacebook}
                  disabled={!!socialLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  <span className="w-5 h-5 rounded-full bg-[#1877F2] flex items-center justify-center text-white font-bold text-xs">
                    f
                  </span>
                  {socialLoading === "facebook" ? "Signing up…" : "Continue with Facebook"}
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-slate-400">or</span>
                  </div>
                </div>

                {!continueWithEmail ? (
                  <button
                    type="button"
                    onClick={() => setContinueWithEmail(true)}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium hover:bg-slate-50 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Continue with email
                  </button>
                ) : (
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-slate-300"
                      required
                    />
                    <input
                      type="password"
                      placeholder="Password (min 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-slate-300"
                      minLength={6}
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium hover:bg-slate-50 transition-colors disabled:opacity-60"
                    >
                      {loading ? "Creating account…" : "Create account"}
                    </button>
                  </form>
                )}
              </div>

              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <a
                  href={DASHBOARD_URL}
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  Login
                </a>
              </p>

              <p className="mt-6 text-center text-xs text-slate-400">
                By signing in, you agree to our{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  Terms of Use
                </a>{" "}
                &{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
