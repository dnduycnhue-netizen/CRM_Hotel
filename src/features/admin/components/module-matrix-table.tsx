"use client";

import { Save, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui";
import type { Branch, SystemModule } from "../domain/types";

interface ModuleMatrixTableProps {
  modules: SystemModule[];
  branches: Branch[];
}

type ModuleState = "off" | "readonly" | "on";

export function ModuleMatrixTable({
  modules,
  branches,
}: ModuleMatrixTableProps) {
  // State: moduleKey -> branchId -> state ('off' | 'readonly' | 'on')
  const [moduleStates, setModuleStates] = useState<
    Record<string, Record<string, ModuleState>>
  >(() => {
    const map: Record<string, Record<string, ModuleState>> = {};
    modules.forEach((m) => {
      map[m.key] = {};
      branches.forEach((b) => {
        map[m.key][b.id] = m.defaultState;
      });
    });
    return map;
  });

  const [hasChanges, setHasChanges] = useState(false);

  const setBranchModuleState = (
    moduleKey: string,
    branchId: string,
    state: ModuleState,
  ) => {
    const mod = modules.find((m) => m.key === moduleKey);
    if (mod?.isCore) return; // Core module cannot be disabled

    setModuleStates((prev) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [branchId]: state,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    toast.success("Đã lưu cấu hình bật/tắt module thành công!");
    setHasChanges(false);
  };

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Ma Trận Bật/Tắt Module Tính Năng Theo Cơ Sở
            </CardTitle>
            <CardDescription className="text-xs">
              Mỗi cơ sở có thể cấu hình trạng thái: Tắt (off) / Chỉ xem
              (readonly) / Bật (on)
            </CardDescription>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                className="h-8 text-xs font-bold"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                Lưu cấu hình module
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-20 shadow-sm">
            <TableRow className="text-xs bg-muted/50">
              <TableHead className="w-[260px] font-semibold">
                Tên Module
              </TableHead>
              {branches.map((b) => (
                <TableHead
                  key={b.id}
                  className="text-center font-bold min-w-[120px]"
                >
                  <span className="block text-foreground">{b.name}</span>
                  <span className="text-[10px] text-muted-foreground block font-mono">
                    ({b.code})
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((m) => (
              <TableRow
                key={m.key}
                className="text-xs hover:bg-muted/40 transition-colors"
              >
                <TableCell className="py-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {m.name}
                      </span>
                      {m.isCore && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] py-0 px-1.5 font-bold"
                        >
                          Lõi
                        </Badge>
                      )}
                      {!m.isAvailable && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 text-muted-foreground"
                        >
                          Sắp có
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      {m.key} ({m.groupName})
                    </span>
                  </div>
                </TableCell>

                {branches.map((b) => {
                  const state = moduleStates[m.key]?.[b.id] || m.defaultState;
                  return (
                    <TableCell key={b.id} className="text-center py-2.5">
                      {m.isCore ? (
                        <Badge
                          variant="default"
                          className="text-[10px] bg-primary/20 text-primary hover:bg-primary/20"
                        >
                          Luôn bật
                        </Badge>
                      ) : (
                        <div className="inline-flex rounded-md border border-input p-0.5 bg-background shadow-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setBranchModuleState(m.key, b.id, "off")
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              state === "off"
                                ? "bg-destructive text-destructive-foreground font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Tắt
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setBranchModuleState(m.key, b.id, "readonly")
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              state === "readonly"
                                ? "bg-amber-500 text-white font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Xem
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setBranchModuleState(m.key, b.id, "on")
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              state === "on"
                                ? "bg-emerald-600 text-white font-bold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Bật
                          </button>
                        </div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
