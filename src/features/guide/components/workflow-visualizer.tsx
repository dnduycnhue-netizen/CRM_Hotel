"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Printer,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, CardContent } from "@/shared/ui";
import { WORKFLOW_DIAGRAMS } from "../data/guide-data";

export function WorkflowVisualizer() {
  const [activeWorkflowId, setActiveWorkflowId] = useState(
    WORKFLOW_DIAGRAMS[0].id,
  );
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    WORKFLOW_DIAGRAMS[0].nodes[0]?.id || null,
  );

  const activeWf =
    WORKFLOW_DIAGRAMS.find((w) => w.id === activeWorkflowId) ||
    WORKFLOW_DIAGRAMS[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Workflow Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {WORKFLOW_DIAGRAMS.map((wf) => {
            const isActive = wf.id === activeWorkflowId;
            return (
              <button
                key={wf.id}
                type="button"
                onClick={() => {
                  setActiveWorkflowId(wf.id);
                  setSelectedStepId(wf.nodes[0]?.id || null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                  isActive
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10"
                    : "bg-card/60 text-muted-foreground border-border/50 hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                  {wf.code}
                </span>
                <span>{wf.title.split(":")[1] || wf.title}</span>
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="text-xs shrink-0 flex items-center gap-1.5 border-border/60"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>In Quy trình (SOP)</span>
        </Button>
      </div>

      {/* Workflow Header Banner */}
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-card to-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs font-mono"
              >
                {activeWf.code}
              </Badge>
              <h2 className="text-lg font-bold text-foreground">
                {activeWf.title}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl">
              {activeWf.description}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-muted-foreground">
              Bộ phận chủ trì:
            </span>
            <Badge
              variant="outline"
              className="bg-card text-foreground border-border/80 text-xs font-semibold"
            >
              {activeWf.primaryRole}
            </Badge>
          </div>
        </div>
      </div>

      {/* Visual Workflow Steps Diagram (Horizontal on desktop / Vertical on mobile) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Sơ đồ luồng xử lý từng bước (Click vào bước để xem hướng dẫn chi
            tiết)
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {activeWf.nodes.length} bước tiêu chuẩn
          </span>
        </div>

        {/* Pipeline Nodes View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeWf.nodes.map((node) => {
            const isSelected = selectedStepId === node.id;

            return (
              <div
                key={node.id}
                className={`relative rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30"
                    : "bg-card/70 border-border/60 hover:border-amber-500/30 hover:bg-card"
                }`}
              >
                {/* Node Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStepId(node.id)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <div
                        className={`h-6 w-6 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                          isSelected
                            ? "bg-amber-500 text-slate-950 font-bold"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {node.stepNumber}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-muted/30 text-muted-foreground border-border/50"
                      >
                        {node.role}
                      </Badge>
                    </button>

                    <Link
                      href={node.screen.split(" ")[0]}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 hover:underline"
                    >
                      <span>Màn hình</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedStepId(node.id)}
                    className="w-full text-left group cursor-pointer"
                  >
                    <h4 className="text-sm font-bold text-foreground mb-1.5 leading-snug group-hover:text-amber-400 transition-colors">
                      {node.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                      {node.action}
                    </p>
                  </button>
                </div>

                {/* Node Footer Indicator */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {node.screen}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedStepId(node.id)}
                    className="cursor-pointer"
                  >
                    {isSelected ? (
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Đang xem
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60 hover:text-foreground text-[10px]">
                        Bấm xem
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Step Detailed View Card */}
      {selectedStepId && (
        <Card className="border-border/60 bg-card/90 shadow-sm mt-4">
          <CardContent className="p-6">
            {(() => {
              const node = activeWf.nodes.find((n) => n.id === selectedStepId);
              if (!node) return null;

              return (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm shadow-md shadow-amber-500/20">
                        {node.stepNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-foreground">
                            {node.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-xs"
                          >
                            Thực hiện: {node.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Màn hình thao tác:{" "}
                          <span className="font-mono text-amber-300/90 font-medium">
                            {node.screen}
                          </span>
                        </p>
                      </div>
                    </div>

                    <Link
                      href={node.screen.split(" ")[0]}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm shrink-0"
                    >
                      <span>Mở màn hình này</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  {/* Actions & Instructions */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Mô tả hành động tiêu chuẩn
                    </h4>
                    <p className="text-sm text-foreground bg-muted/20 border border-border/40 p-3.5 rounded-xl leading-relaxed">
                      {node.action}
                    </p>
                  </div>

                  {/* Step Execution Details */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Các bước thực hiện cụ thể
                    </h4>
                    <ul className="space-y-2">
                      {node.details.map((detail) => (
                        <li
                          key={detail}
                          className="flex items-start gap-2.5 text-xs text-muted-foreground bg-card p-3 rounded-lg border border-border/40"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                          <span className="leading-relaxed">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Caution Alert if any */}
                  {node.caution && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-rose-300">
                          Lưu ý kiểm soát rủi ro & bảo mật:
                        </div>
                        <p className="text-xs text-rose-200/90 mt-0.5 leading-relaxed">
                          {node.caution}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
