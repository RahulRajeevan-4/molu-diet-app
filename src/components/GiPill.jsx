export default function GiPill({ value, bucket }) {
  if (bucket === "na") {
    return (
      <span className="pill na">
        <span className="pill-dot" />
        no data
      </span>
    );
  }
  const label = bucket === "low" ? "Low" : bucket === "medium" ? "Med" : "High";
  return (
    <span className={"pill " + bucket}>
      <span className="pill-dot" />
      {value} &middot; {label}
    </span>
  );
}
