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

export const formatBytes = (n) => {
  const v = Number(n || 0);
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(0)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export function timeAgo(d) {
  const seconds = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(d);
}
