'use client';

import { useTransition } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';
import { selectBranchAction } from '@/features/admin/actions';
import { Building2 } from 'lucide-react';

interface BranchSelectorProps {
  branches: Array<{ id: string; code: string; name: string }>;
  currentBranchId: string | null;
}

export function BranchSelector({
  branches,
  currentBranchId,
}: BranchSelectorProps) {
  const [isPending, startTransition] = useTransition();

  const handleBranchChange = (value: string | null) => {
    if (!value) return;
    startTransition(async () => {
      await selectBranchAction(value);
    });
  };

  if (!branches.length) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1 bg-muted/40 rounded">
        <Building2 className="h-3.5 w-3.5" />
        <span>Chưa có cơ sở</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        defaultValue={currentBranchId || branches[0]?.id}
        onValueChange={handleBranchChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-[180px] h-9 text-xs font-medium border-border/60 bg-background">
          <Building2 className="h-3.5 w-3.5 mr-2 text-primary shrink-0" />
          <SelectValue placeholder="Chọn cơ sở" />
        </SelectTrigger>
        <SelectContent>
          {branches.map((b) => (
            <SelectItem key={b.id} value={b.id} className="text-xs">
              {b.name} ({b.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
