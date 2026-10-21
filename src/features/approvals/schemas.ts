import { z } from 'zod';

export const proposeMergeSchema = z.object({
  keep_guest_id: z.string().uuid(),
  drop_guest_id: z.string().uuid(),
  reason: z.string().default('manual'),
});

export const approveMergeSchema = z.object({
  request_id: z.string().uuid(),
  field_choices: z
    .record(z.string(), z.enum(['keep', 'drop']))
    .default({}),
});

export const rejectMergeSchema = z.object({
  request_id: z.string().uuid(),
  note: z.string().optional().nullable(),
});

export const proposeFlagSchema = z.object({
  guest_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  flag_type: z.enum(['blacklist', 'attention']),
  reason: z.string().min(10, 'Lý do tối thiểu 10 ký tự').max(1000),
  evidence_paths: z.array(z.string()).default([]),
});

export const decideFlagSchema = z.object({
  id: z.string().uuid(),
  approve: z.boolean(),
  note: z.string().optional().nullable(),
});

export const removeFlagSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(5, 'Lý do gỡ cờ tối thiểu 5 ký tự').max(500),
});

export type ProposeMergeInput = z.input<typeof proposeMergeSchema>;
export type ApproveMergeInput = z.input<typeof approveMergeSchema>;
export type RejectMergeInput = z.input<typeof rejectMergeSchema>;
export type ProposeFlagInput = z.input<typeof proposeFlagSchema>;
export type DecideFlagInput = z.input<typeof decideFlagSchema>;
export type RemoveFlagInput = z.input<typeof removeFlagSchema>;
