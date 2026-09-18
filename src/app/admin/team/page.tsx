"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type TeamMember = {
  id: number;
  name: string;
  role_en: string;
  role_fr: string;
  program: string | null;
  image_url: string | null;
  display_order: number | null;
  active: boolean;
};

export default function AdminTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadMembers() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      setMessage(error.message);
      setMembers([]);
    } else {
      setMembers(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadMembers();
  }, []);

  async function toggleMember(member: TeamMember) {
    const { error } = await supabase
      .from("team_members")
      .update({
        active: !member.active,
      })
      .eq("id", member.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadMembers();
  }

  async function deleteMember(member: TeamMember) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${member.name}?`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", member.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadMembers();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-[#071f18] px-6 py-5 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
          <div>
            <p className="text-sm font-bold text-yellow-300">
              RWSA – AERW
            </p>

            <h1 className="text-2xl font-bold">
              Team Management
            </h1>
          </div>

          <Link
            href="/admin"
            className="rounded-full border border-white/30 px-5 py-2 text-sm font-semibold transition hover:bg-white hover:text-[#071f18]"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-600">
              Administration
            </p>

            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Meet the Team
            </h2>

            <p className="mt-2 text-slate-500">
              Add, edit, hide or delete executive team members.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              alert("The Add Member form is our next step.")
            }
            className="rounded-xl bg-[#071f18] px-6 py-3 font-bold text-white transition hover:bg-[#0b3025]"
          >
            + Add Member
          </button>
        </div>

        {message && (
          <div className="mt-8 rounded-2xl bg-red-50 p-5 text-red-700">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-10 rounded-3xl bg-white p-10 text-center shadow-sm">
            Loading team...
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => (
              <article
                key={member.id}
                className="overflow-hidden rounded-3xl bg-white shadow-sm"
              >
                <div className="relative aspect-[4/3] bg-slate-200">
                  {member.image_url ? (
                    <img
                      src={member.image_url}
                      alt={member.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      No photo
                    </div>
                  )}

                  <div className="absolute right-4 top-4">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        member.active
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-800 text-white"
                      }`}
                    >
                      {member.active ? "Visible" : "Hidden"}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                    Executive Team
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    {member.name}
                  </h3>

                  <p className="mt-3 font-semibold text-slate-700">
                    {member.role_en}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {member.role_fr}
                  </p>

                  {member.program && (
                    <p className="mt-4 text-sm leading-6 text-slate-500">
                      {member.program}
                    </p>
                  )}

                  <div className="mt-6 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          `Editing ${member.name} is our next step.`
                        )
                      }
                      className="rounded-xl bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleMember(member)}
                      className="rounded-xl bg-yellow-50 px-3 py-2.5 text-sm font-bold text-yellow-700 transition hover:bg-yellow-100"
                    >
                      {member.active ? "Hide" : "Show"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteMember(member)}
                      className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && members.length === 0 && (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h3 className="text-xl font-bold text-slate-900">
              No team members
            </h3>

            <p className="mt-2 text-slate-500">
              Add the first member of the executive team.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}