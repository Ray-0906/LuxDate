export default function PaymentsPage() {
  return (
    <div className="fade-in">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Payments</h1>
      <div className="card" style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Payment Dashboard</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, maxWidth: 400, margin: '0 auto' }}>
          Payment analytics and transaction history will appear here once payment gateways are configured and orders start flowing.
        </p>
      </div>
    </div>
  );
}
