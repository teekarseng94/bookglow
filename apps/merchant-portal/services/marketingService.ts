import type { Client } from '../types';
import { clientService } from './databaseService';
import { getSupabaseBrowserClientOrNull } from './supabaseBrowser';

export type AudienceCriteriaType =
  | 'all'
  | 'birthday_month'
  | 'member_tier'
  | 'tag'
  | 'voucher_holders'
  | 'contactable';

export interface AudienceCriteria {
  type: AudienceCriteriaType;
  value?: string;
}

export interface MarketingAudience {
  id: string;
  outletID: string;
  name: string;
  description: string;
  criteria: AudienceCriteria;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'paused' | 'completed' | 'cancelled';
export type CampaignChannel = 'email' | 'sms' | 'whatsapp' | 'share_link';

export interface MarketingCampaign {
  id: string;
  outletID: string;
  audienceID?: string;
  name: string;
  objective: 'promotion' | 'rebooking' | 'retention' | 'announcement';
  channel: CampaignChannel;
  subject?: string;
  message: string;
  offer: { type: 'none' | 'percentage' | 'fixed'; value?: number };
  status: CampaignStatus;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDeliverySummary {
  campaignID: string;
  queued: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface CampaignDispatchResult {
  campaignId: string;
  queued: number;
  skipped: number;
  sent: number;
  failed: number;
  manual?: boolean;
}

const db = () => {
  const supabase = getSupabaseBrowserClientOrNull();
  if (!supabase) throw new Error('Marketing storage is unavailable.');
  return supabase;
};

const mapAudience = (row: Record<string, unknown>): MarketingAudience => ({
  id: String(row.id),
  outletID: String(row.outlet_id),
  name: String(row.name || ''),
  description: String(row.description || ''),
  criteria: (row.criteria || { type: 'all' }) as AudienceCriteria,
  createdAt: String(row.created_at || ''),
  updatedAt: String(row.updated_at || ''),
});

const mapCampaign = (row: Record<string, unknown>): MarketingCampaign => ({
  id: String(row.id),
  outletID: String(row.outlet_id),
  audienceID: row.audience_id ? String(row.audience_id) : undefined,
  name: String(row.name || ''),
  objective: (row.objective || 'promotion') as MarketingCampaign['objective'],
  channel: row.channel as CampaignChannel,
  subject: row.subject ? String(row.subject) : undefined,
  message: String(row.message || ''),
  offer: (row.offer || { type: 'none' }) as MarketingCampaign['offer'],
  status: (row.status || 'draft') as CampaignStatus,
  scheduledAt: row.scheduled_at ? String(row.scheduled_at) : undefined,
  createdAt: String(row.created_at || ''),
  updatedAt: String(row.updated_at || ''),
});

export const audienceMatchesClient = (criteria: AudienceCriteria, client: Client): boolean => {
  switch (criteria.type) {
    case 'birthday_month': {
      if (!client.birthday) return false;
      const month = client.birthday.slice(5, 7);
      return month === String(criteria.value || '').padStart(2, '0');
    }
    case 'member_tier':
      return !!criteria.value && client.memberTier === criteria.value;
    case 'tag':
      return !!criteria.value && client.tag === criteria.value;
    case 'voucher_holders':
      return Number(client.voucherCount || 0) > 0;
    case 'contactable':
      if (client.marketingUnsubscribedAt) return false;
      if (criteria.value === 'email') return !!client.email && Boolean(client.marketingEmailConsent);
      if (criteria.value === 'whatsapp') {
        return !!client.phone && Boolean(client.marketingWhatsappConsent);
      }
      return !!client.phone && Boolean(client.marketingSmsConsent);
    default:
      return true;
  }
};

export const marketingService = {
  getClients: (outletID: string) => clientService.getAll(outletID),

  listAudiences: async (outletID: string): Promise<MarketingAudience[]> => {
    const { data, error } = await db()
      .from('marketing_audiences')
      .select('*')
      .eq('outlet_id', outletID)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => mapAudience(row as Record<string, unknown>));
  },

  createAudience: async (
    outletID: string,
    input: Pick<MarketingAudience, 'name' | 'description' | 'criteria'>,
  ): Promise<MarketingAudience> => {
    const { data, error } = await db()
      .from('marketing_audiences')
      .insert({
        outlet_id: outletID,
        name: input.name,
        description: input.description || null,
        criteria: input.criteria,
      } as never)
      .select('*')
      .single();
    if (error) throw error;
    return mapAudience(data as Record<string, unknown>);
  },

  listCampaigns: async (outletID: string): Promise<MarketingCampaign[]> => {
    const { data, error } = await db()
      .from('marketing_campaigns')
      .select('*')
      .eq('outlet_id', outletID)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => mapCampaign(row as Record<string, unknown>));
  },

  createCampaign: async (
    outletID: string,
    input: Omit<MarketingCampaign, 'id' | 'outletID' | 'createdAt' | 'updatedAt'>,
  ): Promise<MarketingCampaign> => {
    const { data, error } = await db()
      .from('marketing_campaigns')
      .insert({
        outlet_id: outletID,
        audience_id: input.audienceID || null,
        name: input.name,
        objective: input.objective,
        channel: input.channel,
        subject: input.subject || null,
        message: input.message,
        offer: input.offer,
        status: input.status,
        scheduled_at: input.scheduledAt || null,
      } as never)
      .select('*')
      .single();
    if (error) throw error;
    return mapCampaign(data as Record<string, unknown>);
  },

  listDeliverySummaries: async (outletID: string): Promise<CampaignDeliverySummary[]> => {
    const { data, error } = await db()
      .from('marketing_campaign_deliveries')
      .select('campaign_id,status')
      .eq('outlet_id', outletID);
    if (error) throw error;
    const summaries = new Map<string, CampaignDeliverySummary>();
    for (const row of data || []) {
      const campaignID = String(row.campaign_id);
      const current = summaries.get(campaignID) || {
        campaignID,
        queued: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      };
      if (row.status === 'queued' || row.status === 'processing') current.queued += 1;
      else if (row.status === 'sent') current.sent += 1;
      else if (row.status === 'failed') current.failed += 1;
      else if (row.status === 'skipped') current.skipped += 1;
      summaries.set(campaignID, current);
    }
    return [...summaries.values()];
  },

  dispatchCampaign: async (campaignId: string): Promise<CampaignDispatchResult> => {
    const { data, error } = await db().functions.invoke('marketing-dispatch', {
      body: { action: 'launch', campaignId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(String(data.error));
    return data as CampaignDispatchResult;
  },
};
