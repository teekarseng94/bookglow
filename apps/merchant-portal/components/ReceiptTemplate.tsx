/**
 * Hidden receipt template for POS. Invisible on screen; shown only when printing
 * via @media print (target #printable-receipt). Formatted for 80mm thermal paper.
 */

import React from 'react';
import { CartItem, OutletSettings } from '../types';

export interface ReceiptTemplateData {
  items: CartItem[];
  total: number;
  date: string;
  customerName: string;
  paymentMethod: string;
  receiptSettings?: Pick<
    OutletSettings,
    'receiptHeaderTitle' | 'receiptCompanyName' | 'receiptPhone' | 'receiptAddress' | 'receiptFooterNote' | 'shopName'
  >;
}

interface ReceiptTemplateProps {
  data: ReceiptTemplateData;
}

const ReceiptTemplate: React.FC<ReceiptTemplateProps> = ({ data }) => {
  const { items, total, date, customerName, paymentMethod, receiptSettings } = data;
  const dateFormatted = new Date(date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const companyName = receiptSettings?.receiptCompanyName?.trim() || receiptSettings?.shopName || 'ZenFlow Spa';
  const headerTitle = receiptSettings?.receiptHeaderTitle?.trim() || 'Tax Invoice';
  const phone = receiptSettings?.receiptPhone?.trim();
  const address = receiptSettings?.receiptAddress?.trim();
  const footerNote = receiptSettings?.receiptFooterNote?.trim() || 'Thank you for your visit!';

  const redeemedPointsTotal = items.reduce((sum, item) => {
    if (!item.redeemedWithPoints || !item.redeemPoints) return sum;
    return sum + item.redeemPoints * item.quantity;
  }, 0);

  return (
    <div id="printable-receipt" className="receipt-container" aria-hidden="true">
      <div className="receipt-header">
        <h1>{companyName}</h1>
        <p>{headerTitle}</p>
        {phone && <p>Phone: {phone}</p>}
        {address && <p>{address}</p>}
        <p>{dateFormatted}</p>
        <p>Customer: {customerName}</p>
      </div>
      {items.map((item, idx) => (
        <div key={idx} className="receipt-row">
          <span>
            {item.name}
            {item.redeemedWithPoints && item.redeemPoints && (
              <span className="receipt-tag">REDEEMED · {item.redeemPoints} pts</span>
            )}
          </span>
          <span>
            {item.quantity} x RM {item.price.toFixed(2)}
          </span>
        </div>
      ))}
      <div className="receipt-row receipt-row-total">
        <span>Total</span>
        <span>RM {total.toFixed(2)}</span>
      </div>
      {redeemedPointsTotal > 0 && (
        <div className="receipt-row">
          <span>Points Redeemed</span>
          <span>{redeemedPointsTotal} pts</span>
        </div>
      )}
      <p className="receipt-payment-row">Payment: {paymentMethod}</p>
      <div className="receipt-footer">
        <p>{footerNote}</p>
      </div>
    </div>
  );
};

export default ReceiptTemplate;
