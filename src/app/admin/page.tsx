"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface EmailRecord {
  id: number;
  email_prefix: string;
  full_email: string;
  action: string;
  created_at: string;
}

export default function AdminPage() {
  const [records, setRecords] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "生成" | "复制">("all");

  useEffect(() => {
    fetchRecords();
  }, [filter]);

  const fetchRecords = async () => {
    setLoading(true);
    let query = supabase
      .from("email_records")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    
    if (filter !== "all") {
      query = query.eq("action", filter);
    }
    
    const { data, error } = await query;
    
    if (!error && data) {
      setRecords(data);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const stats = {
    total: records.length,
    generated: records.filter(r => r.action === "生成").length,
    copied: records.filter(r => r.action === "复制").length,
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-800">管理后台</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            返回首页
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">总记录数</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">生成次数</p>
            <p className="text-2xl font-bold text-blue-500">{stats.generated}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">复制次数</p>
            <p className="text-2xl font-bold text-green-500">{stats.copied}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-gray-600 text-sm">筛选：</span>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === "all"
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilter("生成")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === "生成"
                  ? "bg-blue-500 text-white"
                  : "bg-blue-100 text-blue-600 hover:bg-blue-200"
              }`}
            >
              生成
            </button>
            <button
              onClick={() => setFilter("复制")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === "复制"
                  ? "bg-green-500 text-white"
                  : "bg-green-100 text-green-600 hover:bg-green-200"
              }`}
            >
              复制
            </button>
            <button
              onClick={fetchRecords}
              className="ml-auto px-3 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded text-sm transition-colors"
            >
              刷新
            </button>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700">操作日志</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      邮箱地址
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      时间
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {record.id}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">
                        {record.full_email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            record.action === "生成"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-green-100 text-green-600"
                          }`}
                        >
                          {record.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(record.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
