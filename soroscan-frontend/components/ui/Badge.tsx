type BadgeProps = {
  children: React.ReactNode
  variant?: "default" | "success" | "error" | "warning"
  size?: "sm" | "md" | "lg"
  icon?: React.ReactNode
}

export default function Badge({
  children,
  variant = "default",
  size = "md",
  icon,
}: BadgeProps) {
  const base = "inline-flex items-center rounded-full font-medium"

  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-2",
  }

  const variants = {
    default: "bg-gray-200 text-gray-800",
    success: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
    warning: "bg-yellow-100 text-yellow-700",
  }

  return (
    <span className={`${base} ${sizes[size]} ${variants[variant]}`}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  )
}
