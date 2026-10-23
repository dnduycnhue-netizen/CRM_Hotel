import { z } from "zod";
import { messages } from "./i18n/vi";

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "MODULE_DISABLED"
  | "VALIDATION"
  | "DUPLICATE_DOCUMENT"
  | "DUPLICATE_PHONE"
  | "ROOM_OCCUPIED"
  | "ROOM_OUT_OF_ORDER"
  | "BLACKLIST_ACK_REQUIRED"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNKNOWN";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ErrorCode;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };

// Postgres RAISE EXCEPTION dùng ERRCODE riêng → map về ErrorCode
const PG_CODE_MAP: Record<string, ErrorCode> = {
  P0401: "UNAUTHENTICATED",
  P0403: "FORBIDDEN",
  P0404: "NOT_FOUND",
  P0409: "CONFLICT",
  P0410: "DUPLICATE_DOCUMENT",
  P0411: "DUPLICATE_PHONE",
  P0412: "ROOM_OCCUPIED",
  P0413: "ROOM_OUT_OF_ORDER",
  P0422: "VALIDATION",
  P0423: "MODULE_DISABLED",
  P0428: "BLACKLIST_ACK_REQUIRED",
  P0429: "RATE_LIMITED",
  "23505": "CONFLICT",
  "23514": "VALIDATION",
};

const isErrorCode = (c: string): c is ErrorCode => c in messages.errors;

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

// Nhận ErrorCode của app hoặc SQLSTATE của Postgres
export function fail(
  code: string | undefined,
  fieldErrors?: Record<string, string[]>,
  customMessage?: string,
): ActionResult<never> {
  const c: ErrorCode =
    code && isErrorCode(code) ? code : (code && PG_CODE_MAP[code]) || "UNKNOWN";
  return {
    ok: false,
    error: {
      code: c,
      message: customMessage || messages.errors[c],
      fieldErrors,
    },
  };
}

export const toFieldErrors = (e: z.ZodError) =>
  z.flattenError(e).fieldErrors as Record<string, string[]>;
