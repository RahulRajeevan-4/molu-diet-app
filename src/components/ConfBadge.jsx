export default function ConfBadge({ bucket, raw }) {
  const cls = bucket === "high" ? "high" : bucket === "moderate" ? "moderate" : "";
  const label = bucket === "high" ? "High" : bucket === "moderate" ? "Moderate" : "Mixed";
  return (
    <span className={"conf-badge " + cls} title={raw}>
      {label}
    </span>
  );
}
