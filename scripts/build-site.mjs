// Builds the public marketing site (public/welcome.html and one page per
// module in public/features/) from the content below, on the Creativo
// Bootstrap template shared with MessageHome and the Order Ahead app.
// Run `pnpm site` after changing anything here and commit the output.
//
// Keep every claim true to what the app does today: each module's list
// mirrors its registers in src/lib/registers/defs.ts. Prices are the demo
// prices from migration 0012 until real ones are set (DECISIONS.md #15).

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const NAME = "PS Business Hub";
const SIGN_IN = "/login";

const BASE_PRICE = 20;

const MODULES = [
  {
    slug: "staff-hub",
    key: "staff_hub",
    name: "Staff Hub",
    icon: "bi-people",
    price: 29,
    tagline: "Everything about your team, from the job advert to the leaving date.",
    summary:
      "Recruit, onboard, issue contracts for signature, keep training in date and record supervision, absence and performance. Staff see their own records and do their own requests.",
    groups: [
      {
        title: "Hire someone",
        icon: "bi-person-plus",
        items: [
          ["Vacancies", "Jobs you're recruiting for. Open ones appear on your public jobs page, where people can apply."],
          ["Applicants", "Everyone who has applied and where they are: shortlisted, interview, offered, hired, with right-to-work and reference checks."],
          ["Contract templates", "Contracts, job descriptions and offer letters with the person's name, role and start date filled in for you."],
          ["Issued documents", "Send a contract or letter to someone and see when they have read and signed it."],
        ],
      },
      {
        title: "Get them started",
        icon: "bi-list-check",
        items: [
          ["Onboarding", "A checklist of everything a new starter needs before and during their first weeks."],
          ["Policies", "Publish your handbook and policies. Staff read and sign them, and you can see who still needs to. Change the wording and everyone is asked to sign again."],
        ],
      },
      {
        title: "Keep everyone safe and skilled",
        icon: "bi-mortarboard",
        items: [
          ["Training", "Courses completed with certificate expiry dates, plus a training matrix of the whole team at a glance."],
          ["Competency", "Skills a manager has assessed someone as competent in, and when to review them."],
          ["Supervision & spot checks", "Supervisions, observations and one-to-ones. Staff acknowledge their own."],
        ],
      },
      {
        title: "Manage day to day",
        icon: "bi-calendar-check",
        items: [
          ["Absence & holiday", "Staff request holiday and report sickness themselves. You approve it, record return-to-work chats, and see holiday balances and Bradford Factor scores."],
          ["Performance", "Probation reviews, appraisals, one-to-ones and improvement plans."],
          ["Employee relations", "Concerns, grievances, disciplinaries and conflicts. Staff can raise one, but the file stays confidential to managers."],
          ["Benefits", "Who gets what: health cover, cycle to work, training budgets and so on."],
        ],
      },
    ],
    staffCan: ["See their own details, training and documents", "Read and sign policies and contracts", "Request holiday and report sickness", "Raise a concern or grievance"],
  },
  {
    slug: "compliance",
    key: "compliance",
    name: "Compliance & Safety",
    icon: "bi-shield-check",
    price: 19,
    tagline: "Health and safety paperwork that keeps itself up to date.",
    summary:
      "Risks, risk assessments, COSHH, accidents and incidents, safeguarding, and a calendar of every check, renewal and review, so nothing lapses without you knowing.",
    groups: [
      {
        title: "Know your risks",
        icon: "bi-exclamation-triangle",
        items: [
          ["Risk register", "Each risk scored for likelihood and severity, shown on a risk matrix, with an owner and a review date."],
          ["Risk assessments", "Written assessments for your activities and locations."],
          ["COSHH register", "Hazardous substances with their safety data sheets, controls, protective equipment and first aid."],
        ],
      },
      {
        title: "When something happens",
        icon: "bi-bandaid",
        items: [
          ["Accidents & incidents", "Any member of staff can report an accident, incident or near miss from their phone. You investigate and close it off, and flag RIDDOR-reportable ones."],
          ["Safeguarding", "Staff can raise a safeguarding concern. The log and any referrals are seen by managers only."],
        ],
      },
      {
        title: "Checks and renewals",
        icon: "bi-arrow-repeat",
        items: [
          ["Audits & review calendar", "Fire alarm tests, PAT testing, first aid kits: anything on a repeating schedule. Mark one done and the next date is set for you."],
          ["Quality spot checks", "Checks of work quality on site, with findings and follow-up dates."],
          ["Insurance", "Every policy and its renewal date."],
          ["Registrations", "Registrations with regulators and other bodies, like the ICO, CQC or waste carrier licence."],
        ],
      },
      {
        title: "Vehicles and drivers",
        icon: "bi-car-front",
        items: [
          ["Vehicles", "Company vehicles with MOT, tax, insurance and service dates."],
          ["Driver checks", "Licence checks for anyone who drives for work, and when the next one is due."],
        ],
      },
    ],
    staffCan: ["Report an accident, incident or near miss", "Raise a safeguarding concern", "See the vehicles, driver checks and spot checks that involve them"],
  },
  {
    slug: "gdpr",
    key: "gdpr",
    name: "GDPR Toolkit",
    icon: "bi-lock",
    price: 15,
    tagline: "The records UK GDPR expects you to keep, without a consultant.",
    summary:
      "Map the personal data you hold, track the suppliers who handle it, answer subject access requests on time, log breaches against the 72-hour clock, and publish privacy notices.",
    groups: [
      {
        title: "Know what you hold",
        icon: "bi-diagram-3",
        items: [
          ["Data map", "Your record of processing: what personal data you hold, why, your lawful basis, how long you keep it and where. Special category data is flagged."],
          ["Processor register", "Suppliers who handle personal data for you, where they are based, and whether you have a data processing agreement."],
          ["DPIAs", "Data protection impact assessments for new or risky uses of personal data."],
        ],
      },
      {
        title: "When someone asks, or something goes wrong",
        icon: "bi-stopwatch",
        items: [
          ["Subject access requests", "Requests for a copy of someone's data, with the one-month deadline worked out for you (three months if extended)."],
          ["Data breaches", "Log a breach and see how long is left of the 72 hours you have to report it to the ICO."],
        ],
      },
      {
        title: "Tell people how you use their data",
        icon: "bi-file-earmark-text",
        items: [["Privacy notices", "Notices for customers, staff and job applicants. Published ones get their own public link to share."]],
      },
    ],
    staffCan: ["Read the data protection policies they are asked to sign"],
  },
  {
    slug: "clients",
    key: "clients",
    name: "Clients",
    icon: "bi-briefcase",
    price: 19,
    tagline: "Your customers, visits, invoices and follow-ups in one list.",
    summary: "Keep track of clients and leads, book assessments and site visits, send invoices by email, record disputes and remember who to follow up with.",
    groups: [
      {
        title: "Win and keep clients",
        icon: "bi-person-lines-fill",
        items: [
          ["Clients", "Your clients and leads, with contact details, status and notes."],
          ["Assessments", "Scheduled assessments and site visits. Staff see the ones they are booked on."],
          ["Networking", "People you've met, where, and when to follow up."],
        ],
      },
      {
        title: "Get paid",
        icon: "bi-receipt",
        items: [
          ["Invoices", "Create numbered invoices with line items, print them or email them straight to the client, and mark them paid."],
          ["Disputes", "Complaints and disputes with clients, and how they were resolved."],
        ],
      },
    ],
    staffCan: ["See the assessments and visits they are booked on"],
  },
  {
    slug: "website",
    key: "website",
    name: "Website & Bookings",
    icon: "bi-globe",
    price: 50,
    tagline: "A simple public page that brings in bookings and reviews.",
    summary:
      "A public page with your services, reviews and jobs. Customers send booking requests from it, you collect reviews by email, and you can print a flyer or use your own domain.",
    groups: [
      {
        title: "Your public page",
        icon: "bi-window",
        items: [
          ["Your page", "Your name, colours, about text, contact details and services on a page of your own, with your open jobs and privacy notices alongside."],
          ["Services", "What you offer, with prices and durations, in the order you choose."],
          ["Own domain", "Point your own web address at it and your page appears there."],
          ["Flyer", "A printable A4 flyer made from your details and services."],
        ],
      },
      {
        title: "Bring in work",
        icon: "bi-inbox",
        items: [
          ["Booking requests", "Requests customers send from your page, which you mark as contacted, booked or declined."],
          ["Reviews", "Email customers a link to leave a review. You approve which ones appear on your page."],
        ],
      },
    ],
    staffCan: [],
  },
  {
    slug: "payroll",
    key: "payroll",
    name: "Payroll Connect",
    icon: "bi-cash-coin",
    price: 12,
    tagline: "Everything your payroll provider needs, ready each pay day.",
    summary:
      "Keep pay details and pension status, collect timesheets, track pay problems and tick off each pay run, then export a spreadsheet for your payroll provider. It doesn't run payroll itself: your provider does that.",
    groups: [
      {
        title: "Before pay day",
        icon: "bi-clock-history",
        items: [
          ["Pay details", "Pay rate, tax code, NI number and pension status for each person. Only the owner can see them, and bank details stay in your payroll software."],
          ["Timesheets", "Staff submit their own hours. Approved hours go into the export."],
        ],
      },
      {
        title: "On pay day",
        icon: "bi-check2-square",
        items: [
          ["Pay runs", "A checklist for each pay period: exported, submitted to HMRC by your provider, payslips issued, pension uploaded."],
          ["Payroll export", "One spreadsheet per pay period with hours, holiday, sickness and other leave, pay rates and tax codes, ready to send to your provider."],
          ["Payroll queries", "Missing payslips, wrong tax or NI, holiday or sick pay not recorded, tracked until they're sorted."],
        ],
      },
    ],
    staffCan: ["Submit their own timesheets", "Raise a pay query"],
  },
  {
    slug: "suppliers",
    key: "suppliers",
    name: "Suppliers",
    icon: "bi-truck",
    price: 9,
    tagline: "Who you buy from, what's in stock, and what's on order.",
    summary: "An approved supplier list, products with stock levels and reorder points (linked to your COSHH records), and the orders you've placed.",
    groups: [
      {
        title: "Buying",
        icon: "bi-cart",
        items: [
          ["Suppliers", "Approved wholesalers and suppliers, with account numbers and payment terms."],
          ["Products", "What you buy, current stock and when to reorder. Hazardous products link to their COSHH assessment."],
          ["Orders", "Orders placed, when they're expected and when they arrived."],
        ],
      },
    ],
    staffCan: [],
  },
];

const FAQ = [
  ["Do I have to use every module?", "No. Every business pays the base subscription and switches on only the modules it needs. Switch one off and it disappears from your team's menus, but nothing in it is deleted, so it's all still there if you switch it back on."],
  ["How do my staff sign in?", "With their email address. They're sent a sign-in link, so there are no passwords to remember or reset. You invite them from the Staff page and they only ever see their own records."],
  ["What can a manager do that staff can't?", "Owners run everything, including modules, settings and pay details. Managers look after the team and the registers. Staff see their own details, sign what they're sent, and do their own requests like holiday and timesheets."],
  ["Will it remind me when things are due?", "Yes. Your overview shows everything overdue or due in the next 30 days, from training expiry to insurance renewals, and owners and managers get a short email each morning when something needs doing."],
  ["Is our data safe?", "Every business's records are kept apart by the database itself, not just hidden in the menus, and each person only sees what their role allows. Files are stored privately and only opened through a short-lived link after checking who's asking."],
  ["Is this legal or HR advice?", "No. The starter contract templates and example policies are a starting point. Have them checked by an employment solicitor or HR adviser before you rely on them."],
  ["Does it run our payroll?", "No. Payroll Connect gets everything ready and exports it for your payroll provider, who calculates tax and National Insurance and reports to HMRC."],
];

// ---------------------------------------------------------------------------

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (n) => `£${Number(n).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function page({ title, description, body, active, extraScript = "" }) {
  const nav = [
    ["/welcome#hero", "Home", "home"],
    ["/welcome#modules", "Modules", "modules"],
    ["/welcome#how", "How it works", "how"],
    ["/welcome#pricing", "Pricing", "pricing"],
    ["/welcome#faq", "FAQ", "faq"],
  ];
  return `<!doctype html>
<html lang="en-GB">

<head>
  <!-- Generated by scripts/build-site.mjs: edit that, then run \`pnpm site\`. -->
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">

  <link href="https://fonts.googleapis.com" rel="preconnect">
  <link href="https://fonts.gstatic.com" rel="preconnect" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Lato:wght@400;700;900&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css" rel="stylesheet">

  <!-- Creativo's stylesheet (MessageHome's copy, with its hover fixes), then this site's additions. -->
  <link href="/assets/creativo/main.css" rel="stylesheet">
  <link href="/site/site.css" rel="stylesheet">
</head>

<body class="index-page">

  <header id="header" class="header d-flex align-items-center fixed-top">
    <div class="container position-relative d-flex align-items-center justify-content-between">

      <a href="/welcome" class="logo d-flex align-items-center me-auto me-xl-0">
        <span class="logo-mark" aria-hidden="true"><i class="bi bi-grid-1x2-fill"></i></span>
        <span class="sitename">${esc(NAME)}</span>
      </a>

      <nav id="navmenu" class="navmenu" aria-label="Main">
        <ul>
${nav.map(([href, label, key]) => `          <li><a href="${href}"${key === active ? ' class="active"' : ""}>${label}</a></li>`).join("\n")}
        </ul>
        <i class="mobile-nav-toggle d-xl-none bi bi-list" role="button" tabindex="0" aria-label="Menu"></i>
      </nav>

      <div class="header-cta-row">
        <a href="${SIGN_IN}" class="signin-link d-none d-md-inline-block">Sign in</a>
        <a href="${SIGN_IN}" class="btn-start">Get started</a>
      </div>

    </div>
  </header>

  <main class="main">
${body}
  </main>

  <footer id="footer" class="footer dark-background">
    <div class="container">
      <div class="row gy-5">
        <div class="col-lg-4">
          <div class="footer-content">
            <a href="/welcome" class="logo d-flex align-items-center mb-3">
              <span class="sitename">${esc(NAME)}</span>
            </a>
            <p>Staff, compliance, GDPR and clients for small UK businesses, in one place.</p>
          </div>
        </div>
        <div class="col-lg-2 col-6">
          <div class="footer-links">
            <h4>Product</h4>
            <ul>
              <li><a href="/welcome#modules">Modules</a></li>
              <li><a href="/welcome#how">How it works</a></li>
              <li><a href="/welcome#pricing">Pricing</a></li>
              <li><a href="/welcome#faq">FAQ</a></li>
            </ul>
          </div>
        </div>
        <div class="col-lg-3 col-6">
          <div class="footer-links">
            <h4>Modules</h4>
            <ul>
${MODULES.map((m) => `              <li><a href="/features/${m.slug}">${esc(m.name)}</a></li>`).join("\n")}
            </ul>
          </div>
        </div>
        <div class="col-lg-3">
          <div class="footer-links">
            <h4>Account</h4>
            <ul>
              <li><a href="${SIGN_IN}">Sign in</a></li>
              <li><a href="${SIGN_IN}">Create your business</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container">
        <div class="row align-items-center">
          <div class="col-lg-6">
            <div class="copyright">
              <p>© <strong class="px-1 sitename">${esc(NAME)}</strong> <span>All Rights Reserved</span></p>
            </div>
          </div>
          <div class="col-lg-6">
            <div class="credits">
              Layout template: <a href="https://bootstrapmade.com/">BootstrapMade — Creativo</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>

  <a href="#" id="scroll-top" class="scroll-top d-flex align-items-center justify-content-center" aria-label="Back to top"><i class="bi bi-arrow-up-short"></i></a>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js"></script>
  <script src="/assets/creativo/main.js"></script>
  <script src="/site/site.js"></script>
${extraScript}
</body>

</html>
`;
}

function sectionTitle(h2, p, extra = "") {
  return `      <div class="container section-title" data-aos="fade-up">
        <h2>${h2}</h2>
        <p>${p}</p>${extra}
      </div>`;
}

function faqList(items) {
  return items
    .map(
      ([q, a], i) => `          <div class="faq-item${i === 0 ? " faq-active" : ""}" data-aos="fade-up">
            <h3 class="faq-question" tabindex="0" role="button" aria-expanded="${i === 0}">
              <span class="question-icon"><i class="bi bi-question-circle"></i></span>
              ${esc(q)}
              <span class="toggle-icon"><i class="bi bi-chevron-down"></i></span>
            </h3>
            <div class="faq-answer"><p>${esc(a)}</p></div>
          </div>`
    )
    .join("\n\n");
}

function homePage() {
  const moduleCards = MODULES.map(
    (m, i) => `          <div class="col-md-6 col-lg-4 col-xl-3" data-aos="fade-up" data-aos-delay="${100 + (i % 4) * 50}">
            <a class="service-card module-card" href="/features/${m.slug}">
              <div class="card-header">
                <div class="icon-circle"><i class="bi ${m.icon}"></i></div>
                <span class="service-num">${String(i + 1).padStart(2, "0")}</span>
              </div>
              <div class="card-body">
                <h4>${esc(m.name)}</h4>
                <p>${esc(m.tagline)}</p>
                <p class="module-includes">${m.groups.flatMap((g) => g.items.map(([t]) => t)).slice(0, 5).map(esc).join(" · ")}${m.groups.flatMap((g) => g.items).length > 5 ? " and more" : ""}</p>
                <span class="module-link">What's inside <i class="bi bi-arrow-right"></i></span>
              </div>
            </a>
          </div>`
  ).join("\n\n");

  const priceRows = MODULES.map(
    (m) => `                <label class="calc-row">
                  <input type="checkbox" class="form-check-input calc-module" value="${m.price}"${m.key === "staff_hub" ? " checked" : ""}>
                  <span class="calc-name"><i class="bi ${m.icon}"></i> ${esc(m.name)}</span>
                  <span class="calc-price">${money(m.price)}</span>
                </label>`
  ).join("\n");

  const body = `
    <section id="hero" class="hero section light-background">
      <div class="container">
        <div class="row">
          <div class="col-12" data-aos="fade-down">
            <div class="hero-header">
              <span class="eyebrow">For small UK businesses and their teams</span>
              <h1 class="mt-2">Your staff, compliance and clients.<br>One place, not ten spreadsheets.</h1>
            </div>
          </div>
        </div>
        <div class="row g-4 mt-4 align-items-center">
          <div class="col-lg-7" data-aos="fade-up" data-aos-delay="100">
            <div class="info-block">
              <p class="lead-text">
                ${esc(NAME)} is the back office for a small business. Contracts and policies your team signs online,
                training that tells you before it expires, health and safety records, GDPR, clients and invoices. Switch
                on only the parts you need.
              </p>
              <div class="action-row">
                <a href="${SIGN_IN}" class="btn-get-started">Create your business</a>
                <a href="#modules" class="btn-contact"><i class="bi bi-grid"></i><span>See the modules</span></a>
              </div>
              <p class="hero-fineprint">From <strong>${money(BASE_PRICE)} a month</strong> plus the modules you choose. No passwords for your team to forget.</p>
            </div>
          </div>
          <div class="col-lg-5" data-aos="fade-up" data-aos-delay="200">
            <div class="hero-panel" aria-hidden="true">
              <p class="hero-panel-title">Coming up and overdue</p>
              <ul>
                <li><span><i class="bi bi-mortarboard"></i> First aid certificate expires</span><span class="due overdue">Overdue</span></li>
                <li><span><i class="bi bi-shield-check"></i> Fire alarm test</span><span class="due">In 3 days</span></li>
                <li><span><i class="bi bi-file-earmark-check"></i> Staff Handbook: 2 to sign</span><span class="due">Waiting</span></li>
                <li><span><i class="bi bi-umbrella"></i> Public liability renewal</span><span class="due">In 25 days</span></li>
                <li><span><i class="bi bi-lock"></i> Subject access request due</span><span class="due">In 12 days</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="promises" class="section">
      <div class="container">
        <div class="row g-4">
          <div class="col-md-4" data-aos="fade-up">
            <div class="promise"><span class="promise-big">1</span>
              <p><strong>Login for your whole business.</strong> Owners, managers and staff each see only what their role allows.</p></div>
          </div>
          <div class="col-md-4" data-aos="fade-up" data-aos-delay="100">
            <div class="promise"><span class="promise-big">${MODULES.length}</span>
              <p><strong>Modules to pick from.</strong> Switch them on and off whenever you like. Nothing is deleted when you switch one off.</p></div>
          </div>
          <div class="col-md-4" data-aos="fade-up" data-aos-delay="200">
            <div class="promise"><span class="promise-big">0</span>
              <p><strong>Passwords.</strong> Everyone signs in with a link sent to their email.</p></div>
          </div>
        </div>
      </div>
    </section>

    <section id="why" class="why-us section light-background">
${sectionTitle("Why it helps", "The paperwork that keeps a small business safe, finally in one place.")}
      <div class="container" data-aos="fade-up" data-aos-delay="100">
        <div class="features-grid">
          <div class="grid-item" data-aos="fade-up" data-aos-delay="100">
            <div class="grid-icon"><i class="bi bi-bell"></i></div>
            <div class="grid-content">
              <h5>Nothing quietly expires</h5>
              <p>Training, insurance, MOTs, risk reviews and deadlines all feed one list of what's due, and owners and managers get a short email each morning when something needs doing.</p>
            </div>
          </div>
          <div class="grid-item" data-aos="fade-up" data-aos-delay="150">
            <div class="grid-icon"><i class="bi bi-phone"></i></div>
            <div class="grid-content">
              <h5>Staff do their own bit</h5>
              <p>Your team signs policies and contracts, books holiday, reports sickness and accidents, and submits timesheets from their phone. No more chasing paper.</p>
            </div>
          </div>
          <div class="grid-item" data-aos="fade-up" data-aos-delay="200">
            <div class="grid-icon"><i class="bi bi-clipboard-check"></i></div>
            <div class="grid-content">
              <h5>Ready when someone asks</h5>
              <p>An inspector, insurer or client asks for your records and they're already there: signed policies, training, risk assessments, incident investigations and your GDPR records.</p>
            </div>
          </div>
          <div class="grid-item" data-aos="fade-up" data-aos-delay="250">
            <div class="grid-icon"><i class="bi bi-shield-lock"></i></div>
            <div class="grid-content">
              <h5>Private by design</h5>
              <p>Each business's records are kept apart by the database itself, and confidential things like grievances, safeguarding and pay are only seen by the people who should see them.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="modules" class="services section">
${sectionTitle("The modules", "Start with what you need today. Add the rest later.")}
      <div class="container" data-aos="fade-up" data-aos-delay="100">
        <div class="row g-4">
${moduleCards}

          <div class="col-md-6 col-lg-4 col-xl-3" data-aos="fade-up" data-aos-delay="250">
            <div class="service-card core-card">
              <div class="card-header">
                <div class="icon-circle"><i class="bi bi-house"></i></div>
                <span class="service-num">Core</span>
              </div>
              <div class="card-body">
                <h4>Included with every plan</h4>
                <p>Your team and their roles, a shared overview of what's due, private file storage, email sign-in and a daily reminder email.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="how" class="why-us section light-background">
${sectionTitle("How it works", "Set up in an afternoon.")}
      <div class="container" data-aos="fade-up" data-aos-delay="100">
        <div class="highlight-cards">
          <div class="row g-4">
            <div class="col-lg-4" data-aos="zoom-in" data-aos-delay="100">
              <div class="highlight-card">
                <div class="card-header"><i class="bi bi-building-add"></i><span class="card-badge">Step 1</span></div>
                <h4>Create your business</h4>
                <p>Enter your email, click the link we send you, and give your business a name. You're the owner.</p>
              </div>
            </div>
            <div class="col-lg-4" data-aos="zoom-in" data-aos-delay="200">
              <div class="highlight-card featured">
                <div class="card-header"><i class="bi bi-toggles"></i><span class="card-badge">Step 2</span></div>
                <h4>Switch on your modules</h4>
                <p>Pick the modules you need. Each one adds its own pages to your menu, and you can change your mind at any time.</p>
              </div>
            </div>
            <div class="col-lg-4" data-aos="zoom-in" data-aos-delay="300">
              <div class="highlight-card">
                <div class="card-header"><i class="bi bi-envelope-paper"></i><span class="card-badge">Step 3</span></div>
                <h4>Invite your team</h4>
                <p>Add people by email as staff or managers. They get an invite, sign in with a link, and see only their own records.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="roles mt-5" data-aos="fade-up">
          <h3 class="roles-title">Who sees what</h3>
          <div class="table-responsive">
            <table class="table roles-table align-middle">
              <thead>
                <tr><th scope="col"></th><th scope="col">Owner</th><th scope="col">Manager</th><th scope="col">Staff</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">Switch modules on and off, business settings</th><td><i class="bi bi-check-lg" aria-label="Yes"></i></td><td>–</td><td>–</td></tr>
                <tr><th scope="row">Pay details</th><td><i class="bi bi-check-lg" aria-label="Yes"></i></td><td>–</td><td>–</td></tr>
                <tr><th scope="row">Invite and manage staff</th><td><i class="bi bi-check-lg" aria-label="Yes"></i></td><td><i class="bi bi-check-lg" aria-label="Yes"></i></td><td>–</td></tr>
                <tr><th scope="row">Every register, policy and client record</th><td><i class="bi bi-check-lg" aria-label="Yes"></i></td><td><i class="bi bi-check-lg" aria-label="Yes"></i></td><td>–</td></tr>
                <tr><th scope="row">Their own details, training and documents</th><td><i class="bi bi-check-lg" aria-label="Yes"></i></td><td><i class="bi bi-check-lg" aria-label="Yes"></i></td><td><i class="bi bi-check-lg" aria-label="Yes"></i></td></tr>
                <tr><th scope="row">Sign policies, book holiday, report an incident</th><td><i class="bi bi-check-lg" aria-label="Yes"></i></td><td><i class="bi bi-check-lg" aria-label="Yes"></i></td><td><i class="bi bi-check-lg" aria-label="Yes"></i></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <section id="pricing" class="pricing section">
${sectionTitle("Pricing", "Pay for the modules you use. Nothing else.", `
        <p class="demo-note">Example prices while we're in early access.</p>`)}
      <div class="container" data-aos="fade-up" data-aos-delay="100">
        <div class="row g-4 justify-content-center">
          <div class="col-lg-6 col-md-9">
            <div class="pricing-card highlighted">
              <div class="card-header">
                <span class="plan-icon"><i class="bi bi-calculator"></i></span>
                <h3 class="plan-title">Build your plan</h3>
                <p class="plan-subtitle">Tick the modules you want</p>
              </div>
              <div class="card-body">
                <div class="price-wrapper">
                  <span class="currency">£</span>
                  <span class="amount" id="calc-total" aria-live="polite">${BASE_PRICE + MODULES[0].price}</span>
                  <span class="period">/month</span>
                </div>
                <p class="billing-info">Includes the <strong>${money(BASE_PRICE)} base subscription</strong> every business pays.</p>
                <div class="calc" id="calc" data-base="${BASE_PRICE}">
${priceRows}
                </div>
                <a href="${SIGN_IN}" class="btn-pricing">Get started</a>
                <p class="calc-note">Switch modules on and off whenever you like.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="faq" class="faq section light-background">
${sectionTitle("Questions", "The things people usually ask first.")}
      <div class="container" data-aos="fade-up" data-aos-delay="100">
        <div class="faq-list">
${faqList(FAQ)}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="row">
          <div class="col-lg-8 offset-lg-2" data-aos="fade-up">
            <div class="cta-banner">
              <div class="cta-content">
                <h3>Get your paperwork out of the drawer and into one place.</h3>
                <p>Create your business in a couple of minutes and switch on Staff Hub to start.</p>
              </div>
              <div class="cta-actions">
                <a href="${SIGN_IN}" class="btn-cta-primary">Create your business</a>
                <a href="#modules" class="btn-cta-secondary">See the modules</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
`;
  return page({
    title: `${NAME} | Staff, compliance and clients for small businesses`,
    description: `The back office for small UK businesses: staff records, contracts and policies signed online, training, health and safety, GDPR, clients and invoices. From ${money(BASE_PRICE)} a month.`,
    body,
    active: "home",
  });
}

function modulePage(m, i) {
  const prev = MODULES[(i + MODULES.length - 1) % MODULES.length];
  const next = MODULES[(i + 1) % MODULES.length];
  const groups = m.groups
    .map(
      (g, gi) => `        <div class="feature-group" data-aos="fade-up" data-aos-delay="${50 * gi}">
          <h3 class="feature-group-title"><i class="bi ${g.icon}"></i> ${esc(g.title)}</h3>
          <div class="row g-4">
${g.items
  .map(
    ([t, d]) => `            <div class="col-md-6 col-lg-4">
              <div class="feature-box">
                <h4>${esc(t)}</h4>
                <p>${esc(d)}</p>
              </div>
            </div>`
  )
  .join("\n")}
          </div>
        </div>`
    )
    .join("\n\n");

  const staff = m.staffCan.length
    ? `<ul class="check-list">${m.staffCan.map((s) => `<li><i class="bi bi-check-circle-fill"></i> ${esc(s)}</li>`).join("")}</ul>`
    : `<p>This module is for owners and managers. Staff don't see it.</p>`;

  const body = `
    <section class="module-hero section light-background">
      <div class="container" data-aos="fade-up">
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <ol>
            <li><a href="/welcome">Home</a></li>
            <li><a href="/welcome#modules">Modules</a></li>
            <li aria-current="page">${esc(m.name)}</li>
          </ol>
        </nav>
        <div class="row align-items-center g-4 mt-1">
          <div class="col-lg-8">
            <span class="module-hero-icon"><i class="bi ${m.icon}"></i></span>
            <h1>${esc(m.name)}</h1>
            <p class="module-hero-tagline">${esc(m.tagline)}</p>
            <p class="module-hero-summary">${esc(m.summary)}</p>
          </div>
          <div class="col-lg-4">
            <div class="module-price-card">
              <p class="module-price"><span>${money(m.price)}</span> a month</p>
              <p class="module-price-note">on top of the ${money(BASE_PRICE)} base subscription. Example price.</p>
              <a href="${SIGN_IN}" class="btn-get-started w-100 text-center">Get started</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section module-features">
${sectionTitle("What's inside", "Grouped by the job you're trying to get done.")}
      <div class="container">
${groups}
      </div>
    </section>

    <section class="section light-background">
      <div class="container">
        <div class="row g-4">
          <div class="col-lg-6" data-aos="fade-up">
            <div class="info-panel">
              <h3><i class="bi bi-person-badge"></i> What your staff can do</h3>
              ${staff}
            </div>
          </div>
          <div class="col-lg-6" data-aos="fade-up" data-aos-delay="100">
            <div class="info-panel">
              <h3><i class="bi bi-bell"></i> Reminders</h3>
              <p>Every date in this module that matters, like reviews, renewals and expiry dates, appears on your overview when it's due in the next 30 days or overdue, and in the morning reminder email to owners and managers.</p>
            </div>
          </div>
        </div>

        <div class="module-pager" data-aos="fade-up">
          <a href="/features/${prev.slug}"><i class="bi bi-arrow-left"></i> ${esc(prev.name)}</a>
          <a href="/welcome#modules">All modules</a>
          <a href="/features/${next.slug}">${esc(next.name)} <i class="bi bi-arrow-right"></i></a>
        </div>
      </div>
    </section>
`;
  return page({
    title: `${m.name} | ${NAME}`,
    description: `${m.tagline} ${m.summary}`,
    body,
    active: "modules",
  });
}

function write(path, html) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, html);
  console.log(`wrote public/${path}`);
}

write("welcome.html", homePage());
MODULES.forEach((m, i) => write(`features/${m.slug}.html`, modulePage(m, i)));
