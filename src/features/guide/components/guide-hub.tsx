"use client";

import {
  BookOpen,
  Compass,
  Layers,
  Printer,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Badge, Button, Input } from "@/shared/ui";
import {
  MODULE_GUIDES,
  ROLE_GUIDES,
  WORKFLOW_DIAGRAMS,
} from "../data/guide-data";
import { ModuleGuideView } from "./module-guide-view";
import { RoleGuideView } from "./role-guide-view";
import { WorkflowVisualizer } from "./workflow-visualizer";

type TabMode = "workflows" | "roles" | "modules" | "faq";

export function GuideHub() {
  const [activeTab, setActiveTab] = useState<TabMode>("workflows");
  const [searchQuery, setSearchQuery] = useState("");

  // Search filtering logic
  const normalizedQuery = searchQuery.toLowerCase().trim();

  const filteredWorkflows = WORKFLOW_DIAGRAMS.filter(
    (w) =>
      w.title.toLowerCase().includes(normalizedQuery) ||
      w.code.toLowerCase().includes(normalizedQuery) ||
      w.nodes.some(
        (n) =>
          n.title.toLowerCase().includes(normalizedQuery) ||
          n.action.toLowerCase().includes(normalizedQuery),
      ),
  );

  const filteredRoles = ROLE_GUIDES.filter(
    (r) =>
      r.title.toLowerCase().includes(normalizedQuery) ||
      r.description.toLowerCase().includes(normalizedQuery) ||
      r.keyResponsibilities.some((res) =>
        res.toLowerCase().includes(normalizedQuery),
      ),
  );

  const filteredModules = MODULE_GUIDES.filter(
    (m) =>
      m.title.toLowerCase().includes(normalizedQuery) ||
      m.summary.toLowerCase().includes(normalizedQuery) ||
      m.features.some(
        (f) =>
          f.name.toLowerCase().includes(normalizedQuery) ||
          f.description.toLowerCase().includes(normalizedQuery),
      ),
  );

  const isSearching = normalizedQuery.length > 0;

  return (
    <div className="space-y-6">
      {/* Hero Header Banner */}
      <div className="relative rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-950/20 p-6 sm:p-8 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Compass className="h-3.5 w-3.5" />
              <span>Cẩm Nang Vận Hành & Bản Vẽ Quy Trình (SOP Hub)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hướng Dẫn Sử Dụng & Quy Trình Nghiệp Vụ Chuỗi Khách Sạn
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Tài liệu hướng dẫn tác nghiệp chuẩn cho từng chức danh nhân sự: Lễ
              tân, Quản lý, Sales, Kỹ thuật và Chủ chuỗi. Bản vẽ workflow minh
              họa từng bước từ đón tiếp, buồng phòng đến phân quyền quản trị.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              className="bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700/80 text-xs flex items-center gap-2"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>In Toàn Bộ Quy Trình</span>
            </Button>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <Layers className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>4</strong> Quy trình tiêu chuẩn (SOP)
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-300">
            <Users className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>5</strong> Vai trò nhân sự chuyên biệt
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-300">
            <BookOpen className="h-4 w-4 text-blue-400 shrink-0" />
            <span>
              <strong>6</strong> Phân hệ nghiệp vụ cốt lõi
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-300">
            <ShieldCheck className="h-4 w-4 text-purple-400 shrink-0" />
            <span>
              <strong>100%</strong> Tuân thủ an toàn & RLS
            </span>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm nhanh quy trình, từ khóa (check-in, trả phòng, khóa OOO, blacklist, đối tác, quên mật khẩu)..."
          className="pl-10 h-11 bg-card/70 border-border/60 rounded-2xl text-xs sm:text-sm placeholder:text-muted-foreground/60 focus-visible:ring-amber-500/30"
        />
        {isSearching && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
          >
            Xóa tìm kiếm
          </button>
        )}
      </div>

      {/* Realtime Search Results Mode */}
      {isSearching ? (
        <div className="space-y-6">
          <div className="text-xs text-muted-foreground">
            Kết quả tìm kiếm cho:{" "}
            <span className="font-bold text-foreground font-mono">
              &quot;{searchQuery}&quot;
            </span>
          </div>

          {/* Workflows Search Result */}
          {filteredWorkflows.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-amber-400" />
                Quy trình khớp ({filteredWorkflows.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredWorkflows.map((w) => (
                  <div
                    key={w.id}
                    className="p-4 rounded-xl border border-border/60 bg-card space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-amber-400 font-bold">
                        {w.code}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {w.primaryRole}
                      </Badge>
                    </div>
                    <div className="font-bold text-sm text-foreground">
                      {w.title}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {w.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modules Search Result */}
          {filteredModules.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                Phân hệ khớp ({filteredModules.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredModules.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl border border-border/60 bg-card space-y-2"
                  >
                    <div className="font-bold text-sm text-foreground">
                      {m.title}
                    </div>
                    <p className="text-xs text-muted-foreground">{m.summary}</p>
                    <span className="text-[10px] font-mono text-amber-400">
                      {m.route}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Roles Search Result */}
          {filteredRoles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-emerald-400" />
                Vai trò khớp ({filteredRoles.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredRoles.map((r) => (
                  <div
                    key={r.key}
                    className="p-4 rounded-xl border border-border/60 bg-card space-y-2"
                  >
                    <div className="font-bold text-sm text-foreground">
                      {r.title}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredWorkflows.length === 0 &&
            filteredModules.length === 0 &&
            filteredRoles.length === 0 && (
              <div className="text-center py-12 text-xs text-muted-foreground">
                Không tìm thấy tài liệu phù hợp với từ khóa này. Vui lòng thử
                lại với từ khóa khác (ví dụ: &quot;check-in&quot;, &quot;bảo
                trì&quot;, &quot;phân quyền&quot;).
              </div>
            )}
        </div>
      ) : (
        /* Standard Navigation Tabs Mode */
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("workflows")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "workflows"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "bg-card/70 text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Bản Vẽ Workflow Nghiệp Vụ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "roles"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "bg-card/70 text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Hướng Dẫn Theo Vai Trò Nhân Sự</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("modules")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "modules"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "bg-card/70 text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Hướng Dẫn Từng Phân Hệ (Modules)</span>
            </button>
          </div>

          {/* Tab Views */}
          {activeTab === "workflows" && <WorkflowVisualizer />}
          {activeTab === "roles" && <RoleGuideView />}
          {activeTab === "modules" && <ModuleGuideView />}
        </div>
      )}
    </div>
  );
}
