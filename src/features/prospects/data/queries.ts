import "server-only";
import type { Prospect, ProspectsOverview } from "../types";
import { callRpc } from "./rpc";

const EMPTY_OVERVIEW: ProspectsOverview = {
  total: 0,
  by_status: {},
  overdue: 0,
  dup_pending: 0,
  conversion_rate: null,
  top_sales: [],
  assignees: [],
};

/** Dữ liệu ban đầu cho trang /prospects (chưa lọc). SĐT đã được RPC che theo luật. */
export async function getProspectsPageData(): Promise<{
  prospects: Prospect[];
  overview: ProspectsOverview;
}> {
  const [list, overview] = await Promise.all([
    callRpc<Prospect[]>("get_prospects", {}),
    callRpc<ProspectsOverview>("get_prospects_overview", {}),
  ]);
  return {
    prospects: list.error ? [] : (list.data ?? []),
    overview: overview.error || !overview.data ? EMPTY_OVERVIEW : overview.data,
  };
}
