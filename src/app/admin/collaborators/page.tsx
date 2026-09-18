"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Collaborator = {
  id: number;
  name: string;
  image_url: string | null;
  display_order: number | null;
  active: boolean;
};

const GROUP_IMAGE_KEY = "collaborators_group_image";
const DEFAULT_GROUP_IMAGE = "/images/team/collaborators.jpg";

export default function AdminCollaboratorsPage() {
  const router = useRouter();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [collaborators, setCollaborators] = useState<
    Collaborator[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCollaborator, setEditingCollaborator] =
    useState<Collaborator | null>(null);

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // GROUP PHOTO
  const [groupImage, setGroupImage] = useState(
    DEFAULT_GROUP_IMAGE
  );

  const [newGroupPhoto, setNewGroupPhoto] =
    useState<File | null>(null);

  const [savingPhoto, setSavingPhoto] =
    useState(false);

  async function loadCollaborators() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("collaborators")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      setMessage(error.message);
      setCollaborators([]);
    } else {
      setCollaborators(data ?? []);
    }

    setLoading(false);
  }

  async function loadGroupPhoto() {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", GROUP_IMAGE_KEY)
      .maybeSingle();

    if (error) {
      console.error(
        "Could not load collaborators group photo:",
        error
      );
      return;
    }

    if (data?.value) {
      setGroupImage(data.value);
    }
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

      await Promise.all([
        loadCollaborators(),
        loadGroupPhoto(),
      ]);
    }

    checkAdminAccess();
  }, [router]);

  function resetForm() {
    setName("");
    setEditingCollaborator(null);
    setShowAddForm(false);
  }

  function openAddForm() {
    setMessage("");
    setSuccessMessage("");

    setEditingCollaborator(null);
    setName("");
    setShowAddForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openEditForm(
    collaborator: Collaborator
  ) {
    setMessage("");
    setSuccessMessage("");

    setEditingCollaborator(collaborator);
    setName(collaborator.name);
    setShowAddForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function getStoragePathFromUrl(
    imageUrl: string | null
  ): string | null {
    if (!imageUrl) {
      return null;
    }

    const marker =
      "/storage/v1/object/public/site-media/";

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

  async function deleteStoragePhoto(
    imageUrl: string | null
  ) {
    const path = getStoragePathFromUrl(imageUrl);

    // Local photos such as /images/team/collaborators.jpg
    // are never deleted.
    if (!path) {
      return;
    }

    const { error } = await supabase.storage
      .from("site-media")
      .remove([path]);

    if (error) {
      console.error(
        "Could not delete old collaborators photo:",
        error
      );
    }
  }

  function validateGroupPhoto(file: File) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "Please choose a JPG, PNG or WebP image."
      );
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new Error(
        "The photo must be smaller than 5 MB."
      );
    }
  }

  async function uploadGroupPhoto(file: File) {
    validateGroupPhoto(file);

    const extension =
      file.name.split(".").pop()?.toLowerCase() ||
      "jpg";

    const fileName =
      `${Date.now()}-collaborators.${extension}`;

    const filePath =
      `collaborators/${fileName}`;

    const { error: uploadError } =
      await supabase.storage
        .from("site-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

    if (uploadError) {
      throw new Error(
        `Photo upload failed: ${uploadError.message}`
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

  async function handleSaveGroupPhoto() {
    if (!newGroupPhoto) {
      setMessage(
        "Please choose a new group photo first."
      );
      return;
    }

    setSavingPhoto(true);
    setMessage("");
    setSuccessMessage("");

    let uploadedPath: string | null = null;

    try {
      const oldImage = groupImage;

      const uploaded =
        await uploadGroupPhoto(newGroupPhoto);

      uploadedPath = uploaded.filePath;

      const { error } = await supabase
        .from("site_settings")
        .upsert(
          {
            key: GROUP_IMAGE_KEY,
            value: uploaded.publicUrl,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "key",
          }
        );

      if (error) {
        await supabase.storage
          .from("site-media")
          .remove([uploaded.filePath]);

        throw new Error(error.message);
      }

      setGroupImage(uploaded.publicUrl);
      setNewGroupPhoto(null);

      await deleteStoragePhoto(oldImage);

      setSuccessMessage(
        "Collaborators group photo was updated successfully."
      );
    } catch (error) {
      if (uploadedPath) {
        console.error(
          "Uploaded path:",
          uploadedPath
        );
      }

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Something went wrong while updating the photo."
        );
      }
    } finally {
      setSavingPhoto(false);
    }
  }

  async function handleRestoreOriginalPhoto() {
    const confirmed = window.confirm(
      "Restore the original collaborators group photo?"
    );

    if (!confirmed) {
      return;
    }

    setSavingPhoto(true);
    setMessage("");
    setSuccessMessage("");

    try {
      const oldImage = groupImage;

      const { error } = await supabase
        .from("site_settings")
        .upsert(
          {
            key: GROUP_IMAGE_KEY,
            value: DEFAULT_GROUP_IMAGE,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "key",
          }
        );

      if (error) {
        throw new Error(error.message);
      }

      setGroupImage(DEFAULT_GROUP_IMAGE);
      setNewGroupPhoto(null);

      await deleteStoragePhoto(oldImage);

      setSuccessMessage(
        "The original collaborators group photo was restored successfully."
      );
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Something went wrong while restoring the original photo."
        );
      }
    } finally {
      setSavingPhoto(false);
    }
  }

  async function handleSaveCollaborator(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) {
      setMessage(
        "Please enter the collaborator's name."
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setSuccessMessage("");

    try {
      if (editingCollaborator) {
        const { error } = await supabase
          .from("collaborators")
          .update({
            name: cleanName,
          })
          .eq("id", editingCollaborator.id);

        if (error) {
          throw new Error(error.message);
        }

        resetForm();
        await loadCollaborators();

        setSuccessMessage(
          `${cleanName} was updated successfully.`
        );
      } else {
        const nextOrder =
          collaborators.length === 0
            ? 1
            : Math.max(
                ...collaborators.map(
                  (collaborator) =>
                    collaborator.display_order ?? 0
                )
              ) + 1;

        const { error } = await supabase
          .from("collaborators")
          .insert({
            name: cleanName,
            image_url: null,
            display_order: nextOrder,
            active: true,
          });

        if (error) {
          throw new Error(error.message);
        }

        resetForm();
        await loadCollaborators();

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

  async function toggleCollaborator(
    collaborator: Collaborator
  ) {
    setMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("collaborators")
      .update({
        active: !collaborator.active,
      })
      .eq("id", collaborator.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadCollaborators();

    setSuccessMessage(
      collaborator.active
        ? `${collaborator.name} is now hidden.`
        : `${collaborator.name} is now visible.`
    );
  }

  async function deleteCollaborator(
    collaborator: Collaborator
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${collaborator.name}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("collaborators")
      .delete()
      .eq("id", collaborator.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadCollaborators();

    setSuccessMessage(
      `${collaborator.name} was deleted successfully.`
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
              Collaborators Management
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
              Collaborators
            </h2>

            <p className="mt-2 text-slate-500">
              Manage collaborator names and the
              shared collaborators photo.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-xl bg-[#071f18] px-6 py-3 font-bold text-white transition hover:bg-[#0b3025]"
          >
            + Add Collaborator
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

        {/* GROUP PHOTO MANAGEMENT */}

        <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-[380px_1fr]">
            <div className="bg-slate-100">
              <img
                src={groupImage}
                alt="RWSA collaborators"
                className="h-full min-h-[420px] w-full object-cover"
              />
            </div>

            <div className="flex flex-col justify-center p-7 sm:p-10">
              <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-600">
                Website Photo
              </p>

              <h3 className="mt-3 text-2xl font-bold text-slate-900">
                Collaborators Group Photo
              </h3>

              <p className="mt-3 max-w-xl leading-7 text-slate-500">
                This is the shared photo displayed
                beside the collaborators on the
                public RWSA – AERW website. You can
                replace it whenever you want.
              </p>

              <label className="mt-7 block">
                <span className="text-sm font-bold text-slate-700">
                  Choose New Photo
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={savingPhoto}
                  onChange={(event) =>
                    setNewGroupPhoto(
                      event.target.files?.[0] ?? null
                    )
                  }
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600"
                />
              </label>

              <p className="mt-2 text-xs text-slate-400">
                JPG, PNG or WebP. Maximum 5 MB.
              </p>

              {newGroupPhoto && (
                <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                  <p className="text-sm font-bold text-blue-700">
                    New photo selected
                  </p>

                  <p className="mt-1 break-all text-sm text-blue-600">
                    {newGroupPhoto.name}
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveGroupPhoto}
                  disabled={!newGroupPhoto || savingPhoto}
                  className="rounded-xl bg-[#071f18] px-7 py-3 font-bold text-white transition hover:bg-[#0b3025] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingPhoto
                    ? "Saving Photo..."
                    : "Save New Photo"}
                </button>

                <button
                  type="button"
                  onClick={handleRestoreOriginalPhoto}
                  disabled={
                    savingPhoto ||
                    groupImage === DEFAULT_GROUP_IMAGE
                  }
                  className="rounded-xl border border-slate-300 bg-white px-7 py-3 font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Restore Original Photo
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ADD / EDIT */}

        {showAddForm && (
          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-600">
                  {editingCollaborator
                    ? "Edit Collaborator"
                    : "New Collaborator"}
                </p>

                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {editingCollaborator
                    ? `Edit ${editingCollaborator.name}`
                    : "Add a collaborator"}
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

            <form
              onSubmit={handleSaveCollaborator}
              className="mt-8"
            >
              <label className="block max-w-2xl">
                <span className="text-sm font-bold text-slate-700">
                  Full name *
                </span>

                <input
                  type="text"
                  required
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Example: Jean Uwimana"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#071f18] px-7 py-3 font-bold text-white transition hover:bg-[#0b3025] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingCollaborator
                      ? "Save Changes"
                      : "Add Collaborator"}
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

        {/* COLLABORATORS */}

        {loading ? (
          <div className="mt-10 rounded-3xl bg-white p-10 text-center shadow-sm">
            Loading collaborators...
          </div>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {collaborators.map(
              (collaborator, index) => (
                <article
                  key={collaborator.id}
                  className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${
                    !collaborator.active
                      ? "opacity-60"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#071f18] font-bold text-yellow-300">
                        {index + 1}
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                          Collaborator
                        </p>

                        <h3 className="mt-1 text-xl font-bold text-slate-900">
                          {collaborator.name}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        collaborator.active
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-800 text-white"
                      }`}
                    >
                      {collaborator.active
                        ? "Visible"
                        : "Hidden"}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(collaborator)
                      }
                      className="rounded-xl bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleCollaborator(
                          collaborator
                        )
                      }
                      className="rounded-xl bg-yellow-50 px-3 py-2.5 text-sm font-bold text-yellow-700 transition hover:bg-yellow-100"
                    >
                      {collaborator.active
                        ? "Hide"
                        : "Show"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteCollaborator(
                          collaborator
                        )
                      }
                      className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        )}

        {!loading &&
          collaborators.length === 0 && (
            <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <h3 className="text-xl font-bold text-slate-900">
                No collaborators
              </h3>

              <p className="mt-2 text-slate-500">
                Add the first RWSA – AERW
                collaborator.
              </p>
            </div>
          )}
      </section>
    </main>
  );
}