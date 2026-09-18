"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type GalleryItem = {
  id: number;
  title_en: string | null;
  title_fr: string | null;
  image_url: string;
  display_order: number | null;
  active: boolean;
};

type GalleryForm = {
  titleEn: string;
  titleFr: string;
};

const emptyForm: GalleryForm = {
  titleEn: "",
  titleFr: "",
};

export default function AdminGalleryPage() {
  const router = useRouter();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingPhoto, setEditingPhoto] =
    useState<GalleryItem | null>(null);

  const [form, setForm] =
    useState<GalleryForm>(emptyForm);

  const [photoFile, setPhotoFile] =
    useState<File | null>(null);

  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  async function loadPhotos() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("gallery")
      .select(
        "id, title_en, title_fr, image_url, display_order, active"
      )
      .order("display_order", {
        ascending: true,
      });

    if (error) {
      setMessage(error.message);
      setPhotos([]);
    } else {
      setPhotos(data ?? []);
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
      await loadPhotos();
    }

    checkAdminAccess();
  }, [router]);

  function resetForm() {
    setForm(emptyForm);
    setPhotoFile(null);
    setEditingPhoto(null);
    setShowForm(false);
  }

  function openAddForm() {
    setEditingPhoto(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setMessage("");
    setSuccessMessage("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openEditForm(photo: GalleryItem) {
    setEditingPhoto(photo);

    setForm({
      titleEn: photo.title_en ?? "",
      titleFr: photo.title_fr ?? "",
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

  function getStoragePathFromUrl(
    imageUrl: string | null
  ) {
    if (!imageUrl) {
      return null;
    }

    const marker =
      "/storage/v1/object/public/site-media/";

    const markerIndex =
      imageUrl.indexOf(marker);

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
    const path =
      getStoragePathFromUrl(imageUrl);

    if (!path) {
      return;
    }

    const { error } = await supabase.storage
      .from("site-media")
      .remove([path]);

    if (error) {
      console.error(
        "Could not delete gallery photo:",
        error
      );
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
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const originalName =
      file.name
        .replace(/\.[^/.]+$/, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
      "gallery-photo";

    const filePath =
      `gallery/${Date.now()}-${originalName}.${extension}`;

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

    setSaving(true);
    setMessage("");
    setSuccessMessage("");

    let newlyUploadedPath:
      | string
      | null = null;

    try {
      let imageUrl =
        editingPhoto?.image_url ?? null;

      if (!editingPhoto && !photoFile) {
        throw new Error(
          "Please choose a photo."
        );
      }

      if (photoFile) {
        const uploaded =
          await uploadPhoto(photoFile);

        imageUrl = uploaded.publicUrl;
        newlyUploadedPath =
          uploaded.filePath;
      }

      if (!imageUrl) {
        throw new Error(
          "A photo is required."
        );
      }

      const photoData = {
        title_en:
          form.titleEn.trim() || null,
        title_fr:
          form.titleFr.trim() || null,
        image_url: imageUrl,
      };

      if (editingPhoto) {
        const { error } = await supabase
          .from("gallery")
          .update(photoData)
          .eq("id", editingPhoto.id);

        if (error) {
          if (newlyUploadedPath) {
            await supabase.storage
              .from("site-media")
              .remove([
                newlyUploadedPath,
              ]);
          }

          throw new Error(
            error.message
          );
        }

        if (
          photoFile &&
          editingPhoto.image_url !==
            imageUrl
        ) {
          await deleteStoragePhoto(
            editingPhoto.image_url
          );
        }

        resetForm();
        await loadPhotos();

        setSuccessMessage(
          "Gallery photo updated successfully."
        );
      } else {
        const nextOrder =
          photos.length === 0
            ? 1
            : Math.max(
                ...photos.map(
                  (photo) =>
                    photo.display_order ??
                    0
                )
              ) + 1;

        const { error } = await supabase
          .from("gallery")
          .insert({
            ...photoData,
            display_order: nextOrder,
            active: true,
          });

        if (error) {
          if (newlyUploadedPath) {
            await supabase.storage
              .from("site-media")
              .remove([
                newlyUploadedPath,
              ]);
          }

          throw new Error(
            error.message
          );
        }

        resetForm();
        await loadPhotos();

        setSuccessMessage(
          "Gallery photo added successfully."
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Something went wrong."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(
    photo: GalleryItem
  ) {
    setMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("gallery")
      .update({
        active: !photo.active,
      })
      .eq("id", photo.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadPhotos();

    setSuccessMessage(
      photo.active
        ? "Photo is now hidden."
        : "Photo is now visible."
    );
  }

  async function deletePhoto(
    photo: GalleryItem
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to permanently delete this gallery photo?\n\nThis action cannot be undone."
      );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("gallery")
      .delete()
      .eq("id", photo.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await deleteStoragePhoto(
      photo.image_url
    );

    await loadPhotos();

    setSuccessMessage(
      "Gallery photo deleted successfully."
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
              Gallery Management
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
              Gallery
            </h2>

            <p className="mt-2 max-w-2xl text-slate-500">
              Add, edit, hide and delete
              photos from the public
              website gallery.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-xl bg-[#071f18] px-6 py-3 font-bold text-white transition hover:bg-[#0b3025]"
          >
            + Add Photo
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
                  {editingPhoto
                    ? "Edit Photo"
                    : "New Photo"}
                </p>

                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {editingPhoto
                    ? "Edit gallery photo"
                    : "Add to gallery"}
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

            {editingPhoto && (
              <div className="mt-8">
                <p className="mb-3 text-sm font-bold text-slate-700">
                  Current photo
                </p>

                <img
                  src={
                    editingPhoto.image_url
                  }
                  alt={
                    editingPhoto.title_en ??
                    "Gallery photo"
                  }
                  className="h-64 w-full max-w-md rounded-2xl object-cover"
                />
              </div>
            )}

            <form
              onSubmit={handleSave}
              className="mt-8 grid gap-6 md:grid-cols-2"
            >
              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Title — English
                </span>

                <input
                  type="text"
                  value={form.titleEn}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      titleEn:
                        event.target.value,
                    }))
                  }
                  placeholder="Optional"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Titre — Français
                </span>

                <input
                  type="text"
                  value={form.titleFr}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      titleFr:
                        event.target.value,
                    }))
                  }
                  placeholder="Optionnel"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-bold text-slate-700">
                  {editingPhoto
                    ? "Replace photo"
                    : "Photo *"}
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setPhotoFile(
                      event.target
                        .files?.[0] ??
                        null
                    )
                  }
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600"
                />

                <p className="mt-2 text-xs text-slate-400">
                  JPG, PNG or WebP.
                  Maximum 5 MB.
                  {editingPhoto &&
                    " Leave empty to keep the current photo."}
                </p>
              </label>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#071f18] px-7 py-3 font-bold text-white transition hover:bg-[#0b3025] disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingPhoto
                      ? "Save Changes"
                      : "Add Photo"}
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
            Loading gallery...
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <article
                key={photo.id}
                className={`overflow-hidden rounded-3xl bg-white shadow-sm ${
                  !photo.active
                    ? "opacity-60"
                    : ""
                }`}
              >
                <div className="h-72 bg-slate-100">
                  <img
                    src={photo.image_url}
                    alt={
                      photo.title_en ??
                      "RWSA gallery"
                    }
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        {photo.title_en ||
                          "Untitled photo"}
                      </p>

                      {photo.title_fr && (
                        <p className="mt-1 text-sm text-slate-500">
                          {photo.title_fr}
                        </p>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        photo.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {photo.active
                        ? "Visible"
                        : "Hidden"}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(photo)
                      }
                      className="rounded-xl bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleVisibility(
                          photo
                        )
                      }
                      className="rounded-xl bg-yellow-50 px-3 py-2.5 text-sm font-bold text-yellow-700 hover:bg-yellow-100"
                    >
                      {photo.active
                        ? "Hide"
                        : "Show"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deletePhoto(photo)
                      }
                      className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading &&
          photos.length === 0 && (
            <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <h3 className="text-xl font-bold text-slate-900">
                Gallery is empty
              </h3>

              <p className="mt-2 text-slate-500">
                Add the first photo to
                the gallery.
              </p>
            </div>
          )}
      </section>
    </main>
  );
}