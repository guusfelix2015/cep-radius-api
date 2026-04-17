import { Controller, Get, Query } from '@nestjs/common';
import { SearchZipCodesByRadiusUseCase } from '../../../application/use-cases/search-zip-codes-by-radius.use-case';
import { SearchZipCodesByRadiusOutput } from '../../../application/dto/search-zip-codes-by-radius.output';
import { SearchZipCodesQueryDto } from '../dto/search-zip-codes.query.dto';

@Controller('ceps')
export class ZipCodeSearchController {
  constructor(
    private readonly searchByRadiusUseCase: SearchZipCodesByRadiusUseCase,
  ) {}

  @Get('search-by-radius')
  searchByRadius(
    @Query() query: SearchZipCodesQueryDto,
  ): Promise<SearchZipCodesByRadiusOutput> {
    return this.searchByRadiusUseCase.execute({
      cep: query.cep,
      radiusKm: query.raioKm,
    });
  }
}
