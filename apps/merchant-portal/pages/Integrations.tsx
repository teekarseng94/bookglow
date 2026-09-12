import React, { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../components/ui/PageHeader";
import { IntegrationRow } from "../components/integrations/IntegrationRow";
import { IntegrationSection } from "../components/integrations/IntegrationSection";
import { GoogleMark } from "../components/integrations/GoogleMark";
import { INTEGRATION_REGISTRY, type IntegrationStatus } from "../integrations/registry";
import { useUserContext } from "../contexts/UserContext";
import { getGoogleConnection } from "../services/googleReviewsService";
import { apiIntegrationService } from "../services/databaseService";

function ApiIcon() {
  return (
    <svg className="w-5 h-5 text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

const IntegrationsPage: React.FC = () => {
  const { outletId } = useUserContext();
  const [googleStatus, setGoogleStatus] = useState<IntegrationStatus>("disconnected");
  const [chatbotStatus, setChatbotStatus] = useState<IntegrationStatus>("disconnected");

  const loadStatuses = useCallback(async () => {
    if (!outletId) return;
    try {
      const connection = await getGoogleConnection(outletId);
      if (connection.status === "connected") setGoogleStatus("connected");
      else if (connection.status === "needs_reauth") setGoogleStatus("needs_reauth");
      else if (connection.status === "pending_location") setGoogleStatus("pending");
      else if (connection.status === "setup_required") setGoogleStatus("setup_required");
      else if (connection.status === "error") setGoogleStatus("error");
      else setGoogleStatus("disconnected");
    } catch {
      setGoogleStatus("disconnected");
    }
    try {
      const api = await apiIntegrationService.get(outletId);
      setChatbotStatus(api?.apiKeyHash ? "connected" : "disconnected");
    } catch {
      setChatbotStatus("disconnected");
    }
  }, [outletId]);

  useEffect(() => {
    void loadStatuses();
  }, [loadStatuses]);

  const statusFor = (id: string): IntegrationStatus | undefined => {
    if (id === "google-reviews") return googleStatus;
    if (id === "chatbot-api") return chatbotStatus;
    return undefined;
  };

  const iconFor = (id: string) => (id === "google-reviews" ? <GoogleMark className="w-5 h-5" /> : <ApiIcon />);

  const reviews = INTEGRATION_REGISTRY.filter((item) => item.category === "reviews");
  const apis = INTEGRATION_REGISTRY.filter((item) => item.category === "api");

  return (
    <div className="m-page-with-bottom-nav animate-fadeIn">
      <div className="max-w-2xl mx-auto">
        <PageHeader
          title="Integrations"
          description="Connect BookGlow with the services you use to run your business."
        />
        <div className="mt-6 space-y-8">
          <IntegrationSection title="Reviews">
            {reviews.map((item) => (
              <IntegrationRow
                key={item.id}
                integration={item}
                status={statusFor(item.id)}
                icon={iconFor(item.id)}
              />
            ))}
          </IntegrationSection>
          <IntegrationSection title="API & automation">
            {apis.map((item) => (
              <IntegrationRow
                key={item.id}
                integration={item}
                status={statusFor(item.id)}
                icon={iconFor(item.id)}
              />
            ))}
          </IntegrationSection>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
