"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Position = {
  id: number;
  title_en: string;
  title_fr: string;
  description_en: string | null;
  description_fr: string | null;
  deadline: string | null;
  application_url: string | null;
  status: "open" | "closed";
  display_order: number | null;
  active: boolean;
};

type PositionForm = {
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  deadline: string;
  applicationUrl: string;
  status: "open" | "closed";
};

const emptyForm: PositionForm = {
  titleEn: "",
  titleFr: "",
  descriptionEn: "",
  descriptionFr: "",
  deadline: "",
  applicationUrl: "",
  status: "open",
};

export default function AdminPositionsPage() {
  const router = useRouter();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingPosition, setEditingPosition] =
    useState<Position | null>(null);

  const [form, setForm] =
    useState<PositionForm>(emptyForm);

  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  async function loadPositions() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("positions")
      .select(
        "id, title_en, title_fr, description_en, description_fr, deadline, application_url, status, display_order, active"
      )
      .order("display_order", {
        ascending: true,
      });

    if (error) {
      setMessage(error.message);
      setPositions([]);
    } else {
      setPositions(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    async function checkAdminAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin");
        return;
      }

      const { data, error } = await supabase.rpc("is_admin");

      if (error || data !== true) {
        await supabase.auth.signOut();
        router.replace("/admin");
        return;
      }

      setIsAdmin(true);
      setCheckingAdmin(false);
      await loadPositions();
    }

    checkAdminAccess();
  }, [router]);

  function updateForm(
    field: keyof PositionForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingPosition(null);
    setShowForm(false);
  }

  function openAddForm() {
    setForm(emptyForm);
    setEditingPosition(null);
    setMessage("");
    setSuccessMessage("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openEditForm(position: Position) {
    setEditingPosition(position);

    setForm({
      titleEn: position.title_en,
      titleFr: position.title_fr,
      descriptionEn:
        position.description_en ?? "",
      descriptionFr:
        position.description_fr ?? "",
      deadline: position.deadline
        ? position.deadline.slice(0, 16)
        : "",
      applicationUrl:
        position.application_url ?? "",
      status: position.status,
    });

    setMessage("");
    setSuccessMessage("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setSuccessMessage("");

    try {
      const positionData = {
        title_en: form.titleEn.trim(),
        title_fr: form.titleFr.trim(),

        description_en:
          form.descriptionEn.trim() || null,

        description_fr:
          form.descriptionFr.trim() || null,

        deadline: form.deadline
          ? new Date(form.deadline).toISOString()
          : null,

        application_url:
          form.applicationUrl.trim() || null,

        status: form.status,
      };

      if (editingPosition) {
        const { error } = await supabase
          .from("positions")
          .update(positionData)
          .eq("id", editingPosition.id);

        if (error) {
          throw new Error(error.message);
        }

        const savedTitle =
          form.titleEn.trim();

        resetForm();
        await loadPositions();

        setSuccessMessage(
          `${savedTitle} was updated successfully.`
        );
      } else {
        const nextOrder =
          positions.length === 0
            ? 1
            : Math.max(
                ...positions.map(
                  (position) =>
                    position.display_order ?? 0
                )
              ) + 1;

        const { error } = await supabase
          .from("positions")
          .insert({
            ...positionData,
            display_order: nextOrder,
            active: true,
          });

        if (error) {
          throw new Error(error.message);
        }

        const savedTitle =
          form.titleEn.trim();

        resetForm();
        await loadPositions();

        setSuccessMessage(
          `${savedTitle} was added successfully.`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Something went wrong.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(
    position: Position
  ) {
    setMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("positions")
      .update({
        active: !position.active,
      })
      .eq("id", position.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadPositions();

    setSuccessMessage(
      position.active
        ? `${position.title_en} is now hidden.`
        : `${position.title_en} is now visible.`
    );
  }

  async function toggleStatus(
    position: Position
  ) {
    const newStatus =
      position.status === "open"
        ? "closed"
        : "open";

    setMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("positions")
      .update({
        status: newStatus,
      })
      .eq("id", position.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadPositions();

    setSuccessMessage(
      `${position.title_en} is now ${newStatus}.`
    );
  }

  async function deletePosition(
    position: Position
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${position.title_en}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("positions")
      .delete()
      .eq("id", position.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadPositions();

    setSuccessMessage(
      `${position.title_en} was deleted successfully.`
    );
  }

  if (checkingAdmin || !isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-600">
            RWSA – AERW
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            Checking administrator access...
          </h1>
          <p className="mt-2 text-slate-500">
            Please wait while we verify your session.
          </p>
        </div>
      </main>
    );
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
              Recruitment Management
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
              Join Our Team
            </h2>

            <p className="mt-2 max-w-2xl text-slate-500">
              Create and manage executive,
              volunteer and recruitment
              opportunities.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-xl bg-[#071f18] px-6 py-3 font-bold text-white transition hover:bg-[#0b3025]"
          >
            + Add Position
          </button>
        </div>

        {successMessage && (
          <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-5 font-medium text-green-700">
            {successMessage}
          </div>
        )}

        {message && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 font-medium text-red-700">
            {message}
          </div>
        )}

        {showForm && (
          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-600">
                  {editingPosition
                    ? "Edit Position"
                    : "New Position"}
                </p>

                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {editingPosition
                    ? `Edit ${editingPosition.title_en}`
                    : "Create a position"}
                </h3>
              </div>

              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600"
              >
                Close
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="mt-8 grid gap-6 md:grid-cols-2"
            >
              <Input
                label="Position Title — English *"
                value={form.titleEn}
                required
                onChange={(value) =>
                  updateForm("titleEn", value)
                }
              />

              <Input
                label="Titre du poste — Français *"
                value={form.titleFr}
                required
                onChange={(value) =>
                  updateForm("titleFr", value)
                }
              />

              <TextArea
                label="Description — English"
                value={form.descriptionEn}
                onChange={(value) =>
                  updateForm(
                    "descriptionEn",
                    value
                  )
                }
              />

              <TextArea
                label="Description — Français"
                value={form.descriptionFr}
                onChange={(value) =>
                  updateForm(
                    "descriptionFr",
                    value
                  )
                }
              />

              <Input
                label="Application Deadline"
                type="datetime-local"
                value={form.deadline}
                onChange={(value) =>
                  updateForm("deadline", value)
                }
              />

              <Input
                label="Application URL"
                type="url"
                value={form.applicationUrl}
                placeholder="https://..."
                onChange={(value) =>
                  updateForm(
                    "applicationUrl",
                    value
                  )
                }
              />

              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Status *
                </span>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateForm(
                      "status",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                >
                  <option value="open">
                    Open
                  </option>

                  <option value="closed">
                    Closed
                  </option>
                </select>
              </label>

              <div className="flex items-end">
                <p className="pb-3 text-sm text-slate-500">
                  Only visible and open
                  positions will be shown as
                  available on the public site.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#071f18] px-7 py-3 font-bold text-white transition hover:bg-[#0b3025] disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingPosition
                      ? "Save Changes"
                      : "Create Position"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-xl bg-slate-100 px-7 py-3 font-bold text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="mt-10 rounded-3xl bg-white p-10 text-center shadow-sm">
            Loading positions...
          </div>
        ) : positions.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h3 className="text-xl font-bold text-slate-900">
              No positions yet
            </h3>

            <p className="mt-2 text-slate-500">
              There are currently no
              recruitment positions.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {positions.map((position) => (
              <article
                key={position.id}
                className={`rounded-3xl bg-white p-7 shadow-sm ${
                  !position.active
                    ? "opacity-60"
                    : ""
                }`}
              >
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      position.status ===
                      "open"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {position.status ===
                    "open"
                      ? "Open"
                      : "Closed"}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      position.active
                        ? "bg-blue-100 text-blue-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {position.active
                      ? "Visible"
                      : "Hidden"}
                  </span>
                </div>

                <h3 className="mt-5 text-2xl font-bold text-slate-900">
                  {position.title_en}
                </h3>

                <p className="mt-1 font-medium text-slate-500">
                  {position.title_fr}
                </p>

                {position.description_en && (
                  <p className="mt-5 leading-7 text-slate-600">
                    {
                      position.description_en
                    }
                  </p>
                )}

                {position.deadline && (
                  <p className="mt-5 text-sm font-semibold text-slate-600">
                    Deadline:{" "}
                    {new Date(
                      position.deadline
                    ).toLocaleString()}
                  </p>
                )}

                <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button
                    type="button"
                    onClick={() =>
                      openEditForm(position)
                    }
                    className="rounded-xl bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleVisibility(
                        position
                      )
                    }
                    className="rounded-xl bg-yellow-50 px-3 py-2.5 text-sm font-bold text-yellow-700 hover:bg-yellow-100"
                  >
                    {position.active
                      ? "Hide"
                      : "Show"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleStatus(position)
                    }
                    className="rounded-xl bg-green-50 px-3 py-2.5 text-sm font-bold text-green-700 hover:bg-green-100"
                  >
                    {position.status ===
                    "open"
                      ? "Close"
                      : "Reopen"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deletePosition(
                        position
                      )
                    }
                    className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

type InputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
};

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: InputProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function TextArea({
  label,
  value,
  onChange,
}: TextAreaProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">
        {label}
      </span>

      <textarea
        value={value}
        rows={6}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}