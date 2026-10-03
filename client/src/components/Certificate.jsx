import React, { useRef, useState, useCallback, forwardRef, useEffect } from 'react';

/**
 * Official DTS certificate of completion.
 *
 * One certificate per student per programme, not one per sub-course. The
 * previous design issued a separate "achievement card" for every completed
 * course, which read as a pile of course receipts rather than one credential
 * for one programme of study.
 *
 * Release conditions, enforced on the client by Profile.jsx and intended to be
 * enforced server-side before any server-issued artifact:
 *   1. every course on the intake is marked completed, and
 *   2. the tuition fee is settled in full.
 *
 * Rendered at a fixed size matching the aspect ratio of
 * client/public/certificate templete/Certificate template.jpeg (480x345 =
 * 1.3913) so the print template and the digital certificate line up.
 */
const CARD_WIDTH = 1200;
const CARD_HEIGHT = Math.round((CARD_WIDTH * 345) / 480); // 863

const GRADIENT = "linear-gradient(135deg, #0f2149 0%, #16305e 42%, #1b4074 68%, #1b6f9e 100%)";

export const DTS_LOGO_SRC = "/Logo.png";
export const UR_LOGO_SRC = "/ur%20logo.jpg";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "";

/**
 * How the training was delivered, for the certificate to name.
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
 * A stable reference printed on the certificate so a paper copy can be traced
 * back to the exact record it came from. Derived from the student's own id, so
 * it needs no new field and cannot drift from the data.
 */
const referenceFor = (student) => {
  if (!student?._id) return "";
  return `DTS-${String(student._id).replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`;
};

/**
 * Shrink a headline as its text gets longer.
 *
 * The certificate is a fixed-size box with `overflow: hidden`, so a long name
 * used to wrap onto extra lines and get silently clipped off the bottom.
 * Stepping the size down keeps long values fully visible instead.
 */
const autoSize = (text, base, min, roomyChars) => {
  const length = String(text || "").trim().length;
  if (length <= roomyChars) return base;
  return Math.max(min, base - Math.ceil((length - roomyChars) / 8) * 4);
};

const Certificate = forwardRef(function Certificate({ student, intakeTitle, previewScale = 1 }, ref) {
  const fullName = String(student?.name || "Student").trim();
  const delivery = deliveryFor(student);
  const reference = referenceFor(student);
  const nameSize = autoSize(fullName, 60, 36, 22);
  const programmeSize = autoSize(intakeTitle, 27, 18, 40);
  const avgScore = (() => {
    const scored = (student?.marks || []).filter((m) => m.score != null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, m) => sum + Number(m.score), 0) / scored.length);
  })();
  const completedOn = (() => {
    const dates = (student?.marks || []).map((m) => m.completedAt).filter(Boolean);
    if (!dates.length) return null;
    return new Date(Math.max(...dates.map((d) => new Date(d).getTime())));
  })();

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
          fontFamily: "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "46px 60px 40px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-190px",
            right: "-170px",
            width: "640px",
            height: "640px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(35,168,222,0.42) 0%, rgba(35,168,222,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-230px",
            left: "-190px",
            width: "580px",
            height: "580px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(57,178,76,0.26) 0%, rgba(57,178,76,0) 70%)",
          }}
        />
        {/* Double rule, the conventional certificate frame. */}
        <div
          style={{
            position: "absolute",
            inset: "24px",
            border: "2px solid rgba(255,255,255,0.24)",
            borderRadius: "20px",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "32px",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: "14px",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: "0 1 auto" }}>
            <div
              style={{
                width: "78px",
                height: "78px",
                borderRadius: "50%",
                background: "#ffffff",
                border: "3px solid rgba(255,255,255,0.75)",
                boxShadow: "0 8px 22px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <img
                src={DTS_LOGO_SRC}
                alt="Digital Technology Skills logo"
                width="78"
                height="78"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "23px", fontWeight: 700, letterSpacing: "0.4px" }}>
                Digital Technology Skills
              </div>
              <div style={{ fontSize: "15px", opacity: 0.88, letterSpacing: "1.5px" }}>
                {delivery ? delivery.programme : "DTS"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "11px", flex: "0 0 auto" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "1.1px" }}>
                University of Rwanda
              </div>
              <div style={{ fontSize: "12px", opacity: 0.85, letterSpacing: "1.3px" }}>
                Partner Institution
              </div>
            </div>
            <div
              style={{
                width: "78px",
                height: "78px",
                borderRadius: "50%",
                background: "#ffffff",
                border: "3px solid rgba(255,255,255,0.75)",
                boxShadow: "0 8px 22px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <img
                src={UR_LOGO_SRC}
                alt="University of Rwanda logo"
                width="78"
                height="78"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            marginTop: "26px",
            fontSize: "15px",
            letterSpacing: "5px",
            textTransform: "uppercase",
            fontWeight: 600,
            opacity: 0.9,
          }}
        >
          Certificate of Completion
        </div>

        <div style={{ position: "relative", marginTop: "18px", fontSize: "20px", opacity: 0.88 }}>
          This is to certify that
        </div>

        <div
          style={{
            position: "relative",
            marginTop: "8px",
            padding: "0 30px 10px",
            borderBottom: "2px solid rgba(255,255,255,0.42)",
            fontSize: `${nameSize}px`,
            fontWeight: 800,
            lineHeight: 1.15,
            textAlign: "center",
            textShadow: "0 2px 16px rgba(0,0,0,0.25)",
          }}
        >
          {fullName}
        </div>

        <div
          style={{
            position: "relative",
            marginTop: "22px",
            fontSize: "19px",
            lineHeight: 1.5,
            textAlign: "center",
            maxWidth: "880px",
          }}
        >
          has successfully completed all the requirements of the programme of study
        </div>

        <div
          style={{
            position: "relative",
            marginTop: "12px",
            textAlign: "center",
            maxWidth: "900px",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "10px 26px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.13)",
              border: "1px solid rgba(255,255,255,0.28)",
            }}
          >
            <div style={{ fontSize: `${programmeSize}px`, fontWeight: 700, lineHeight: 1.2 }}>
              {intakeTitle || "Programme of Study"}
            </div>
            <div style={{ fontSize: "14px", marginTop: "6px", opacity: 0.9, letterSpacing: "1.2px" }}>
              {delivery ? delivery.mode : ""}
              {delivery ? (avgScore != null ? " · " : "") : ""}
              {avgScore != null ? `Average ${avgScore}%` : ""}
            </div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            marginTop: "24px",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            width: "100%",
            maxWidth: "900px",
            gap: "40px",
          }}
        >
          <div style={{ textAlign: "center", flex: 1 }}>
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.5)",
                paddingTop: "7px",
                fontSize: "14px",
                opacity: 0.88,
              }}
            >
              {student?.regNumber || "Registration number"}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "3px" }}>Student</div>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.5)",
                paddingTop: "7px",
                fontSize: "14px",
                opacity: 0.88,
              }}
            >
              {completedOn ? fmtDate(completedOn) : ""}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "3px" }}>Date of completion</div>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.5)",
                paddingTop: "7px",
                fontSize: "14px",
                opacity: 0.88,
              }}
            >
              {reference || "DTS"}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "3px" }}>Reference</div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            marginTop: "auto",
            paddingTop: "14px",
            fontSize: "12.5px",
            color: "rgba(255,255,255,0.78)",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Issued by Digital Technology Skills in partnership with the University of Rwanda.
        </div>
      </div>
    </div>
  );
});

/**
 * Preview lightbox plus the PNG download. Kept separate from the certificate
 * markup so the exported node is never affected by the modal's scaling.
 */
export default function CertificateModal({ student, intakeTitle, onClose }) {
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const fit = () => {
      // Fit both axes. Fitting width alone let the certificate be cut off at
      // the bottom on short laptop viewports.
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
  // images and produce a certificate with blank logo circles.
  useEffect(() => {
    [DTS_LOGO_SRC, UR_LOGO_SRC].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const safeName = String(student?.name || "student")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

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
      link.download = `dts-certificate-${safeName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      setError("Could not generate the image. Please try again, or use a screenshot if this keeps happening.");
    } finally {
      setBusy(false);
    }
  }, [safeName]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Certificate of completion"
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
          <Certificate ref={cardRef} student={student} intakeTitle={intakeTitle} previewScale={scale} />
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
