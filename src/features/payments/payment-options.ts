export type PaymentCategory = "match_fee" | "subs" | "kit" | "fine" | "other";

export const PAYMENT_CATEGORIES: { value: PaymentCategory; label: string }[] = [
  { value: "match_fee", label: "Match fee" },
  { value: "subs", label: "Subs" },
  { value: "kit", label: "Kit" },
  { value: "fine", label: "Fine" },
  { value: "other", label: "Other" },
];

export function paymentCategoryLabel(category: PaymentCategory | null | undefined) {
  return PAYMENT_CATEGORIES.find((option) => option.value === category)?.label ?? "Other";
}
