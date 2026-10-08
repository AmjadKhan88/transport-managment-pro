export const formatPKR = (n) => `Rs ${Number(n || 0).toLocaleString("en-PK")}`;

// Same style as the dashboard: 82.4 Lac, 1.52 Cr
export const formatCompact = (n) => {
  const v = Number(n || 0);
  const a = Math.abs(v);
  if (a >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${(v / 1e5).toFixed(1)} Lac`;
  return v.toLocaleString("en-PK");
};

export const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const formatSigned = (n) => {
  const v = Number(n || 0);
  return `${v < 0 ? "−" : "+"}Rs ${Math.abs(v).toLocaleString("en-PK")}`;
};

export const formatNumber = (n) =>
  Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
