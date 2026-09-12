export type IntegrationId = "google-reviews" | "chatbot-api";
export type IntegrationCategory = "reviews" | "api";
export type IntegrationStatus =
  | "connected"
  | "disconnected"
  | "pending"
  | "needs_reauth"
  | "setup_required"
  | "error";

export interface IntegrationDefinition {
  id: IntegrationId;
  name: string;
  category: IntegrationCategory;
  categoryLabel: string;
  description: string;
  route: string;
}

export const INTEGRATION_REGISTRY: IntegrationDefinition[] = [
  {
    id: "google-reviews",
    name: "Google Reviews",
    category: "reviews",
    categoryLabel: "Reviews",
    description: "Show Google reviews on your Booking Page.",
    route: "/integrations/google-reviews",
  },
  {
    id: "chatbot-api",
    name: "Chatbot API Integration",
    category: "api",
    categoryLabel: "API & automation",
    description: "Connect your chatbot or external automation to BookGlow.",
    route: "/integrations/chatbot-api",
  },
];

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = ["reviews", "api"];

export function integrationsByCategory(category: IntegrationCategory): IntegrationDefinition[] {
  return INTEGRATION_REGISTRY.filter((item) => item.category === category);
}

export function isIntegrationConnected(status: IntegrationStatus | undefined): boolean {
  return status === "connected";
}
