import type { RuntimeConfig } from "@/lib/server/config";
import { ensureStep } from "@/lib/server/errors";
import { pickBestMailCodeCandidate } from "@/lib/server/temp-email/code-parser";
import {
  requestTempEmailDetail,
  requestTempEmailList,
} from "@/lib/server/temp-email/service";

function hasMailContent(mail: Record<string, unknown>) {
  return Boolean(mail.raw || mail.text || mail.html || mail.content);
}

async function hydrateMail(
  mail: Record<string, unknown>,
  options: {
    config: RuntimeConfig;
    fetchImpl?: typeof fetch;
  },
) {
  if (hasMailContent(mail)) {
    return mail;
  }

  const detailUrl = String(mail.detail_url ?? mail.detailUrl ?? "").trim();
  if (!detailUrl) {
    return mail;
  }

  const detail = await requestTempEmailDetail(detailUrl, options);
  return {
    ...mail,
    ...detail,
  };
}

function formatCandidate(
  candidate: NonNullable<ReturnType<typeof pickBestMailCodeCandidate>>,
  address: string,
) {
  return {
    address,
    code: candidate.code,
    mailId: candidate.mail.id ?? null,
    createdAt: candidate.mail.created_at ?? null,
    subject: candidate.detail.subject || String(candidate.mail.subject ?? ""),
    from:
      candidate.detail.from ||
      String(candidate.mail.source ?? "") ||
      String(candidate.mail.from ?? ""),
  };
}

export async function fetchTempEmailCodeJson(
  address: string,
  options: {
    config: RuntimeConfig;
    fetchImpl?: typeof fetch;
  },
) {
  return ensureStep(
    "获取邮箱验证码",
    async () => {
      const normalizedAddress = String(address ?? "").trim();

      if (!normalizedAddress) {
        throw new Error("缺少邮箱地址");
      }

      const listData = await requestTempEmailList(normalizedAddress, options);
      const mails = Array.isArray(listData.results) ? listData.results : [];

      if (mails.length === 0) {
        throw new Error("未找到可用验证码邮件");
      }

      const hydratedMails = await Promise.all(
        mails.map((mail: unknown) => hydrateMail(mail as Record<string, unknown>, options)),
      );

      const bestCandidate = pickBestMailCodeCandidate(hydratedMails);

      if (!bestCandidate) {
        throw new Error("未找到可用验证码邮件");
      }

      return formatCandidate(bestCandidate, normalizedAddress);
    },
    { address },
  );
}
