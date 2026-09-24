import User from "../models/User.js";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const FONT = "Arial, Helvetica, sans-serif";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const siteUrl = () =>
  (process.env.RENDER_EXTERNAL_URL || process.env.SITE_URL || "http://localhost:5000").replace(/\/+$/, "");

const getLogoUrl = () => process.env.BREVO_LOGO_URL || `${siteUrl()}/Logo.png`;

export async function getAdminEmails() {
  const emails = new Set();
  (process.env.ADMIN_NOTIFY_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .forEach((e) => emails.add(e));
  try {
    const admins = await User.find({ role: "admin" }).select("email").lean();
    admins.forEach((u) => emails.add(String(u.email).toLowerCase()));
  } catch {
    /* ignore */
  }
  return [...emails];
}

export async function sendMail({ to, subject, html, replyTo }) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName = process.env.BREVO_FROM_NAME || "Digital Technology Skills";
  if (!apiKey || !fromEmail || !to) {
    console.warn("[mailer] Brevo not configured; skipping email to", to);
    return null;
  }
  const payload = {
    sender: { email: fromEmail, name: fromName },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    replyTo: { email: replyTo || fromEmail, name: fromName },
  };
  try {
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[mailer] Brevo error", res.status, text);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error("[mailer] Failed to send email:", error.message);
    return null;
  }
}

const formatDate = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
};

const logoImage = () => `
  <img src="${getLogoUrl()}" alt="Digital Technology Skills - UR-Huye Campus" width="46" height="46" style="display:block;width:46px;height:46px;border:0;outline:none;text-decoration:none;" />`;

const brandHeader = () => `
  <tr>
    <td class="brand-pad" style="background:#ffffff;padding:20px 32px;border-bottom:1px solid #eef1f6;border-radius:12px 12px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="left" valign="middle">${logoImage()}</td>
          <td width="14">&nbsp;</td>
          <td align="left" valign="middle" width="100%">
            <div style="font-family:${FONT};font-size:16px;color:#142851;font-weight:800;line-height:1.2;">Digital Technology Skills</div>
            <div style="font-family:${FONT};font-size:10px;color:#61708a;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-top:3px;">UR-Huye Campus &bull; Rwanda</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;

const heroBadge = (label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
    <tr>
      <td style="background:#ffffff;border-radius:999px;padding:7px 16px;">
        <span style="font-family:${FONT};font-size:11px;color:#142851;font-weight:800;letter-spacing:0.08em;">${escapeHtml(label)}</span>
      </td>
    </tr>
  </table>`;

const heroBand = (heading, badgeHtml) => `
  <tr>
    <td class="hero-pad" style="background:#142851;padding:26px 32px;">
      <div style="font-family:${FONT};font-size:22px;line-height:1.2;color:#ffffff;font-weight:800;letter-spacing:0.02em;">${escapeHtml(heading)}</div>
      ${badgeHtml || ""}
    </td>
  </tr>`;

const sectionLabel = (text) => `
  <div style="font-family:${FONT};font-size:12px;color:#5b6b84;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;margin:26px 0 8px;">${escapeHtml(text)}</div>`;

const detailCard = (title, rows) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;border:1px solid #e5eaf2;border-radius:10px;">
    <tr>
      <td style="background:#f3f6fb;padding:10px 16px;font-family:${FONT};font-size:11px;color:#142851;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;border-bottom:1px solid #e5eaf2;border-radius:10px 10px 0 0;">${escapeHtml(title)}</td>
    </tr>
    ${rows
      .filter(([, value]) => value)
      .map(
        ([label, value], index) => `
      <tr>
        <td style="padding:0 16px;border-bottom:${index === rows.filter(([, v]) => v).length - 1 ? "0" : "1px solid #eef2f7"};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="40%" valign="top" style="padding:11px 12px 11px 0;font-family:${FONT};font-size:12px;color:#64748b;font-weight:600;">${escapeHtml(label)}</td>
              <td valign="top" style="padding:11px 0;font-family:${FONT};font-size:13px;color:#1a202c;font-weight:600;line-height:1.55;">${value}</td>
            </tr>
          </table>
        </td>
      </tr>`
      )
      .join("")}
  </table>`;

const statusPill = (text) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 0;">
    <tr>
      <td style="background:#eaf3ff;border:1px solid #cfdff7;border-radius:999px;padding:9px 16px;">
        <span style="font-family:${FONT};font-size:13px;color:#1a5fb4;font-weight:700;">${escapeHtml(text)}</span>
      </td>
    </tr>
  </table>`;

const stepsList = (steps) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 4px;">
    ${steps
      .map(
        (step, index) => `
      <tr>
        <td width="40" valign="top" style="padding:0 0 18px;">
          <div style="width:28px;height:28px;line-height:28px;border-radius:50%;background:#142851;color:#ffffff;font-family:${FONT};font-size:13px;font-weight:700;text-align:center;">${index + 1}</div>
        </td>
        <td valign="top" style="padding:0 0 18px 12px;">
          <div style="font-family:${FONT};font-size:14px;color:#1a202c;font-weight:700;line-height:1.4;">${escapeHtml(step.title)}</div>
          <div style="font-family:${FONT};font-size:13px;color:#4b5563;line-height:1.6;margin-top:2px;">${escapeHtml(step.text)}</div>
        </td>
      </tr>`
      )
      .join("")}
  </table>`;

const ctaButton = (label, href) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 4px;">
    <tr>
      <td style="border-radius:8px;background:#1a7fd4;">
        <a href="${href}" target="_blank" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:14px;color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;

const credentialsCard = (regNumber, pin) => `
  ${sectionLabel("Your DTS Profile Access")}
  ${detailCard("Your Credentials — Keep Them Safe", [
    ["Registration Number", `<strong style="font-size:15px;color:#142851;">${escapeHtml(regNumber)}</strong>`],
    ["Profile PIN", `<strong style="font-size:15px;color:#142851;">${escapeHtml(pin)}</strong>`],
  ])}
  <p style="font-family:${FONT};font-size:13px;line-height:1.65;color:#64748b;margin:10px 0 0;">Use your Registration Number and PIN to log in to your DTS student profile and check your application status, intake details, and results. Do not share your PIN with anyone.</p>
  ${ctaButton("View My Profile", `${siteUrl()}/profile`)}`;

const footerBand = () => {
  const fromEmail = process.env.BREVO_FROM_EMAIL || "";
  return `
  <tr>
    <td class="foot-pad" style="background:#0f1f3d;padding:24px 32px;text-align:center;">
      <div style="font-family:${FONT};font-size:15px;color:#ffffff;font-weight:800;">Digital Technology Skills</div>
      <div style="font-family:${FONT};font-size:11px;color:#b6c3d9;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;margin-top:4px;">UR-Huye Campus &bull; Rwanda</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:16px auto 0;">
        <tr>
          <td style="padding:0 10px;"><a href="${siteUrl()}" target="_blank" style="font-family:${FONT};font-size:12px;color:#7dd3fc;text-decoration:none;font-weight:600;">Website</a></td>
          ${fromEmail ? `<td style="padding:0 10px;border-left:1px solid #33415e;"><a href="mailto:${escapeHtml(fromEmail)}" style="font-family:${FONT};font-size:12px;color:#7dd3fc;text-decoration:none;font-weight:600;">${escapeHtml(fromEmail)}</a></td>` : ""}
        </tr>
      </table>
      <div style="border-top:1px solid #26344f;margin:16px 0 0;height:0;font-size:0;line-height:0;">&nbsp;</div>
      <div style="font-family:${FONT};font-size:11px;color:#8fa2c0;line-height:1.6;margin-top:10px;">
        This is an automated application confirmation email.<br>
        Copyright &copy; 2026 Digital Technology Skills. All rights reserved.
      </div>
    </td>
  </tr>`;
};

const layout = ({ heading, heroLabel = "", body }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(heading)}</title>
  <style>
    @media only screen and (max-width:620px) {
      .brand-pad, .foot-pad { padding: 18px 20px !important; }
      .hero-pad { padding: 22px 20px !important; }
      .body-pad { padding: 22px 20px !important; }
      .wrap { width: 100% !important; max-width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:${FONT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6fa;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" class="wrap" style="width:640px;max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5eaf2;box-shadow:0 8px 24px rgba(16,42,84,0.06);">
          ${brandHeader()}
          ${heroBand(heading, heroLabel ? heroBadge(heroLabel) : "")}
          <tr>
            <td class="body-pad" style="padding:28px 32px;">${body}</td>
          </tr>
          ${footerBand()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const getCourses = (application) =>
  Array.isArray(application.preferredCourses) && application.preferredCourses.length
    ? application.preferredCourses.join(", ")
    : application.program;

const NEXT_STEPS = [
  { title: "Application Review", text: "Our team will review applications before the application deadline." },
  { title: "Application Outcome", text: "You will receive an email confirming the outcome of your application." },
  { title: "Orientation & Training", text: "If accepted, you will receive details about orientation and the training schedule." },
];

export async function sendApplicationConfirmation(application, intake, credentials) {
  const intakeTitle = intake?.title || application.intakeTitle;
  const level = intake?.program || application.program;
  const body = `
    <p style="font-family:${FONT};font-size:15px;line-height:1.6;color:#1a202c;margin:0 0 14px;">Hello <strong style="color:#142851;">${escapeHtml(application.name)}</strong>,</p>
    <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:0 0 4px;">Thank you for applying to <strong style="color:#142851;">${escapeHtml(intakeTitle)}</strong>.</p>
    <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:0;">Your application has been successfully received and is currently under review by the DTS admissions team.</p>
    ${detailCard("Application Details", [
      ["Application", escapeHtml(intakeTitle)],
      ["Level", escapeHtml(level)],
      ["Preferred course", escapeHtml(getCourses(application))],
      ["Submitted on", formatDate(application.createdAt)],
    ])}
    ${statusPill("Application status: Pending Review")}
    ${credentials ? credentialsCard(credentials.regNumber, credentials.pin) : ""}
    ${sectionLabel("What Happens Next?")}
    ${stepsList(NEXT_STEPS)}
    <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:18px 0 0;">If you have any questions about your application, our team is here to help &mdash; simply reply to this email.</p>
    <p style="font-family:${FONT};font-size:14px;line-height:1.6;color:#1a202c;margin:16px 0 0;">Best regards,<br><strong style="color:#142851;">The DTS Admissions Team</strong></p>
  `;
  return sendMail({
    to: application.email,
    subject: `Application received - ${intakeTitle}`,
    html: layout({ heading: "Application Received", heroLabel: "Pending Review", body }),
  });
}

export async function sendApplicationStatusChange(application, student) {
  const status = String(application.status || "").toLowerCase();
  const intakeTitle = application.intakeTitle || "the intake";
  let heading;
  let heroLabel;
  let body;

  if (status === "accepted") {
    heading = "You are Accepted!";
    heroLabel = "Accepted";
    body = `
      <p style="font-family:${FONT};font-size:15px;line-height:1.6;color:#1a202c;margin:0 0 14px;">Hello <strong style="color:#142851;">${escapeHtml(application.name)}</strong>,</p>
      <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:0;">Congratulations! We are pleased to inform you that you have been <strong style="color:#142851;">accepted</strong> into <strong style="color:#142851;">${escapeHtml(intakeTitle)}</strong>.</p>
      ${student ? detailCard("Your DTS Registration", [
        ["Registration Number", `<strong style="color:#142851;">${escapeHtml(student.regNumber)}</strong>`],
      ]) : ""}
      ${student ? ctaButton("View My Profile", `${siteUrl()}/profile`) : ""}
      ${sectionLabel("What Happens Next?")}
      ${stepsList([...NEXT_STEPS])}
      <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:18px 0 0;">We look forward to welcoming you. If you have any questions before orientation, simply reply to this email.</p>
      <p style="font-family:${FONT};font-size:14px;line-height:1.6;color:#1a202c;margin:16px 0 0;">Best regards,<br><strong style="color:#142851;">The DTS Admissions Team</strong></p>
    `;
  } else if (status === "rejected") {
    heading = "Update on Your Application";
    heroLabel = "Not Selected";
    body = `
      <p style="font-family:${FONT};font-size:15px;line-height:1.6;color:#1a202c;margin:0 0 14px;">Hello <strong style="color:#142851;">${escapeHtml(application.name)}</strong>,</p>
      <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:0;">Thank you for applying to <strong style="color:#142851;">${escapeHtml(intakeTitle)}</strong>. After careful review, we are sorry to inform you that you were not selected for this intake.</p>
      <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:14px 0 0;">Spots are limited and we receive many strong applications. We encourage you to keep building your skills and to apply again for a future intake.</p>
      <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:14px 0 0;">Please do not hesitate to contact us if you have any questions about future opportunities.</p>
      <p style="font-family:${FONT};font-size:14px;line-height:1.6;color:#1a202c;margin:16px 0 0;">Best regards,<br><strong style="color:#142851;">The DTS Admissions Team</strong></p>
    `;
  } else {
    heading = "Application Update";
    heroLabel = status;
    body = `
      <p style="font-family:${FONT};font-size:15px;line-height:1.6;color:#1a202c;margin:0 0 14px;">Hello <strong style="color:#142851;">${escapeHtml(application.name)}</strong>,</p>
      <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:0;">There has been an update to your application for <strong style="color:#142851;">${escapeHtml(intakeTitle)}</strong>. Your application status is now marked as <strong style="color:#142851;">${escapeHtml(status)}</strong>.</p>
      <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:14px 0 0;">Our team will continue processing your application and reach out if any further information is needed.</p>
      <p style="font-family:${FONT};font-size:14px;line-height:1.6;color:#1a202c;margin:16px 0 0;">Best regards,<br><strong style="color:#142851;">The DTS Admissions Team</strong></p>
    `;
  }

  return sendMail({
    to: application.email,
    subject: `${heading} - ${intakeTitle}`,
    html: layout({ heading, heroLabel, body }),
  });
}

export async function notifyAdminsNewApplication(application, intake) {
  const intakeTitle = intake?.title || application.intakeTitle;
  const body = `
    <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:0;">A new application has just been submitted on the DTS website.</p>
    ${detailCard("Application Details", [
      ["Intake", escapeHtml(intakeTitle)],
      ["Name", escapeHtml(application.name)],
      ["Email", escapeHtml(application.email)],
      ["Phone", escapeHtml(application.phone)],
      ["Campus", escapeHtml(application.campus)],
      ["Preferred course", escapeHtml(getCourses(application))],
      ["Motivation", escapeHtml(application.motivation)],
      ["Submitted on", formatDate(application.createdAt)],
    ])}
    <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:14px 0 0;">Review this application in the admin dashboard.</p>
    ${ctaButton("Review Applications", `${siteUrl()}/admin/applications`)}
  `;
  const emails = await getAdminEmails();
  return Promise.all(
    emails.map((to) =>
      sendMail({
        to,
        subject: `New application - ${application.name} (${intakeTitle})`,
        html: layout({ heading: "New Application", body }),
      })
    )
  );
}

export async function notifyAdminsNewMessage(message) {
  const body = `
    <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:0;">A new contact message has been submitted on the DTS website.</p>
    ${detailCard("Message Details", [
      ["Subject", escapeHtml(message.subject)],
      ["Name", escapeHtml(message.name)],
      ["Email", escapeHtml(message.email)],
      ["Phone", escapeHtml(message.phone)],
      ["Message", escapeHtml(message.message)],
      ["Received on", formatDate(message.createdAt)],
    ])}
    <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:14px 0 0;">Open the admin dashboard to read the full message and reply.</p>
    ${ctaButton("View Messages", `${siteUrl()}/admin/messages`)}
  `;
  const emails = await getAdminEmails();
  return Promise.all(
    emails.map((to) =>
      sendMail({
        to,
        subject: `New contact message - ${message.subject}`,
        html: layout({ heading: "New Contact Message", body }),
      })
    )
  );
}

export async function sendStudentCredentials(student, { pin, intakeTitle } = {}) {
  const title = intakeTitle || student.intakeTitle || "the intake";
  const body = `
    <p style="font-family:${FONT};font-size:15px;line-height:1.6;color:#1a202c;margin:0 0 14px;">Hello <strong style="color:#142851;">${escapeHtml(student.name)}</strong>,</p>
    <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:0;">Here are your DTS profile credentials for <strong style="color:#142851;">${escapeHtml(title)}</strong>. Use them to sign in to your student profile and check your application status, intake details, and results.</p>
    ${credentialsCard(student.regNumber, pin)}
    <p style="font-family:${FONT};font-size:13px;line-height:1.65;color:#64748b;margin:16px 0 0;">For your security, do not share your PIN with anyone. DTS staff will never ask you for your PIN.</p>
    <p style="font-family:${FONT};font-size:14px;line-height:1.6;color:#1a202c;margin:16px 0 0;">Best regards,<br><strong style="color:#142851;">The DTS Team</strong></p>
  `;
  return sendMail({
    to: student.email,
    subject: `Your DTS credentials - ${student.regNumber}`,
    html: layout({ heading: "Your DTS Credentials", heroLabel: "Student Profile", body }),
  });
}

export async function notifyAdminsNewTestimonial(testimonial) {
  const body = `
    <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:0;">A new testimonial has been submitted on the DTS website and is waiting for approval.</p>
    ${detailCard("Testimonial Details", [
      ["Name", escapeHtml(testimonial.name)],
      ["Role", escapeHtml(testimonial.role)],
      ["Rating", `${escapeHtml(String(Number(testimonial.rating) || 0))} / 5`],
      ["Content", escapeHtml(testimonial.content)],
      ["Received on", formatDate(testimonial.createdAt)],
    ])}
    <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:#374151;margin:14px 0 0;">Open the admin dashboard to review and approve this testimonial.</p>
    ${ctaButton("Review Testimonials", `${siteUrl()}/admin/testimonials`)}
  `;
  const emails = await getAdminEmails();
  return Promise.all(
    emails.map((to) =>
      sendMail({
        to,
        subject: "New testimonial awaiting approval",
        html: layout({ heading: "New Testimonial", body }),
      })
    )
  );
}