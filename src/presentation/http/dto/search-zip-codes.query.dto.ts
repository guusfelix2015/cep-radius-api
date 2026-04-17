import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SearchZipCodesQueryDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  cep!: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'raioKm deve ser numerico' })
  raioKm!: number;
}
