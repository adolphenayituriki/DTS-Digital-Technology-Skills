import React, { useRef, useState, useCallback, forwardRef, useEffect } from "react";
import { toPng } from "html-to-image";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 800;

const GRADIENT =
  "linear-gradient(135deg, #142851 0%, #1d3a6b 42%, #23507f 68%, #23a8de 100%)";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

/**
 * Celebratory card for a completed course.
 *
 * Deliberately NOT a certificate: it celebrates training completion and says
 * so in the footer, because the site copy in Programs.jsx/About.jsx already
 * makes separate claims about certificates.
 *
 * Rendered at a fixed 1200x800 so the exported PNG is always the same size
 * regardless of the visitor's viewport.
 */
const AchievementCard = forwardRef(function AchievementCard(
  { student, mark, intakeTitle, previewScale = 1 },
  ref
) {
  const firstName = String(student?.name || "Student").trim().split(/\s+/)[0];
  const course = mark?.course || "";
  const scoreLine =
    mark?.score != null
      ? `Score ${mark.score}%${mark.grade ? ` · ${mark.grade}` : ""}`
      : "";

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
          background: GRADIENT,
          fontFamily:
            "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "52px 64px",
          boxSizing: "border-box",
        }}
      >
        {/* soft light bloom top-right */}
        <div
          style={{
            position: "absolute",
            top: "-180px",
            right: "-160px",
            width: "620px",
            height: "620px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(35,168,222,0.45) 0%, rgba(35,168,222,0) 70%)",
          }}
        />
        {/* light bloom bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: "-220px",
            left: "-180px",
            width: "560px",
            height: "560px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(57,178,76,0.28) 0%, rgba(57,178,76,0) 70%)",
          }}
        />
        {/* thin accent frame */}
        <div
          style={{
            position: "absolute",
            inset: "26px",
            border: "2px solid rgba(255,255,255,0.22)",
            borderRadius: "24px",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "18px",
          }}
        >
          <img
            src="/Logo.png"
            alt="Digital Technology Skills"
            width="76"
            height="76"
            style={{ borderRadius: "18px", background: "#ffffff", objectFit: "contain" }}
          />
          <div>
            <div style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "0.5px" }}>
              Digital Technology Skills
            </div>
            <div style={{ fontSize: "17px", opacity: 0.82, letterSpacing: "1.6px" }}>
              DTS · UR-Huye Campus
            </div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            marginTop: "26px",
            padding: "7px 22px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.3)",
            fontSize: "15px",
            letterSpacing: "3.4px",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Achievement Card
        </div>

        <div
          style={{
            position: "relative",
            marginTop: "22px",
            fontSize: "52px",
            fontWeight: 800,
            lineHeight: 1.12,
            textAlign: "center",
            textShadow: "0 2px 18px rgba(0,0,0,0.25)",
          }}
        >
          Congratulations,
          <br />
          {firstName}!
        </div>

        <div
          style={{
            position: "relative",
            marginTop: "18px",
            padding: "14px 34px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.26)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "15px",
              letterSpacing: "2.4px",
              textTransform: "uppercase",
              opacity: 0.85,
            }}
          >
            Completed Course
          </div>
          <div style={{ fontSize: "31px", fontWeight: 700, marginTop: "6px" }}>{course}</div>
          {scoreLine ? (
            <div style={{ fontSize: "19px", marginTop: "6px", opacity: 0.9 }}>{scoreLine}</div>
          ) : null}
        </div>

        <div
          style={{
            position: "relative",
            marginTop: "22px",
            maxWidth: "820px",
            textAlign: "center",
            fontSize: "21px",
            lineHeight: 1.55,
            opacity: 0.94,
          }}
        >
          The skills you have earned are yours to keep, and the determination that
          carried you through this training will carry you far beyond it. Keep
          building.
        </div>

        <div
          style={{
            position: "relative",
            marginTop: "auto",
            display: "flex",
            gap: "18px",
            alignItems: "center",
            fontSize: "17px",
            opacity: 0.92,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {intakeTitle ? <span>{intakeTitle}</span> : null}
          {intakeTitle && student?.regNumber ? <span style={{ opacity: 0.5 }}>|</span> : null}
          {student?.regNumber ? <span>{student.regNumber}</span> : null}
          {student?.regNumber && mark?.completedAt ? (
            <span style={{ opacity: 0.5 }}>|</span>
          ) : null}
          {mark?.completedAt ? <span>{fmtDate(mark.completedAt)}</span> : null}
        </div>

        <div
          style={{
            position: "relative",
            marginTop: "14px",
            fontSize: "13px",
            opacity: 0.6,
            textAlign: "center",
          }}
        >
          This achievement card celebrates training completion. It is not a formal
          certificate.
        </div>
      </div>
    </div>
  );
});

/**
 * Lightbox preview plus the PNG download. Kept separate from the card markup so
 * the exported node is never affected by the modal's scaling or overflow rules.
 */
export default function AchievementCardModal({ student, mark, intakeTitle, onClose }) {
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const fit = () => {
      const available = Math.min(window.innerWidth - 48, 980);
      setScale(Math.min(1, available / CARD_WIDTH));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Decode the logo before exporting. Without this the capture can race the
  // image and produce a card with a blank logo box.
  useEffect(() => {
    const img = new Image();
    img.src = "/Logo.png";
  }, []);

  const safeName = String(student?.name || "student")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const safeCourse = String(mark?.course || "course")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  const download = useCallback(async () => {
    if (!cardRef.current) return;
    setBusy(true);
    setError("");
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        pixelRatio: 2,
        // Avoids a cross-origin fetch of the Google Fonts stylesheet, which
        // fails under CORS and aborts the whole export.
        skipFonts: true,
        cacheBust: false,
      });

      const link = document.createElement("a");
      link.download = `dts-achievement-${safeName}-${safeCourse}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      setError(
        "Could not generate the image. Please try again, or use a screenshot if this keeps happening."
      );
    } finally {
      setBusy(false);
    }
  }, [safeName, safeCourse]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Achievement card"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(10,16,30,0.72)",
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
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "18px",
          maxWidth: "100%",
        }}
      >
        <div style={{ height: CARD_HEIGHT * scale, width: CARD_WIDTH * scale }}>
          <AchievementCard
            ref={cardRef}
            student={student}
            mark={mark}
            intakeTitle={intakeTitle}
            previewScale={scale}
          />
        </div>

        {error ? (
          <p style={{ color: "#fca5a5", fontSize: "14px", margin: 0 }}>{error}</p>
        ) : null}

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={download}
            disabled={busy}
            style={{
              padding: "12px 24px",
              borderRadius: "10px",
              border: "none",
              background: busy ? "#94a3b8" : "#23a8de",
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
