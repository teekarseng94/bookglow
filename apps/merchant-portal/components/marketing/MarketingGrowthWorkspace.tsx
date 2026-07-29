import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Mail,
  Megaphone,
  MessageCircle,
  Plus,
  Send,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import type { Client } from '../../types';
import {
  AudienceCriteria,
  CampaignDeliverySummary,
  CampaignChannel,
  MarketingAudience,
  MarketingCampaign,
  audienceMatchesClient,
  marketingService,
} from '../../services/marketingService';
import {
  Alert,
  AppDrawer,
  Button,
  EmptyState,
  LoadingSkeleton,
  StatusBadge,
} from '../ui';

interface MarketingGrowthWorkspaceProps {
  outletID: string;
  section: 'audiences' | 'campaigns';
}

const criteriaLabels: Record<AudienceCriteria['type'], string> = {
  all: 'All customers',
  birthday_month: 'Birthday month',
  member_tier: 'Membership tier',
  tag: 'Customer tag',
  voucher_holders: 'Voucher holders',
  contactable: 'Contactable by channel',
};

const channelIcons: Record<CampaignChannel, React.ComponentType<{ size?: number }>> = {
  email: Mail,
  sms: MessageCircle,
  whatsapp: MessageCircle,
  share_link: Share2,
};

const errorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  if (message.includes('marketing_audiences') || message.includes('marketing_campaigns')) {
    return 'Marketing Phase 2 storage is not active yet. Apply the latest Supabase migration, then retry.';
  }
  return message || 'Marketing data could not be loaded.';
};

export const MarketingGrowthWorkspace: React.FC<MarketingGrowthWorkspaceProps> = ({
  outletID,
  section,
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [audiences, setAudiences] = useState<MarketingAudience[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [deliverySummaries, setDeliverySummaries] = useState<CampaignDeliverySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [audienceEditorOpen, setAudienceEditorOpen] = useState(false);
  const [campaignEditorOpen, setCampaignEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dispatchingCampaignID, setDispatchingCampaignID] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [customerRows, audienceRows, campaignRows, deliveryRows] = await Promise.all([
        marketingService.getClients(outletID),
        marketingService.listAudiences(outletID),
        marketingService.listCampaigns(outletID),
        marketingService.listDeliverySummaries(outletID),
      ]);
      setClients(customerRows);
      setAudiences(audienceRows);
      setCampaigns(campaignRows);
      setDeliverySummaries(deliveryRows);
      setError(null);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [outletID]);

  useEffect(() => {
    void load();
  }, [load]);

  const audienceCounts = useMemo(
    () =>
      new Map(
        audiences.map((audience) => [
          audience.id,
          clients.filter((client) => audienceMatchesClient(audience.criteria, client)).length,
        ]),
      ),
    [audiences, clients],
  );

  const deliverySummaryMap = useMemo(
    () => new Map(deliverySummaries.map((summary) => [summary.campaignID, summary])),
    [deliverySummaries],
  );

  const dispatchCampaign = async (campaign: MarketingCampaign) => {
    setDispatchingCampaignID(campaign.id);
    setError(null);
    try {
      const result = await marketingService.dispatchCampaign(campaign.id);
      await load();
      setSuccess(
        result.manual
          ? `${campaign.name} is ready to share manually.`
          : `${result.sent} messages sent. ${result.skipped} customers were excluded by consent or missing contact details.`,
      );
    } catch (dispatchError) {
      setError(errorMessage(dispatchError));
    } finally {
      setDispatchingCampaignID(null);
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-6">
        <LoadingSkeleton rows={7} />
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert
          tone="danger"
          action={
            <Button size="sm" variant="ghost" onClick={() => void load()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert tone="success" onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}

      {section === 'audiences' ? (
        <section className="overflow-hidden rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-xs">
          <div className="flex flex-col gap-3 border-b border-[var(--line)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Reusable audiences</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Save customer groups once and reuse them across campaigns.
              </p>
            </div>
            <Button onClick={() => setAudienceEditorOpen(true)}>
              <Plus size={16} /> Create audience
            </Button>
          </div>
          {audiences.length ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {audiences.map((audience) => (
                <article
                  key={audience.id}
                  className="rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-ui-md bg-[var(--brand-soft)] p-2 text-[var(--brand)]">
                      <Users size={18} />
                    </span>
                    <StatusBadge tone="brand">
                      {audienceCounts.get(audience.id) || 0} customers
                    </StatusBadge>
                  </div>
                  <h3 className="mt-4 font-semibold text-[var(--text-primary)]">{audience.name}</h3>
                  <p className="mt-1 min-h-10 text-sm text-[var(--text-muted)]">
                    {audience.description || criteriaLabels[audience.criteria.type]}
                  </p>
                  <div className="mt-4 border-t border-[var(--line)] pt-3 text-xs text-[var(--text-secondary)]">
                    Rule: {criteriaLabels[audience.criteria.type]}
                    {audience.criteria.value ? ` · ${audience.criteria.value}` : ''}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users size={26} />}
              title="No reusable audiences yet"
              description="Create a customer group for birthdays, membership tiers, voucher holders or a communication channel."
              className="m-5"
              action={<Button onClick={() => setAudienceEditorOpen(true)}>Create audience</Button>}
            />
          )}
        </section>
      ) : (
        <section className="overflow-hidden rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-xs">
          <div className="flex flex-col gap-3 border-b border-[var(--line)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Campaigns</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Build, review and schedule messages for saved audiences.
              </p>
            </div>
            <Button
              disabled={!audiences.length}
              onClick={() => setCampaignEditorOpen(true)}
              title={!audiences.length ? 'Create an audience first' : undefined}
            >
              <Plus size={16} /> Create campaign
            </Button>
          </div>
          {campaigns.length ? (
            <div className="divide-y divide-[var(--line)]">
              {campaigns.map((campaign) => {
                const Icon = channelIcons[campaign.channel];
                const audience = audiences.find((item) => item.id === campaign.audienceID);
                const delivery = deliverySummaryMap.get(campaign.id);
                return (
                  <article
                    key={campaign.id}
                    className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                  >
                    <div className="flex min-w-0 gap-3">
                      <span className="h-fit rounded-ui-md bg-[var(--brand-soft)] p-2.5 text-[var(--brand)]">
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-[var(--text-primary)]">{campaign.name}</h3>
                          <StatusBadge tone={campaign.status === 'scheduled' ? 'info' : 'neutral'}>
                            {campaign.status}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
                          {campaign.message}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {audience?.name || 'Audience removed'} ·{' '}
                          {audienceCounts.get(campaign.audienceID || '') || 0} customers
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <div className="text-right text-xs text-[var(--text-muted)]">
                        {campaign.scheduledAt ? (
                          <span className="inline-flex items-center gap-2">
                            <CalendarClock size={15} />
                            {new Date(campaign.scheduledAt).toLocaleString()}
                          </span>
                        ) : (
                          <span>
                            {delivery
                              ? `${delivery.sent} sent · ${delivery.failed} failed`
                              : 'Not launched'}
                          </span>
                        )}
                      </div>
                      {campaign.status === 'draft' || campaign.status === 'paused' ? (
                        <Button
                          size="sm"
                          disabled={dispatchingCampaignID === campaign.id}
                          onClick={() => void dispatchCampaign(campaign)}
                        >
                          <Send size={14} />
                          {dispatchingCampaignID === campaign.id
                            ? 'Sending…'
                            : campaign.channel === 'share_link'
                              ? 'Mark ready'
                              : 'Send now'}
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Megaphone size={26} />}
              title="No campaign drafts yet"
              description={
                audiences.length
                  ? 'Build your first campaign and save it as a draft or schedule it for delivery.'
                  : 'Create a reusable audience before building your first campaign.'
              }
              className="m-5"
              action={
                audiences.length ? (
                  <Button onClick={() => setCampaignEditorOpen(true)}>Create campaign</Button>
                ) : (
                  <Button variant="secondary" onClick={() => setAudienceEditorOpen(true)}>
                    Create audience
                  </Button>
                )
              }
            />
          )}
        </section>
      )}

      <AudienceEditor
        open={audienceEditorOpen}
        clients={clients}
        busy={isSaving}
        onClose={() => setAudienceEditorOpen(false)}
        onSave={async (input) => {
          setIsSaving(true);
          try {
            const created = await marketingService.createAudience(outletID, input);
            setAudiences((current) => [created, ...current]);
            setAudienceEditorOpen(false);
            setSuccess(`${created.name} is ready to use.`);
          } catch (saveError) {
            setError(errorMessage(saveError));
          } finally {
            setIsSaving(false);
          }
        }}
      />

      <CampaignBuilder
        open={campaignEditorOpen}
        audiences={audiences}
        audienceCounts={audienceCounts}
        busy={isSaving}
        onClose={() => setCampaignEditorOpen(false)}
        onSave={async (input) => {
          setIsSaving(true);
          try {
            const created = await marketingService.createCampaign(outletID, input);
            setCampaigns((current) => [created, ...current]);
            setCampaignEditorOpen(false);
            setSuccess(
              created.status === 'scheduled'
                ? `${created.name} was scheduled.`
                : `${created.name} was saved as a draft.`,
            );
          } catch (saveError) {
            setError(errorMessage(saveError));
          } finally {
            setIsSaving(false);
          }
        }}
      />
    </div>
  );
};

interface AudienceEditorProps {
  open: boolean;
  clients: Client[];
  busy: boolean;
  onClose: () => void;
  onSave: (input: Pick<MarketingAudience, 'name' | 'description' | 'criteria'>) => Promise<void>;
}

const AudienceEditor: React.FC<AudienceEditorProps> = ({ open, clients, busy, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<AudienceCriteria['type']>('all');
  const [value, setValue] = useState('');
  const criteria = useMemo<AudienceCriteria>(() => ({ type, value: value || undefined }), [type, value]);
  const estimate = useMemo(
    () => clients.filter((client) => audienceMatchesClient(criteria, client)).length,
    [clients, criteria],
  );
  const tiers = useMemo(
    () => [...new Set(clients.map((client) => client.memberTier).filter(Boolean))] as string[],
    [clients],
  );
  const tags = useMemo(
    () => [...new Set(clients.map((client) => client.tag).filter(Boolean))] as string[],
    [clients],
  );

  const needsValue = ['birthday_month', 'member_tier', 'tag', 'contactable'].includes(type);

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title="Create audience"
      description="Save a live customer segment for future campaigns."
      variant="right"
      busy={busy}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button
            disabled={busy || !name.trim() || (needsValue && !value)}
            onClick={() => void onSave({ name: name.trim(), description: description.trim(), criteria })}
          >
            {busy ? 'Saving…' : 'Save audience'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-ui-md bg-[var(--brand-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Live estimate</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{estimate}</p>
          <p className="text-xs text-[var(--text-muted)]">customers currently match</p>
        </div>
        <Field label="Audience name">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Birthday customers" />
        </Field>
        <Field label="Description" optional>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Who this audience is intended for"
          />
        </Field>
        <Field label="Audience rule">
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as AudienceCriteria['type']);
              setValue('');
            }}
          >
            {Object.entries(criteriaLabels).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </Field>
        {type === 'birthday_month' ? (
          <Field label="Month">
            <select value={value} onChange={(event) => setValue(event.target.value)}>
              <option value="">Select month</option>
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={String(index + 1)}>
                  {new Date(2026, index, 1).toLocaleString('en-MY', { month: 'long' })}
                </option>
              ))}
            </select>
          </Field>
        ) : type === 'member_tier' ? (
          <Field label="Membership tier">
            <select value={value} onChange={(event) => setValue(event.target.value)}>
              <option value="">Select tier</option>
              {tiers.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
            </select>
          </Field>
        ) : type === 'tag' ? (
          <Field label="Customer tag">
            <select value={value} onChange={(event) => setValue(event.target.value)}>
              <option value="">Select tag</option>
              {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </Field>
        ) : type === 'contactable' ? (
          <Field label="Channel">
            <select value={value} onChange={(event) => setValue(event.target.value)}>
              <option value="">Select channel</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </Field>
        ) : null}
      </div>
    </AppDrawer>
  );
};

interface CampaignBuilderProps {
  open: boolean;
  audiences: MarketingAudience[];
  audienceCounts: Map<string, number>;
  busy: boolean;
  onClose: () => void;
  onSave: (
    input: Omit<MarketingCampaign, 'id' | 'outletID' | 'createdAt' | 'updatedAt'>,
  ) => Promise<void>;
}

const CampaignBuilder: React.FC<CampaignBuilderProps> = ({
  open,
  audiences,
  audienceCounts,
  busy,
  onClose,
  onSave,
}) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [objective, setObjective] = useState<MarketingCampaign['objective']>('promotion');
  const [audienceID, setAudienceID] = useState('');
  const [channel, setChannel] = useState<CampaignChannel>('email');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [offerType, setOfferType] = useState<MarketingCampaign['offer']['type']>('none');
  const [offerValue, setOfferValue] = useState(0);
  const [scheduledAt, setScheduledAt] = useState('');

  useEffect(() => {
    if (open && !audienceID && audiences[0]) setAudienceID(audiences[0].id);
  }, [audienceID, audiences, open]);

  const canContinue =
    step === 1 ? !!name.trim() :
    step === 2 ? !!audienceID :
    step === 3 ? !!message.trim() && (channel !== 'email' || !!subject.trim()) :
    true;

  const campaignInput = (): Omit<
    MarketingCampaign,
    'id' | 'outletID' | 'createdAt' | 'updatedAt'
  > => ({
    name: name.trim(),
    objective,
    audienceID,
    channel,
    subject: channel === 'email' ? subject.trim() : undefined,
    message: message.trim(),
    offer: { type: offerType, value: offerType === 'none' ? undefined : offerValue },
    status: scheduledAt ? 'scheduled' : 'draft',
    scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
  });

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title="Campaign builder"
      description={`Step ${step} of 4`}
      variant="right"
      busy={busy}
      className="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Button variant="ghost" disabled={busy || step === 1} onClick={() => setStep((current) => current - 1)}>
            <ChevronLeft size={16} /> Back
          </Button>
          {step < 4 ? (
            <Button disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>
              Continue <ChevronRight size={16} />
            </Button>
          ) : (
            <Button disabled={busy || !canContinue} onClick={() => void onSave(campaignInput())}>
              {busy ? 'Saving…' : scheduledAt ? 'Schedule campaign' : 'Save draft'}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-2" aria-label="Campaign progress">
          {['Goal', 'Audience', 'Message', 'Review'].map((label, index) => (
            <div key={label} className="space-y-1">
              <div className={`h-1.5 rounded-full ${index + 1 <= step ? 'bg-[var(--brand)]' : 'bg-[var(--bg-soft)]'}`} />
              <p className="text-center text-[11px] text-[var(--text-muted)]">{label}</p>
            </div>
          ))}
        </div>

        {step === 1 ? (
          <>
            <Field label="Campaign name">
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="August wellness offer" />
            </Field>
            <Field label="Campaign goal">
              <select value={objective} onChange={(event) => setObjective(event.target.value as MarketingCampaign['objective'])}>
                <option value="promotion">Promote an offer</option>
                <option value="rebooking">Encourage rebooking</option>
                <option value="retention">Retain existing customers</option>
                <option value="announcement">Share an announcement</option>
              </select>
            </Field>
          </>
        ) : step === 2 ? (
          <div className="space-y-3">
            <h3 className="font-semibold text-[var(--text-primary)]">Choose an audience</h3>
            {audiences.map((audience) => (
              <label
                key={audience.id}
                className={`flex cursor-pointer items-center gap-3 rounded-ui-md border p-4 ${
                  audienceID === audience.id
                    ? 'border-[var(--brand)] bg-[var(--brand-soft)]'
                    : 'border-[var(--line)]'
                }`}
              >
                <input
                  type="radio"
                  name="campaign-audience"
                  value={audience.id}
                  checked={audienceID === audience.id}
                  onChange={() => setAudienceID(audience.id)}
                  className="accent-[var(--brand)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">{audience.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{criteriaLabels[audience.criteria.type]}</p>
                </div>
                <StatusBadge tone="brand">{audienceCounts.get(audience.id) || 0} customers</StatusBadge>
              </label>
            ))}
          </div>
        ) : step === 3 ? (
          <>
            <Field label="Channel">
              <div className="grid grid-cols-2 gap-2">
                {(['email', 'sms', 'whatsapp', 'share_link'] as CampaignChannel[]).map((id) => {
                  const Icon = channelIcons[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setChannel(id)}
                      className={`flex min-h-12 items-center gap-2 rounded-ui-md border px-3 text-sm font-semibold ${
                        channel === id
                          ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]'
                          : 'border-[var(--line)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <Icon size={16} /> {id.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </Field>
            {channel === 'email' ? (
              <Field label="Subject">
                <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="A little wellness treat for you" />
              </Field>
            ) : null}
            <Field label="Message">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={6}
                maxLength={channel === 'sms' ? 320 : 2000}
                placeholder="Hi {{first_name}}, take time for yourself with..."
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Offer">
                <select value={offerType} onChange={(event) => setOfferType(event.target.value as MarketingCampaign['offer']['type'])}>
                  <option value="none">No offer</option>
                  <option value="percentage">Percentage discount</option>
                  <option value="fixed">Fixed discount</option>
                </select>
              </Field>
              {offerType !== 'none' ? (
                <Field label={offerType === 'percentage' ? 'Discount (%)' : 'Discount (RM)'}>
                  <input type="number" min={0} value={offerValue} onChange={(event) => setOfferValue(Number(event.target.value) || 0)} />
                </Field>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="rounded-ui-lg border border-[var(--line)] bg-[var(--bg-soft)] p-5">
              <div className="flex items-center gap-2 text-[var(--brand)]">
                <Sparkles size={17} />
                <p className="text-xs font-semibold uppercase tracking-wide">Campaign preview</p>
              </div>
              <h3 className="mt-3 font-semibold text-[var(--text-primary)]">{subject || name}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{message}</p>
              {offerType !== 'none' ? (
                <div className="mt-4 inline-flex rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand)]">
                  {offerType === 'percentage' ? `${offerValue}% off` : `RM ${offerValue} off`}
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Summary label="Audience" value={audiences.find((item) => item.id === audienceID)?.name || '—'} icon={Users} />
              <Summary label="Channel" value={channel.replace('_', ' ')} icon={Send} />
            </div>
            <Field label="Schedule" optional>
              <input
                type="datetime-local"
                value={scheduledAt}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </Field>
            <Alert tone="info">
              Campaign delivery activates after the selected communication provider is connected. Until then, scheduled campaigns remain safely queued.
            </Alert>
          </>
        )}
      </div>
    </AppDrawer>
  );
};

const controlClass =
  'min-h-11 w-full rounded-ui-md border border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus-visible:shadow-ui-focus-strong';

const Field: React.FC<{
  label: string;
  optional?: boolean;
  children: React.ReactElement<{ className?: string }>;
}> = ({ label, optional, children }) => (
  <label className="block">
    <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
      {label}
      {optional ? <span className="text-xs font-normal text-[var(--text-muted)]">Optional</span> : null}
    </span>
    {React.cloneElement(children, { className: `${controlClass} ${children.props.className || ''}` })}
  </label>
);

const Summary: React.FC<{
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number }>;
}> = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-3 rounded-ui-md border border-[var(--line)] p-4">
    <span className="rounded-ui-sm bg-[var(--brand-soft)] p-2 text-[var(--brand)]"><Icon size={16} /></span>
    <div>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="text-sm font-semibold capitalize text-[var(--text-primary)]">{value}</p>
    </div>
  </div>
);

export default MarketingGrowthWorkspace;
