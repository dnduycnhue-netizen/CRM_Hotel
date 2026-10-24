"use client";

import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Settings2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui";
import { type SetBranchModuleChange, setBranchModulesAction } from "../actions";
import type { Branch, BranchModuleMatrix, SystemModule } from "../domain/types";

type ModuleState = "off" | "readonly" | "on";

interface ModuleMatrixTableProps {
  matrix?: BranchModuleMatrix;
  modules?: SystemModule[];
  branches?: Branch[];
  initialStates?: Record<string, Record<string, ModuleState>>;
}

interface PendingConfirmAction {
  type: "enable_dependencies" | "disable_children";
  moduleKey: string;
  moduleName: string;
  branchId: string | null; // null = all branches
  targetState: ModuleState;
  affectedKeys: string[];
}

export function ModuleMatrixTable({
  matrix,
  modules: propModules,
  branches: propBranches,
  initialStates: propStates,
}: ModuleMatrixTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const modules = useMemo(
    () => matrix?.modules || propModules || [],
    [matrix, propModules],
  );
  const branches = useMemo(
    () => matrix?.branches || propBranches || [],
    [matrix, propBranches],
  );

  // Initial state mapping from server
  const baseInitialStates = useMemo(() => {
    if (matrix?.states) return matrix.states;
    if (propStates) return propStates;

    const map: Record<string, Record<string, ModuleState>> = {};
    for (const m of modules) {
      map[m.key] = {};
      for (const b of branches) {
        map[m.key][b.id] = m.isCore ? "on" : m.defaultState;
      }
    }
    return map;
  }, [matrix, propStates, modules, branches]);

  const [savedStates, setSavedStates] =
    useState<Record<string, Record<string, ModuleState>>>(baseInitialStates);
  const [moduleStates, setModuleStates] =
    useState<Record<string, Record<string, ModuleState>>>(baseInitialStates);

  const [searchQuery, setSearchQuery] = useState("");
  const [confirmModal, setConfirmModal] = useState<PendingConfirmAction | null>(
    null,
  );

  // Map for quick module lookup
  const moduleMap = useMemo(() => {
    const map = new Map<string, SystemModule>();
    for (const m of modules) {
      map.set(m.key, m);
    }
    return map;
  }, [modules]);

  // Transitive children finder (modules depending on key)
  const getTransitiveChildren = (
    key: string,
    allMods: SystemModule[],
  ): string[] => {
    const children = new Set<string>();
    const stack = [key];
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const m of allMods) {
        if (m.dependsOn.includes(current) && !children.has(m.key)) {
          children.add(m.key);
          stack.push(m.key);
        }
      }
    }
    return Array.from(children);
  };

  // Transitive parents finder (dependencies of key)
  const getTransitiveParents = (
    key: string,
    allMods: SystemModule[],
  ): string[] => {
    const parents = new Set<string>();
    const stack = [key];
    while (stack.length > 0) {
      const current = stack.pop()!;
      const mod = allMods.find((m) => m.key === current);
      if (mod) {
        for (const dep of mod.dependsOn) {
          if (!parents.has(dep)) {
            parents.add(dep);
            stack.push(dep);
          }
        }
      }
    }
    return Array.from(parents);
  };

  // Calculate changes compared to savedStates
  const pendingChanges = useMemo(() => {
    const changes: SetBranchModuleChange[] = [];
    for (const m of modules) {
      if (m.isCore) continue;
      for (const b of branches) {
        const cur = moduleStates[m.key]?.[b.id] ?? m.defaultState;
        const saved = savedStates[m.key]?.[b.id] ?? m.defaultState;
        if (cur !== saved) {
          changes.push({
            branchId: b.id,
            moduleKey: m.key,
            state: cur,
          });
        }
      }
    }
    return changes;
  }, [modules, branches, moduleStates, savedStates]);

  // Internal apply state
  const applyStateDirectly = (
    moduleKey: string,
    branchId: string | null,
    targetState: ModuleState,
    additionalChanges?: Array<{ key: string; state: ModuleState }>,
  ) => {
    setModuleStates((prev) => {
      const next = { ...prev };
      const targetBranches = branchId
        ? [branches.find((b) => b.id === branchId)!].filter(Boolean)
        : branches;

      // Update primary module
      if (!next[moduleKey]) next[moduleKey] = {};
      next[moduleKey] = { ...next[moduleKey] };
      for (const b of targetBranches) {
        next[moduleKey][b.id] = targetState;
      }

      // Update additional cascaded or dependency modules
      if (additionalChanges && additionalChanges.length > 0) {
        for (const change of additionalChanges) {
          if (!next[change.key]) next[change.key] = {};
          next[change.key] = { ...next[change.key] };
          for (const b of targetBranches) {
            next[change.key][b.id] = change.state;
          }
        }
      }

      return next;
    });
  };

  // State change handler with dependency & cascade checks
  const handleStateChange = (
    moduleKey: string,
    branchId: string | null,
    targetState: ModuleState,
  ) => {
    const mod = moduleMap.get(moduleKey);
    if (!mod || mod.isCore || !mod.isAvailable) return;

    const currentBranchStates = branchId
      ? [moduleStates[moduleKey]?.[branchId] ?? mod.defaultState]
      : branches.map(
          (b) => moduleStates[moduleKey]?.[b.id] ?? mod.defaultState,
        );

    // If already in target state, do nothing
    if (currentBranchStates.every((s) => s === targetState)) return;

    if (targetState !== "off") {
      // Check missing parent dependencies
      const parents = getTransitiveParents(moduleKey, modules);
      const missingParents = new Set<string>();

      for (const pKey of parents) {
        const pMod = moduleMap.get(pKey);
        if (!pMod || pMod.isCore) continue;

        if (branchId) {
          const pState = moduleStates[pKey]?.[branchId] ?? pMod.defaultState;
          if (pState === "off") missingParents.add(pKey);
        } else {
          // Check across any branch
          for (const b of branches) {
            const pState = moduleStates[pKey]?.[b.id] ?? pMod.defaultState;
            if (pState === "off") {
              missingParents.add(pKey);
              break;
            }
          }
        }
      }

      if (missingParents.size > 0) {
        setConfirmModal({
          type: "enable_dependencies",
          moduleKey,
          moduleName: mod.name,
          branchId,
          targetState,
          affectedKeys: Array.from(missingParents),
        });
        return;
      }
    } else {
      // Check active child modules that depend on this
      const children = getTransitiveChildren(moduleKey, modules);
      const activeChildren = new Set<string>();

      for (const cKey of children) {
        const cMod = moduleMap.get(cKey);
        if (!cMod || cMod.isCore) continue;

        if (branchId) {
          const cState = moduleStates[cKey]?.[branchId] ?? cMod.defaultState;
          if (cState !== "off") activeChildren.add(cKey);
        } else {
          for (const b of branches) {
            const cState = moduleStates[cKey]?.[b.id] ?? cMod.defaultState;
            if (cState !== "off") {
              activeChildren.add(cKey);
              break;
            }
          }
        }
      }

      if (activeChildren.size > 0) {
        setConfirmModal({
          type: "disable_children",
          moduleKey,
          moduleName: mod.name,
          branchId,
          targetState,
          affectedKeys: Array.from(activeChildren),
        });
        return;
      }
    }

    applyStateDirectly(moduleKey, branchId, targetState);
  };

  const handleConfirmModal = () => {
    if (!confirmModal) return;
    const { moduleKey, branchId, targetState, type, affectedKeys } =
      confirmModal;

    if (type === "enable_dependencies") {
      const extraChanges = affectedKeys.map((k) => ({
        key: k,
        state: "on" as ModuleState,
      }));
      applyStateDirectly(moduleKey, branchId, targetState, extraChanges);
    } else {
      const extraChanges = affectedKeys.map((k) => ({
        key: k,
        state: "off" as ModuleState,
      }));
      applyStateDirectly(moduleKey, branchId, targetState, extraChanges);
    }

    setConfirmModal(null);
  };

  // Revert all pending changes
  const handleReset = () => {
    setModuleStates(savedStates);
    toast.info("Đã hoàn tác các thay đổi chưa lưu");
  };

  // Save changes to database
  const handleSave = () => {
    if (pendingChanges.length === 0) {
      toast.info("Không có thay đổi nào cần lưu");
      return;
    }

    startTransition(async () => {
      const res = await setBranchModulesAction(pendingChanges);
      if (res.ok) {
        toast.success(
          `Đã lưu thành công ${res.data.applied} cấu hình module cơ sở!`,
        );
        if (res.data.cascaded && res.data.cascaded.length > 0) {
          const cascadedNames = res.data.cascaded
            .map((k) => moduleMap.get(k)?.name || k)
            .join(", ");
          toast.info(`Các tính năng con đã tự động tắt theo: ${cascadedNames}`);
        }
        setSavedStates(moduleStates);
        router.refresh();
      } else {
        toast.error(res.error?.message || "Không thể lưu cấu hình module");
      }
    });
  };

  // Filter modules
  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.key.toLowerCase().includes(q) ||
        m.groupName.toLowerCase().includes(q),
    );
  }, [modules, searchQuery]);

  // Group modules by groupName
  const groupedModules = useMemo(() => {
    const groups: { groupName: string; list: SystemModule[] }[] = [];
    const groupMap = new Map<string, SystemModule[]>();

    for (const m of filteredModules) {
      if (!groupMap.has(m.groupName)) {
        groupMap.set(m.groupName, []);
        groups.push({
          groupName: m.groupName,
          list: groupMap.get(m.groupName)!,
        });
      }
      groupMap.get(m.groupName)!.push(m);
    }

    return groups;
  }, [filteredModules]);

  return (
    <>
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                Ma Trận Bật / Tắt Module Tính Năng Theo Cơ Sở
              </CardTitle>
              <CardDescription className="text-xs">
                Mỗi cơ sở có thể cấu hình trạng thái:{" "}
                <span className="font-semibold text-destructive">
                  Tắt (off)
                </span>{" "}
                /{" "}
                <span className="font-semibold text-amber-500">
                  Chỉ xem (readonly)
                </span>{" "}
                /{" "}
                <span className="font-semibold text-emerald-600">Bật (on)</span>
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Tìm module hoặc nhóm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-muted/40"
                />
              </div>

              {pendingChanges.length > 0 && (
                <>
                  <Badge
                    variant="outline"
                    className="h-8 px-2.5 text-xs border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium"
                  >
                    {pendingChanges.length} thay đổi chưa lưu
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={isPending}
                    className="h-8 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Hoàn tác
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isPending}
                    className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Lưu cấu hình
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-xs z-20 shadow-xs">
              <TableRow className="text-xs bg-muted/50 border-b">
                <TableHead className="w-[300px] min-w-[280px] font-semibold">
                  Tên Module & Nhóm
                </TableHead>
                <TableHead className="text-center font-bold w-[190px] min-w-[190px] bg-muted/70">
                  <span className="block text-foreground font-semibold">
                    Áp dụng toàn chuỗi
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Tất cả {branches.length} cơ sở)
                  </span>
                </TableHead>
                {branches.map((b) => (
                  <TableHead
                    key={b.id}
                    className="text-center font-bold min-w-[130px]"
                  >
                    <span className="block text-foreground truncate max-w-[150px]">
                      {b.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      ({b.code})
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {groupedModules.map((group) => (
                <div key={group.groupName} className="contents">
                  <TableRow className="bg-muted/30 border-y border-border/60 hover:bg-muted/30">
                    <TableCell
                      colSpan={branches.length + 2}
                      className="py-1.5 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground"
                    >
                      Nhóm: {group.groupName} ({group.list.length} tính năng)
                    </TableCell>
                  </TableRow>

                  {group.list.map((m) => {
                    const allBranchStates = branches.map(
                      (b) => moduleStates[m.key]?.[b.id] ?? m.defaultState,
                    );
                    const isAllOn = allBranchStates.every((s) => s === "on");
                    const isAllReadonly = allBranchStates.every(
                      (s) => s === "readonly",
                    );
                    const isAllOff = allBranchStates.every((s) => s === "off");

                    return (
                      <TableRow
                        key={m.key}
                        className="text-xs hover:bg-muted/40 transition-colors border-b border-border/40"
                      >
                        {/* Module Info */}
                        <TableCell className="py-2.5 align-middle">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-foreground text-xs">
                                {m.name}
                              </span>
                              {m.isCore && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] py-0 px-1 font-bold"
                                >
                                  Lõi
                                </Badge>
                              )}
                              {!m.isAvailable && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] py-0 px-1 text-muted-foreground border-dashed"
                                >
                                  Sắp có
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="font-mono">{m.key}</span>
                              {m.dependsOn.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                                  <Info className="h-3 w-3" />
                                  Kèm:{" "}
                                  {m.dependsOn
                                    .map((k) => moduleMap.get(k)?.name || k)
                                    .join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* All Branches Column */}
                        <TableCell className="text-center py-2.5 align-middle bg-muted/20">
                          {m.isCore ? (
                            <Badge
                              variant="default"
                              className="text-[10px] bg-primary/20 text-primary border-primary/30"
                            >
                              Luôn bật
                            </Badge>
                          ) : !m.isAvailable ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground bg-muted/40"
                            >
                              Khóa (Sắp có)
                            </Badge>
                          ) : (
                            <div className="inline-flex rounded-md border border-input p-0.5 bg-background shadow-xs">
                              <button
                                type="button"
                                title="Tắt cho tất cả cơ sở"
                                onClick={() =>
                                  handleStateChange(m.key, null, "off")
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  isAllOff
                                    ? "bg-destructive text-destructive-foreground font-bold"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                Tắt hết
                              </button>
                              <button
                                type="button"
                                title="Chỉ xem cho tất cả cơ sở"
                                onClick={() =>
                                  handleStateChange(m.key, null, "readonly")
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  isAllReadonly
                                    ? "bg-amber-500 text-white font-bold"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                Xem hết
                              </button>
                              <button
                                type="button"
                                title="Bật cho tất cả cơ sở"
                                onClick={() =>
                                  handleStateChange(m.key, null, "on")
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  isAllOn
                                    ? "bg-emerald-600 text-white font-bold"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                Bật hết
                              </button>
                            </div>
                          )}
                        </TableCell>

                        {/* Per-Branch Columns */}
                        {branches.map((b) => {
                          const state =
                            moduleStates[m.key]?.[b.id] || m.defaultState;
                          const isModified =
                            state !==
                            (savedStates[m.key]?.[b.id] ?? m.defaultState);

                          return (
                            <TableCell
                              key={b.id}
                              className={`text-center py-2.5 align-middle ${
                                isModified ? "bg-amber-500/5 font-semibold" : ""
                              }`}
                            >
                              {m.isCore ? (
                                <Badge
                                  variant="default"
                                  className="text-[10px] bg-primary/20 text-primary border-primary/30"
                                >
                                  Luôn bật
                                </Badge>
                              ) : !m.isAvailable ? (
                                <span className="text-[10px] text-muted-foreground italic">
                                  —
                                </span>
                              ) : (
                                <div className="inline-flex rounded-md border border-input p-0.5 bg-background shadow-xs">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStateChange(m.key, b.id, "off")
                                    }
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                      state === "off"
                                        ? "bg-destructive text-destructive-foreground font-bold shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    Tắt
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStateChange(m.key, b.id, "readonly")
                                    }
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                      state === "readonly"
                                        ? "bg-amber-500 text-white font-bold shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    Xem
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStateChange(m.key, b.id, "on")
                                    }
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                      state === "on"
                                        ? "bg-emerald-600 text-white font-bold shadow-xs"
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
                    );
                  })}
                </div>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Confirmation & Dependency Dialog */}
      <Dialog
        open={!!confirmModal}
        onOpenChange={(open) => !open && setConfirmModal(null)}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              {confirmModal?.type === "enable_dependencies" ? (
                <>
                  <HelpCircle className="h-5 w-5 text-amber-500" />
                  Cần bật thêm tính năng phụ thuộc
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Cảnh báo tự động tắt tính năng con
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1.5 leading-relaxed">
              {confirmModal?.type === "enable_dependencies" ? (
                <>
                  Để bật module <strong>{confirmModal.moduleName}</strong>, hệ
                  thống yêu cầu các tính năng phụ thuộc sau phải được bật kèm:
                </>
              ) : (
                <>
                  Khi tắt module <strong>{confirmModal?.moduleName}</strong>,
                  các tính năng con phụ thuộc vào module này sẽ tự động bị tắt
                  theo để đảm bảo tính toàn vẹn hệ thống:
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2.5">
            <div className="rounded-md border border-border/60 bg-muted/40 p-3 space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground block">
                {confirmModal?.type === "enable_dependencies"
                  ? "Danh sách module sẽ tự động BẬT kèm:"
                  : "Danh sách module con sẽ tự động TẮT theo:"}
              </span>
              <ul className="text-xs font-semibold space-y-1">
                {confirmModal?.affectedKeys.map((k) => (
                  <li key={k} className="flex items-center gap-1.5">
                    {confirmModal.type === "enable_dependencies" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    )}
                    <span>{moduleMap.get(k)?.name || k}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ({k})
                    </span>
                  </li>
                ))}
              </ul>
              {confirmModal?.branchId ? (
                <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                  Phạm vi áp dụng:{" "}
                  <strong>
                    {branches.find((b) => b.id === confirmModal.branchId)
                      ?.name || "Cơ sở"}
                  </strong>
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                  Phạm vi áp dụng: <strong>Tất cả cơ sở trong chuỗi</strong>
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmModal(null)}
              className="text-xs h-8"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmModal}
              className={`text-xs h-8 font-semibold ${
                confirmModal?.type === "enable_dependencies"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-destructive hover:bg-destructive/90 text-white"
              }`}
            >
              {confirmModal?.type === "enable_dependencies"
                ? "Bật kèm & Tiếp tục"
                : "Đồng ý tắt tất cả"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
