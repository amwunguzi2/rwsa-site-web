"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type EventItem = {
  id: number;
  title_en: string;
  title_fr: string;
  description_en: string | null;
  description_fr: string | null;
  collaboration_en: string | null;
  collaboration_fr: string | null;
  label_en: string | null;
  label_fr: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  image_url: string | null;
  eventbrite_url: string | null;
  instagram_url: string | null;
  status: "upcoming" | "past";
  display_order: number | null;
  active: boolean;
};

type EventForm = {
  titleEn: string;
  titleFr: string;
  descriptionEn: string;
  descriptionFr: string;
  labelEn: string;
  labelFr: string;
  collaborationEn: string;
  collaborationFr: string;
  eventDate: string;
  eventTime: string;
  location: string;
  eventbriteUrl: string;
  instagramUrl: string;
  status: "upcoming" | "past";
};

const emptyForm: EventForm = {
  titleEn: "",
  titleFr: "",
  descriptionEn: "",
  descriptionFr: "",
  labelEn: "",
  labelFr: "",
  collaborationEn: "",
  collaborationFr: "",
  eventDate: "",
  eventTime: "",
  location: "",
  eventbriteUrl: "",
  instagramUrl: "",
  status: "upcoming",
};

export default function AdminEventsPage() {
  const router = useRouter();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] =
    useState<EventItem | null>(null);

  const [form, setForm] =
    useState<EventForm>(emptyForm);

  const [photo, setPhoto] = useState<File | null>(null);

  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  async function loadEvents() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      setMessage(error.message);
      setEvents([]);
    } else {
      setEvents(data ?? []);
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
      await loadEvents();
    }

    checkAdminAccess();
  }, [router]);

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

  function updateForm(
    field: keyof EventForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setPhoto(null);
    setEditingEvent(null);
    setShowForm(false);
  }

  function openAddForm() {
    setForm(emptyForm);
    setPhoto(null);
    setEditingEvent(null);
    setMessage("");
    setSuccessMessage("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openEditForm(eventItem: EventItem) {
    setEditingEvent(eventItem);

    setForm({
      titleEn: eventItem.title_en,
      titleFr: eventItem.title_fr,
      descriptionEn: eventItem.description_en ?? "",
      descriptionFr: eventItem.description_fr ?? "",
      labelEn: eventItem.label_en ?? "",
      labelFr: eventItem.label_fr ?? "",
      collaborationEn:
        eventItem.collaboration_en ?? "",
      collaborationFr:
        eventItem.collaboration_fr ?? "",
      eventDate: eventItem.event_date ?? "",
      eventTime:
        eventItem.event_time?.slice(0, 5) ?? "",
      location: eventItem.location ?? "",
      eventbriteUrl:
        eventItem.eventbrite_url ?? "",
      instagramUrl:
        eventItem.instagram_url ?? "",
      status: eventItem.status,
    });

    setPhoto(null);
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

    if (!path) {
      return;
    }

    const { error } = await supabase.storage
      .from("site-media")
      .remove([path]);

    if (error) {
      console.error(
        "Could not delete event photo:",
        error
      );
    }
  }

  async function uploadEventPhoto(
    file: File,
    eventName: string
  ) {
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
      file.name.split(".").pop()?.toLowerCase() ||
      "jpg";

    const safeName = eventName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const filePath = `events/${Date.now()}-${
      safeName || "event"
    }.${extension}`;

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
    submitEvent: FormEvent<HTMLFormElement>
  ) {
    submitEvent.preventDefault();

    setSaving(true);
    setMessage("");
    setSuccessMessage("");

    let newUploadedPath: string | null = null;

    try {
      let imageUrl =
        editingEvent?.image_url ?? null;

      if (photo) {
        const uploaded = await uploadEventPhoto(
          photo,
          form.titleEn
        );

        imageUrl = uploaded.publicUrl;
        newUploadedPath = uploaded.filePath;
      }

      const eventData = {
        title_en: form.titleEn.trim(),
        title_fr: form.titleFr.trim(),

        description_en:
          form.descriptionEn.trim() || null,

        description_fr:
          form.descriptionFr.trim() || null,

        label_en:
          form.labelEn.trim() || null,

        label_fr:
          form.labelFr.trim() || null,

        collaboration_en:
          form.collaborationEn.trim() || null,

        collaboration_fr:
          form.collaborationFr.trim() || null,

        event_date:
          form.eventDate || null,

        event_time:
          form.eventTime || null,

        location:
          form.location.trim() || null,

        image_url: imageUrl,

        eventbrite_url:
          form.eventbriteUrl.trim() || null,

        instagram_url:
          form.instagramUrl.trim() || null,

        status: form.status,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id);

        if (error) {
          if (newUploadedPath) {
            await supabase.storage
              .from("site-media")
              .remove([newUploadedPath]);
          }

          throw new Error(error.message);
        }

        if (
          photo &&
          editingEvent.image_url &&
          editingEvent.image_url !== imageUrl
        ) {
          await deleteStoragePhoto(
            editingEvent.image_url
          );
        }

        const savedTitle =
          form.titleEn.trim();

        resetForm();
        await loadEvents();

        setSuccessMessage(
          `${savedTitle} was updated successfully.`
        );
      } else {
        const nextOrder =
          events.length === 0
            ? 1
            : Math.max(
                ...events.map(
                  (eventItem) =>
                    eventItem.display_order ?? 0
                )
              ) + 1;

        const { error } = await supabase
          .from("events")
          .insert({
            ...eventData,
            display_order: nextOrder,
            active: true,
          });

        if (error) {
          if (newUploadedPath) {
            await supabase.storage
              .from("site-media")
              .remove([newUploadedPath]);
          }

          throw new Error(error.message);
        }

        const savedTitle =
          form.titleEn.trim();

        resetForm();
        await loadEvents();

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
    eventItem: EventItem
  ) {
    setMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("events")
      .update({
        active: !eventItem.active,
      })
      .eq("id", eventItem.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadEvents();

    setSuccessMessage(
      eventItem.active
        ? `${eventItem.title_en} is now hidden.`
        : `${eventItem.title_en} is now visible.`
    );
  }

  async function changeStatus(
    eventItem: EventItem
  ) {
    const newStatus =
      eventItem.status === "upcoming"
        ? "past"
        : "upcoming";

    setMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("events")
      .update({
        status: newStatus,
      })
      .eq("id", eventItem.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadEvents();

    setSuccessMessage(
      `${eventItem.title_en} is now ${
        newStatus === "upcoming"
          ? "an upcoming event"
          : "a past event"
      }.`
    );
  }

  async function deleteEvent(
    eventItem: EventItem
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${eventItem.title_en}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventItem.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await deleteStoragePhoto(
      eventItem.image_url
    );

    await loadEvents();

    setSuccessMessage(
      `${eventItem.title_en} was deleted successfully.`
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
              Events Management
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
              Events
            </h2>

            <p className="mt-2 max-w-2xl text-slate-500">
              Create and manage upcoming and past
              RWSA – AERW events.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-xl bg-[#071f18] px-6 py-3 font-bold text-white transition hover:bg-[#0b3025]"
          >
            + Add Event
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
                  {editingEvent
                    ? "Edit Event"
                    : "New Event"}
                </p>

                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {editingEvent
                    ? `Edit ${editingEvent.title_en}`
                    : "Create an event"}
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

            {editingEvent?.image_url && (
              <div className="mt-8">
                <p className="mb-3 text-sm font-bold text-slate-700">
                  Current photo
                </p>

                <img
                  src={editingEvent.image_url}
                  alt={editingEvent.title_en}
                  className="h-48 w-full max-w-md rounded-2xl object-cover"
                />
              </div>
            )}

            <form
              onSubmit={handleSave}
              className="mt-8 grid gap-6 md:grid-cols-2"
            >
              <Input
                label="Title — English *"
                value={form.titleEn}
                required
                onChange={(value) =>
                  updateForm("titleEn", value)
                }
              />

              <Input
                label="Titre — Français *"
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
                label="Small label — English"
                value={form.labelEn}
                placeholder="Example: In collaboration with RISE"
                onChange={(value) =>
                  updateForm("labelEn", value)
                }
              />

              <Input
                label="Petit label — Français"
                value={form.labelFr}
                placeholder="Exemple : En collaboration avec RISE"
                onChange={(value) =>
                  updateForm("labelFr", value)
                }
              />

              <TextArea
                label="Collaboration — English"
                value={form.collaborationEn}
                onChange={(value) =>
                  updateForm(
                    "collaborationEn",
                    value
                  )
                }
              />

              <TextArea
                label="Collaboration — Français"
                value={form.collaborationFr}
                onChange={(value) =>
                  updateForm(
                    "collaborationFr",
                    value
                  )
                }
              />

              <Input
                label="Date"
                type="date"
                value={form.eventDate}
                onChange={(value) =>
                  updateForm("eventDate", value)
                }
              />

              <Input
                label="Time"
                type="time"
                value={form.eventTime}
                onChange={(value) =>
                  updateForm("eventTime", value)
                }
              />

              <Input
                label="Location"
                value={form.location}
                placeholder="Example: UCU, University of Ottawa"
                onChange={(value) =>
                  updateForm("location", value)
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
                  <option value="upcoming">
                    Upcoming
                  </option>

                  <option value="past">
                    Past
                  </option>
                </select>
              </label>

              <Input
                label="Eventbrite URL"
                type="url"
                value={form.eventbriteUrl}
                placeholder="https://..."
                onChange={(value) =>
                  updateForm(
                    "eventbriteUrl",
                    value
                  )
                }
              />

              <Input
                label="Instagram URL"
                type="url"
                value={form.instagramUrl}
                placeholder="https://..."
                onChange={(value) =>
                  updateForm(
                    "instagramUrl",
                    value
                  )
                }
              />

              <label className="block md:col-span-2">
                <span className="text-sm font-bold text-slate-700">
                  {editingEvent
                    ? "Replace event photo"
                    : "Event photo"}
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setPhoto(
                      event.target.files?.[0] ??
                        null
                    )
                  }
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600"
                />

                <p className="mt-2 text-xs text-slate-400">
                  JPG, PNG or WebP. Maximum 5 MB.
                  {editingEvent &&
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
                    : editingEvent
                      ? "Save Changes"
                      : "Create Event"}
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
            Loading events...
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {events.map((eventItem) => (
              <article
                key={eventItem.id}
                className={`overflow-hidden rounded-3xl bg-white shadow-sm ${
                  !eventItem.active
                    ? "opacity-60"
                    : ""
                }`}
              >
                {eventItem.image_url ? (
                  <img
                    src={eventItem.image_url}
                    alt={eventItem.title_en}
                    className="h-64 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center bg-slate-100 text-slate-400">
                    No photo
                  </div>
                )}

                <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        eventItem.status ===
                        "upcoming"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {eventItem.status ===
                      "upcoming"
                        ? "Upcoming"
                        : "Past"}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        eventItem.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {eventItem.active
                        ? "Visible"
                        : "Hidden"}
                    </span>
                  </div>

                  <h3 className="mt-4 text-2xl font-bold text-slate-900">
                    {eventItem.title_en}
                  </h3>

                  <p className="mt-1 text-slate-500">
                    {eventItem.title_fr}
                  </p>

                  {(eventItem.event_date ||
                    eventItem.event_time ||
                    eventItem.location) && (
                    <div className="mt-5 space-y-1 text-sm text-slate-600">
                      {eventItem.event_date && (
                        <p>
                          Date:{" "}
                          {eventItem.event_date}
                        </p>
                      )}

                      {eventItem.event_time && (
                        <p>
                          Time:{" "}
                          {eventItem.event_time.slice(
                            0,
                            5
                          )}
                        </p>
                      )}

                      {eventItem.location && (
                        <p>
                          Location:{" "}
                          {eventItem.location}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(eventItem)
                      }
                      className="rounded-xl bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleVisibility(
                          eventItem
                        )
                      }
                      className="rounded-xl bg-yellow-50 px-3 py-2.5 text-sm font-bold text-yellow-700 hover:bg-yellow-100"
                    >
                      {eventItem.active
                        ? "Hide"
                        : "Show"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        changeStatus(eventItem)
                      }
                      className="rounded-xl bg-green-50 px-3 py-2.5 text-sm font-bold text-green-700 hover:bg-green-100"
                    >
                      {eventItem.status ===
                      "upcoming"
                        ? "Mark Past"
                        : "Mark Upcoming"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteEvent(eventItem)
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

        {!loading && events.length === 0 && (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h3 className="text-xl font-bold">
              No events yet
            </h3>

            <p className="mt-2 text-slate-500">
              Create your first event.
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
        onChange={(event) =>
          onChange(event.target.value)
        }
        rows={5}
        className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}