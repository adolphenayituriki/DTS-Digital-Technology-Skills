import React, { useRef, useState, useCallback, forwardRef, useEffect } from 'react';

/**
 * DTS course completion appreciation.
 *
 * One card per COMPLETED COURSE, not one per programme. A student who finishes
 * Computer Maintenance, Hardware Engineering and Networking gets three cards,
 * each naming the course it is for. It is an appreciation of finishing a
 * single course, so it never claims the whole programme is done.
 *
 * Release condition: the trainer signed that specific course off in
 * `completedCourses`. Profile.jsx lists one card per signed-off course, and the
 * server is the authority on that list.
 *
 * Rendered at a fixed size matching the aspect ratio of
 * client/public/certificate templete/Certificate template.jpeg (480x345 =
 * 1.3913) so the print template and the digital card line up.
 */
const CARD_WIDTH = 1200;
const CARD_HEIGHT = Math.round((CARD_WIDTH * 345) / 480); // 863

/**
 * Layout of the two halves.
 *
 * The header is navy and stops on a curve that dips `CURVE` pixels at the
 * centre; everything below that curve is white. The curve is what makes the
 * division read as designed rather than as a seam between two stacked blocks.
 */
const HEADER_EDGE = 380; // where the navy meets white at the left and right edges
const CURVE = 108; // how far the curve dips at the centre
const HEADER_CONTENT = 366; // height reserved for the header text
const BODY_TOP_GAP = 132; // clears the lowest point of the curve

const INK = "#1e2733"; // near-black, not black: brand names and body text
const INK_SOFT = "#5b6b84"; // secondary text on the white halves
const GREEN = "#15803d"; // brand green, used for the small uppercase labels
const GREEN_RULE = "rgba(21,128,61,0.45)";
const GOLD_LIGHT = "#f2d98f"; // emblem and the appreciation title on navy

export const DTS_LOGO_SRC = "/Logo.png";
export const UR_LOGO_SRC = "/ur%20logo.jpg";

/**
 * A logo on its own circular tile.
 *
 * Both brand files are opaque JPEGs with their background baked in, so they are
 * clipped to the circle rather than letterboxed: a rectangular image with
 * `contain` would leave white corners showing inside the ring. The tinted
 * border gives the tile a visible edge even when the file's own background is
 * plain white.
 */
function LogoTile({ src, alt, size = 68 }) {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        padding: "4px",
        boxSizing: "border-box",
        borderRadius: "50%",
        background: "#ffffff",
        border: "2px solid rgba(21,128,61,0.32)",
      }}
    >
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
      />
    </div>
  );
}

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "";

/**
 * How the training was delivered, for the card to name.
 *
 * Delivery is taken from the learning place captured at application, with the
 * campus as a weaker fallback. An online student is never credited with a
 * physical campus, because the two are different claims.
 */
const DELIVERY = {
  online: { programme: "Online Programme", mode: "Delivered Online" },
  campus: { programme: "On-Campus Programme", mode: "On Campus" },
};

const deliveryFor = (student) => {
  const place = String(student?.learningPlace || "").trim();
  if (/online/i.test(place)) return DELIVERY.online;
  if (/physical|campus|huye/i.test(place)) return DELIVERY.campus;
  const campus = String(student?.campus || "").trim();
  if (campus) return { ...DELIVERY.campus, mode: `On Campus · ${campus}` };
  return null;
};

/**
 * A stable reference printed on the card so a paper copy can be traced back to
 * the exact record it came from. Derived from the student's own id, so it
 * needs no new field and cannot drift from the data.
 */
const referenceFor = (student) => {
  if (!student?._id) return "";
  return `DTS-${String(student._id).replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`;
};

/**
 * Shrink a headline as its text gets longer.
 *
 * The card is a fixed-size box, so a long value used to wrap onto extra lines
 * and get silently clipped off the bottom. Stepping the size down keeps long
 * values fully visible instead.
 */
const autoSize = (text, base, min, roomyChars) => {
  const length = String(text || "").trim().length;
  if (length <= roomyChars) return base;
  return Math.max(min, base - Math.ceil((length - roomyChars) / 8) * 4);
};

const matchesCourse = (value, courseKey) =>
  String(value || "").trim().toLowerCase() === courseKey;

/**
 * The gold appreciation emblem: a ribboned medallion with a star struck into
 * it. Built from ordinary elements and a clip-path star rather than an inline
 * SVG, so it needs no gradient ids and survives the PNG export unchanged.
 */
function AppreciationMedal({ size = 88 }) {
  const disc = size * 0.78;
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {/* Tails first so the disc paints over their tops. Centred on the disc
          with flex, otherwise the two tails drift off to one side. */}
      <div
        style={{
          position: "absolute",
          top: disc * 0.6,
          left: 0,
          width: disc,
          height: size - disc * 0.6,
          display: "flex",
          justifyContent: "center",
          gap: size * 0.05,
        }}
      >
        {[-1, 1].map((side) => (
          <div
            key={side}
            style={{
              width: size * 0.17,
              height: "100%",
              borderRadius: "3px",
              background: "linear-gradient(180deg, #f2d98f 0%, #d8ab3c 55%, #a97c1c 100%)",
              transform: `rotate(${side * 13}deg)`,
              boxShadow: "0 4px 10px rgba(0,0,0,0.28)",
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: disc,
          height: disc,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background:
            "linear-gradient(145deg, #fdf4d6 0%, #eccb74 40%, #c99a2e 72%, #9d7115 100%)",
          boxShadow:
            "0 10px 22px rgba(0,0,0,0.34), inset 0 2px 6px rgba(255,255,255,0.7), inset 0 -4px 8px rgba(120,80,10,0.38)",
        }}
      >
        <div
          style={{
            width: "70%",
            height: "70%",
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.6)",
            background: "rgba(255,255,255,0.16)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            style={{
              width: "62%",
              height: "62%",
              background: "#ffffff",
              clipPath:
                "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

const Certificate = forwardRef(function Certificate(
  { student, intakeTitle, course, previewScale = 1 },
  ref
) {
  const fullName = String(student?.name || "Student").trim();
  const delivery = deliveryFor(student);
  const reference = referenceFor(student);
  const courseName = String(course || "").trim();
  const courseKey = courseName.toLowerCase();
  const nameSize = autoSize(fullName, 54, 32, 22);
  const courseSize = autoSize(courseName, 40, 25, 30);

  const marks = Array.isArray(student?.marks) ? student.marks : [];
  const completions = Array.isArray(student?.completedCourses) ? student.completedCourses : [];
  const completion = completions.find((entry) => matchesCourse(entry?.course, courseKey));

  // The date and the average both belong to THIS course. Reading them off the
  // whole student would put another course's mark on this card.
  const completedOn = (() => {
    if (completion?.completedAt) return completion.completedAt;
    const dates = marks
      .filter((m) => matchesCourse(m?.course, courseKey))
      .map((m) => m.completedAt)
      .filter(Boolean)
      .map((d) => new Date(d).getTime());
    return dates.length ? new Date(Math.max(...dates)) : null;
  })();
  const avgScore = (() => {
    const scored = marks.filter((m) => matchesCourse(m?.course, courseKey) && m.score != null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, m) => sum + Number(m.score), 0) / scored.length);
  })();

  // Programme, delivery and this course's average, as one quiet line under the
  // course name so the course itself stays the loudest thing on the card.
  const facts = [intakeTitle, delivery?.mode, avgScore != null ? `Average ${avgScore}%` : null]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  const columns = [
    { value: student?.regNumber || "—", label: "Registration number" },
    { value: completedOn ? fmtDate(completedOn) : "—", label: "Date completed" },
    { value: reference || "DTS", label: "Reference" },
  ];
  const signedBy = String(completion?.recordedBy || "").trim();
  if (signedBy) columns.push({ value: signedBy, label: "Signed off by" });

  return (
    <div
      style={{
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        transform: `scale(${previewScale})`,
        transformOrigin: "top left",
      }}
    >
      <div
        ref={ref}
        style={{
          width: `${CARD_WIDTH}px`,
          height: `${CARD_HEIGHT}px`,
          position: "relative",
          overflow: "hidden",
          background: "#ffffff",
          fontFamily: "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
          color: INK,
        }}
      >
        {/* Navy header, closed on a curve that dips at the centre, with a gold
            rule tracing that same curve. */}
        <svg
          width={CARD_WIDTH}
          height={HEADER_EDGE + CURVE}
          viewBox={`0 0 ${CARD_WIDTH} ${HEADER_EDGE + CURVE}`}
          style={{ position: "absolute", top: 0, left: 0, display: "block" }}
        >
          <defs>
            <linearGradient id="dtsAppreciationHeader" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0c1c40" />
              <stop offset="44%" stopColor="#123059" />
              <stop offset="74%" stopColor="#164470" />
              <stop offset="100%" stopColor="#155a86" />
            </linearGradient>
          </defs>
          <path
            d={`M 0 0 H ${CARD_WIDTH} V ${HEADER_EDGE} A ${CARD_WIDTH / 2} ${CURVE} 0 0 1 0 ${HEADER_EDGE} Z`}
            fill="url(#dtsAppreciationHeader)"
          />
          <path
            d={`M 0 ${HEADER_EDGE} A ${CARD_WIDTH / 2} ${CURVE} 0 0 0 ${CARD_WIDTH} ${HEADER_EDGE}`}
            fill="none"
            stroke="rgba(242,217,143,0.6)"
            strokeWidth="3"
          />
        </svg>
        {/* Warm highlight instead of the green glow the old card used. */}
        <div
          style={{
            position: "absolute",
            top: "-210px",
            right: "-170px",
            width: "640px",
            height: "640px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(236,203,116,0.20) 0%, rgba(236,203,116,0) 70%)",
          }}
        />

        <div
          style={{
            position: "relative",
            height: `${HEADER_CONTENT}px`,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "28px 56px 0",
          }}
        >
          {/* The branding sits on its own white panel inside the navy header.
              On navy the small grey-white labels were the least legible thing on
              the card; on white they are near-black and green, which is as clear
              as text gets. */}
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "22px",
              padding: "12px 20px",
              boxSizing: "border-box",
              borderRadius: "16px",
              background: "#ffffff",
              border: "1px solid rgba(18,48,89,0.18)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.24)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
              <LogoTile src={DTS_LOGO_SRC} alt="Digital Technology Skills logo" />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "23px",
                    fontWeight: 800,
                    letterSpacing: "0.2px",
                    color: INK,
                    lineHeight: 1.15,
                  }}
                >
                  Digital Technology Skills
                </div>
                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    letterSpacing: "1.6px",
                    color: GREEN,
                    textTransform: "uppercase",
                  }}
                >
                  {delivery ? delivery.programme : "DTS"}
                </div>
              </div>
            </div>

            <div
              style={{ flex: "0 0 auto", width: "1px", alignSelf: "stretch", background: "rgba(18,48,89,0.16)" }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "20px", fontWeight: 800, color: INK, lineHeight: 1.15 }}>
                  University of Rwanda
                </div>
                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    letterSpacing: "1.6px",
                    color: GREEN,
                    textTransform: "uppercase",
                  }}
                >
                  Partner Institution
                </div>
              </div>
              <LogoTile src={UR_LOGO_SRC} alt="University of Rwanda logo" />
            </div>
          </div>

          <div style={{ marginTop: "14px" }}>
            <AppreciationMedal size={74} />
          </div>

          <div
            style={{
              marginTop: "12px",
              fontSize: "21px",
              letterSpacing: "5px",
              textTransform: "uppercase",
              fontWeight: 700,
              color: GOLD_LIGHT,
              textAlign: "center",
            }}
          >
            Course Completion Appreciation
          </div>

          <div style={{ marginTop: "12px", fontSize: "17px", color: "rgba(255,255,255,0.88)" }}>
            This appreciation is presented to
          </div>

          <div
            style={{
              marginTop: "6px",
              padding: "0 40px 9px",
              borderBottom: "2px solid rgba(242,217,143,0.7)",
              fontSize: `${nameSize}px`,
              fontWeight: 800,
              lineHeight: 1.12,
              color: "#ffffff",
              textAlign: "center",
              textShadow: "0 2px 14px rgba(0,0,0,0.28)",
            }}
          >
            {fullName}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            height: `${CARD_HEIGHT - HEADER_CONTENT}px`,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "0 56px 24px",
          }}
        >
          <div style={{ marginTop: `${BODY_TOP_GAP}px`, fontSize: "20px", color: INK_SOFT }}>
            for successfully completing the course
          </div>

          <div
            style={{
              marginTop: "10px",
              paddingBottom: "10px",
              borderBottom: `3px solid ${GREEN}`,
              fontSize: `${courseSize}px`,
              fontWeight: 800,
              lineHeight: 1.18,
              color: INK,
              textAlign: "center",
              maxWidth: "1020px",
            }}
          >
            {courseName || "Course"}
          </div>

          {facts.length ? (
            <div
              style={{
                marginTop: "13px",
                fontSize: "15px",
                color: INK_SOFT,
                letterSpacing: "0.3px",
                textAlign: "center",
              }}
            >
              {facts.join("  ·  ")}
            </div>
          ) : null}

          <div
            style={{
              marginTop: "auto",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              width: "100%",
              gap: "28px",
            }}
          >
            {columns.map((column) => (
              <div key={column.label} style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    borderTop: `2px solid ${GREEN_RULE}`,
                    paddingTop: "8px",
                    fontSize: "15px",
                    fontWeight: 600,
                    color: INK,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {column.value}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: GREEN,
                    marginTop: "4px",
                    textTransform: "uppercase",
                    letterSpacing: "1.1px",
                  }}
                >
                  {column.label}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "20px",
              fontSize: "12.5px",
              color: INK_SOFT,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Issued by Digital Technology Skills in partnership with the University of Rwanda.
            <br />
            This card appreciates the course named above only. It is not a certificate of programme completion.
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Preview lightbox plus the PNG download. Kept separate from the card markup so
 * the exported node is never affected by the modal's scaling.
 */
export default function CertificateModal({ student, intakeTitle, course, onClose }) {
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const fit = () => {
      // Fit both axes. Fitting width alone let the card be cut off at the
      // bottom on short laptop viewports.
      const availableWidth = Math.min(window.innerWidth - 32, 980);
      const availableHeight = Math.max(240, window.innerHeight - 200);
      setScale(Math.min(1, availableWidth / CARD_WIDTH, availableHeight / CARD_HEIGHT));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Decode both logos before exporting. Without this the capture can race the
  // images and produce a card with blank logo circles.
  useEffect(() => {
    [DTS_LOGO_SRC, UR_LOGO_SRC].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const slug = (value) =>
    String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  const fileSlug = [slug(student?.name) || "student", slug(course) || "course"]
    .filter(Boolean)
    .join("-");

  const download = useCallback(async () => {
    if (!cardRef.current) return;
    setBusy(true);
    setError("");
    try {
      const imgs = Array.from(cardRef.current.querySelectorAll("img"));
      await Promise.all(
        imgs.map((img) => (img.complete ? img.decode().catch(() => {}) : Promise.resolve()))
      );
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        pixelRatio: 3,
        // Avoids a cross-origin fetch of the Google Fonts stylesheet, which
        // fails under CORS and aborts the whole export.
        skipFonts: true,
        cacheBust: false,
      });

      const link = document.createElement("a");
      link.download = `dts-appreciation-${fileSlug}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      setError("Could not generate the image. Please try again, or use a screenshot if this keeps happening.");
    } finally {
      setBusy(false);
    }
  }, [fileSlug]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Course completion appreciation for ${course || "this course"}`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(10,16,30,0.74)",
        backdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px", maxWidth: "100%" }}
      >
        <div style={{ height: CARD_HEIGHT * scale, width: CARD_WIDTH * scale }}>
          <Certificate
            ref={cardRef}
            student={student}
            intakeTitle={intakeTitle}
            course={course}
            previewScale={scale}
          />
        </div>

        {error ? <p style={{ color: "#fca5a5", fontSize: "14px", margin: 0 }}>{error}</p> : null}

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={download}
            disabled={busy}
            style={{
              padding: "12px 24px",
              borderRadius: "10px",
              border: "none",
              background: busy ? "#94a3b8" : GREEN,
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Preparing image..." : "Download PNG"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "12px 24px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.35)",
              background: "transparent",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
