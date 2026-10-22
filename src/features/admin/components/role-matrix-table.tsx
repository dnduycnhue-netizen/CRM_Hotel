'use client';

import React, { useState, useTransition } from 'react';
import type { SystemRole, SystemPermission } from '../domain/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui';
import { Badge } from '@/shared/ui';
import { Button } from '@/shared/ui';
import { Checkbox } from '@/shared/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui';
import { ShieldCheck, Check, RotateCcw, Save, Loader2 } from 'lucide-react';
import { updateRolePermissionsAction } from '../actions';
import { toast } from 'sonner';

interface RoleMatrixTableProps {
  roles: SystemRole[];
  permissions: SystemPermission[];
}

export function RoleMatrixTable({
  roles,
  permissions,
}: RoleMatrixTableProps) {
  const [isPending, startTransition] = useTransition();

  // State: roleId -> Set of permission keys
  const [rolePerms, setRolePerms] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {};
    roles.forEach((r) => {
      map[r.id] = new Set(r.permissionKeys);
    });
    return map;
  });

  const [initialRolePerms, setInitialRolePerms] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {};
    roles.forEach((r) => {
      map[r.id] = new Set(r.permissionKeys);
    });
    return map;
  });

  // Calculate total changes count
  let changedCount = 0;
  roles.forEach((r) => {
    if (r.key === 'owner') return; // Owner is locked
    const current = rolePerms[r.id] || new Set();
    const initial = initialRolePerms[r.id] || new Set();
    permissions.forEach((p) => {
      if (current.has(p.key) !== initial.has(p.key)) {
        changedCount++;
      }
    });
  });

  // Group permissions by groupName
  const groupedPermissions = permissions.reduce((acc: Record<string, SystemPermission[]>, p) => {
    acc[p.groupName] = acc[p.groupName] || [];
    acc[p.groupName].push(p);
    return acc;
  }, {});

  const togglePermission = (roleId: string, roleKey: string, permKey: string) => {
    if (roleKey === 'owner') return; // Owner role cannot be modified

    setRolePerms((prev) => {
      const nextSet = new Set(prev[roleId]);
      if (nextSet.has(permKey)) {
        nextSet.delete(permKey);
      } else {
        nextSet.add(permKey);
      }
      return {
        ...prev,
        [roleId]: nextSet,
      };
    });
  };

  const handleReset = () => {
    setRolePerms(initialRolePerms);
    toast.info('Đã hủy bỏ các thay đổi phân quyền');
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        for (const r of roles) {
          if (r.key === 'owner') continue;
          const current = rolePerms[r.id] || new Set();
          const initial = initialRolePerms[r.id] || new Set();
          // Check if this role changed
          let hasDiff = false;
          if (current.size !== initial.size) {
            hasDiff = true;
          } else {
            for (const k of current) {
              if (!initial.has(k)) {
                hasDiff = true;
                break;
              }
            }
          }

          if (hasDiff) {
            const res = await updateRolePermissionsAction(r.id, Array.from(current));
            if (!res.ok) {
              toast.error(`Lỗi khi lưu vai trò ${r.name}: ${res.error.message}`);
              return;
            }
          }
        }

        setInitialRolePerms(rolePerms);
        toast.success(`Đã lưu thành công các thay đổi phân quyền vào cơ sở dữ liệu!`);
      } catch (err: any) {
        toast.error('Lỗi khi lưu phân quyền');
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/70 shadow-xs overflow-hidden rounded-2xl">
        <CardHeader className="pb-3 border-b border-border/50 bg-card/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                <span>Ma Trận Phân Quyền Vai Trò (Role Matrix)</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Tích chọn để cấp hoặc thu hồi quyền cho từng vai trò người dùng trong chuỗi khách sạn
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-semibold">
                {roles.length} Vai trò · {permissions.length} Quyền
              </Badge>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-20 shadow-xs">
              <TableRow className="text-xs bg-muted/40">
                <TableHead className="w-[320px] font-bold">Quyền hạn hệ thống</TableHead>
                {roles.map((r) => (
                  <TableHead key={r.id} className="text-center font-bold min-w-[120px]">
                    <div className="space-y-0.5">
                      <span className="block text-foreground font-bold">{r.name}</span>
                      <span className="text-[10px] font-medium text-muted-foreground block font-mono">
                        ({r.key})
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedPermissions).map(([group, groupPerms]) => (
                <React.Fragment key={group}>
                  {/* Group Header Row */}
                  <TableRow className="bg-muted/30 font-bold text-xs border-y border-border/50">
                    <TableCell colSpan={roles.length + 1} className="py-2.5 text-primary font-bold">
                      {group} ({groupPerms.length} quyền)
                    </TableCell>
                  </TableRow>

                  {/* Permission Rows */}
                  {groupPerms.map((p) => (
                    <TableRow key={p.key} className="text-xs hover:bg-muted/40 transition-colors">
                      <TableCell className="py-2">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground text-xs block">{p.label}</span>
                          <span className="text-[11px] text-muted-foreground block">{p.description}</span>
                          <span className="text-[10px] text-muted-foreground/80 font-mono block">
                            {p.key}
                          </span>
                        </div>
                      </TableCell>

                      {roles.map((r) => {
                        const isOwner = r.key === 'owner';
                        const isChecked = isOwner ? true : (rolePerms[r.id]?.has(p.key) || false);

                        return (
                          <TableCell key={r.id} className="text-center py-2">
                            <div className="flex items-center justify-center">
                              {isOwner ? (
                                <span className="h-5 w-5 rounded bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold text-xs">
                                  ✓
                                </span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(r.id, r.key, p.key)}
                                  className="h-4.5 w-4.5 rounded border-border/80 accent-amber-600 cursor-pointer"
                                />
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Floating Save Changes Bar */}
      {changedCount > 0 && (
        <div className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-xs font-bold text-amber-400">
            Đã thay đổi {changedCount} quyền hạn
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isPending}
              className="h-8.5 text-xs bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 rounded-lg"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="h-8.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Lưu phân quyền
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
