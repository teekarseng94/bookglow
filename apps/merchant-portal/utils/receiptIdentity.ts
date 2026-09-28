/**
 * Receipt identity resolution.
 *
 * Company name, phone and address printed on a receipt are inherited: the shop
 * name and the Booking page contact details are the source of truth. A receipt
 * field only overrides its source while it holds a non-empty value, so clearing
 * it returns that line to following the shop name or contact details again.
 *
 * Settings, the live preview, POS and the printed template all resolve through
 * here so the receipt a merchant previews is the receipt a customer is handed.
 */

export interface OutletContact {
  phone?: string;
  address?: string;
}

export interface ReceiptIdentityInput {
  shopName?: string;
  receiptCompanyName?: string;
  receiptPhone?: string;
  receiptAddress?: string;
  contact?: OutletContact | null;
}

export interface ReceiptIdentity {
  companyName: string;
  phone: string;
  address: string;
}

const text = (value: string | undefined | null): string => (value || '').trim();

export function resolveReceiptIdentity(input: ReceiptIdentityInput): ReceiptIdentity {
  return {
    companyName: text(input.receiptCompanyName) || text(input.shopName),
    phone: text(input.receiptPhone) || text(input.contact?.phone),
    address: text(input.receiptAddress) || text(input.contact?.address),
  };
}
