'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui';
import { selectBranchAction } from '@/features/admin/actions';
import { Building2, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface BranchSelectorProps {
  branches: Array<{ id: string; code: string; name: string }>;
  currentBranchId: string | null;
}

export function BranchSelector({
  branches,
  currentBranchId,
}: BranchSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleBranchChange = (value: string | null) => {
    if (!value) return;
    const branch = branches.find((b) => b.id === value);
    startTransition(async () => {
      await selectBranchAction(value);
      toast.info(`Đã chuyển làm việc sang cơ sở: ${branch?.name || value}`);
      router.refresh();
    });
  };

  if (!branches.length) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 bg-muted/50 rounded-lg border border-border/60">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Chưa có cơ sở</span>
      </div>
    );
  }

  const selectedBranch = branches.find(b => b.id === (currentBranchId || branches[0]?.id)) || branches[0];

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-medium mr-1">
        <MapPin className="h-3.5 w-3.5 text-amber-500" />
        <span>Cơ sở:</span>
      </div>
      <Select
        defaultValue={currentBranchId || branches[0]?.id}
        onValueChange={handleBranchChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-[200px] h-9 text-xs font-semibold border-border/80 bg-background/90 shadow-sm hover:border-amber-500/50 hover:bg-accent/40 transition-all rounded-lg focus:ring-amber-500/30">
          <div className="flex items-center gap-2 truncate">
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500 shrink-0" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[10px] shrink-0">
                {selectedBranch?.code?.slice(0, 2) || 'KS'}
              </span>
            )}
            <span className="truncate font-semibold text-foreground">
              {selectedBranch?.name || 'Chọn cơ sở'}
            </span>
          </div>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {branches.map((b) => (
            <SelectItem key={b.id} value={b.id} className="text-xs font-medium py-2">
              <div className="flex items-center justify-between w-full gap-3">
                <span className="font-semibold text-foreground">{b.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {b.code}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
