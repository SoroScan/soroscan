type Status = "active" | "failed" | "pending"

export default function StatusIndicator({ status }: { status: Status }) {
  const colors = {
    active: "bg-green-500",
    failed: "bg-red-500",
    pending: "bg-yellow-500",
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2.5 h-2.5 rounded-full ${colors[status]} animate-pulse`}
      />
      <span className="capitalize text-sm">{status}</span>
    </div>
  )
}
