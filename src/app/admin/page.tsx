"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [signingIn, setSigningIn] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    setLoading(true);
    setMessage("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("is_admin");

    if (error || data !== true) {
      await supabase.auth.signOut();

      setAuthorized(false);

      if (error) {
        console.error(
          "Could not verify admin access:",
          error
        );
      }

      setLoading(false);
      return;
    }

    setAuthorized(true);
    setLoading(false);
  }

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSigningIn(true);
    setMessage("");

    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error) {
      setMessage(
        "Unable to sign in. Check your email and password."
      );

      setSigningIn(false);
      return;
    }

    const { data, error: adminError } =
      await supabase.rpc("is_admin");

    if (adminError || data !== true) {
      await supabase.auth.signOut();

      setMessage(
        "This account does not have administrator access."
      );

      setSigningIn(false);
      return;
    }

    setAuthorized(true);
    setPassword("");
    setSigningIn(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    setAuthorized(false);
    setEmail("");
    setPassword("");
    setMessage("");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071f18] px-6">
        <div className="text-center text-white">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-yellow-400" />

          <p className="mt-5 font-semibold">
            Loading administration...
          </p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#071f18] px-6 py-16">
        <div className="absolute left-0 top-0 flex h-2 w-full">
          <div className="w-1/3 bg-blue-500" />
          <div className="w-1/3 bg-yellow-400" />
          <div className="w-1/3 bg-green-600" />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8 text-center text-white">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl">
              🇷🇼
            </div>

            <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-yellow-300">
              RWSA – AERW
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              Admin Login
            </h1>

            <p className="mt-3 text-slate-300">
              Website Administration
            </p>
          </div>

          <div className="rounded-[2rem] bg-white p-8 shadow-2xl">
            <form
              onSubmit={handleLogin}
              className="space-y-6"
            >
              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Email
                </span>

                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="admin@example.com"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Password
                </span>

                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="••••••••"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {message && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={signingIn}
                className="w-full rounded-xl bg-[#071f18] px-6 py-3.5 font-bold text-white transition hover:bg-[#0b3025] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signingIn
                  ? "Signing in..."
                  : "Sign In"}
              </button>
            </form>
          </div>

          <div className="mt-7 text-center">
            <Link
              href="/"
              className="text-sm font-semibold text-slate-300 transition hover:text-white"
            >
              ← Back to RWSA – AERW Website
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="relative overflow-hidden bg-[#071f18] text-white">
        <div className="absolute left-0 top-0 flex h-2 w-full">
          <div className="w-1/3 bg-blue-500" />
          <div className="w-1/3 bg-yellow-400" />
          <div className="w-1/3 bg-green-600" />
        </div>

        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-6 py-8 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-300">
              RWSA – AERW
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              Website Administration
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              target="_blank"
              className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-bold transition hover:bg-white hover:text-[#071f18]"
            >
              View Website ↗
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#071f18] transition hover:bg-yellow-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
            Administration
          </p>

          <h2 className="mt-3 text-4xl font-bold text-slate-900">
            Manage the Website
          </h2>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Manage the association&apos;s events,
            team, gallery, collaborators and
            recruitment opportunities.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <DashboardCard
            href="/admin/events"
            icon="📅"
            title="Events"
            description="Create upcoming events, manage past events, photos, registration links and event information."
            button="Manage Events"
          />

          <DashboardCard
            href="/admin/team"
            icon="👥"
            title="Team"
            description="Add executive members, update their roles and programs, replace photos or hide former members."
            button="Manage Team"
          />

          <DashboardCard
            href="/admin/gallery"
            icon="🖼️"
            title="Gallery"
            description="Add new photos to the website gallery, edit information, hide photos or remove them."
            button="Manage Gallery"
          />

          <DashboardCard
            href="/admin/collaborators"
            icon="🤝"
            title="Collaborators"
            description="Manage the students and collaborators who support RWSA – AERW initiatives."
            button="Manage Collaborators"
          />

          <div className="md:col-span-2">
            <DashboardCard
              href="/admin/positions"
              icon="💼"
              title="Recruitment"
              description="Create executive, volunteer or team opportunities. Open, close, hide or update applications directly from the dashboard."
              button="Manage Recruitment"
              featured
            />
          </div>
        </div>

        <div className="mt-12 overflow-hidden rounded-[2rem] bg-[#071f18] text-white">
          <div className="flex h-2">
            <div className="w-1/3 bg-blue-500" />
            <div className="w-1/3 bg-yellow-400" />
            <div className="w-1/3 bg-green-600" />
          </div>

          <div className="p-8 md:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-300">
              RWSA – AERW
            </p>

            <h3 className="mt-3 text-2xl font-bold">
              Website Management
            </h3>

            <p className="mt-4 max-w-3xl leading-7 text-slate-300">
              Changes made from the administration
              pages are connected to Supabase and
              will automatically update the
              corresponding sections of the public
              website.
            </p>

            <Link
              href="/"
              target="_blank"
              className="mt-7 inline-flex rounded-full bg-yellow-400 px-6 py-3 font-bold text-slate-900 transition hover:bg-yellow-300"
            >
              Open Public Website →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <p>
            RWSA – AERW Website Administration
          </p>

          <p>
            University of Ottawa • Université
            d&apos;Ottawa
          </p>
        </div>
      </footer>
    </main>
  );
}

type DashboardCardProps = {
  href: string;
  icon: string;
  title: string;
  description: string;
  button: string;
  featured?: boolean;
};

function DashboardCard({
  href,
  icon,
  title,
  description,
  button,
  featured = false,
}: DashboardCardProps) {
  return (
    <Link
      href={href}
      className={`group block h-full rounded-[2rem] border p-7 transition duration-300 hover:-translate-y-1 hover:shadow-lg md:p-8 ${
        featured
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl transition group-hover:scale-105">
          {icon}
        </div>

        <h3 className="mt-6 text-2xl font-bold text-slate-900">
          {title}
        </h3>

        <p className="mt-3 flex-1 leading-7 text-slate-600">
          {description}
        </p>

        <div className="mt-7 font-bold text-blue-600 transition group-hover:text-blue-800">
          {button} →
        </div>
      </div>
    </Link>
  );
}