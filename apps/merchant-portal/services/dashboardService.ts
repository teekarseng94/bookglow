/**
 * Dashboard / report aggregate RPCs — egress-friendly summaries.
 * Falls back is handled by callers when the migration is not yet applied.
 */
import { createBrowserSupabaseClient } from "@bookglow/supabase";
import { withQueryTelemetry } from "./queryTelemetry";

function viteEnv(): Record<string, string | undefined> {
  return import.meta.env as unknown as Record<string, string | undefined>;
}

function client() {
  return createBrowserSupabaseClient(viteEnv());
}

export interface DashboardAggregatePeriods {
  today: { total: number; prev: number };
  week: { total: number; prev: number };
  month: { total: number; prev: number };
}

export interface DashboardAggregates {
  revenue: number;
  expenses: number;
  expense_txn_count: number;
  profit: number;
  client_count: number;
  appointment_count: number;
  outstanding_total: number;
  outstanding_count: number;
  month_sale_count: number;
  week_sales: number;
  week_txn_count: number;
  payment_summary: Array<{ method: string; amount: number }>;
  category_summary: {
    service: number;
    product: number;
    package: number;
    discount: number;
    outstanding: number;
  };
  top_selling: Array<{ name: string; type: string; quantity: number; amount: number }>;
  week_chart: Array<{ day: string; sales: number }>;
  periods: DashboardAggregatePeriods;
  visitors: Array<{ client_id: string; name: string; spent: number; points: number }>;
}

export interface DashboardDateBounds {
  monthStart: string;
  monthEnd: string;
  weekStart: string;
  weekEnd: string;
  today: string;
  yesterday: string;
  prevWeekStart: string;
  prevWeekEnd: string;
  prevMonthStart: string;
  prevMonthEnd: string;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapAggregates(raw: Record<string, unknown>): DashboardAggregates {
  const cat = (raw.category_summary || {}) as Record<string, unknown>;
  const periods = (raw.periods || {}) as Record<string, Record<string, unknown>>;
  return {
    revenue: num(raw.revenue),
    expenses: num(raw.expenses),
    expense_txn_count: num(raw.expense_txn_count),
    profit: num(raw.profit),
    client_count: num(raw.client_count),
    appointment_count: num(raw.appointment_count),
    outstanding_total: num(raw.outstanding_total),
    outstanding_count: num(raw.outstanding_count),
    month_sale_count: num(raw.month_sale_count),
    week_sales: num(raw.week_sales),
    week_txn_count: num(raw.week_txn_count),
    payment_summary: Array.isArray(raw.payment_summary)
      ? (raw.payment_summary as Array<{ method: string; amount: number }>).map((p) => ({
          method: String(p.method || "Other"),
          amount: num(p.amount),
        }))
      : [],
    category_summary: {
      service: num(cat.service),
      product: num(cat.product),
      package: num(cat.package),
      discount: num(cat.discount),
      outstanding: num(cat.outstanding),
    },
    top_selling: Array.isArray(raw.top_selling)
      ? (raw.top_selling as Array<Record<string, unknown>>).map((t) => ({
          name: String(t.name || "Item"),
          type: String(t.type || "service"),
          quantity: num(t.quantity),
          amount: num(t.amount),
        }))
      : [],
    week_chart: Array.isArray(raw.week_chart)
      ? (raw.week_chart as Array<Record<string, unknown>>).map((d) => ({
          day: String(d.day || ""),
          sales: num(d.sales),
        }))
      : [],
    periods: {
      today: {
        total: num(periods.today?.total),
        prev: num(periods.today?.prev),
      },
      week: {
        total: num(periods.week?.total),
        prev: num(periods.week?.prev),
      },
      month: {
        total: num(periods.month?.total),
        prev: num(periods.month?.prev),
      },
    },
    visitors: Array.isArray(raw.visitors)
      ? (raw.visitors as Array<Record<string, unknown>>).map((v) => ({
          client_id: String(v.client_id || ""),
          name: String(v.name || "Unknown"),
          spent: num(v.spent),
          points: num(v.points),
        }))
      : [],
  };
}

export async function fetchDashboardAggregates(
  outletID: string,
  bounds: DashboardDateBounds,
): Promise<DashboardAggregates> {
  return withQueryTelemetry(
    { queryName: "dashboardService.fetchDashboardAggregates", resource: "rpc:merchant_dashboard_aggregates" },
    async () => {
      const { data, error } = await client().rpc("merchant_dashboard_aggregates", {
        p_outlet_id: outletID,
        p_month_start: bounds.monthStart,
        p_month_end: bounds.monthEnd,
        p_week_start: bounds.weekStart,
        p_week_end: bounds.weekEnd,
        p_today: bounds.today,
        p_yesterday: bounds.yesterday,
        p_prev_week_start: bounds.prevWeekStart,
        p_prev_week_end: bounds.prevWeekEnd,
        p_prev_month_start: bounds.prevMonthStart,
        p_prev_month_end: bounds.prevMonthEnd,
      });
      if (error) throw error;
      return mapAggregates((data || {}) as Record<string, unknown>);
    },
  );
}

export interface MonthlyReportSummary {
  collection_total: number;
  sales_total: number;
  total_count: number;
  voided_count: number;
  voided_sales: number;
  customer_pax: number;
  service: number;
  product: number;
  package: number;
  total_expenses: number;
  total_collection: number;
  closing_balance: number;
  average_sales: number;
  collection: Array<{ name: string; value: number }>;
  expenses: Record<string, number>;
}

export async function fetchMonthlyReportSummary(
  outletID: string,
  year: number,
  month: number,
): Promise<MonthlyReportSummary> {
  return withQueryTelemetry(
    { queryName: "dashboardService.fetchMonthlyReportSummary", resource: "rpc:merchant_monthly_report_summary" },
    async () => {
      const { data, error } = await client().rpc("merchant_monthly_report_summary", {
        p_outlet_id: outletID,
        p_year: year,
        p_month: month,
      });
      if (error) throw error;
      const raw = (data || {}) as Record<string, unknown>;
      return {
        collection_total: num(raw.collection_total),
        sales_total: num(raw.sales_total),
        total_count: num(raw.total_count),
        voided_count: num(raw.voided_count),
        voided_sales: num(raw.voided_sales),
        customer_pax: num(raw.customer_pax),
        service: num(raw.service),
        product: num(raw.product),
        package: num(raw.package),
        total_expenses: num(raw.total_expenses),
        total_collection: num(raw.total_collection),
        closing_balance: num(raw.closing_balance),
        average_sales: num(raw.average_sales),
        collection: Array.isArray(raw.collection)
          ? (raw.collection as Array<{ name: string; value: number }>).map((c) => ({
              name: String(c.name || "Other"),
              value: num(c.value),
            }))
          : [],
        expenses: (raw.expenses && typeof raw.expenses === "object"
          ? (raw.expenses as Record<string, number>)
          : {}) as Record<string, number>,
      };
    },
  );
}
