# 🇷🇼 RWSA – AERW Website

Official website of the **Rwandan Students' Association (RWSA – AERW)** at the **University of Ottawa / Université d'Ottawa**.

🌐 **Live Website:** https://www.rwsa-aerw.ca

The website was designed and developed to provide the Rwandan student community at uOttawa with a central platform for discovering events, joining the association, exploring community activities, viewing recruitment opportunities, and staying connected with RWSA – AERW.

---

## ✨ Features

### 🌍 Bilingual Experience
- English and French interface
- Instant EN / FR language switching
- Bilingual event, team, membership, and recruitment content

### 📅 Event Management
- Upcoming events
- Past event highlights
- Event descriptions and collaboration information
- Eventbrite registration links
- Instagram recap links
- Event images and details managed dynamically

### 📸 Dynamic Gallery
- Community and event photo gallery
- Photos managed through the administration dashboard
- Responsive photo layout
- Expandable gallery with **View More / View Less**

### 👥 Team & Collaborators
- Executive team profiles
- Roles and academic programs
- Collaborator section
- Photos and information managed dynamically

### 🇷🇼 Membership
- Dedicated membership section
- Connection to the official RWSA – AERW membership form
- Membership link can be updated directly from the admin dashboard

### 💼 Recruitment
- Dynamic recruitment opportunities
- Position descriptions
- Application deadlines
- Application links
- Open and closed position management

### 🔐 Administration Dashboard
A private administration area allows authorized RWSA – AERW administrators to manage website content without modifying the source code.

Administrators can manage:

- Events
- Gallery photos
- Team members
- Collaborators
- Recruitment positions
- Membership form link

The dashboard includes authentication, administrator authorization, content visibility controls, image uploads, editing, and deletion.

---

## 🛠️ Tech Stack

### Frontend
- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**

### Backend & Database
- **Supabase**
- PostgreSQL database
- Supabase Authentication
- Row Level Security (RLS)
- Supabase Storage

### Deployment & Infrastructure
- **Vercel**
- **Cloudflare DNS**
- Custom `.ca` domain
- GitHub-based continuous deployment

---

## 🔒 Security

The project uses several security measures, including:

- Supabase Authentication for administrator access
- Administrator authorization checks
- Row Level Security (RLS)
- Restricted database write operations
- Protected admin interfaces
- Environment variables for Supabase configuration
- No private API keys stored in the repository

---

## 📱 Responsive Design

The website is designed for:

- Desktop
- Tablet
- Mobile

It includes a dedicated mobile navigation menu and responsive layouts throughout the website.

---

## 🔎 SEO & Accessibility

The website includes:

- Search engine metadata
- Canonical URL
- Dynamic sitemap
- `robots.txt`
- Open Graph metadata
- Social sharing images
- Google Search Console integration
- Accessible color contrast
- Responsive image optimization

---

## 📂 Project Structure

```text
rwsa-site-web/
├── public/
│   └── images/
│       ├── branding/
│       ├── events/
│       ├── hero/
│       └── team/
│
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── collaborators/
│   │   │   ├── events/
│   │   │   ├── gallery/
│   │   │   ├── positions/
│   │   │   └── team/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   │
│   └── lib/
│       └── supabase.ts
│
└── README.md
```

---

## ⚙️ Local Development

### 1. Clone the repository

```bash
git clone https://github.com/amwunguzi2/rwsa-site-web.git
```

### 2. Enter the project

```bash
cd rwsa-site-web
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env.local` file in the root of the project:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

> Do not commit `.env.local` or private credentials to GitHub.

### 5. Start the development server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## 🚀 Deployment

The production website is deployed with **Vercel**.

Updates pushed to the main GitHub branch can be automatically deployed to the production website.

**Production domain:**

https://www.rwsa-aerw.ca

---

## 🤝 RWSA – AERW

**Rwandan Students' Association**  
**Association des Étudiants Rwandais**

University of Ottawa  
Université d'Ottawa

📧 aerwasauo@gmail.com  
📸 Instagram: @rwsa.uottawa

---

## 👩🏾‍💻 Development

Designed and developed by **Arielle Mwunguzi Icyeza**.

Built as a modern digital platform for the Rwandan student community at the University of Ottawa.

---

© 2026 RWSA – AERW. All rights reserved.
