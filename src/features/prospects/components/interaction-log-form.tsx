"use client";

import { Loader2, MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logProspectInteractionAction } from "../actions";
import {
  prospectChannelLabels,
  prospectChannels,
  prospectOutcomeLabels,
  prospectOutcomes,
} from "../schemas";
import type { ProspectChannel, ProspectOutcome } from "../types";
import { selectClass, textareaClass, todayVn } from "./prospect-ui";

interface InteractionLogFormProps {
  prospectId: string;
  onLogged: () => void;
}

/** Ghi nhật ký chăm sóc: tự cập nhật "lần liên hệ cuối" và "hẹn tiếp" của prospect */
export function InteractionLogForm({
  prospectId,
  onLogged,
}: InteractionLogFormProps) {
  const [channel, setChannel] = useState<ProspectChannel>("call");
  const [outcome, setOutcome] = useState<ProspectOutcome>("interested");
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await logProspectInteractionAction({
        prospect_id: prospectId,
        channel,
        outcome,
        note: note.trim() || null,
        next_follow_up_at: nextDate || null,
      });
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Đã ghi nhận lần liên hệ");
      setNote("");
      setNextDate("");
      onLogged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border p-3 space-y-3 bg-muted/20"
    >
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <MessageSquarePlus className="h-3.5 w-3.5" />
        Ghi nhận lần liên hệ
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="il-channel" className="text-xs">
            Hình thức
          </Label>
          <select
            id="il-channel"
            className={selectClass}
            value={channel}
            onChange={(e) => setChannel(e.target.value as ProspectChannel)}
          >
            {prospectChannels.map((c) => (
              <option key={c} value={c}>
                {prospectChannelLabels[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="il-outcome" className="text-xs">
            Kết quả
          </Label>
          <select
            id="il-outcome"
            className={selectClass}
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as ProspectOutcome)}
          >
            {prospectOutcomes.map((o) => (
              <option key={o} value={o}>
                {prospectOutcomeLabels[o]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="il-next" className="text-xs">
            Hẹn liên hệ tiếp
          </Label>
          <Input
            id="il-next"
            type="date"
            min={todayVn()}
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
          />
        </div>
      </div>
      <textarea
        rows={2}
        className={textareaClass}
        placeholder="Nội dung trao đổi, yêu cầu của khách, việc cần làm tiếp..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={busy}>
          {busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Lưu nhật ký
        </Button>
      </div>
    </form>
  );
}
