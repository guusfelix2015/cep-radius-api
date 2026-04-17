import { Cep } from '../value-objects/cep.vo';
import { GeoPoint } from '../value-objects/geo-point.vo';

export type ZipCodeLocationProps = {
  cep: string;
  latitude: number;
  longitude: number;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
};

export class ZipCodeLocation {
  readonly cep: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly state?: string;
  readonly city?: string;
  readonly neighborhood?: string;
  readonly street?: string;

  constructor(props: ZipCodeLocationProps) {
    const cep = Cep.create(props.cep);
    const point = GeoPoint.create(props.latitude, props.longitude);

    this.cep = cep.value;
    this.latitude = point.latitude;
    this.longitude = point.longitude;
    this.state = props.state;
    this.city = props.city;
    this.neighborhood = props.neighborhood;
    this.street = props.street;
  }
}
