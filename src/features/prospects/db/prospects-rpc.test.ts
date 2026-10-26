// Kiểm tra hành vi các RPC của migration 52 (khách tiềm năng B2B) trên Postgres nhúng
// PGlite — không cần Docker. Phân quyền được mô phỏng bằng auth-stubs.sql nên test này
// KHÔNG thay thế `pnpm supabase test db` (RLS / hàm quyền thật).
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../../../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const SALES1 = "aaaaaaaa-0000-0000-0000-000000000001";
const SALES2 = "bbbbbbbb-0000-0000-0000-000000000002";
const MANAGER = "cccccccc-0000-0000-0000-000000000003";

const SALES_PERMS =
  "prospect.view,prospect.manage,prospect.convert,prospect.import,partner.manage,partner.view";
const MANAGER_PERMS =
  "prospect.view,prospect.manage,prospect.assign,prospect.convert,prospect.import,prospect.export,partner.manage,partner.view,guest.view_summary";

let db: PGlite;

async function as(uid: string | null, perms: string) {
  await db.query(
    "select set_config('test.uid',$1,false), set_config('test.perms',$2,false)",
    [uid ?? "", perms],
  );
}

type CallResult<T = unknown> =
  | { ok: true; v: T }
  | { ok: false; code?: string; msg: string; detail?: string };

async function call<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<CallResult<T>> {
  try {
    const r = await db.query<{ v: T }>(sql, params);
    return { ok: true, v: r.rows[0]?.v as T };
  } catch (e) {
    const err = e as { code?: string; message: string; detail?: string };
    return { ok: false, code: err.code, msg: err.message, detail: err.detail };
  }
}

const save = (
  payload: Record<string, unknown>,
  force = false,
  reason?: string,
) =>
  call<{ status: string; id?: string; candidates?: unknown[] }>(
    "select public.save_prospect($1::jsonb,$2,$3) as v",
    [JSON.stringify(payload), force, reason ?? null],
  );

const one = async (sql: string, params: unknown[] = []) =>
  (await db.query<Record<string, unknown>>(sql, params)).rows[0];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(read("src/features/prospects/db/auth-stubs.sql"));

  // Dùng save_partner thật (migration 41) cho luồng chuyển đổi
  const m41 = read(
    "supabase/migrations/20261101000041_sprint5_partners_and_groups.sql",
  );
  const start = m41.indexOf("create or replace function public.save_partner(");
  const end =
    m41.indexOf("$$;", m41.indexOf("return to_jsonb(v_res);", start)) + 3;
  await db.exec(m41.slice(start, end));

  await db.exec(read("supabase/migrations/20261101000052_prospects.sql"));
  await db.exec(`
    insert into public.profiles values
      ('${SALES1}','Sales Một',true),('${SALES2}','Sales Hai',true),('${MANAGER}','Quản Lý',true);
    insert into public.user_effective_permissions values
      ('${SALES1}',gen_random_uuid(),'prospect.manage'),
      ('${SALES2}',gen_random_uuid(),'prospect.manage'),
      ('${MANAGER}',gen_random_uuid(),'prospect.manage');`);
}, 60_000);

afterAll(async () => {
  await db.close();
});

const base = {
  company_name: "Công ty TNHH Du Lịch Biển Xanh",
  kind: "tour_operator",
  phone: "090 978 92 32",
  tax_code: "0312 345 678",
  province: "Bình Định",
  website: "https://www.bienxanh.vn/gioi-thieu",
  contact_name: "Nguyễn Văn A",
  contact_phone: "0988 111 222",
};

describe("tạo + chống trùng", () => {
  let p1: string;

  it("sales tạo mới: tự gán chính mình, dữ liệu được chuẩn hóa", async () => {
    await as(SALES1, SALES_PERMS);
    const r = await save(base);
    expect(r.ok && r.v.status).toBe("saved");
    p1 = (r as { v: { id: string } }).v.id;
    const row = await one(
      "select assigned_to, phone_norm, tax_code_norm, name_norm, website_domain from public.tour_prospects where id=$1",
      [p1],
    );
    expect(row).toMatchObject({
      assigned_to: SALES1,
      phone_norm: "0909789232",
      tax_code_norm: "0312345678",
      name_norm: "du lich bien xanh",
      website_domain: "bienxanh.vn",
    });
  });

  it("chặn cứng trùng SĐT (biến thể +84) và trùng MST", async () => {
    const phone = await save({
      company_name: "Biển Xanh 2",
      kind: "other",
      phone: "+84909789232",
    });
    expect(phone).toMatchObject({ ok: false, code: "P0451" });
    expect(JSON.parse((phone as { detail: string }).detail).id).toBe(p1);

    const tax = await save({
      company_name: "Khác hẳn",
      kind: "other",
      phone: "0911000111",
      tax_code: "0312-345-678",
    });
    expect(tax).toMatchObject({ ok: false, code: "P0450" });
  });

  it("bắt buộc SĐT hoặc email", async () => {
    const r = await save({ company_name: "Thiếu liên hệ", kind: "other" });
    expect(r).toMatchObject({ ok: false, code: "P0422" });
  });

  it("chặn trùng với đối tác đã có (SĐT và MST)", async () => {
    await db.exec(
      "insert into public.partners (name, kind, phone, tax_code) values ('Vietravel Hà Nội','tour_operator','0912 000 999','0100 111 222')",
    );
    const phone = await save({
      company_name: "VTR HN",
      kind: "other",
      phone: "+84912000999",
    });
    expect(phone).toMatchObject({ ok: false, code: "P0451" });
    expect(JSON.parse((phone as { detail: string }).detail).source).toBe(
      "partner",
    );
    const tax = await save({
      company_name: "VTR 2",
      kind: "other",
      phone: "0933000111",
      tax_code: "0100111222",
    });
    expect(tax).toMatchObject({ ok: false, code: "P0450" });
  });

  it("nghi trùng tên + tỉnh: trả ứng viên, chỉ ghi khi có lý do", async () => {
    const dup = {
      company_name: "DU LỊCH BIỂN XANH",
      kind: "travel_agency",
      phone: "0944555666",
      province: "bình định",
    };
    const asked = await save(dup);
    expect(asked.ok && asked.v.status).toBe("possible_duplicates");
    expect(
      (await one("select count(*)::int c from public.tour_prospects")).c,
    ).toBe(1);

    expect(await save(dup, true, "   ")).toMatchObject({
      ok: false,
      code: "P0422",
    });

    const forced = await save(dup, true, "Chi nhánh khác pháp nhân");
    expect(forced.ok && forced.v.status).toBe("saved");
    const row = await one(
      "select dup_override_reason, dup_reviewed from public.tour_prospects where id=$1",
      [(forced as { v: { id: string } }).v.id],
    );
    expect(row).toMatchObject({
      dup_override_reason: "Chi nhánh khác pháp nhân",
      dup_reviewed: false,
    });
  });

  it("domain của nền tảng chung (facebook.com) KHÔNG bị coi là cùng website", async () => {
    const a = await save({
      company_name: "Quán Tour A",
      kind: "small_tour",
      phone: "0955000111",
      website: "https://www.facebook.com/quantoura",
    });
    expect(a.ok && a.v.status).toBe("saved");
    const b = await save({
      company_name: "Quán Tour B",
      kind: "small_tour",
      phone: "0955000222",
      website: "https://facebook.com/quantourb",
    });
    expect(b.ok && b.v.status).toBe("saved");
  });

  it("cùng website riêng thì nghi trùng", async () => {
    const r = await save({
      company_name: "Tên khác nữa",
      kind: "other",
      phone: "0955000333",
      website: "http://bienxanh.vn",
    });
    expect(r.ok && r.v.status).toBe("possible_duplicates");
  });
});

describe("che SĐT + tìm kiếm", () => {
  it("sales khác thấy SĐT bị che; người phụ trách và quản lý thấy đủ", async () => {
    const p = await one(
      "select id from public.tour_prospects where phone_norm='0909789232'",
    );
    await as(SALES2, SALES_PERMS);
    const other = await call<Array<Record<string, unknown>>>(
      "select public.get_prospects() as v",
    );
    const seen = (other as { v: Array<Record<string, unknown>> }).v.find(
      (x) => x.id === p.id,
    );
    expect(seen).toMatchObject({
      is_masked: true,
      phone_display: "090****232",
      contact_phone_display: "098****222",
    });

    await as(SALES1, SALES_PERMS);
    const mine = await call<Array<Record<string, unknown>>>(
      "select public.get_prospects() as v",
    );
    expect(
      (mine as { v: Array<Record<string, unknown>> }).v.find(
        (x) => x.id === p.id,
      ),
    ).toMatchObject({
      is_masked: false,
      phone_display: "090 978 92 32",
    });

    await as(MANAGER, MANAGER_PERMS);
    const mgr = await call<Array<Record<string, unknown>>>(
      "select public.get_prospects() as v",
    );
    expect(
      (mgr as { v: Array<Record<string, unknown>> }).v.find(
        (x) => x.id === p.id,
      )?.is_masked,
    ).toBe(false);
  });

  it("tìm theo SĐT chuẩn hóa và tên có dấu", async () => {
    const byPhone = await call<unknown[]>(
      "select public.get_prospects($1) as v",
      ["+84 909 789 232"],
    );
    expect((byPhone as { v: unknown[] }).v).toHaveLength(1);
    const byName = await call<unknown[]>(
      "select public.get_prospects($1) as v",
      ["biển xanh"],
    );
    expect((byName as { v: unknown[] }).v.length).toBeGreaterThanOrEqual(2);
  });
});

describe("cách ly sales", () => {
  let pid: string;

  it("sales khác không sửa / ghi liên hệ / đổi trạng thái / chuyển đổi", async () => {
    pid = (
      await one(
        "select id from public.tour_prospects where phone_norm='0909789232'",
      )
    ).id as string;
    await as(SALES2, SALES_PERMS);
    expect(
      await save({ ...base, id: pid, company_name: "Đổi tên" }),
    ).toMatchObject({ ok: false, code: "P0403" });
    expect(
      await call(
        "select public.log_prospect_interaction($1,'call','interested','x',null) as v",
        [pid],
      ),
    ).toMatchObject({ ok: false, code: "P0403" });
    expect(
      await call("select public.set_prospect_status($1,'lost','x') as v", [
        pid,
      ]),
    ).toMatchObject({ ok: false, code: "P0403" });
    expect(
      await call("select public.convert_prospect_to_partner($1) as v", [pid]),
    ).toMatchObject({ ok: false, code: "P0403" });
  });

  it("sales không có quyền chuyển người phụ trách (assign)", async () => {
    expect(
      await call("select public.assign_prospect($1,$2) as v", [pid, SALES2]),
    ).toMatchObject({ ok: false, code: "P0403" });
  });

  it("quản lý vẫn chuyển phụ trách như cũ", async () => {
    await as(MANAGER, MANAGER_PERMS);
    const r = await call("select public.assign_prospect($1,$2) as v", [
      pid,
      SALES2,
    ]);
    expect(r.ok).toBe(true);
    expect(
      (
        await one("select assigned_to from public.tour_prospects where id=$1", [
          pid,
        ])
      ).assigned_to,
    ).toBe(SALES2);
    // trả lại cho sales 1 để các test sau giữ nguyên kịch bản
    expect(
      (await call("select public.assign_prospect($1,$2) as v", [pid, SALES1]))
        .ok,
    ).toBe(true);
  });
});

describe("Nhận chăm sóc (prospect chưa gán)", () => {
  let unassigned: string;

  it("prospect chưa gán: sales không sửa được trước khi nhận", async () => {
    await db.exec(`insert into public.tour_prospects
      (company_name,name_norm,kind,phone,phone_norm,status,created_by)
      values ('Công ty Import Chưa Gán','import chua gan','tour_operator','0977111222','0977111222','new','${MANAGER}')`);
    unassigned = (
      await one(
        "select id from public.tour_prospects where phone_norm='0977111222'",
      )
    ).id as string;

    await as(SALES1, SALES_PERMS);
    expect(
      await save({
        id: unassigned,
        company_name: "Công ty Import Chưa Gán",
        kind: "tour_operator",
        phone: "0977111222",
      }),
    ).toMatchObject({ ok: false, code: "P0403" });
    expect(
      await call(
        "select public.log_prospect_interaction($1,'call','interested','x',null) as v",
        [unassigned],
      ),
    ).toMatchObject({ ok: false, code: "P0403" });

    const list = await call<Array<Record<string, unknown>>>(
      "select public.get_prospects() as v",
    );
    const row = (list as { v: Array<Record<string, unknown>> }).v.find(
      (x) => x.id === unassigned,
    );
    expect(row).toMatchObject({
      can_claim: true,
      can_edit: false,
      is_masked: true,
      assigned_to: null,
    });
  });

  it("SĐT của prospect chưa gán cũng bị che khi hiện làm ứng viên trùng", async () => {
    await as(SALES2, SALES_PERMS);
    const r = await call<Array<{ phone: string | null; source: string }>>(
      "select public.check_prospect_duplicates($1,$2) as v",
      ["Công ty Import Chưa Gán", "0977111222"],
    );
    const hit = (
      r as { v: Array<{ phone: string | null; source: string }> }
    ).v.find((c) => c.source === "prospect");
    expect(hit?.phone).toBe("097****222");
  });

  it("sales nhận không cần quyền assign → trở thành người phụ trách, sửa + ghi nhật ký được", async () => {
    await as(SALES1, SALES_PERMS); // SALES_PERMS không có prospect.assign
    expect(SALES_PERMS.includes("prospect.assign")).toBe(false);

    const claim = await call("select public.claim_prospect($1) as v", [
      unassigned,
    ]);
    expect(claim.ok).toBe(true);
    expect(
      (
        await one("select assigned_to from public.tour_prospects where id=$1", [
          unassigned,
        ])
      ).assigned_to,
    ).toBe(SALES1);

    const edit = await save({
      id: unassigned,
      company_name: "Công ty Import Chưa Gán",
      kind: "tour_operator",
      phone: "0977111222",
      note: "đã nhận",
    });
    expect(edit.ok && edit.v.status).toBe("saved");
    const log = await call(
      "select public.log_prospect_interaction($1,'call','interested','Quan tâm',(current_date+2)) as v",
      [unassigned],
    );
    expect(log.ok).toBe(true);

    const list = await call<Array<Record<string, unknown>>>(
      "select public.get_prospects() as v",
    );
    expect(
      (list as { v: Array<Record<string, unknown>> }).v.find(
        (x) => x.id === unassigned,
      ),
    ).toMatchObject({
      can_claim: false,
      can_edit: true,
      is_masked: false,
    });
  });

  it("ghi audit lần nhận", async () => {
    const audit = await one(
      "select actor_id, meta from public.audit_logs where action='prospect.claim' and entity_id=$1",
      [unassigned],
    );
    expect(audit.actor_id).toBe(SALES1);
    const timeline = await one(
      "select note from public.prospect_interactions where prospect_id=$1 and entry_type='status_change' order by created_at desc limit 1",
      [unassigned],
    );
    expect(String(timeline.note)).toContain("Nhận chăm sóc");
  });

  it("sales thứ 2 nhận prospect đã có người phụ trách → bị chặn", async () => {
    await as(SALES2, SALES_PERMS);
    const r = await call("select public.claim_prospect($1) as v", [unassigned]);
    expect(r).toMatchObject({ ok: false, code: "P0409" });
    expect((r as { msg: string }).msg).toContain("Sales Một");
    expect(
      (
        await one("select assigned_to from public.tour_prospects where id=$1", [
          unassigned,
        ])
      ).assigned_to,
    ).toBe(SALES1);
  });

  it("sales nhận lại prospect của chính mình cũng bị chặn; không nhận được khi không có quyền manage", async () => {
    await as(SALES1, SALES_PERMS);
    expect(
      await call("select public.claim_prospect($1) as v", [unassigned]),
    ).toMatchObject({ ok: false, code: "P0409" });
    await as(SALES2, "prospect.view");
    expect(
      await call("select public.claim_prospect($1) as v", [unassigned]),
    ).toMatchObject({ ok: false, code: "P0403" });
  });

  it("không nhận được prospect đã chuyển đổi / không tiềm năng", async () => {
    await as(SALES1, SALES_PERMS);
    await db.exec(`insert into public.tour_prospects
      (company_name,name_norm,kind,phone,phone_norm,status,lost_reason,created_by)
      values ('Công ty Đã Hủy','da huy','other','0977333444','0977333444','lost','không có nhu cầu','${MANAGER}')`);
    const lost = (
      await one(
        "select id from public.tour_prospects where phone_norm='0977333444'",
      )
    ).id as string;
    expect(
      await call("select public.claim_prospect($1) as v", [lost]),
    ).toMatchObject({ ok: false, code: "P0422" });
  });

  it("quản lý chuyển phụ trách người đã nhận → vẫn hoạt động", async () => {
    await as(MANAGER, MANAGER_PERMS);
    const r = await call("select public.assign_prospect($1,$2) as v", [
      unassigned,
      SALES2,
    ]);
    expect(r.ok).toBe(true);
    expect(
      (
        await one("select assigned_to from public.tour_prospects where id=$1", [
          unassigned,
        ])
      ).assigned_to,
    ).toBe(SALES2);
  });
});

describe("nhật ký, trạng thái, chuyển đổi", () => {
  let pid: string;

  it("ghi nhật ký cập nhật lần liên hệ cuối + hẹn tiếp + trạng thái", async () => {
    pid = (
      await one(
        "select id from public.tour_prospects where phone_norm='0909789232'",
      )
    ).id as string;
    await as(SALES1, SALES_PERMS);
    expect(
      (
        await call(
          "select public.log_prospect_interaction($1,'call','interested','Quan tâm',(current_date+3)) as v",
          [pid],
        )
      ).ok,
    ).toBe(true);
    const row = await one(
      "select status, last_contacted_at is not null as lc, next_follow_up_at = current_date+3 as nf from public.tour_prospects where id=$1",
      [pid],
    );
    expect(row).toMatchObject({ status: "contacted", lc: true, nf: true });
    expect(
      await call(
        "select public.log_prospect_interaction($1,'call','other','x',(current_date-1)) as v",
        [pid],
      ),
    ).toMatchObject({ ok: false, code: "P0422" });
  });

  it("trạng thái: nurturing/negotiating bắt buộc ngày hẹn, lost bắt buộc lý do", async () => {
    await db.query(
      "update public.tour_prospects set next_follow_up_at=null where id=$1",
      [pid],
    );
    expect(
      await call(
        "select public.set_prospect_status($1,'negotiating',null,null) as v",
        [pid],
      ),
    ).toMatchObject({ ok: false, code: "P0422" });
    expect(
      await call("select public.set_prospect_status($1,'lost',null) as v", [
        pid,
      ]),
    ).toMatchObject({ ok: false, code: "P0422" });
    expect(
      (
        await call(
          "select public.set_prospect_status($1,'negotiating',null,(current_date+5)) as v",
          [pid],
        )
      ).ok,
    ).toBe(true);
  });

  it("quá hạn chăm sóc được liệt kê", async () => {
    await db.query(
      "update public.tour_prospects set next_follow_up_at=current_date-2 where id=$1",
      [pid],
    );
    const r = await call<Array<{ id: string; is_overdue: boolean }>>(
      "select public.get_prospects(null,null,null,null,null,true) as v",
    );
    const list = (r as { v: Array<{ id: string; is_overdue: boolean }> }).v;
    expect(list.map((x) => x.id)).toContain(pid);
    expect(list.every((x) => x.is_overdue)).toBe(true);
  });

  it("chuyển đổi: tạo đúng 1 đối tác, lần 2 idempotent, hồ sơ bị khóa", async () => {
    await as(SALES1, SALES_PERMS);
    const first = await call<{
      partner_id: string;
      already_converted: boolean;
    }>("select public.convert_prospect_to_partner($1) as v", [pid]);
    expect(first.ok && first.v.already_converted).toBe(false);
    const partnerId = (first as { v: { partner_id: string } }).v.partner_id;

    const again = await call<{
      partner_id: string;
      already_converted: boolean;
    }>("select public.convert_prospect_to_partner($1) as v", [pid]);
    expect(again.ok && again.v).toMatchObject({
      already_converted: true,
      partner_id: partnerId,
    });
    expect(
      (
        await one(
          "select count(*)::int c from public.partners where name like '%Biển Xanh%'",
        )
      ).c,
    ).toBe(1);

    const partner = await one(
      "select kind, phone, tax_code, note from public.partners where id=$1",
      [partnerId],
    );
    expect(partner).toMatchObject({
      kind: "tour_operator",
      phone: "090 978 92 32",
      tax_code: "0312 345 678",
    });
    expect(String(partner.note)).toContain(
      "Nguồn: chuyển đổi từ khách tiềm năng",
    );

    expect(await save({ ...base, id: pid })).toMatchObject({
      ok: false,
      code: "P0422",
    });
    expect(
      await call(
        "select public.log_prospect_interaction($1,'call','other',null,null) as v",
        [pid],
      ),
    ).toMatchObject({ ok: false, code: "P0422" });
    expect(
      await call("select public.claim_prospect($1) as v", [pid]),
    ).toMatchObject({ ok: false, code: "P0422" });
  });

  it("chuyển đổi dừng khi đã có đối tác trùng (P0452) và không đổi gì", async () => {
    await as(SALES1, SALES_PERMS);
    await db.exec(`insert into public.tour_prospects
      (company_name,name_norm,kind,phone,phone_norm,assigned_to,status,created_by)
      values ('Công ty Saigontourist','saigontourist','tour_operator','0977000111','0977000111','${SALES1}','contacted','${SALES1}')`);
    const id = (
      await one(
        "select id from public.tour_prospects where name_norm='saigontourist'",
      )
    ).id as string;
    await db.exec(
      "insert into public.partners (name, kind, phone) values ('SAIGONTOURIST','tour_operator','+84 977 000 111')",
    );
    const r = await call("select public.convert_prospect_to_partner($1) as v", [
      id,
    ]);
    expect(r).toMatchObject({ ok: false, code: "P0452" });
    expect(JSON.parse((r as { detail: string }).detail).source).toBe("partner");
    expect(
      (await one("select status from public.tour_prospects where id=$1", [id]))
        .status,
    ).toBe("contacted");
  });

  it("không có quyền / chưa đăng nhập bị chặn", async () => {
    await as(SALES1, "");
    expect(await call("select public.get_prospects() as v")).toMatchObject({
      ok: false,
      code: "P0403",
    });
    expect(await save(base)).toMatchObject({ ok: false, code: "P0403" });
    await as(null, "");
    expect(await call("select public.get_prospects() as v")).toMatchObject({
      ok: false,
      code: "P0401",
    });
  });
});

describe("import dry-run (preview_prospect_import)", () => {
  const preview = async (rows: unknown[]) =>
    call<
      Array<{
        row_id: string;
        classification: string;
        hard: { source: string } | null;
      }>
    >("select public.preview_prospect_import($1::jsonb) as v", [
      JSON.stringify(rows),
    ]);

  it("phân loại new / soft / hard / invalid, kể cả trùng giữa các dòng trong file, không ghi gì", async () => {
    await as(SALES1, SALES_PERMS);
    await db.exec(
      "delete from public.tour_prospects; delete from public.partners;",
    );
    await db.exec(
      "insert into public.partners (name, kind, phone) values ('Đối Tác Cũ','other','0911222333')",
    );
    await save({
      company_name: "Biển Xanh Quy Nhơn",
      kind: "other",
      phone: "0909000111",
      province: "Bình Định",
    });

    const r = await preview([
      {
        row_id: "r1",
        company_name: "Sao Mai Travel",
        phone: "0922333444",
        province: "Huế",
      },
      {
        row_id: "r2",
        company_name: "Trùng cứng với partner",
        phone: "+84 911 222 333",
      },
      {
        row_id: "r3",
        company_name: "Công ty TNHH Biển Xanh Quy Nhơn",
        phone: "0933000999",
        province: "Bình Định",
      },
      {
        row_id: "r4",
        company_name: "Sao Mai Travel Khác",
        phone: "0922 333 444",
      },
      { row_id: "r5", company_name: "X", phone: "0911" },
      { row_id: "r6", company_name: "Thiếu liên hệ" },
      {
        row_id: "r7",
        company_name: "Công ty TNHH Sao Mai Travel",
        email: "a@saomai.vn",
        province: "Huế",
      },
      {
        row_id: "r8",
        company_name: "Chi nhánh A",
        phone: "0966000001",
        website: "https://vietravel.com",
      },
      {
        row_id: "r9",
        company_name: "Chi nhánh B",
        phone: "0966000002",
        website: "https://www.vietravel.com/hn",
      },
      {
        row_id: "r10",
        company_name: "Quán FB 1",
        phone: "0966000003",
        website: "https://facebook.com/a",
      },
      {
        row_id: "r11",
        company_name: "Quán FB 2",
        phone: "0966000004",
        website: "https://facebook.com/b",
      },
      {
        row_id: "r12",
        company_name: "Trường THPT Lê Hồng Phong",
        phone: "0966000005",
        province: "TP.HCM",
      },
      {
        row_id: "r13",
        company_name: "Trường THPT Lê Hồng Phong",
        phone: "0966000006",
        province: "Nam Định",
      },
    ]);
    expect(r.ok).toBe(true);
    const cls = Object.fromEntries(
      (r as { v: Array<{ row_id: string; classification: string }> }).v.map(
        (x) => [x.row_id, x.classification],
      ),
    );
    expect(cls).toMatchObject({
      r1: "new",
      r2: "hard",
      r3: "soft",
      r4: "hard",
      r5: "invalid",
      r6: "invalid",
      r7: "soft",
      r8: "new",
      r9: "soft", // cùng website riêng trong file
      r10: "new",
      r11: "new", // facebook.com là domain nền tảng chung
      r12: "new",
      r13: "new", // cùng tên nhưng khác tỉnh
    });
    expect(
      (
        r as { v: Array<{ row_id: string; hard: { source: string } | null }> }
      ).v.find((x) => x.row_id === "r4")?.hard?.source,
    ).toBe("file");
    expect(
      (await one("select count(*)::int c from public.tour_prospects")).c,
    ).toBe(1);
  });

  it("giới hạn 500 dòng và yêu cầu quyền prospect.import", async () => {
    const rows = Array.from({ length: 501 }, (_, i) => ({
      company_name: `A${i}`,
      phone: `09${10000000 + i}`,
    }));
    expect(await preview(rows)).toMatchObject({ ok: false, code: "P0422" });
    await as(SALES1, "prospect.view,prospect.manage");
    expect(await preview([])).toMatchObject({ ok: false, code: "P0403" });
  });
});

describe("prospect chưa gán: không RPC nào trả null cho cờ / lộ SĐT", () => {
  let unassigned: string;
  const BOOLEAN_FLAGS = [
    "is_masked",
    "can_edit",
    "can_claim",
    "is_overdue",
    "dup_reviewed",
  ];

  const expectStrictBooleans = (obj: Record<string, unknown>) => {
    for (const key of BOOLEAN_FLAGS) {
      expect(typeof obj[key], `cờ ${key} phải là boolean`).toBe("boolean");
    }
  };

  it("chuẩn bị: prospect chưa gán, có tên/tỉnh/website/SĐT riêng", async () => {
    await db.exec(
      "delete from public.tour_prospects; delete from public.partners;",
    );
    await db.exec(`insert into public.tour_prospects
      (company_name,name_norm,kind,phone,phone_norm,province,website,website_domain,status,created_by)
      values ('Công ty Chưa Gán Kiểm Tra','chua gan kiem tra','tour_operator','0977 555 666','0977555666','Huế','https://chuagan.vn','chuagan.vn','new','${MANAGER}')`);
    unassigned = (
      await one(
        "select id from public.tour_prospects where phone_norm='0977555666'",
      )
    ).id as string;
  });

  it("get_prospects: cờ là boolean thật, SĐT bị che với sales", async () => {
    await as(SALES2, SALES_PERMS);
    const r = await call<Array<Record<string, unknown>>>(
      "select public.get_prospects() as v",
    );
    const row = (r as { v: Array<Record<string, unknown>> }).v.find(
      (x) => x.id === unassigned,
    ) as Record<string, unknown>;
    expectStrictBooleans(row);
    expect(row).toMatchObject({
      is_masked: true,
      can_edit: false,
      can_claim: true,
      phone_display: "097****666",
    });
  });

  it("get_prospect_detail: cờ là boolean thật, SĐT bị che với sales", async () => {
    await as(SALES2, SALES_PERMS);
    const r = await call<{ prospect: Record<string, unknown> }>(
      "select public.get_prospect_detail($1) as v",
      [unassigned],
    );
    const prospect = (r as { v: { prospect: Record<string, unknown> } }).v
      .prospect;
    expectStrictBooleans(prospect);
    expect(prospect).toMatchObject({
      is_masked: true,
      can_edit: false,
      phone_display: "097****666",
    });
  });

  it("check_prospect_duplicates: ứng viên chưa gán bị che SĐT (trùng cứng và nghi trùng)", async () => {
    await as(SALES2, SALES_PERMS);
    const r = await call<Array<{ match_type: string; phone: string | null }>>(
      "select public.check_prospect_duplicates($1,$2,null,$3,$4) as v",
      ["Chưa Gán Kiểm Tra", "0977555666", "https://www.chuagan.vn", "Huế"],
    );
    const hits = (
      r as { v: Array<{ match_type: string; phone: string | null }> }
    ).v;
    expect(hits.map((h) => h.match_type)).toEqual(
      expect.arrayContaining(["hard_phone", "soft_name", "soft_domain"]),
    );
    for (const h of hits) expect(h.phone).toBe("097****666");
  });

  it("save_prospect (possible_duplicates): ứng viên chưa gán bị che SĐT", async () => {
    await as(SALES2, SALES_PERMS);
    const r = await save({
      company_name: "Chưa Gán Kiểm Tra",
      kind: "other",
      phone: "0966888999",
      province: "Huế",
    });
    expect(r.ok && r.v.status).toBe("possible_duplicates");
    const cands = (r as { v: { candidates: Array<{ phone: string | null }> } })
      .v.candidates;
    expect(cands.length).toBeGreaterThan(0);
    for (const c of cands) expect(c.phone).toBe("097****666");
  });

  it("preview_prospect_import: ứng viên chưa gán bị che SĐT", async () => {
    await as(SALES2, SALES_PERMS);
    const r = await call<
      Array<{
        classification: string;
        candidates: Array<{ phone: string | null }>;
      }>
    >("select public.preview_prospect_import($1::jsonb) as v", [
      JSON.stringify([
        {
          row_id: "x1",
          company_name: "Chưa Gán Kiểm Tra",
          phone: "0966777888",
          province: "Huế",
        },
      ]),
    ]);
    const row = (
      r as {
        v: Array<{
          classification: string;
          candidates: Array<{ phone: string | null }>;
        }>;
      }
    ).v[0];
    expect(row.classification).toBe("soft");
    for (const c of row.candidates) expect(c.phone).toBe("097****666");
  });

  it("quản lý vẫn thấy đủ SĐT ở mọi RPC", async () => {
    await as(MANAGER, MANAGER_PERMS);
    const list = await call<Array<Record<string, unknown>>>(
      "select public.get_prospects() as v",
    );
    const row = (list as { v: Array<Record<string, unknown>> }).v.find(
      (x) => x.id === unassigned,
    ) as Record<string, unknown>;
    expectStrictBooleans(row);
    expect(row).toMatchObject({
      is_masked: false,
      phone_display: "0977 555 666",
    });
    const dup = await call<Array<{ phone: string | null }>>(
      "select public.check_prospect_duplicates($1,$2) as v",
      ["Chưa Gán Kiểm Tra", "0977555666"],
    );
    for (const h of (dup as { v: Array<{ phone: string | null }> }).v)
      expect(h.phone).toBe("0977555666");
  });

  it("sắp xếp: dòng quá hạn luôn lên trước dòng chưa có ngày hẹn", async () => {
    await db.exec(`insert into public.tour_prospects
      (company_name,name_norm,kind,phone,phone_norm,status,next_follow_up_at,assigned_to,created_by)
      values ('Công ty Quá Hạn','qua han','other','0977000999','0977000999','contacted',current_date-3,'${SALES2}','${SALES2}')`);
    await as(MANAGER, MANAGER_PERMS);
    const list = await call<
      Array<{ company_name: string; is_overdue: boolean }>
    >("select public.get_prospects() as v");
    const rows = (
      list as { v: Array<{ company_name: string; is_overdue: boolean }> }
    ).v;
    expect(rows[0]).toMatchObject({
      company_name: "Công ty Quá Hạn",
      is_overdue: true,
    });
  });
});
