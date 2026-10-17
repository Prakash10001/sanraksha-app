import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import axiosClient from "../api/axiosClient.js";
import loadRazorpayCheckout from "../api/razorpayCheckout.js";

const PATIENT_NAV = [
  { label: "My care", to: "/portal" },
  { label: "Appointments", to: "/book" },
  { label: "Records", to: "/records" },
  { label: "Billing", to: "/billing" },
];

function formatAmount(amountPaise, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format((Number(amountPaise) || 0) / 100);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message
    || error?.response?.data?.error
    || error?.message
    || fallback;
}

export default function Billing() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [gatewayEnabled, setGatewayEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingInvoiceId, setPayingInvoiceId] = useState(null);
  const [notice, setNotice] = useState("");

  const displayName = user?.fullName || user?.name || user?.email || "Patient";
  const initials = displayName
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const loadBillingData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [invoiceResponse, configResponse] = await Promise.all([
        axiosClient.get("/patient/billing/invoices"),
        axiosClient.get("/patient/billing/config"),
      ]);
      setInvoices(Array.isArray(invoiceResponse.data) ? invoiceResponse.data : []);
      setGatewayEnabled(Boolean(configResponse.data?.enabled));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load your billing details."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  const totals = useMemo(() => invoices.reduce((summary, invoice) => {
    const amount = Number(invoice.amountPaise) || 0;
    if (invoice.status === "PAID") summary.paid += amount;
    else summary.pending += amount;
    return summary;
  }, { paid: 0, pending: 0 }), [invoices]);

  async function handlePayInvoice(invoice) {
    setError("");
    setNotice("");
    setPayingInvoiceId(invoice.id);

    try {
      const { data: order } = await axiosClient.post(`/patient/billing/invoices/${invoice.id}/payment-order`);
      await loadRazorpayCheckout();
      if (!window.Razorpay) throw new Error("Razorpay Checkout did not initialize.");

      const finishPayment = async (payment) => {
        try {
          const { data: verifiedInvoice } = await axiosClient.post(
            `/patient/billing/invoices/${invoice.id}/verify-payment`,
            {
              razorpayOrderId: payment.razorpay_order_id,
              razorpayPaymentId: payment.razorpay_payment_id,
              razorpaySignature: payment.razorpay_signature,
            },
          );
          setInvoices((current) => current.map((item) => item.id === verifiedInvoice.id ? verifiedInvoice : item));
          setNotice(`Payment received for ${verifiedInvoice.invoiceNumber}.`);
        } catch (verificationError) {
          setError(getErrorMessage(verificationError, "Payment could not be verified. Contact the hospital before retrying."));
          await loadBillingData();
        } finally {
          setPayingInvoiceId(null);
        }
      };

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: "Sanraksha Hospital",
        description: order.invoiceNumber,
        order_id: order.orderId,
        prefill: { name: order.patientName, email: order.patientEmail },
        theme: { color: "#8a2a2a" },
        handler: finishPayment,
        modal: { ondismiss: () => setPayingInvoiceId(null) },
      });
      checkout.on("payment.failed", (event) => {
        setError(event?.error?.description || "Payment was not completed. You can try again.");
        setPayingInvoiceId(null);
      });
      checkout.open();
    } catch (paymentError) {
      setError(getErrorMessage(paymentError, "Unable to start payment."));
      setPayingInvoiceId(null);
    }
  }

  return (
    <div>
      <Header navLinks={PATIENT_NAV} user={{ initials, name: displayName, role: "Patient" }} />
      <div className="page">
        <div className="page-head">
          <h1>Billing</h1>
          <p>View invoices issued for your care and securely pay any outstanding balance.</p>
        </div>

        <section className="portal-info-section">
          <div className="portal-section-header">
            <h2>Your billing summary</h2>
            <button type="button" className="portal-section-link" onClick={loadBillingData} disabled={loading}>
              Refresh
            </button>
          </div>
          <div className="portal-card-grid">
            <div className="portal-stat-card invoice">
              <span className="portal-card-kicker">Outstanding</span>
              <strong>{formatAmount(totals.pending)}</strong>
              <p>Balance due across pending invoices.</p>
            </div>
            <div className="portal-stat-card history">
              <span className="portal-card-kicker">Paid</span>
              <strong>{formatAmount(totals.paid)}</strong>
              <p>Total recorded payments.</p>
            </div>
            <div className="portal-stat-card summary">
              <span className="portal-card-kicker">Invoices</span>
              <strong>{invoices.length}</strong>
              <p>Invoices associated with your account.</p>
            </div>
          </div>
        </section>

        <section className="portal-info-section invoice-table-panel" style={{ marginTop: 24 }}>
          <div className="portal-section-header">
            <h2>Invoices</h2>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-success" role="status">{notice}</p>}
          {!gatewayEnabled && !loading && (
            <p className="billing-gateway-notice">
              Online payment is not configured yet. Please contact the hospital to pay a pending invoice.
            </p>
          )}
          {loading ? (
            <p>Loading your invoices…</p>
          ) : invoices.length === 0 ? (
            <div className="portal-detail-panel">
              <strong>No invoices yet</strong>
              <p>Invoices issued by the hospital for your account will appear here.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Description</th>
                  <th>Appointment</th>
                  <th>Issued</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNumber}</td>
                    <td>{invoice.description}</td>
                    <td>{invoice.appointmentId ? `#${invoice.appointmentId}` : "—"}</td>
                    <td>{formatDate(invoice.createdAt)}</td>
                    <td>{formatAmount(invoice.amountPaise, invoice.currency)}</td>
                    <td>{invoice.status === "PAID" ? `Paid${invoice.paidAt ? ` · ${formatDate(invoice.paidAt)}` : ""}` : "Pending"}</td>
                    <td>
                      {invoice.status !== "PAID" && (
                        <button
                          type="button"
                          className="btn-primary invoice-pay-button"
                          disabled={!gatewayEnabled || payingInvoiceId !== null}
                          onClick={() => handlePayInvoice(invoice)}
                        >
                          {payingInvoiceId === invoice.id ? "Opening…" : "Pay invoice"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <div className="page-head" style={{ marginTop: 24 }}>
          <Link className="btn-primary" to="/portal" style={{ display: "inline-block" }}>Back to my care</Link>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
