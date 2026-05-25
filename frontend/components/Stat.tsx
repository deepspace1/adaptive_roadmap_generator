import { LucideIcon } from "lucide-react";

export function Stat({ label, value, icon: Icon, tone = "teal" }: { label: string; value: string; icon: LucideIcon; tone?: "teal" | "coral" | "saffron" | "ink" }) {
  const colors = {
    teal: "bg-teal/10 text-teal",
    coral: "bg-coral/10 text-coral",
    saffron: "bg-saffron/20 text-ink",
    ink: "bg-ink text-white"
  };
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink/55">{label}</p>
          <p className="mt-3 break-words text-3xl font-semibold">{value}</p>
        </div>
        <span className={`grid h-11 w-11 place-items-center ${colors[tone]}`} style={{ borderRadius: 8 }}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
