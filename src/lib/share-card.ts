import { contributionCount, passportDisplayDid, truncateDid, type PassportData } from "./passport";

const W = 1200;
const H = 630;

const COLORS = {
  navy: "#0A1128",
  panel: "#111A38",
  border: "#2A3765",
  cyan: "#00B4D8",
  blue: "#0466C8",
  ice: "#F5F7FA",
  muted: "#8CA0C6",
  green: "#16C784",
  amber: "#F5A524",
  red: "#F31260",
};

function stateColor(state: string): string {
  if (state === "merged") return COLORS.blue;
  if (state === "open") return COLORS.green;
  if (state === "closed") return COLORS.red;
  return COLORS.amber;
}

function drawCore(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.strokeStyle = COLORS.cyan;
  ctx.lineWidth = s * 0.055;
  ctx.strokeRect(x + s * 0.08, y + s * 0.08, s * 0.84, s * 0.84);
  ctx.globalAlpha = 0.55;
  ctx.strokeRect(x + s * 0.34, y + s * 0.34, s * 0.32, s * 0.32);
  ctx.globalAlpha = 1;
  ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.19, y + s * 0.55);
  ctx.lineTo(x + s * 0.42, y + s * 0.78);
  ctx.lineTo(x + s * 0.84, y + s * 0.19);
  ctx.stroke();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

/** Renders the 1200x630 share card fully client-side. */
export async function renderShareCard(
  data: PassportData,
  avatarDataUrl?: string | null,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser");
  const displayedDid = passportDisplayDid(data);

  ctx.fillStyle = COLORS.navy;
  ctx.fillRect(0, 0, W, H);

  // subtle grid lines
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.35;
  for (let x = 60; x < W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
    ctx.stroke();
  }
  for (let y = 60; y < H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = COLORS.border;
  ctx.strokeRect(40.5, 40.5, W - 81, H - 81);

  // Header
  drawCore(ctx, 72, 72, 40);
  ctx.fillStyle = COLORS.ice;
  ctx.font = "700 26px 'Space Grotesk', system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("PROOFCORE", 128, 93);
  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 18px 'JetBrains Mono', monospace";
  ctx.fillText("AGENT PASSPORT", 290, 93);

  if (data.isDemo) {
    ctx.strokeStyle = COLORS.amber;
    ctx.strokeRect(W - 200.5, 76.5, 128, 34);
    ctx.fillStyle = COLORS.amber;
    ctx.font = "600 16px 'JetBrains Mono', monospace";
    ctx.fillText("DEMO DATA", W - 184, 94);
  }

  // Avatar
  const avatarX = 72;
  const avatarY = 160;
  const avatarSize = 128;
  ctx.strokeStyle = COLORS.border;
  ctx.strokeRect(avatarX + 0.5, avatarY + 0.5, avatarSize, avatarSize);
  if (avatarDataUrl) {
    try {
      const image = await loadImage(avatarDataUrl);
      ctx.save();
      ctx.beginPath();
      ctx.rect(avatarX, avatarY, avatarSize, avatarSize);
      ctx.clip();
      ctx.drawImage(image, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } catch {
      /* fall through to placeholder */
    }
  } else {
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(avatarX + 1, avatarY + 1, avatarSize - 2, avatarSize - 2);
    drawCore(ctx, avatarX + 34, avatarY + 34, 60);
  }

  // Identity
  const infoX = avatarX + avatarSize + 32;
  ctx.fillStyle = COLORS.ice;
  ctx.font = "700 46px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillText(
    fitText(ctx, data.input.displayName || "Unnamed agent", W - infoX - 90),
    infoX,
    avatarY + 30,
  );

  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 20px 'JetBrains Mono', monospace";
  const handles = [
    data.input.xHandle,
    data.input.githubUsername ? `github/${data.input.githubUsername}` : "",
  ]
    .filter(Boolean)
    .join("   ");
  ctx.fillText(fitText(ctx, handles, W - infoX - 90), infoX, avatarY + 68);

  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 18px 'JetBrains Mono', monospace";
  ctx.fillText(
    fitText(
      ctx,
      `${displayedDid.authenticated ? "DID" : "DID CLAIM"}  ${truncateDid(
        displayedDid.did || "—",
        30,
        10,
      )}`,
      W - infoX - 90,
    ),
    infoX,
    avatarY + 104,
  );

  // Verification chip row
  const verified = data.verification.status === "verified";
  const chipY = 330;
  const chipLabel = verified
    ? "SIGNATURE VERIFIED"
    : data.verification.status === "invalid"
      ? data.verification.kind === "signature"
        ? "SIGNATURE INVALID"
        : data.verification.kind === "internal"
          ? "VERIFY UNAVAILABLE"
          : "RECEIPT INVALID"
      : "NO RECEIPT";
  const chipColor = verified
    ? COLORS.green
    : data.verification.status === "invalid"
      ? COLORS.red
      : COLORS.amber;
  ctx.font = "600 18px 'JetBrains Mono', monospace";
  const chipW = ctx.measureText(chipLabel).width + 32;
  ctx.strokeStyle = chipColor;
  ctx.strokeRect(72.5, chipY + 0.5, chipW, 40);
  ctx.fillStyle = chipColor;
  ctx.fillText(chipLabel, 88, chipY + 21);

  const roomText =
    data.verification.status === "verified"
      ? `ROOM ${data.verification.result.authenticated.room}  ·  SEQ ${data.verification.result.unverifiedServerObservation.seq} (UNVERIFIED)`
      : "SERVER OBSERVATION UNAVAILABLE";
  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 17px 'JetBrains Mono', monospace";
  ctx.fillText(fitText(ctx, roomText, W - 72 - chipW - 120), 92 + chipW, chipY + 21);

  // Stats panels
  const prs = data.pullRequests;
  const counts = {
    merged: prs.filter((p) => p.state === "merged").length,
    open: prs.filter((p) => p.state === "open").length,
    closed: prs.filter((p) => p.state === "closed").length,
    unavailable: prs.filter((p) => p.state === "unavailable").length,
  };
  const stats: [string, string, string][] = [
    ["LINKED EVIDENCE", String(contributionCount(data)), COLORS.ice],
    ["LINKED MERGED", String(counts.merged), COLORS.blue],
    ["LINKED OPEN", String(counts.open), COLORS.green],
    ["LINKED CLOSED", String(counts.closed), COLORS.red],
    ["UNAVAILABLE", String(counts.unavailable), COLORS.amber],
  ];
  const statY = 396;
  const statW = (W - 144 - 16 * 4) / 5;
  stats.forEach(([label, value, color], index) => {
    const x = 72 + index * (statW + 16);
    ctx.strokeStyle = COLORS.border;
    ctx.strokeRect(x + 0.5, statY + 0.5, statW, 96);
    ctx.fillStyle = COLORS.muted;
    ctx.font = "500 13px 'JetBrains Mono', monospace";
    ctx.fillText(label, x + 16, statY + 26);
    ctx.fillStyle = color;
    ctx.font = "700 40px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillText(value, x + 16, statY + 64);
  });

  // Repository line
  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 17px 'JetBrains Mono', monospace";
  ctx.fillText(
    fitText(
      ctx,
      `GITHUB STATUS ${
        data.githubFetchedAt ? `FETCHED ${data.githubFetchedAt}` : "NOT FETCHED"
      }  ·  REPO  ${
        data.input.repositoryUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "") || "—"
      }`,
      W - 144,
    ),
    72,
    527,
  );

  // Footer
  ctx.strokeStyle = COLORS.border;
  ctx.beginPath();
  ctx.moveTo(72, 552.5);
  ctx.lineTo(W - 72, 552.5);
  ctx.stroke();
  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 15px 'JetBrains Mono', monospace";
  ctx.fillText(
    fitText(
      ctx,
      `USER-LINKED GITHUB DATA  ·  GENERATED ${data.generatedAt}  ·  NO OWNERSHIP OR ELIGIBILITY CLAIM`,
      W - 144,
    ),
    72,
    578,
  );

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode the PNG card"));
    }, "image/png");
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image failed to load"));
    image.src = src;
  });
}
