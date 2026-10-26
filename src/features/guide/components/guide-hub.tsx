"use client";

import {
  BookOpen,
  Compass,
  Layers,
  Printer,
  Scale,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Badge, Button, Input } from "@/shared/ui";
import {
  MODULE_GUIDES,
  ROLE_GUIDES,
  RULE_GROUPS,
  WORKFLOW_DIAGRAMS,
} from "../data/guide-data";
import { ModuleGuideView } from "./module-guide-view";
import { RoleGuideView } from "./role-guide-view";
import { RulesView } from "./rules-view";
import { WorkflowVisualizer } from "./workflow-visualizer";

type TabMode = "workflows" | "roles" | "modules" | "rules";

const TABS: Array<{
  id: TabMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "workflows", label: "Quy trình (SOP)", icon: Layers },
  { id: "roles", label: "Theo vai trò nhân sự", icon: Users },
  { id: "modules", label: "Theo phân hệ", icon: BookOpen },
  { id: "rules", label: "Quy tắc nghiệp vụ", icon: Scale },
];

const includes = (text: string, q: string) => text.toLowerCase().includes(q);

export function GuideHub() {
  const [activeTab, setActiveTab] = useState<TabMode>("workflows");
  const [searchQuery, setSearchQuery] = useState("");

  const q = searchQuery.toLowerCase().trim();
  const isSearching = q.length > 0;

  const filteredWorkflows = WORKFLOW_DIAGRAMS.filter(
    (w) =>
      includes(w.title, q) ||
      includes(w.code, q) ||
      includes(w.description, q) ||
      w.nodes.some(
        (n) =>
          includes(n.title, q) ||
          includes(n.action, q) ||
          n.details.some((d) => includes(d, q)),
      ),
  );
  const filteredRoles = ROLE_GUIDES.filter(
    (r) =>
      includes(r.title, q) ||
      includes(r.description, q) ||
      r.keyResponsibilities.some((x) => includes(x, q)),
  );
  const filteredModules = MODULE_GUIDES.filter(
    (m) =>
      includes(m.title, q) ||
      includes(m.summary, q) ||
      m.features.some(
        (f) =>
          includes(f.name, q) ||
          includes(f.description, q) ||
          f.howTo.some((h) => includes(h, q)),
      ) ||
      m.faq.some((f) => includes(f.q, q) || includes(f.a, q)),
  );
  const filteredRules = RULE_GROUPS.flatMap((g) =>
    g.rules
      .filter((r) => includes(r.rule, q) || includes(r.detail, q))
      .map((r) => ({ ...r, group: g.title })),
  );

  const ruleCount = RULE_GROUPS.reduce((n, g) => n + g.rules.length, 0);
  const nothingFound =
    filteredWorkflows.length === 0 &&
    filteredModules.length === 0 &&
    filteredRoles.length === 0 &&
    filteredRules.length === 0;

  return (
    <div className="space-y-6">
      {/* Hero: nền tối đặc (không dùng gradient trong suốt để chữ luôn đủ tương phản) */}
      <div className="relative rounded-3xl border border-amber-500/30 bg-slate-900 p-6 sm:p-8 overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Compass className="h-3.5 w-3.5" />
              <span>Cẩm nang vận hành & bản vẽ quy trình (SOP)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hướng dẫn sử dụng & Quy trình nghiệp vụ chuỗi khách sạn
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Tài liệu tác nghiệp cho từng chức danh (Lễ tân, Quản lý, Sales, Kỹ
              thuật, Chủ chuỗi): quy trình từng bước, hướng dẫn từng phân hệ và
              các quy tắc cần nhớ. Nội dung đối chiếu với quyền thực tế của hệ
              thống.
            </p>
          </div>

          <div className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              className="bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700 hover:text-white text-xs flex items-center gap-2"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>In tài liệu</span>
            </Button>
          </div>
        </div>

        <div className="relative z-10 mt-6 pt-5 border-t border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-slate-200">
            <Layers className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong className="text-white">{WORKFLOW_DIAGRAMS.length}</strong>{" "}
              quy trình tiêu chuẩn (SOP)
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-200">
            <Users className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-white">{ROLE_GUIDES.length}</strong> vai
              trò nhân sự
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-200">
            <BookOpen className="h-4 w-4 text-sky-400 shrink-0" />
            <span>
              <strong className="text-white">{MODULE_GUIDES.length}</strong>{" "}
              phân hệ nghiệp vụ
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-200">
            <ShieldCheck className="h-4 w-4 text-violet-400 shrink-0" />
            <span>
              <strong className="text-white">{ruleCount}</strong> quy tắc cần
              nhớ
            </span>
          </div>
        </div>
      </div>

      {/* Tìm kiếm */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm quy trình, thao tác, quy tắc (check-in, hủy lượt, khóa phòng, blacklist, voucher, hoa hồng, nhận chăm sóc…)"
          className="pl-10 pr-28 h-11 bg-card border-border rounded-2xl text-xs sm:text-sm focus-visible:ring-amber-500/30"
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

      {isSearching ? (
        <div className="space-y-6">
          <div className="text-xs text-muted-foreground">
            Kết quả cho:{" "}
            <span className="font-bold text-foreground font-mono">
              &quot;{searchQuery}&quot;
            </span>
          </div>

          {filteredWorkflows.length > 0 && (
            <ResultSection
              icon={Layers}
              title={`Quy trình (${filteredWorkflows.length})`}
              iconClass="text-amber-600"
            >
              {filteredWorkflows.map((w) => (
                <ResultCard key={w.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-amber-800 dark:text-amber-300 font-bold">
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
                </ResultCard>
              ))}
            </ResultSection>
          )}

          {filteredModules.length > 0 && (
            <ResultSection
              icon={BookOpen}
              title={`Phân hệ (${filteredModules.length})`}
              iconClass="text-sky-600"
            >
              {filteredModules.map((m) => (
                <ResultCard key={m.id}>
                  <div className="font-bold text-sm text-foreground">
                    {m.title}
                  </div>
                  <p className="text-xs text-muted-foreground">{m.summary}</p>
                  <span className="text-[10px] font-mono text-amber-800 dark:text-amber-300">
                    {m.route}
                  </span>
                </ResultCard>
              ))}
            </ResultSection>
          )}

          {filteredRules.length > 0 && (
            <ResultSection
              icon={Scale}
              title={`Quy tắc (${filteredRules.length})`}
              iconClass="text-violet-600"
            >
              {filteredRules.map((r) => (
                <ResultCard key={`${r.group}-${r.rule}`}>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {r.group}
                  </div>
                  <div className="font-bold text-sm text-foreground">
                    {r.rule}
                  </div>
                  <p className="text-xs text-muted-foreground">{r.detail}</p>
                </ResultCard>
              ))}
            </ResultSection>
          )}

          {filteredRoles.length > 0 && (
            <ResultSection
              icon={Users}
              title={`Vai trò (${filteredRoles.length})`}
              iconClass="text-emerald-600"
            >
              {filteredRoles.map((r) => (
                <ResultCard key={r.key}>
                  <div className="font-bold text-sm text-foreground">
                    {r.title}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.description}
                  </p>
                </ResultCard>
              ))}
            </ResultSection>
          )}

          {nothingFound && (
            <div className="text-center py-12 text-xs text-muted-foreground">
              Không tìm thấy tài liệu phù hợp. Thử từ khóa khác (ví dụ:
              &quot;check-in&quot;, &quot;bảo trì&quot;, &quot;phân
              quyền&quot;).
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div
            role="tablist"
            className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                    active
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "bg-card text-muted-foreground border border-border hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab === "workflows" && <WorkflowVisualizer />}
          {activeTab === "roles" && <RoleGuideView />}
          {activeTab === "modules" && <ModuleGuideView />}
          {activeTab === "rules" && <RulesView />}
        </div>
      )}
    </div>
  );
}

function ResultSection({
  icon: Icon,
  title,
  iconClass,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  iconClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function ResultCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-2">
      {children}
    </div>
  );
}
