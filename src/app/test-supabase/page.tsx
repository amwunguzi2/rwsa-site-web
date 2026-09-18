"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type TeamMember = {
  id: number;
  name: string;
  role_en: string;
  role_fr: string;
  program: string | null;
};

export default function TestSupabase() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMembers() {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, name, role_en, role_fr, program")
        .order("display_order", { ascending: true });

      if (error) {
        console.error(error);
        setError(error.message);
      } else {
        setMembers(data ?? []);
      }

      setLoading(false);
    }

    loadMembers();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold">
          Supabase Connection Test
        </h1>

        {loading && (
          <p className="mt-8 text-lg">
            Loading...
          </p>
        )}

        {error && (
          <div className="mt-8 rounded-2xl bg-red-100 p-6 text-red-700">
            <p className="font-bold">
              Connection error
            </p>

            <p className="mt-2">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mt-8 rounded-2xl bg-green-100 p-6 text-green-800">
              <p className="text-xl font-bold">
                Supabase connected successfully!
              </p>

              <p className="mt-2">
                {members.length} team members found.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-2xl bg-white p-6 shadow-sm"
                >
                  <h2 className="text-xl font-bold">
                    {member.name}
                  </h2>

                  <p className="mt-2 font-semibold text-blue-600">
                    {member.role_en}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    {member.program}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}