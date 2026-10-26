"use client";

import { Award, Clock, Handshake, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { RULE_GROUPS } from "../data/guide-data";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck,
  Clock,
  Award,
  Handshake,
};

/** Nếu `where` là một đường dẫn (bắt đầu bằng "/") thì cho phép bấm để mở màn hình đó */
function whereHref(where: string): string | null {
  const first = where.split(/[,\s]/)[0];
  return first.startsWith("/") ? first : null;
}

export function RulesView() {
  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
        Các quy tắc dễ vấp nhất khi thao tác hằng ngày. Con số lấy từ cấu hình
        đang chạy trên hệ thống (thời hạn hủy, SLA, giới hạn xuất file…).
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {RULE_GROUPS.map((group) => {
          const Icon = ICONS[group.iconName] ?? ShieldCheck;
          return (
            <section
              key={group.id}
              className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs"
            >
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-4">
                <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  <Icon className="h-4 w-4" />
                </span>
                {group.title}
              </h3>
              <dl className="divide-y divide-border/60">
                {group.rules.map((r) => {
                  const href = r.where ? whereHref(r.where) : null;
                  return (
                    <div key={r.rule} className="py-3 first:pt-0 last:pb-0">
                      <dt className="text-xs font-bold text-foreground">
                        {r.rule}
                      </dt>
                      <dd className="text-xs text-muted-foreground leading-relaxed mt-1">
                        {r.detail}
                      </dd>
                      {r.where && (
                        <dd className="mt-1.5">
                          {href ? (
                            <Link
                              href={href}
                              className="font-mono text-[10px] text-amber-800 dark:text-amber-300 hover:underline"
                            >
                              {r.where}
                            </Link>
                          ) : (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {r.where}
                            </span>
                          )}
                        </dd>
                      )}
                    </div>
                  );
                })}
              </dl>
            </section>
          );
        })}
      </div>
    </div>
  );
}
