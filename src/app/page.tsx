"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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

type Collaborator = {
  id: number;
  name: string;
  image_url: string | null;
  display_order: number | null;
  active: boolean;
};

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

type GalleryItem = {
  id: number;
  title_en: string | null;
  title_fr: string | null;
  image_url: string;
  display_order: number | null;
  active: boolean;
};

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

function buildGoogleCalendarUrl(eventItem: EventItem, en: boolean) {
  if (!eventItem.event_date) {
    return null;
  }

  const title = en ? eventItem.title_en : eventItem.title_fr;
  const description =
    (en ? eventItem.description_en : eventItem.description_fr) || "";
  const collaboration =
    (en ? eventItem.collaboration_en : eventItem.collaboration_fr) || "";

  const details = [description, collaboration, "RWSA – AERW"]
    .filter(Boolean)
    .join("\n\n");

  const formatCalendarDateTime = (date: Date) =>
    date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details,
  });

  if (eventItem.location) {
    params.set("location", eventItem.location);
  }

  if (eventItem.event_time) {
    const start = new Date(
      `${eventItem.event_date}T${eventItem.event_time.slice(0, 5)}:00`
    );

    if (!Number.isNaN(start.getTime())) {
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      params.set(
        "dates",
        `${formatCalendarDateTime(start)}/${formatCalendarDateTime(end)}`
      );
    }
  } else {
    const [year, month, day] = eventItem.event_date.split("-").map(Number);
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
    const startDate = eventItem.event_date.replaceAll("-", "");
    const endDate = [
      nextDay.getUTCFullYear(),
      String(nextDay.getUTCMonth() + 1).padStart(2, "0"),
      String(nextDay.getUTCDate()).padStart(2, "0"),
    ].join("");

    params.set("dates", `${startDate}/${endDate}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function Home() {
  const [language, setLanguage] = useState<"en" | "fr">("en");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(true);
  const [collaboratorsGroupImage, setCollaboratorsGroupImage] = useState(
    "/images/team/collaborators.jpg"
  );
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [pastEvents, setPastEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryExpanded, setGalleryExpanded] = useState(false);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState<number | null>(null);
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const en = language === "en";
  const visibleGalleryPhotos = galleryExpanded
    ? galleryPhotos
    : galleryPhotos.slice(0, 8);

  const eventbrite =
    "https://www.eventbrite.com/o/rwandan-student-association-des-etudiants-rwandais-120057976891";

  const defaultMembershipForm =
    "https://docs.google.com/forms/d/e/1FAIpQLSeX0ERr999YinVrhMwwdjE8wws9p3Owr1pkafWWgc_tBpjYzg/viewform";

  const [membershipForm, setMembershipForm] = useState(
    defaultMembershipForm
  );

  const instagram =
    "https://www.instagram.com/rwsa.uottawa/";

  const email = "aerwasauo@gmail.com";





  useEffect(() => {
    async function loadMembershipForm() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "membership_form_url")
        .maybeSingle();

      if (error) {
        console.error("Could not load membership form URL:", error);
        return;
      }

      if (data?.value) {
        setMembershipForm(data.value);
      }
    }

    loadMembershipForm();
  }, []);

  useEffect(() => {
    async function loadTeam() {
      const { data, error } = await supabase
        .from("team_members")
        .select(
          "id, name, role_en, role_fr, program, image_url, display_order, active"
        )
        .eq("active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Could not load team members:", error);
        setTeam([]);
      } else {
        setTeam(data ?? []);
      }

      setTeamLoading(false);
    }

    loadTeam();
  }, []);

  useEffect(() => {
    async function loadCollaborators() {
      const { data, error } = await supabase
        .from("collaborators")
        .select("id, name, image_url, display_order, active")
        .eq("active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Could not load collaborators:", error);
        setCollaborators([]);
      } else {
        setCollaborators(data ?? []);
      }

      setCollaboratorsLoading(false);
    }

    loadCollaborators();
  }, []);

  useEffect(() => {
    async function loadCollaboratorsGroupImage() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "collaborators_group_image")
        .maybeSingle();

      if (error) {
        console.error("Could not load collaborators group photo:", error);
        return;
      }

      if (data?.value) {
        setCollaboratorsGroupImage(data.value);
      }
    }

    loadCollaboratorsGroupImage();
  }, []);

  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Could not load events:", error);
        setUpcomingEvents([]);
        setPastEvents([]);
      } else {
        const allEvents = (data ?? []) as EventItem[];

        setUpcomingEvents(
          allEvents.filter((eventItem) => eventItem.status === "upcoming")
        );

        setPastEvents(
          allEvents.filter((eventItem) => eventItem.status === "past")
        );
      }

      setEventsLoading(false);
    }

    loadEvents();
  }, []);

  useEffect(() => {
    async function loadGallery() {
      const { data, error } = await supabase
        .from("gallery")
        .select("id, title_en, title_fr, image_url, display_order, active")
        .eq("active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Could not load gallery:", error);
        setGalleryPhotos([]);
      } else {
        setGalleryPhotos(data ?? []);
      }

      setGalleryLoading(false);
    }

    loadGallery();
  }, []);

  useEffect(() => {
    async function loadPositions() {
      const { data, error } = await supabase
        .from("positions")
        .select(
          "id, title_en, title_fr, description_en, description_fr, deadline, application_url, status, display_order, active"
        )
        .eq("active", true)
        .eq("status", "open")
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Could not load positions:", error);
        setOpenPositions([]);
      } else {
        setOpenPositions(data ?? []);
      }

      setPositionsLoading(false);
    }

    loadPositions();
  }, []);

  return (
    <main className="min-h-screen bg-white text-slate-900">

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex h-[92px] max-w-7xl items-center justify-between px-6">

          <a href="#home" className="flex items-center gap-3">

            <div className="relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-full bg-white">
              <Image
                src="/images/branding/logo.jpg"
                alt="RWSA AERW logo"
                fill
                priority
                className="scale-[1.35] object-cover object-center"
                sizes="58px"
              />
            </div>

            <div className="leading-tight">
              <p className="text-base font-bold md:text-lg">
                RWSA – AERW
              </p>

              <p className="mt-1 text-xs text-slate-500">
                uOttawa
              </p>
            </div>

          </a>

          <div className="hidden items-center gap-4 text-sm font-medium lg:flex">

            <a href="#home" className="transition hover:text-blue-600">
              {en ? "Home" : "Accueil"}
            </a>

            <a href="#about" className="transition hover:text-blue-600">
              {en ? "About" : "À propos"}
            </a>

            <a href="#upcoming" className="transition hover:text-blue-600">
              {en ? "Upcoming" : "À venir"}
            </a>

            <a href="#events" className="transition hover:text-blue-600">
              {en ? "Past Events" : "Événements"}
            </a>

            <a href="#gallery" className="transition hover:text-blue-600">
              {en ? "Gallery" : "Galerie"}
            </a>

            <a href="#team" className="transition hover:text-blue-600">
              {en ? "Team" : "Équipe"}
            </a>

            <a
              href="#member"
              className="font-bold text-blue-600 transition hover:text-blue-800"
            >
              {en ? "Become a Member" : "Devenir membre"}
            </a>

            <a href="#join" className="transition hover:text-blue-600">
              {en ? "Join Team" : "Rejoindre l’équipe"}
            </a>

            <a href="#contact" className="transition hover:text-blue-600">
              Contact
            </a>

            <div className="flex rounded-full border border-slate-200 bg-white p-1">

              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`rounded-full px-3 py-1.5 transition ${
                  en
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                EN
              </button>

              <button
                type="button"
                onClick={() => setLanguage("fr")}
                className={`rounded-full px-3 py-1.5 transition ${
                  !en
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                FR
              </button>

            </div>

          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-2xl text-slate-800 transition hover:bg-slate-100 lg:hidden"
            aria-label={en ? "Open navigation menu" : "Ouvrir le menu de navigation"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? "×" : "☰"}
          </button>

        </nav>

        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white px-6 py-5 shadow-lg lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 text-sm font-semibold">
              {[
                ["#home", en ? "Home" : "Accueil"],
                ["#about", en ? "About" : "À propos"],
                ["#upcoming", en ? "Upcoming" : "À venir"],
                ["#events", en ? "Past Events" : "Événements passés"],
                ["#gallery", en ? "Gallery" : "Galerie"],
                ["#team", en ? "Team" : "Équipe"],
                ["#member", en ? "Become a Member" : "Devenir membre"],
                ["#join", en ? "Join Team" : "Rejoindre l’équipe"],
                ["#contact", "Contact"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-slate-700 transition hover:bg-slate-50 hover:text-blue-600"
                >
                  {label}
                </a>
              ))}

              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setLanguage("en");
                    setMobileMenuOpen(false);
                  }}
                  className={`rounded-full px-5 py-2.5 transition ${
                    en
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  EN
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLanguage("fr");
                    setMobileMenuOpen(false);
                  }}
                  className={`rounded-full px-5 py-2.5 transition ${
                    !en
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  FR
                </button>
              </div>
            </div>
          </div>
        )}
      </header>


      {/* HERO */}
      <section
        id="home"
        className="relative flex min-h-[720px] items-center overflow-hidden"
      >

        <Image
          src="/images/hero/hero.jpg"
          alt="RWSA AERW community"
          fill
          priority
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-slate-950/60" />

        <div className="absolute left-0 top-0 h-2 w-full bg-blue-500" />

        <div className="absolute bottom-0 left-0 flex h-2 w-full">
          <div className="w-1/3 bg-blue-500" />
          <div className="w-1/3 bg-yellow-400" />
          <div className="w-1/3 bg-green-600" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-28 text-white">

          <p className="mb-5 text-sm font-bold uppercase tracking-[0.25em] text-yellow-300">
            University of Ottawa • Université d&apos;Ottawa
          </p>

          <h1 className="max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
            RWSA – AERW
          </h1>

          <div className="mt-5 text-xl font-semibold md:text-2xl">
            <p>Rwandan Students&apos; Association</p>
            <p>Association des Étudiants Rwandais</p>
          </div>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-100">
            {en
              ? "Celebrating our culture, strengthening our community and creating a home away from home for Rwandan students at the University of Ottawa."
              : "Célébrer notre culture, renforcer notre communauté et créer un chez-soi loin de chez soi pour les étudiants rwandais à l’Université d’Ottawa."}
          </p>

          <div className="mt-10 flex flex-wrap gap-4">

            <a
              href="#member"
              className="rounded-full bg-yellow-400 px-7 py-3 font-bold text-slate-900 transition hover:bg-yellow-300"
            >
              {en ? "Become a Member" : "Devenir membre"}
            </a>

            <a
              href="#upcoming"
              className="rounded-full border border-white/60 bg-white/10 px-7 py-3 font-semibold backdrop-blur transition hover:bg-white/20"
            >
              {en ? "Upcoming Events" : "Événements à venir"}
            </a>

          </div>

        </div>
      </section>


      {/* ABOUT */}
      <section id="about" className="relative overflow-hidden bg-white">

        <div className="absolute right-0 top-0 h-full w-2 bg-green-600" />

        <div className="mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-2 lg:items-center">

          <div>

            <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-green-700">
              {en ? "Our Mission" : "Notre mission"}
            </p>

            <h2 className="text-4xl font-bold leading-tight md:text-5xl">
              {en
                ? "Culture. Community. Connection."
                : "Culture. Communauté. Connexion."}
            </h2>

            <p className="mt-7 text-lg leading-8 text-slate-600">
              {en
                ? "RWSA – AERW is dedicated to celebrating Rwandan culture, heritage and values while building a strong, welcoming community at the University of Ottawa. Our mission is to create a space where Rwandan students can connect, build meaningful relationships, celebrate their heritage and feel at home throughout their university experience."
                : "RWSA – AERW a pour mission de célébrer la culture, le patrimoine et les valeurs du Rwanda tout en bâtissant une communauté forte et accueillante à l’Université d’Ottawa. Nous souhaitons créer un espace où les étudiants rwandais peuvent se rencontrer, développer des liens significatifs, célébrer leur patrimoine et se sentir chez eux tout au long de leur parcours universitaire."}
            </p>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              {en
                ? "Through cultural celebrations, social events, academic initiatives and collaborations with other student associations, we promote unity, learning and mutual support while creating opportunities to share the richness of Rwandan culture with the wider uOttawa community."
                : "À travers des célébrations culturelles, des événements sociaux, des initiatives académiques et des collaborations avec d’autres associations étudiantes, nous favorisons l’unité, l’apprentissage et le soutien mutuel tout en créant des occasions de faire découvrir la richesse de la culture rwandaise à l’ensemble de la communauté uOttawa."}
            </p>

            <div className="mt-7 rounded-2xl border-l-4 border-yellow-400 bg-slate-50 p-5">

              <p className="leading-7 text-slate-700">
                {en
                  ? "Whether you are Rwandan, have Rwandan roots, are a friend of Rwanda or are simply curious to discover our culture, RWSA – AERW welcomes you."
                  : "Que vous soyez Rwandais, que vous ayez des racines rwandaises, que vous soyez un ami du Rwanda ou simplement curieux de découvrir notre culture, RWSA – AERW vous accueille."}
              </p>

            </div>

          </div>

          <div className="relative h-[430px] overflow-hidden rounded-[2rem]">

            <Image
              src="/images/hero/group.jpg"
              alt="RWSA AERW group"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center"
            />

          </div>

        </div>
      </section>


      {/* UPCOMING EVENTS */}
      <section
        id="upcoming"
        className="relative overflow-hidden bg-[#071d17] text-white"
      >
        <div className="absolute left-0 top-0 flex h-2 w-full">
          <div className="w-1/3 bg-blue-500" />
          <div className="w-1/3 bg-yellow-400" />
          <div className="w-1/3 bg-green-600" />
        </div>

        <div className="mx-auto max-w-7xl px-6 py-24">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-yellow-300">
            {en ? "What's next" : "À venir"}
          </p>

          <h2 className="mt-4 text-4xl font-bold md:text-5xl">
            {en ? "Upcoming Events" : "Événements à venir"}
          </h2>

          {eventsLoading ? (
            <div className="mt-12 rounded-[2rem] border border-white/10 bg-white/5 p-10 text-slate-300">
              {en ? "Loading events..." : "Chargement des événements..."}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="mt-12 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur md:p-12">
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full bg-yellow-400 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-900">
                  {en ? "Coming Soon" : "Bientôt"}
                </div>

                <h3 className="mt-6 text-3xl font-bold md:text-4xl">
                  {en
                    ? "New events are on the way."
                    : "De nouveaux événements arrivent bientôt."}
                </h3>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                  {en
                    ? "We don't have a new event to announce just yet. Follow our Eventbrite page to discover our next activities and register when tickets become available."
                    : "Nous n’avons pas encore de nouvel événement à annoncer. Suivez notre page Eventbrite pour découvrir nos prochaines activités et vous inscrire dès que les billets seront disponibles."}
                </p>

                <a
                  href={eventbrite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex rounded-full bg-blue-700 px-7 py-3 font-bold text-white transition hover:bg-blue-800"
                >
                  {en ? "View our Eventbrite →" : "Voir notre Eventbrite →"}
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              {upcomingEvents.map((eventItem) => (
                <article
                  key={eventItem.id}
                  className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur"
                >
                  {eventItem.image_url && (
                    <div className="h-72 overflow-hidden">
                      <img
                        src={eventItem.image_url}
                        alt={en ? eventItem.title_en : eventItem.title_fr}
                        className="h-full w-full object-cover object-center transition duration-500 hover:scale-105"
                      />
                    </div>
                  )}

                  <div className="p-7 md:p-8">
                    {(eventItem.label_en || eventItem.label_fr) && (
                      <p className="text-xs font-bold uppercase tracking-widest text-yellow-300">
                        {en ? eventItem.label_en : eventItem.label_fr}
                      </p>
                    )}

                    <h3 className="mt-3 text-2xl font-bold">
                      {en ? eventItem.title_en : eventItem.title_fr}
                    </h3>

                    {(eventItem.event_date ||
                      eventItem.event_time ||
                      eventItem.location) && (
                      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-slate-200">
                        {eventItem.event_date && (
                          <span>
                            {new Date(
                              `${eventItem.event_date}T12:00:00`
                            ).toLocaleDateString(en ? "en-CA" : "fr-CA", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        )}

                        {eventItem.event_time && (
                          <span>{eventItem.event_time.slice(0, 5)}</span>
                        )}

                        {eventItem.location && <span>{eventItem.location}</span>}
                      </div>
                    )}

                    {(eventItem.description_en || eventItem.description_fr) && (
                      <p className="mt-5 leading-7 text-slate-300">
                        {en
                          ? eventItem.description_en
                          : eventItem.description_fr}
                      </p>
                    )}

                    {(eventItem.collaboration_en ||
                      eventItem.collaboration_fr) && (
                      <p className="mt-4 text-sm leading-6 text-slate-400">
                        {en
                          ? eventItem.collaboration_en
                          : eventItem.collaboration_fr}
                      </p>
                    )}

                    <div className="mt-7 flex flex-wrap gap-3">
                      {eventItem.eventbrite_url && (
                        <a
                          href={eventItem.eventbrite_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded-full bg-yellow-400 px-6 py-3 font-bold text-slate-900 transition hover:bg-yellow-300"
                        >
                          {en
                            ? "Register on Eventbrite →"
                            : "S’inscrire sur Eventbrite →"}
                        </a>
                      )}

                      {buildGoogleCalendarUrl(eventItem, en) && (
                        <a
                          href={buildGoogleCalendarUrl(eventItem, en) ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white/20"
                        >
                          📅{" "}
                          {en
                            ? "Add to Calendar"
                            : "Ajouter au calendrier"}
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>


      {/* PAST EVENTS */}
      <section id="events" className="bg-blue-50">

        <div className="mx-auto max-w-7xl px-6 py-24">

          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-600">
            {en
              ? "Our community in action"
              : "Notre communauté en action"}
          </p>

          <h2 className="mt-4 text-4xl font-bold md:text-5xl">
            {en ? "Past Events" : "Événements passés"}
          </h2>

          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            {en
              ? "Discover some of the events, collaborations and activities that have brought our community together."
              : "Découvrez quelques-uns des événements, collaborations et activités qui ont rassemblé notre communauté."}
          </p>

          <div className="mt-12 grid gap-7 md:grid-cols-3">

            {pastEvents.map((event) => (

              <article
                key={event.id}
                className="flex overflow-hidden rounded-3xl bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >

                <div className="flex w-full flex-col">

                  <div className="relative h-64 overflow-hidden">

                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={en ? event.title_en : event.title_fr}
                        className="h-full w-full object-cover object-center transition duration-500 hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-slate-100 text-slate-400">
                        {en ? "Photo coming soon" : "Photo à venir"}
                      </div>
                    )}

                  </div>

                  <div className="flex flex-1 flex-col p-6">

                    <p className="text-xs font-bold uppercase tracking-widest text-green-700">
                      {en ? event.label_en : event.label_fr}
                    </p>

                    <h3 className="mt-3 text-xl font-bold">
                      {en ? event.title_en : event.title_fr}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {en
                        ? event.description_en
                        : event.description_fr}
                    </p>

                    <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">
                      {en
                        ? event.collaboration_en
                        : event.collaboration_fr}
                    </p>

                    {event.instagram_url && (
                      <a
                        href={event.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 inline-flex w-fit items-center font-semibold text-blue-600 transition hover:text-blue-800"
                      >
                        {en
                          ? "View on Instagram →"
                          : "Voir sur Instagram →"}
                      </a>
                    )}

                  </div>

                </div>

              </article>

            ))}

          </div>

        </div>
      </section>


      {/* GALLERY */}
      <section id="gallery" className="bg-white">

        <div className="mx-auto max-w-7xl px-6 py-24">

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">

            <div>

              <p className="text-sm font-bold uppercase tracking-[0.25em] text-green-700">
                {en ? "Our memories" : "Nos souvenirs"}
              </p>

              <h2 className="mt-4 text-4xl font-bold md:text-5xl">
                {en ? "Gallery" : "Galerie"}
              </h2>

            </div>

            <p className="max-w-xl text-slate-600">
              {en
                ? "A glimpse into the people, events and moments that make our community special."
                : "Un aperçu des personnes, événements et moments qui rendent notre communauté unique."}
            </p>

          </div>

          {galleryLoading ? (
            <div className="mt-12 rounded-3xl bg-slate-50 p-10 text-center text-slate-500">
              {en ? "Loading gallery..." : "Chargement de la galerie..."}
            </div>
          ) : galleryPhotos.length === 0 ? (
            <div className="mt-12 rounded-3xl bg-slate-50 p-10 text-center text-slate-500">
              {en
                ? "New memories will be added soon."
                : "De nouveaux souvenirs seront bientôt ajoutés."}
            </div>
          ) : (
            <>
              <div className="mt-12 grid gap-4 md:grid-cols-12">
                {visibleGalleryPhotos.map((photo, index) => {
                  const wide = index % 4 === 0 || index % 4 === 3;

                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setSelectedGalleryIndex(galleryPhotos.findIndex((item) => item.id === photo.id))}
                      className={`group relative h-80 overflow-hidden rounded-3xl text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-700 focus-visible:ring-offset-4 ${
                        wide ? "md:col-span-7" : "md:col-span-5"
                      }`}
                    >
                      <img
                        src={photo.image_url}
                        alt={
                          (en ? photo.title_en : photo.title_fr) ||
                          (en ? "RWSA gallery photo" : "Photo de la galerie RWSA")
                        }
                        className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                    </button>
                  );
                })}
              </div>

              {galleryPhotos.length > 8 && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setGalleryExpanded((expanded) => !expanded)}
                    className="rounded-full border border-slate-300 bg-white px-7 py-3 font-bold text-slate-800 transition hover:border-green-700 hover:text-green-700"
                    aria-expanded={galleryExpanded}
                  >
                    {galleryExpanded
                      ? en
                        ? "View less ↑"
                        : "Voir moins ↑"
                      : en
                        ? "View more ↓"
                        : "Voir plus ↓"}
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </section>


      {selectedGalleryIndex !== null && galleryPhotos[selectedGalleryIndex] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 px-4 py-6" role="dialog" aria-modal="true" onClick={() => setSelectedGalleryIndex(null)}>
          <button type="button" onClick={() => setSelectedGalleryIndex(null)} className="absolute right-4 top-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white text-3xl text-slate-900" aria-label={en ? "Close photo" : "Fermer la photo"}>×</button>
          {galleryPhotos.length > 1 && <>
            <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedGalleryIndex((selectedGalleryIndex - 1 + galleryPhotos.length) % galleryPhotos.length); }} className="absolute left-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-3xl text-slate-900 md:left-8" aria-label={en ? "Previous photo" : "Photo précédente"}>‹</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedGalleryIndex((selectedGalleryIndex + 1) % galleryPhotos.length); }} className="absolute right-3 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-3xl text-slate-900 md:right-8" aria-label={en ? "Next photo" : "Photo suivante"}>›</button>
          </>}
          <div className="flex max-h-full max-w-[92vw] flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={galleryPhotos[selectedGalleryIndex].image_url} alt={(en ? galleryPhotos[selectedGalleryIndex].title_en : galleryPhotos[selectedGalleryIndex].title_fr) || (en ? "RWSA gallery photo" : "Photo de la galerie RWSA")} className="max-h-[78vh] max-w-full rounded-2xl object-contain shadow-2xl" />
            <p className="mt-4 text-sm text-slate-300">{selectedGalleryIndex + 1} / {galleryPhotos.length}</p>
          </div>
        </div>
      )}

      {/* TEAM */}
      <section id="team" className="bg-green-50">

        <div className="mx-auto max-w-7xl px-6 py-24">

          <p className="text-sm font-bold uppercase tracking-[0.25em] text-green-700">
            RWSA – AERW
          </p>

          <h2 className="mt-4 text-4xl font-bold md:text-5xl">
            {en ? "Meet the Team" : "Découvrez l’équipe"}
          </h2>

          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            {en
              ? "Meet some of the students working behind the scenes to strengthen our community."
              : "Découvrez quelques-uns des étudiants qui travaillent pour renforcer notre communauté."}
          </p>

          {teamLoading ? (
            <div className="mt-12 rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm">
              {en ? "Loading team..." : "Chargement de l’équipe..."}
            </div>
          ) : team.length === 0 ? (
            <div className="mt-12 rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm">
              {en
                ? "Team information will be available soon."
                : "Les informations sur l’équipe seront bientôt disponibles."}
            </div>
          ) : (
            <div className="mt-12 grid gap-8 md:grid-cols-3">

              {team.map((member) => (

              <article
                key={member.id}
                className="overflow-hidden rounded-3xl bg-white shadow-sm"
              >

                <div className="relative h-80 overflow-hidden">

                  {member.image_url ? (
                    <img
                      src={member.image_url}
                      alt={member.name}
                      className="h-full w-full object-cover object-center"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-400">
                      {en ? "Photo coming soon" : "Photo à venir"}
                    </div>
                  )}

                </div>

                <div className="p-6">

                  <h3 className="text-xl font-bold">
                    {member.name}
                  </h3>

                  <p className="mt-2 font-semibold text-blue-600">
                    {en ? member.role_en : member.role_fr}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    {member.program}
                  </p>

                </div>

              </article>

              ))}

            </div>
          )}


          {/* COLLABORATORS */}
          <div className="mt-14">

            <div className="grid items-stretch gap-8 lg:grid-cols-[440px_1fr]">

              <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">

                <div className="relative aspect-[3/4] w-full">

                  <img
                    src={collaboratorsGroupImage}
                    alt="RWSA AERW collaborators"
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />

                </div>

              </div>

              <div className="flex min-h-full flex-col justify-center rounded-[2rem] bg-white p-8 shadow-sm md:p-12 lg:p-14">

                <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">
                  {en ? "Collaborators" : "Collaborateurs"}
                </p>

                <h3 className="mt-4 text-3xl font-bold md:text-4xl">
                  {en
                    ? "Supporting our community"
                    : "Au service de notre communauté"}
                </h3>

                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                  {en
                    ? "A special thank you to our collaborators who contribute to our initiatives and help bring our ideas to life."
                    : "Un grand merci à nos collaborateurs qui contribuent à nos initiatives et nous aident à donner vie à nos idées."}
                </p>

                <div className="mt-8 space-y-3 text-lg font-medium text-slate-700">
                  {collaboratorsLoading ? (
                    <p className="text-slate-500">
                      {en
                        ? "Loading collaborators..."
                        : "Chargement des collaborateurs..."}
                    </p>
                  ) : collaborators.length === 0 ? (
                    <p className="text-slate-500">
                      {en
                        ? "Collaborator information will be available soon."
                        : "Les informations sur les collaborateurs seront bientôt disponibles."}
                    </p>
                  ) : (
                    collaborators.map((collaborator) => (
                      <p key={collaborator.id}>{collaborator.name}</p>
                    ))
                  )}
                </div>

              </div>

            </div>

          </div>

        </div>
      </section>


      {/* BECOME A MEMBER */}
      <section
        id="member"
        className="relative overflow-hidden bg-blue-50"
      >

        <div className="absolute left-0 top-0 h-full w-2 bg-blue-500" />

        <div className="mx-auto max-w-7xl px-6 py-24">

          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">

            {/* LEFT SIDE */}
            <div>

              <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-600">
                {en ? "Be part of the community" : "Faites partie de la communauté"}
              </p>

              <h2 className="mt-4 text-4xl font-bold md:text-5xl">
                {en ? "Become a Member" : "Devenir membre"}
              </h2>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                {en
                  ? "You don't need to be part of the executive team to be involved with RWSA – AERW. Becoming a member means joining our wider student community and staying connected with our activities throughout the year."
                  : "Vous n’avez pas besoin de faire partie de l’équipe exécutive pour vous impliquer au sein de RWSA – AERW. Devenir membre signifie rejoindre notre communauté étudiante et rester connecté à nos activités tout au long de l’année."}
              </p>

              <p className="mt-5 leading-7 text-slate-600">
                {en
                  ? "Complete our membership form to join the community and receive information about the next steps."
                  : "Remplissez notre formulaire d’adhésion pour rejoindre la communauté et recevoir les informations concernant les prochaines étapes."}
              </p>

            </div>


            {/* MEMBER CARD */}
            <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">

              <div className="flex h-2 w-full">
                <div className="w-1/3 bg-blue-500" />
                <div className="w-1/3 bg-yellow-400" />
                <div className="w-1/3 bg-green-600" />
              </div>

              <div className="p-8 md:p-10">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
                  🇷🇼
                </div>

                <h3 className="mt-7 text-2xl font-bold">
                  {en
                    ? "Join the RWSA – AERW community"
                    : "Rejoignez la communauté RWSA – AERW"}
                </h3>

                <p className="mt-4 leading-7 text-slate-600">
                  {en
                    ? "Membership helps you stay connected to the association and our student community."
                    : "L’adhésion vous permet de rester connecté à l’association et à notre communauté étudiante."}
                </p>


                {/* BENEFITS */}
                <div className="mt-7 space-y-4">

                  <div className="flex gap-3">
                    <span className="font-bold text-green-700">✓</span>
                    <p className="text-slate-700">
                      {en
                        ? "Join our community and WhatsApp group"
                        : "Rejoindre notre communauté et notre groupe WhatsApp"}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <span className="font-bold text-green-700">✓</span>
                    <p className="text-slate-700">
                      {en
                        ? "Stay informed about events and association activities"
                        : "Rester informé de nos événements et des activités de l’association"}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <span className="font-bold text-green-700">✓</span>
                    <p className="text-slate-700">
                      {en
                        ? "Receive information about membership and registration"
                        : "Recevoir les informations concernant l’adhésion et l’inscription"}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <span className="font-bold text-green-700">✓</span>
                    <p className="text-slate-700">
                      {en
                        ? "Connect with other students in our community"
                        : "Créer des liens avec d’autres étudiants de notre communauté"}
                    </p>
                  </div>

                </div>


                <a
                  href={membershipForm}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-9 inline-flex rounded-full bg-blue-600 px-7 py-3 font-bold text-white transition hover:bg-blue-700"
                >
                  {en
                    ? "Become a Member →"
                    : "Devenir membre →"}
                </a>

                <p className="mt-4 text-xs leading-5 text-slate-600">
                  {en
                    ? "The membership form opens in Google Forms."
                    : "Le formulaire d’adhésion s’ouvre dans Google Forms."}
                </p>

              </div>

            </div>

          </div>

        </div>
      </section>


      {/* JOIN OUR TEAM */}
      <section id="join" className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-green-700">
              {en ? "Get involved" : "Impliquez-vous"}
            </p>

            <h2 className="mt-4 text-4xl font-bold md:text-5xl">
              {en ? "Join Our Team" : "Rejoignez notre équipe"}
            </h2>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              {en
                ? "Looking to take a more active role in the association? When positions become available within RWSA – AERW, you'll be able to find them here and submit an application."
                : "Vous souhaitez jouer un rôle plus actif au sein de l’association ? Lorsque des postes seront disponibles au sein de RWSA – AERW, vous pourrez les retrouver ici et soumettre votre candidature."}
            </p>
          </div>

          {positionsLoading ? (
            <div className="mt-12 rounded-3xl bg-slate-50 p-10 text-center text-slate-500">
              {en
                ? "Loading opportunities..."
                : "Chargement des opportunités..."}
            </div>
          ) : openPositions.length === 0 ? (
            <div className="mt-12 rounded-[2rem] border border-slate-200 bg-slate-50 p-8 md:p-10">
              <div className="inline-flex rounded-full bg-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-700">
                {en ? "No open positions" : "Aucun poste ouvert"}
              </div>

              <h3 className="mt-6 text-2xl font-bold text-slate-900">
                {en
                  ? "There are no recruitment opportunities at the moment."
                  : "Il n’y a aucune opportunité de recrutement pour le moment."}
              </h3>

              <p className="mt-4 max-w-2xl leading-7 text-slate-600">
                {en
                  ? "Check back later or follow RWSA – AERW on Instagram for future executive, volunteer and team opportunities."
                  : "Revenez plus tard ou suivez RWSA – AERW sur Instagram pour découvrir nos futures opportunités au sein de l’exécutif, de l’équipe ou comme bénévole."}
              </p>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {openPositions.map((position) => (
                <article
                  key={position.id}
                  className="rounded-[2rem] border border-slate-200 bg-slate-50 p-7 md:p-8"
                >
                  <div className="inline-flex rounded-full bg-green-100 px-4 py-2 text-xs font-bold uppercase tracking-widest text-green-700">
                    {en ? "Applications Open" : "Candidatures ouvertes"}
                  </div>

                  <h3 className="mt-5 text-2xl font-bold text-slate-900">
                    {en ? position.title_en : position.title_fr}
                  </h3>

                  {(position.description_en || position.description_fr) && (
                    <p className="mt-4 leading-7 text-slate-600">
                      {en
                        ? position.description_en
                        : position.description_fr}
                    </p>
                  )}

                  {position.deadline && (
                    <p className="mt-5 text-sm font-semibold text-slate-700">
                      {en ? "Application deadline: " : "Date limite : "}
                      {new Date(position.deadline).toLocaleString(
                        en ? "en-CA" : "fr-CA",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  )}

                  {position.application_url && (
                    <a
                      href={position.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-7 inline-flex rounded-full bg-[#071f18] px-6 py-3 font-bold text-white transition hover:bg-[#0b3025]"
                    >
                      {en ? "Apply Now →" : "Postuler →"}
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>


      {/* CONTACT */}
      <section
        id="contact"
        className="relative overflow-hidden bg-[#071d17] text-white"
      >

        <div className="absolute left-0 top-0 flex h-2 w-full">
          <div className="w-1/3 bg-blue-500" />
          <div className="w-1/3 bg-yellow-400" />
          <div className="w-1/3 bg-green-600" />
        </div>

        <div className="mx-auto max-w-7xl px-6 py-24">

          <p className="text-sm font-bold uppercase tracking-[0.25em] text-yellow-300">
            {en ? "Get in touch" : "Contactez-nous"}
          </p>

          <h2 className="mt-4 max-w-3xl text-4xl font-bold md:text-6xl">
            {en
              ? "Stay connected with RWSA – AERW."
              : "Restez connectés avec RWSA – AERW."}
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            {en
              ? "Follow us for upcoming events, announcements, membership information, recruitment opportunities and highlights from our community."
              : "Suivez-nous pour découvrir nos prochains événements, nos annonces, les informations concernant l’adhésion, nos possibilités de recrutement et les moments forts de notre communauté."}
          </p>


          {/* EMAIL */}
          <div className="mt-10">

            <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              Email
            </p>

            <a
              href={`mailto:${email}`}
              className="mt-2 inline-block text-xl font-semibold text-white transition hover:text-yellow-300"
            >
              {email}
            </a>

          </div>


          {/* CONTACT BUTTONS */}
          <div className="mt-10 flex flex-wrap gap-4">

            <a
              href={instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-yellow-400 px-7 py-3 font-bold text-slate-900 transition hover:bg-yellow-300"
            >
              Instagram
            </a>

            <a
              href={eventbrite}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/30 px-7 py-3 font-semibold transition hover:bg-white/10"
            >
              Eventbrite
            </a>

            <a
              href={membershipForm}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/30 px-7 py-3 font-semibold transition hover:bg-white/10"
            >
              {en ? "Become a Member" : "Devenir membre"}
            </a>

            <a
              href={`mailto:${email}`}
              className="rounded-full border border-white/30 px-7 py-3 font-semibold transition hover:bg-white/10"
            >
              {en ? "Email Us" : "Nous écrire"}
            </a>

          </div>

        </div>
      </section>


      {/* FOOTER */}
      <footer className="bg-[#04120e] text-slate-300">

        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-6 py-12 md:flex-row md:items-center">

          <div className="flex items-center gap-4">

            <div className="relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-full bg-white">

              <Image
                src="/images/branding/logo.jpg"
                alt="RWSA AERW logo"
                fill
                className="scale-[1.35] object-cover object-center"
                sizes="58px"
              />

            </div>

            <div>

              <p className="font-bold text-white">
                RWSA – AERW uOttawa
              </p>

              <p className="mt-1 text-sm">
                Rwandan Students&apos; Association
              </p>

              <p className="text-sm">
                Association des Étudiants Rwandais
              </p>

            </div>

          </div>

          <div className="text-sm md:text-right">

            <p>
              University of Ottawa • Université d&apos;Ottawa
            </p>

            <p className="mt-2">
              Ottawa, Canada
            </p>

            <a
              href={`mailto:${email}`}
              className="mt-2 block transition hover:text-white"
            >
              {email}
            </a>

            <p className="mt-4 text-slate-300">
              © 2026 RWSA – AERW
            </p>

          </div>

        </div>

      </footer>

    </main>
  );
}