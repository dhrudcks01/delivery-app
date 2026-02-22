export type AddressItem = {
  roadAddress: string;
  jibunAddress: string;
  zipCode: string;
};

export type AddressSearchResponse = {
  query: string;
  limit: number;
  results: AddressItem[];
};
