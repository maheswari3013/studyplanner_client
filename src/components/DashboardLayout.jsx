export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-layout-shell">
      <div className="dashboard-layout-content">
        {children}
      </div>
    </div>
  );
}
