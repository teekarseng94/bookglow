import React, { useEffect, useState } from "react";
import { hasCapability, type MerchantRole } from "@bookglow/auth-contracts";
import { useUserContext } from "../../contexts/UserContext";
import { inviteOutletAccount, listOutletAccounts, setOutletAccountStatus, type OutletAccount } from "../../services/teamAccessService";
import { SettingsSection } from "./SettingsSection";

export function TeamAccess({ outletId, accountLimit = 3 }: { outletId: string; accountLimit?: number }) {
  const { role: legacyRole } = useUserContext();
  const role: MerchantRole = legacyRole === "admin" ? "owner" : (legacyRole || "cashier");
  const canManage = hasCapability(role, "accounts.invite");
  const [accounts, setAccounts] = useState<OutletAccount[]>([]);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "manager" | "cashier">("manager");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      setAccounts(await listOutletAccounts(outletId));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Team accounts could not be loaded.");
    }
  };

  useEffect(() => {
    void load();
  }, [outletId]);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) return;
    setMessage("");
    setSending(true);
    try {
      await inviteOutletAccount(outletId, email, inviteRole);
      setEmail("");
      setMessage("Invitation sent.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "The invitation could not be sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SettingsSection title="Team & Access" description="Manage merchant accounts and outlet roles. Only admins can send invitations.">
      <p className="m-settings-value">
        Account usage: {accounts.filter((account) => account.status === "active").length} of {accountLimit}
      </p>
      {message && <p role="status" className="m-settings-hint">{message}</p>}
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
        <form onSubmit={invite} className="m-settings-group">
          <label className="m-settings-label">Invite account</label>
          <input className="m-settings-control" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <select className="m-settings-control" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as typeof inviteRole)}>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
          </select>
          <button className="m-settings-btn bg-[var(--brand)] text-white" type="submit" disabled={sending}>
            {sending ? "Sending…" : "Send invitation"}
          </button>
        </form>
      ) : (
        <p className="m-settings-hint">Only an outlet admin can invite teammates.</p>
      )}
    </SettingsSection>
  );
}
