"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface EmailRecord {
  id: number;
  email_prefix: string;
  full_email: string;
  created_at: string;
}

interface ReceivedEmail {
  from: string;
  subject: string;
  date: string;
  verificationCode: string | null;
  bodyPreview: string;
}

function generateEmailPrefix(): string {
  const upperLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const allChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
  const firstChar = upperLetters[Math.floor(Math.random() * upperLetters.length)];
  
  let middleChars = "";
  for (let i = 0; i < 14; i++) {
    middleChars += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  const lastChar = upperLetters[Math.floor(Math.random() * upperLetters.length)];
  
  return firstChar + middleChars + lastChar;
}

function copyToClipboard(text: string): boolean {
  try {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback
  }
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
  return true;
}

export default function Home() {
  const [emailPrefix, setEmailPrefix] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 邮件相关状态
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);
  const [receivedEmails, setReceivedEmails] = useState<ReceivedEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    const { data, error } = await supabase
      .from("email_records")
      .select("*")
      .eq("action", "生成")
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (!error && data) {
      const uniqueEmails = data.reduce((acc: EmailRecord[], curr) => {
        if (!acc.find(e => e.email_prefix === curr.email_prefix)) {
          acc.push(curr);
        }
        return acc;
      }, []);
      setEmails(uniqueEmails);
    }
    setLoading(false);
  };

  const saveRecord = async (prefix: string, action: string) => {
    const fullEmail = prefix + "@qq.com";
    await supabase.from("email_records").insert({
      email_prefix: prefix,
      full_email: fullEmail,
      action: action,
    });
  };

  const handleGenerate = async () => {
    const prefix = generateEmailPrefix();
    setEmailPrefix(prefix);
    setCopied(false);
    await saveRecord(prefix, "生成");
    fetchEmails();
  };

  const handleCopy = () => {
    if (emailPrefix) {
      const fullEmail = emailPrefix + "@qq.com";
      copyToClipboard(fullEmail);
      setCopied(true);
      saveRecord(emailPrefix, "复制"); // 不等待
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyFromHistory = (record: EmailRecord) => {
    copyToClipboard(record.full_email);
    setCopiedId(record.id);
    saveRecord(record.email_prefix, "复制"); // 不等待
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyCode = (code: string) => {
    copyToClipboard(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCheckEmails = async (record: EmailRecord) => {
    setSelectedEmail(record);
    setLoadingEmails(true);
    setEmailError(null);
    setReceivedEmails([]);

    try {
      const response = await fetch(`/api/emails?prefix=${record.email_prefix}`);
      const data = await response.json();
      
      if (data.success) {
        setReceivedEmails(data.emails);
      } else {
        setEmailError(data.error || "获取邮件失败");
      }
    } catch (error) {
      setEmailError("网络错误，请重试");
    } finally {
      setLoadingEmails(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 py-8">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-blue-500 text-center mb-4">
          随机邮箱前缀生成器
        </h1>
        
        <p className="text-gray-500 text-center text-sm mb-8">
          生成16位随机邮箱前缀，大写字母开头和结尾，中间为随机字母和数字
        </p>

        <div className="border border-gray-300 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <input
              type="text"
              value={emailPrefix}
              readOnly
              placeholder="点击下方按钮生成"
              className="flex-1 outline-none text-gray-700 bg-transparent"
            />
            <span className="text-blue-500 font-medium">@qq.com</span>
          </div>
        </div>

        <p className="text-orange-400 text-sm text-center mb-6">
          格式：大写字母开头 + 14位随机字符 + 大写字母结尾 = 16位
        </p>

        <div className="flex gap-4">
          <button
            onClick={handleGenerate}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg font-medium transition-colors"
          >
            生成邮箱前缀
          </button>
          
          <button
            onClick={handleCopy}
            disabled={!emailPrefix}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
              emailPrefix
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {copied ? "已复制!" : "复制完整邮箱"}
          </button>
        </div>

        {emailPrefix && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">生成的邮箱地址：</p>
            <p className="text-lg font-mono text-gray-800 break-all">
              {emailPrefix}@qq.com
            </p>
          </div>
        )}

        {/* 历史记录 */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">历史记录</h2>
          {loading ? (
            <p className="text-gray-500 text-center py-4">加载中...</p>
          ) : emails.length === 0 ? (
            <p className="text-gray-500 text-center py-4">暂无记录</p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {emails.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-gray-700 truncate">
                      {record.full_email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className="text-gray-400 text-xs whitespace-nowrap">
                      {formatDate(record.created_at)}
                    </span>
                    <button
                      onClick={() => handleCopyFromHistory(record)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        copiedId === record.id
                          ? "bg-green-500 text-white"
                          : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                      }`}
                    >
                      {copiedId === record.id ? "已复制" : "复制"}
                    </button>
                    <button
                      onClick={() => handleCheckEmails(record)}
                      className="px-3 py-1 rounded text-xs font-medium bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors"
                    >
                      查收邮件
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 邮件查看弹窗 */}
        {selectedEmail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  收件箱 - {selectedEmail.full_email}
                </h3>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {loadingEmails ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-500">正在查收邮件...</span>
                  </div>
                ) : emailError ? (
                  <div className="text-center py-8">
                    <p className="text-red-500">{emailError}</p>
                    <button
                      onClick={() => handleCheckEmails(selectedEmail)}
                      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      重试
                    </button>
                  </div>
                ) : receivedEmails.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>暂无邮件</p>
                    <p className="text-sm mt-2">请确保已使用此邮箱注册或接收验证码</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {receivedEmails.map((email, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{email.subject || "(无主题)"}</p>
                            <p className="text-sm text-gray-500 truncate">来自: {email.from}</p>
                          </div>
                          {email.verificationCode && (
                            <button
                              onClick={() => handleCopyCode(email.verificationCode!)}
                              className={`ml-3 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                copiedCode === email.verificationCode
                                  ? "bg-green-500 text-white"
                                  : "bg-orange-500 hover:bg-orange-600 text-white"
                              }`}
                            >
                              {copiedCode === email.verificationCode ? "已复制!" : `验证码: ${email.verificationCode}`}
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                          {email.bodyPreview}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {email.date ? formatDate(email.date) : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => handleCheckEmails(selectedEmail)}
                  disabled={loadingEmails}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  刷新邮件
                </button>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
