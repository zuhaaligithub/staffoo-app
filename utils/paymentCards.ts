export type SavedCard = {
  card_holder_name: string;
  card_number: string;
  expiry_month: string;
  expiry_year: string;
  cvv?: string;
};

export const normalizeBankDetails = (value: unknown): SavedCard[] => {
  if (Array.isArray(value)) {
    return value.map((card) => ({
      card_holder_name: card?.card_holder_name ?? "",
      card_number: card?.card_number ?? "",
      expiry_month: card?.expiry_month ?? "",
      expiry_year: card?.expiry_year ?? "",
      cvv: card?.cvv ?? "",
    })) as SavedCard[];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? (parsed as SavedCard[]).map((card) => ({
            card_holder_name: card?.card_holder_name ?? "",
            card_number: card?.card_number ?? "",
            expiry_month: card?.expiry_month ?? "",
            expiry_year: card?.expiry_year ?? "",
            cvv: card?.cvv ?? "",
          }))
        : [];
    } catch {
      return [];
    }
  }

  return [];
};

export const buildBankDetailsFormData = (cards: SavedCard[]) => {
  const formData = new FormData();
  formData.append("bank_details", JSON.stringify(cards));
  return formData;
};
