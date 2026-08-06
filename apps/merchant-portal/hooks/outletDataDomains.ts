export type OutletDataDomain = "catalog" | "clients" | "appointments" | "transactions";

/** Domains required by the active merchant route (tab id or path segment). */
export function domainsForRoute(activeRoute: string): Set<OutletDataDomain> {
  const tab = (activeRoute || "dashboard").replace(/^\//, "").split("/")[0] || "dashboard";
  const domains = new Set<OutletDataDomain>(["catalog"]);
  switch (tab) {
    case "pos":
      break;
    case "member":
    case "member-details":
    case "marketing":
      domains.add("clients");
      domains.add("transactions");
      break;
    case "dashboard":
      // KPIs come from merchant_dashboard_aggregates RPC (not full transactions).
      domains.add("clients");
      domains.add("appointments");
      break;
    case "schedule":
    case "appointments":
      domains.add("clients");
      domains.add("appointments");
      break;
    case "transactions":
    case "finance":
    case "report":
    case "sales-reports":
      domains.add("clients");
      domains.add("transactions");
      break;
    case "staff":
      domains.add("transactions");
      break;
    default:
      break;
  }
  return domains;
}

export function tableToDomain(table: string): OutletDataDomain | null {
  switch (table) {
    case "clients":
      return "clients";
    case "appointments":
      return "appointments";
    case "transactions":
      return "transactions";
    case "staff":
    case "services":
    case "products":
    case "packages":
    case "rewards":
    case "outlets":
    case "vouchers":
      return "catalog";
    default:
      return null;
  }
}
