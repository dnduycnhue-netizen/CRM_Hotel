'use client';

import { useState } from 'react';
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
import { ShieldCheck, Check, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';

interface RoleMatrixTableProps {
  roles: SystemRole[];
  permissions: SystemPermission[];
}

export function RoleMatrixTable({
  roles,
  permissions,
}: RoleMatrixTableProps) {
  // State: roleId -> Set of permission keys
  const [rolePerms, setRolePerms] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {};
    roles.forEach((r) => {
      map[r.id] = new Set(r.permissionKeys);
    });
    return map;
  });

  const [initialRolePerms] = useState<Record<string, Set<string>>>(() => {
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
    toast.success(`Đã lưu thành công ${changedCount} thay đổi phân quyền!`);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Ma Trận Phân Quyền Vai Trò (Dynamic Role Matrix)
              </CardTitle>
              <CardDescription className="text-xs">
                Tích chọn để cấp hoặc thu hồi quyền cho từng vai trò người dùng trong hệ thống
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {roles.length} Vai trò · {permissions.length} Quyền
              </Badge>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-20 shadow-sm">
              <TableRow className="text-xs bg-muted/50">
                <TableHead className="w-[320px] font-semibold">Quyền hạn hệ thống</TableHead>
                {roles.map((r) => (
                  <TableHead key={r.id} className="text-center font-bold min-w-[110px]">
                    <div className="space-y-0.5">
                      <span className="block text-foreground">{r.name}</span>
                      <span className="text-[10px] font-normal text-muted-foreground block font-mono">
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
                  <TableRow className="bg-muted/30 font-semibold text-xs border-y border-border/50">
                    <TableCell colSpan={roles.length + 1} className="py-2.5 text-primary font-bold">
                      {group} ({groupPerms.length} quyền)
                    </TableCell>
                  </TableRow>

                  {/* Permission Rows */}
                  {groupPerms.map((p) => (
                    <TableRow key={p.key} className="text-xs hover:bg-muted/40 transition-colors">
                      <TableCell className="py-2.5">
                        <div className="space-y-0.5">
                          <span className="font-medium text-foreground block">{p.label}</span>
                          <span className="text-[11px] text-muted-foreground block font-mono">
                            {p.key}
                          </span>
                        </div>
                      </TableCell>
                      {roles.map((r) => {
                        const isOwner = r.key === 'owner';
                        const isChecked = isOwner || (rolePerms[r.id]?.has(p.key) ?? false);
                        return (
                          <TableCell key={r.id} className="text-center py-2.5">
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isOwner}
                                onChange={() => togglePermission(r.id, r.key, p.key)}
                                className={`h-4 w-4 rounded border-border transition-colors ${
                                  isOwner
                                    ? 'opacity-60 cursor-not-allowed accent-primary'
                                    : 'cursor-pointer accent-primary'
                                }`}
                              />
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
        <div className="fixed bottom-6 right-6 z-40 bg-foreground text-background px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-xs font-semibold">
            Đã thay đổi {changedCount} quyền hạn
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8 text-xs bg-transparent border-background/40 hover:bg-background/20 text-background"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Lưu phân quyền
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
import React from 'react';
