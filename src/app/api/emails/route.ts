import { NextResponse } from "next/server";
import Imap from "imap";
import { simpleParser, ParsedMail } from "mailparser";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 提取验证码的正则表达式
function extractVerificationCode(text: string): string | null {
  // 匹配常见验证码格式: 4-8位数字或字母数字组合
  const patterns = [
    /验证码[：:]\s*([A-Za-z0-9]{4,8})/,
    /verification code[：:]\s*([A-Za-z0-9]{4,8})/i,
    /code[：:]\s*([A-Za-z0-9]{4,8})/i,
    /【([A-Za-z0-9]{4,8})】/,
    /\b(\d{4,8})\b/, // 单独的4-8位数字
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// 连接IMAP并获取邮件
async function fetchEmails(targetPrefix?: string): Promise<ParsedMail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.QQ_EMAIL!,
      password: process.env.QQ_EMAIL_AUTH_CODE!,
      host: "imap.qq.com",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    const emails: ParsedMail[] = [];

    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        // 获取最近50封邮件
        const total = box.messages.total;
        const start = Math.max(1, total - 49);
        const fetchRange = `${start}:${total}`;

        const f = imap.seq.fetch(fetchRange, {
          bodies: "",
          struct: true,
        });

        f.on("message", (msg) => {
          msg.on("body", (stream) => {
            simpleParser(stream as unknown as NodeJS.ReadableStream, (err, parsed) => {
              if (!err) {
                // 如果指定了前缀，只获取发送到该前缀邮箱的邮件
                if (targetPrefix) {
                  const toAddresses = Array.isArray(parsed.to)
                    ? parsed.to
                    : parsed.to
                    ? [parsed.to]
                    : [];
                  
                  const isMatch = toAddresses.some((addr) => {
                    if (addr && "value" in addr) {
                      return addr.value.some(
                        (v) => v.address?.toLowerCase().includes(targetPrefix.toLowerCase())
                      );
                    }
                    return false;
                  });

                  if (isMatch) {
                    emails.push(parsed);
                  }
                } else {
                  emails.push(parsed);
                }
              }
            });
          });
        });

        f.once("error", (err) => {
          imap.end();
          reject(err);
        });

        f.once("end", () => {
          imap.end();
          // 等待解析完成
          setTimeout(() => resolve(emails), 1000);
        });
      });
    });

    imap.once("error", (err: Error) => {
      reject(err);
    });

    imap.connect();
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const emailPrefix = searchParams.get("prefix");

  try {
    const emails = await fetchEmails(emailPrefix || undefined);

    const results = emails.map((email) => {
      const bodyText = email.text || email.html?.replace(/<[^>]*>/g, "") || "";
      const verificationCode = extractVerificationCode(bodyText);

      return {
        from: email.from?.text || "",
        to: email.to?.toString() || "",
        subject: email.subject || "",
        date: email.date,
        verificationCode,
        bodyPreview: bodyText.substring(0, 200),
      };
    });

    // 如果指定了前缀，保存到数据库
    if (emailPrefix && results.length > 0) {
      for (const email of results) {
        await supabase.from("received_emails").upsert(
          {
            email_prefix: emailPrefix,
            target_email: `${emailPrefix}@qq.com`,
            from_address: email.from,
            subject: email.subject,
            body: email.bodyPreview,
            verification_code: email.verificationCode,
            received_at: email.date,
          },
          { onConflict: "email_prefix,subject" }
        );
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      emails: results,
    });
  } catch (error) {
    console.error("Failed to fetch emails:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch emails",
      },
      { status: 500 }
    );
  }
}
