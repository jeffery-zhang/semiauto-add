function parseMailDate(value: string | undefined) {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const normalized = String(value).trim().replace(" ", "T");
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function decodeBinaryText(text: string) {
  try {
    return Buffer.from(text, "binary").toString("utf8");
  } catch {
    return text;
  }
}

export function decodeQuotedPrintable(text = "") {
  const normalized = String(text).replace(/=\r?\n/g, "");
  let binary = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const current = normalized[index];
    const hex = normalized.slice(index + 1, index + 3);

    if (current === "=" && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      binary += String.fromCharCode(Number.parseInt(hex, 16));
      index += 2;
      continue;
    }

    binary += current;
  }

  return decodeBinaryText(binary);
}

export function decodeMimeWords(text = "") {
  return String(text).replace(
    /=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g,
    (_match, _charset, encoding, payload) => {
      if (String(encoding).toUpperCase() === "B") {
        try {
          return Buffer.from(payload, "base64").toString("utf8");
        } catch {
          return payload;
        }
      }

      return decodeQuotedPrintable(String(payload).replace(/_/g, " "));
    },
  );
}

function extractMailHeader(raw = "", name: string) {
  const pattern = new RegExp(`^${name}:\\s*(.+)$`, "im");
  const match = String(raw).match(pattern);
  return match ? decodeMimeWords(match[1].trim()) : "";
}

function extractBodyText(raw = "") {
  const separatorMatch = String(raw).match(/\r?\n\r?\n([\s\S]*)$/);
  if (!separatorMatch) {
    return decodeQuotedPrintable(String(raw));
  }

  return decodeQuotedPrintable(separatorMatch[1]);
}

function buildBodySource(mail: Record<string, unknown>) {
  if (mail.raw) {
    return extractBodyText(String(mail.raw));
  }

  return decodeQuotedPrintable(
    [mail.text ?? "", mail.html ?? "", mail.content ?? ""].filter(Boolean).join("\n"),
  );
}

export function extractVerificationCode(text = "") {
  const patterns = [
    /验证码[:：\s-]*([0-9]{4,8})/i,
    /临时验证码[^0-9]{0,20}([0-9]{4,8})/i,
    /你的\s*ChatGPT\s*代码为\s*([0-9]{4,8})/i,
    /输入此临时验证码以继续[^0-9]{0,40}([0-9]{4,8})/i,
    /OTP[:：\s-]*([0-9]{4,8})/i,
    /verification\s*code[:：\s-]*([0-9]{4,8})/i,
    /\b([0-9]{6})\b/i,
  ];

  for (const pattern of patterns) {
    const match = String(text).match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export function parseMailContent(mail: Record<string, unknown>) {
  const raw = String(mail.raw ?? "");
  const subject =
    extractMailHeader(raw, "Subject") || decodeMimeWords(String(mail.subject ?? ""));
  const from =
    extractMailHeader(raw, "From") ||
    decodeMimeWords(String(mail.from ?? "")) ||
    decodeMimeWords(String(mail.source ?? ""));
  const tag =
    extractMailHeader(raw, "X-Mailgun-Tag") || decodeMimeWords(String(mail.tag ?? ""));
  const bodyText = buildBodySource(mail);

  return {
    raw,
    subject,
    from,
    tag,
    bodyText,
  };
}

function buildMailSearchText(detail: ReturnType<typeof parseMailContent>) {
  return [detail.subject, detail.from, detail.tag, detail.bodyText, detail.raw]
    .filter(Boolean)
    .join("\n");
}

function scoreVerificationMail(detail: ReturnType<typeof parseMailContent>) {
  let score = 0;
  const subject = detail.subject.toLowerCase();
  const from = detail.from.toLowerCase();
  const tag = detail.tag.toLowerCase();
  const body = detail.bodyText.toLowerCase();

  if (from.includes("otp@tm1.openai.com")) score += 8;
  if (tag === "email-otp-verification") score += 10;
  if (subject.includes("验证码") || subject.includes("代码为") || subject.includes("chatgpt")) {
    score += 6;
  }
  if (body.includes("输入此临时验证码以继续")) score += 10;
  if (body.includes("临时验证码") || body.includes("verification code") || body.includes("otp")) {
    score += 5;
  }
  if (body.includes("newsletter") || body.includes("openai dev newsletter")) score -= 8;
  if (subject.includes("openai dev news")) score -= 10;
  if (from.includes("noreply@email.openai.com")) score -= 5;

  return score;
}

export function pickBestMailCodeCandidate(mails: Array<Record<string, unknown>>) {
  const candidates = mails
    .map((mail) => {
      const detail = parseMailContent(mail);
      const code = extractVerificationCode(buildMailSearchText(detail));

      if (!code) {
        return null;
      }

      return {
        mail,
        detail,
        code,
        score: scoreVerificationMail(detail),
      };
    })
    .filter(Boolean) as Array<{
    mail: Record<string, unknown>;
    detail: ReturnType<typeof parseMailContent>;
    code: string;
    score: number;
  }>;

  if (candidates.length === 0) {
    return null;
  }

  const positiveCandidates = candidates.filter((candidate) => candidate.score > 0);
  const pool = positiveCandidates.length > 0 ? positiveCandidates : candidates;

  pool.sort((left, right) => {
    const timeDiff =
      parseMailDate(String(right.mail.created_at ?? "")) -
      parseMailDate(String(left.mail.created_at ?? ""));
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return right.score - left.score;
  });

  return pool[0];
}
