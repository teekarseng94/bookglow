import React, { useEffect, useState } from "react";
import { hasCapability, type MerchantRole } from "@bookglow/auth-contracts";
import { Button } from "../ui/Button";
import { useUserContext } from "../../contexts/UserContext";
import { inviteOutletAccount, listOutletAccounts, setOutletAccountStatus, type OutletAccount } from "../../services/teamAccessService";
import { SettingsSection } from "./SettingsSection";

const LOAD_ERROR = "Team accounts could not be loaded.";
const INVITE_ERROR = "The invitation could not be sent.";

function presentError(err: unknown, fallback: string) {
  const raw = err instanceof Error ? err.message.trim() : "";
  if (!raw || /edge function|failed to (send a request|fetch)/i.test(raw)) return fallback;
  return raw;
}

function isInviteEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function TeamAccess({ outletId, accountLimit = 3 }: { outletId: string; accountLimit?: number }) {
  const { role: legacyRole } = useUserContext();
  const role: MerchantRole = legacyRole === "admin" ? "owner" : (legacyRole || "cashier");
  const canManage = hasCapability(role, "accounts.invite");
  const [accounts, setAccounts] = useState<OutletAccount[]>([]);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "manager" | "cashier">("manager");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"status" | "alert">("status");
  const [sending, setSending] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const load = async () => {
    setLoadState("loading");
    try {
      setAccounts(await listOutletAccounts(outletId));
      setLoadState("ready");
    } catch {
      setAccounts([]);
      setLoadState("error");
    }
  };

  useEffect(() => {
    void load();
  }, [outletId]);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage || !isInviteEmail(email)) return;
    setMessage("");
    setSending(true);
    try {
      await inviteOutletAccount(outletId, email.trim(), inviteRole);
      setEmail("");
      setMessageTone("status");
      setMessage("Invitation sent.");
      await load();
    } catch (err) {
      setMessageTone("alert");
      setMessage(presentError(err, INVITE_ERROR));
    } finally {
      setSending(false);
    }
  };

  const activeCount = accounts.filter((account) => account.status === "active").length;

  return (
    <SettingsSection
      id="settings-team-access"
      title="Team & Access"
      description="Manage merchant accounts and outlet roles. Only admins can send invitations."
    >
      {loadState === "ready" ? (
        <p className="m-settings-value">Account usage: {activeCount} of {accountLimit}</p>
      ) : null}
      {loadState === "error" ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {LOAD_ERROR}{" "}
          <button type="button" className="font-semibold underline" onClick={() => void load()}>
            Retry
          </button>
        </p>
      ) : null}
      {message ? (
        <p role={messageTone} className={messageTone === "alert" ? "text-sm text-[var(--danger)]" : "m-settings-hint"}>
          {message}
        </p>
      ) : null}
      <div className="m-settings-list">
        {accounts.map((account) => (
          <div key={account.id} className="p-4 border rounded-xl flex justify-between gap-4">
            <div>
              <strong>{account.name}</strong>
              <p>{account.email}</p>
              <small>{account.role} · {account.status}</small>
            </div>
            {canManage && account.role !== "owner" && (
              <button
                type="button"
                onClick={() => void setOutletAccountStatus(account.id, account.status === "active" ? "suspended" : "active").then(load)}
              >
                {account.status === "active" ? "Suspend" : "Reactivate"}
              </button>
            )}
          </div>
        ))}
      </div>
      {canManage ? (
        <form
          onSubmit={invite}
          className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_9.5rem_auto]"
        >
          <div className="m-settings-field">
            <label htmlFor="team-invite-email" className="m-settings-label">Invite account</label>
            <input
              id="team-invite-email"
              className="m-settings-control"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@studio.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="m-settings-field">
            <label htmlFor="team-invite-role" className="m-settings-label">Role</label>
            <select
              id="team-invite-role"
              className="m-settings-control"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as typeof inviteRole)}
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="cashier">Cashier</option>
            </select>
          </div>
          <Button
            type="submit"
            className="justify-self-start"
            disabled={sending || !isInviteEmail(email)}
          >
            {sending ? "Sending…" : "Send invitation"}
          </Button>
        </form>
      ) : (
        <p className="m-settings-hint">Only an outlet admin can invite teammates.</p>
      )}
    </SettingsSection>
  );
}
