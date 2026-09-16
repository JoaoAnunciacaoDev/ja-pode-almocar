import { Coffee, Moon, Utensils, type LucideIcon } from "lucide-react";

import type { MealType } from "@/features/agenda/model/meals";

const mealIcons: Record<MealType, LucideIcon> = {
  BREAKFAST: Coffee,
  LUNCH: Utensils,
  DINNER: Moon,
};

export function MealIcon({ mealType, className }: { mealType: MealType; className?: string }) {
  const Icon = mealIcons[mealType];
  return <Icon aria-hidden="true" className={className} />;
}
