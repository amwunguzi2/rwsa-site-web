"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

type TeamForm = {
  name: string;
  roleEn: string;
  roleFr: string;
  program: string;
};

const emptyForm: TeamForm = {
  name: "",
  roleEn: "",
  roleFr: "",
  program: "",
};

export default function AdminTeamPage() {
  const router = useRouter();

  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] =
    useState<TeamMember | null>(null);

  const [form, setForm] = useState<TeamForm>(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
      await loadMembers();
    }

    checkAdminAccess();
  }, [router]);

  function updateForm(field: keyof TeamForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setPhotoFile(null);
    setEditingMember(null);
    setShowForm(false);
  }

  function openAddForm() {
    setForm(emptyForm);
    setPhotoFile(null);
    setEditingMember(null);
    setMessage("");
    setSuccessMessage("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openEditForm(member: TeamMember) {
    setEditingMember(member);
    setForm({
      name: member.name,
      roleEn: member.role_en,
      roleFr: member.role_fr,
      program: member.program ?? "",
    });
    setPhotoFile(null);
    setMessage("");
    setSuccessMessage("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function getStoragePathFromUrl(imageUrl: string | null) {
    if (!imageUrl) {
      return null;
    }

    const marker = "/storage/v1/object/public/site-media/";
    const markerIndex = imageUrl.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const encodedPath = imageUrl.substring(
      markerIndex + marker.length
    );

    try {
      return decodeURIComponent(encodedPath);
    } catch {
      return encodedPath;
    }
  }

  async function deleteStoragePhoto(imageUrl: string | null) {
    const path = getStoragePathFromUrl(imageUrl);

    // Local photos such as /images/team/arielle.jpg are never deleted.
    if (!path) {
      return;
    }

    const { error } = await supabase.storage
      .from("site-media")
      .remove([path]);

    if (error) {
      console.error("Could not delete team photo:", error);
    }
  }

  async function uploadPhoto(file: File) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "The photo must be JPG, PNG or WebP."
      );
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new Error(
        "The photo must be smaller than 5 MB."
      );
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const originalName =
      file.name
        .replace(/\.[^/.]+$/, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "team-member";

    const filePath =
      `team/${Date.now()}-${originalName}.${extension}`;

    const { error } = await supabase.storage
      .from("site-media")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(
        `Photo upload failed: ${error.message}`
      );
    }

    const { data } = supabase.storage
      .from("site-media")
      .getPublicUrl(filePath);

    return {
      publicUrl: data.publicUrl,
      filePath,
    };
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName = form.name.trim();
    const cleanRoleEn = form.roleEn.trim();
    const cleanRoleFr = form.roleFr.trim();

    if (!cleanName || !cleanRoleEn || !cleanRoleFr) {
      setMessage(
        "Name, English role and French role are required."
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setSuccessMessage("");

    let newlyUploadedPath: string | null = null;

    try {
      let imageUrl = editingMember?.image_url ?? null;

      if (photoFile) {
        const uploaded = await uploadPhoto(photoFile);
        imageUrl = uploaded.publicUrl;
        newlyUploadedPath = uploaded.filePath;
      }

      const memberData = {
        name: cleanName,
        role_en: cleanRoleEn,
        role_fr: cleanRoleFr,
        program: form.program.trim() || null,
        image_url: imageUrl,
      };

      if (editingMember) {
        const { error } = await supabase
          .from("team_members")
          .update(memberData)
          .eq("id", editingMember.id);

        if (error) {
          if (newlyUploadedPath) {
            await supabase.storage
              .from("site-media")
              .remove([newlyUploadedPath]);
          }

          throw new Error(error.message);
        }

        if (
          photoFile &&
          editingMember.image_url !== imageUrl
        ) {
          await deleteStoragePhoto(
            editingMember.image_url
          );
        }

        resetForm();
        await loadMembers();

        setSuccessMessage(
          `${cleanName} was updated successfully.`
        );
      } else {
        const nextOrder =
          members.length === 0
            ? 1
            : Math.max(
                ...members.map(
                  (member) => member.display_order ?? 0
                )
              ) + 1;

        const { error } = await supabase
          .from("team_members")
          .insert({
            ...memberData,
            display_order: nextOrder,
            active: true,
          });

        if (error) {
          if (newlyUploadedPath) {
            await supabase.storage
              .from("site-media")
              .remove([newlyUploadedPath]);
          }

          throw new Error(error.message);
        }

        resetForm();
        await loadMembers();

        setSuccessMessage(
          `${cleanName} was added successfully.`
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

  async function toggleMember(member: TeamMember) {
    setMessage("");
    setSuccessMessage("");

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

    setSuccessMessage(
      member.active
        ? `${member.name} is now hidden.`
        : `${member.name} is now visible.`
    );
  }

  async function deleteMember(member: TeamMember) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${member.name}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", member.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await deleteStoragePhoto(member.image_url);
    await loadMembers();

    setSuccessMessage(
      `${member.name} was deleted successfully.`
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
            onClick={openAddForm}
            className="rounded-xl bg-[#071f18] px-6 py-3 font-bold text-white transition hover:bg-[#0b3025]"
          >
            + Add Member
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
                  {editingMember
                    ? "Edit Team Member"
                    : "New Team Member"}
                </p>

                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {editingMember
                    ? `Edit ${editingMember.name}`
                    : "Add a team member"}
                </h3>
              </div>

              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            {editingMember?.image_url && (
              <div className="mt-8">
                <p className="mb-3 text-sm font-bold text-slate-700">
                  Current photo
                </p>

                <img
                  src={editingMember.image_url}
                  alt={editingMember.name}
                  className="h-64 w-full max-w-md rounded-2xl object-cover"
                />
              </div>
            )}

            <form
              onSubmit={handleSave}
              className="mt-8 grid gap-6 md:grid-cols-2"
            >
              <Input
                label="Full Name *"
                value={form.name}
                required
                onChange={(value) =>
                  updateForm("name", value)
                }
              />

              <Input
                label="Program"
                value={form.program}
                placeholder="Example: BASc Computer Engineering"
                onChange={(value) =>
                  updateForm("program", value)
                }
              />

              <Input
                label="Role — English *"
                value={form.roleEn}
                required
                onChange={(value) =>
                  updateForm("roleEn", value)
                }
              />

              <Input
                label="Rôle — Français *"
                value={form.roleFr}
                required
                onChange={(value) =>
                  updateForm("roleFr", value)
                }
              />

              <label className="block md:col-span-2">
                <span className="text-sm font-bold text-slate-700">
                  {editingMember
                    ? "Replace photo"
                    : "Photo"}
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={saving}
                  onChange={(event) =>
                    setPhotoFile(
                      event.target.files?.[0] ?? null
                    )
                  }
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600"
                />

                <p className="mt-2 text-xs text-slate-400">
                  JPG, PNG or WebP. Maximum 5 MB.
                  {editingMember &&
                    " Leave empty to keep the current photo."}
                </p>
              </label>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#071f18] px-7 py-3 font-bold text-white transition hover:bg-[#0b3025] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingMember
                      ? "Save Changes"
                      : "Add Member"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-xl bg-slate-100 px-7 py-3 font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
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
                className={`overflow-hidden rounded-3xl bg-white shadow-sm ${
                  !member.active ? "opacity-60" : ""
                }`}
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
                      {member.active
                        ? "Visible"
                        : "Hidden"}
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
                        openEditForm(member)
                      }
                      className="rounded-xl bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleMember(member)
                      }
                      className="rounded-xl bg-yellow-50 px-3 py-2.5 text-sm font-bold text-yellow-700 transition hover:bg-yellow-100"
                    >
                      {member.active
                        ? "Hide"
                        : "Show"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteMember(member)
                      }
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