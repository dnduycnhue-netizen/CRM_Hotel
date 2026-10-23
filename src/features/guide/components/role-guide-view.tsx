"use client";

import {
  AlertOctagon,
  CalendarCheck2,
  CheckCircle2,
  Crown,
  ExternalLink,
  Shield,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Card, CardContent } from "@/shared/ui";
import { ROLE_GUIDES } from "../data/guide-data";
import type { RoleKey } from "../types";

export function RoleGuideView() {
  const [selectedRoleKey, setSelectedRoleKey] = useState<RoleKey>("owner");
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});

  const activeRole =
    ROLE_GUIDES.find((r) => r.key === selectedRoleKey) || ROLE_GUIDES[0];

  const toggleTask = (task: string) => {
    setCheckedTasks((prev) => ({
      ...prev,
      [task]: !prev[task],
    }));
  };

  const getRoleIcon = (key: RoleKey) => {
    switch (key) {
      case "owner":
        return Crown;
      case "branch_manager":
        return Shield;
      case "receptionist":
        return UserCheck;
      case "sales":
        return TrendingUp;
      case "technician":
        return Wrench;
    }
  };

  return (
    <div className="space-y-6">
      {/* Role Picker Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {ROLE_GUIDES.map((role) => {
          const isSelected = role.key === selectedRoleKey;
          const Icon = getRoleIcon(role.key);

          return (
            <button
              key={role.key}
              type="button"
              onClick={() => setSelectedRoleKey(role.key)}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between select-none ${
                isSelected
                  ? "bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/20"
                  : "bg-card/70 border-border/60 hover:bg-card hover:border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`p-2 rounded-xl ${
                    isSelected
                      ? "bg-amber-500 text-slate-950"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">
                  {role.title.split("(")[0].trim()}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {role.badge}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Role Main Card */}
      <Card className="border-border/60 bg-card/90 shadow-sm">
        <CardContent className="p-6 space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border/50">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge
                  variant="outline"
                  className={`${activeRole.badgeColor} text-xs font-semibold`}
                >
                  {activeRole.badge}
                </Badge>
                <h3 className="text-lg font-bold text-foreground">
                  {activeRole.title}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                {activeRole.description}
              </p>
            </div>
          </div>

          {/* Grid Content: Daily Checklist + Responsibilities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Routine / Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CalendarCheck2 className="h-4 w-4 text-emerald-400" />
                  Lịch trình tác nghiệp trong ngày (Checklist)
                </h4>
                <span className="text-[10px] text-muted-foreground">
                  Bấm để đánh dấu hoàn thành
                </span>
              </div>

              <div className="space-y-2">
                {activeRole.dailyChecklist.map((task) => {
                  const isDone = !!checkedTasks[task];
                  return (
                    <button
                      type="button"
                      key={task}
                      onClick={() => toggleTask(task)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-3 select-none ${
                        isDone
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                          : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isDone
                            ? "bg-emerald-500 border-emerald-500 text-slate-950 font-bold"
                            : "border-muted-foreground/40 bg-card"
                        }`}
                      >
                        {isDone && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <span
                        className={`leading-relaxed ${
                          isDone
                            ? "line-through text-muted-foreground opacity-80"
                            : "text-foreground"
                        }`}
                      >
                        {task}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Key Responsibilities */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-amber-400" />
                Nhiệm vụ & Trách nhiệm chủ chốt
              </h4>

              <div className="space-y-2">
                {activeRole.keyResponsibilities.map((resp) => (
                  <div
                    key={resp}
                    className="p-3 rounded-xl bg-card border border-border/40 text-xs text-muted-foreground flex items-start gap-2.5"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                    <span className="leading-relaxed text-foreground/90">
                      {resp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Allowed Routes */}
          <div className="space-y-3 pt-4 border-t border-border/50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Các màn hình nghiệp vụ được phân quyền truy cập
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeRole.allowedRoutes.map((route) => (
                <Link
                  key={route.path}
                  href={route.path}
                  className="p-3 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/30 hover:border-amber-500/40 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-foreground group-hover:text-amber-400 transition-colors">
                        {route.label}
                      </span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-amber-400 transition-colors" />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {route.desc}
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-amber-400/80">
                    {route.path}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Prohibited Actions & Security Warning */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                <AlertOctagon className="h-4 w-4" />
                Hành vi bị nghiêm cấm đối với vai trò này:
              </div>
              <ul className="space-y-1.5 text-xs text-rose-200/90 pl-5 list-disc leading-relaxed">
                {activeRole.prohibitedActions.map((act) => (
                  <li key={act}>{act}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <ShieldAlert className="h-4 w-4" />
                Nguyên tắc bảo vệ dữ liệu & Tuân thủ:
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {activeRole.securityNote}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
