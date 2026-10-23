"use client";

import {
  BarChart3,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lightbulb,
  Settings,
  Sparkles,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { Badge, Card, CardContent } from "@/shared/ui";
import { MODULE_GUIDES } from "../data/guide-data";

export function ModuleGuideView() {
  const [selectedModuleId, setSelectedModuleId] = useState(MODULE_GUIDES[0].id);
  const [expandedFaq, setExpandedFaq] = useState<Record<string, boolean>>({});

  const activeModule =
    MODULE_GUIDES.find((m) => m.id === selectedModuleId) || MODULE_GUIDES[0];

  const toggleFaq = (index: number) => {
    setExpandedFaq((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const getModuleIcon = (id: string) => {
    switch (id) {
      case "mod-checkin-stays":
        return UserCheck;
      case "mod-guests":
        return Users;
      case "mod-facilities":
        return Wrench;
      case "mod-reports":
        return BarChart3;
      case "mod-approvals":
        return CheckSquare;
      case "mod-settings":
        return Settings;
      default:
        return Sparkles;
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {MODULE_GUIDES.map((mod) => {
          const isSelected = mod.id === selectedModuleId;
          const Icon = getModuleIcon(mod.id);

          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => setSelectedModuleId(mod.id)}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 select-none ${
                isSelected
                  ? "bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10 text-amber-300 ring-1 ring-amber-500/20"
                  : "bg-card/70 border-border/60 hover:bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-bold leading-tight line-clamp-1">
                {mod.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Module Main Card */}
      <Card className="border-border/60 bg-card/90 shadow-sm">
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 border-b border-border/50">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-foreground">
                  {activeModule.title}
                </h3>
                <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md border border-border/40">
                  {activeModule.route}
                </span>
              </div>
              <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
                {activeModule.summary}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-muted-foreground">
                Vai trò tham gia:
              </span>
              <div className="flex flex-wrap gap-1">
                {activeModule.rolesInvolved.map((role) => (
                  <Badge
                    key={role}
                    variant="outline"
                    className="text-[10px] bg-muted/40 text-foreground border-border/60"
                  >
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Features Walkthrough */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Các tính năng và hướng dẫn thao tác từng bước
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeModule.features.map((feat) => (
                <div
                  key={feat.name}
                  className="rounded-2xl border border-border/60 bg-muted/10 p-5 space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <h5 className="text-sm font-bold text-foreground flex items-center justify-between">
                      <span>{feat.name}</span>
                    </h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {feat.description}
                    </p>

                    <div className="space-y-1.5 pt-2">
                      <div className="text-[11px] font-semibold text-muted-foreground">
                        Cách thực hiện:
                      </div>
                      <ul className="space-y-1 text-xs text-foreground/90 pl-3">
                        {feat.howTo.map((step) => (
                          <li key={step} className="leading-relaxed">
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {feat.tips && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2.5 text-xs text-amber-300/90">
                      <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{feat.tips}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Accordion */}
          {activeModule.faq && activeModule.faq.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-primary" />
                Câu hỏi thường gặp khi vận hành (FAQ)
              </h4>

              <div className="space-y-2">
                {activeModule.faq.map((item, index) => {
                  const isOpen = !!expandedFaq[index];
                  return (
                    <div
                      key={item.q}
                      className="rounded-xl border border-border/50 bg-card overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(index)}
                        className="w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-bold text-foreground hover:bg-muted/30 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-amber-400 font-mono">Q:</span>
                          <span>{item.q}</span>
                        </span>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="p-3.5 pt-0 text-xs text-muted-foreground border-t border-border/30 bg-muted/10 leading-relaxed pl-8">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
