export type ProposalLineItem = {
  id: string;
  category: string;
  name: string;
  description?: string;
  image?: string;
  quantityLabel?: string;
  unitPrice?: number;
  subtotal: number;
  note?: string;
};

export type ProposalTableRow = {
  id: string;
  category: string;
  name: string;
  quantity: string;
  unitPrice?: number;
  subtotal: number;
};
