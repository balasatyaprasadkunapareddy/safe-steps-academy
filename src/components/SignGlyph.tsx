import {
  Octagon,
  TriangleAlert,
  Ban,
  CircleParking,
  Gauge,
  VolumeX,
  CornerUpLeft,
  Footprints,
  School,
  CornerRightUp,
  MoveHorizontal,
  Rabbit,
  Cross,
  BriefcaseMedical,
  ArrowDownToLine,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const glyphIcons: Record<string, LucideIcon> = {
  octagon: Octagon,
  "triangle-down": TriangleAlert,
  "no-entry": Ban,
  "circle-cross": CircleParking,
  "circle-40": Gauge,
  "circle-horn": VolumeX,
  "circle-left": CornerUpLeft,
  "triangle-ped": Footprints,
  "triangle-school": School,
  "triangle-curve": CornerRightUp,
  "triangle-bridge": MoveHorizontal,
  "triangle-cattle": Rabbit,
  "square-hospital": Cross,
  "square-firstaid": BriefcaseMedical,
  "square-parking": CircleParking,
  "square-subway": ArrowDownToLine,
};

const categoryStyles: Record<string, string> = {
  Mandatory: "border-destructive/70 bg-destructive/10 text-destructive rounded-full",
  Warning: "border-warning bg-warning/15 text-warning-foreground rounded-2xl",
  Informational: "border-primary/60 bg-primary-soft text-primary rounded-lg",
};

export function SignGlyph({
  glyph,
  category,
  className,
}: {
  glyph: string;
  category: string;
  className?: string;
}) {
  const Icon = glyphIcons[glyph] ?? TriangleAlert;
  return (
    <div
      aria-hidden
      className={cn(
        "flex size-16 shrink-0 items-center justify-center border-4",
        categoryStyles[category] ?? categoryStyles["Informational"],
        className,
      )}
    >
      <Icon className="size-7" strokeWidth={2.2} />
    </div>
  );
}
