export type SearchZipCodeItemOutput = {
  cep: string;
  distanceKm: number;
  latitude: number;
  longitude: number;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
};

export type SearchZipCodesByRadiusOutput = {
  originCep: string;
  radiusKm: number;
  total: number;
  items: SearchZipCodeItemOutput[];
};
