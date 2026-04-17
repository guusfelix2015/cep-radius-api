# Busca de CEPs por Raio

API NestJS que recebe um CEP de origem e um raio em KM, busca CEPs próximos em uma base CSV georreferenciada e retorna o resultado em JSON.

## Instalação

```bash
cd backend
npm install
```

## Execução

```bash
npm run start:dev
```

Acesse a interface web em: `http://localhost:3000`

Valores para teste rápido:

- CEP: `38400001`
- Raio em KM: `2`

## Testar endpoint

```bash
curl "http://localhost:3000/api/ceps/search-by-radius?cep=38400001&raioKm=2"
```

Resposta:

```json
{
  "originCep": "38400001",
  "radiusKm": 2,
  "total": 14,
  "items": [
    {
      "cep": "38400001",
      "distanceKm": 0,
      "latitude": -18.992836,
      "longitude": -48.337149,
      "state": "MG",
      "city": "Uberlandia",
      "neighborhood": "IRMA DULCE",
      "street": "RUA 5"
    }
  ]
}
```

## Testes

```bash
npm test
npm run test:e2e
npm run build
```

O `test:e2e` tambem cobre concorrencia funcional com multiplas requisicoes simultaneas usando `Promise.all`.

## Teste de carga/performance

Primeiro suba a aplicacao em modo producao:

```bash
npm run build
npm run start:prod
```

Em outro terminal, execute:

```bash
npm run test:load
```

Defaults do teste de carga:

- URL: `http://localhost:3000/api/ceps/search-by-radius?cep=38400001&raioKm=2`
- conexoes simultaneas: `50`
- duracao: `20s`
- limite de p97.5: `300ms`
- falha se houver respostas non-2xx

Para customizar:

```bash
LOAD_TEST_CONNECTIONS=100 LOAD_TEST_DURATION=30 LOAD_TEST_MAX_LATENCY_MS=500 npm run test:load
```

---

# Documentação Técnica

## 1. Requisitos do Case

- Receber um CEP de origem e um raio em KM
- Buscar CEPs próximos em uma base CSV georreferenciada
- Retornar o resultado em JSON

## 2. Decisões Técnicas

### 2.1 Fonte de Dados

O dump CSV do CEP Aberto não possui latitude e longitude, impossibilitando a busca por raio. Utilizei o **IBGE CNEFE 2022**, que contém CEP, latitude, longitude e endereço completo.

A base em `data/ceps.csv` contém **4.380 CEPs** do município de Uberlândia-MG.

### 2.2 Sem Banco de Dados

O requisito pedia CSV, então:

- CSV carregado apenas no bootstrap (inicialização)
- Dados mantidos em memória durante toda a execução
- Sem consultas a disco por requisição

### 2.3 Stack Tecnológico

- **Framework:** NestJS (TypeScript)
- **Validação:** class-validator + ValidationPipe
- **Logs:** Async File Logger (JSON Lines)
- **Testes:** Jest (unitários + e2e)

## 3. Arquitetura (Clean Architecture)

```
src/
├── application/           # Use Cases
│   └── use-cases/        # SearchZipCodesByRadiusUseCase
├── domain/               # Entidades e regras de negócio
│   ├── entities/         # ZipCodeLocation
│   ├── value-objects/   # Cep, GeoPoint, RadiusKm
│   ├── services/        # GeoDistanceService, GeoBoundingBoxService
│   └── repositories/    # Interface do repositório
├── infrastructure/       # Implementações técnicas
│   ├── repositories/     # InMemoryZipCodeLocationRepository
│   ├── data/csv/        # CepLoaderService
│   └── spatial/         # GeoGridIndex
└── presentation/        # Controllers HTTP
    ├── controllers/     # ZipCodeSearchController
    ├── filters/         # HttpExceptionFilter
    └── interceptors/    # TelemetryInterceptor
```

## 4. Fluxo de Dados

```
Requisição HTTP
      │
      ▼
ZipCodeSearchController
      │
      ▼
ValidationPipe (valida cep e raio)
      │
      ▼
SearchZipCodesByRadiusUseCase.execute()
      │
      ├─► Cep.create()                    → Valida formato do CEP
      ├─► RadiusKm.create()               → Valida raio (0 < raio ≤ 200km)
      ├─► repository.findByCep()          → O(1) via Map
      ├─► boundingBoxService.calculate()  → Calcula bounding box
      ├─► repository.findWithinBoundingBox() → GeoGridIndex (pré-filtro)
      ├─► distanceService.calculateKm()   → Haversine para distância real
      ├─► Filtra por raio + ordena
      │
      ▼
TelemetryInterceptor → Registra em logs/telemetry.log
      │
      ▼
Resposta JSON
```

## 5. Como os Dados do CSV foram Gerados

### Processo

1. **Download:** FTP do IBGE CNEFE 2022 → `https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/`
2. **Seleção:** ZIP do município de Uberlândia (código IBGE: 3170206)
3. **Conversão:** Script `scripts/convert-cnefe-to-ceps.js`

### Lógica do Script

- Para cada linha do CNEFE: extrai CEP, latitude, longitude
- Agrupa registros por CEP (múltiplos endereços por CEP)
- Calcula **média das coordenadas** de todos os endereços de cada CEP
- Gera CSV com: cep, latitude, longitude, state, city, neighborhood, street

### Resultado

- 4.380 CEPs únicos de Uberlândia
- Cada CEP tem coordenadas como média dos seus endereços

## 6. Estratégias de Otimização

### 6.1 Busca O(1) - Map por CEP

```typescript
private cepIndex = new Map<string, ZipCodeLocation>();
```

### 6.2 Bounding Box (pré-filtro)

Converte raio km → graus para criar retângulo ao redor do CEP de origem, evitando calcular Haversine para todos os CEPs.

### 6.3 GeoGridIndex

Divide o espaço em células de 0.1 graus. Cada célula contém CEPs daquela região. Busca apenas nas células que intersectam o bounding box.

### 6.4 Haversine

Fórmula que considera curvatura da Terra para distância real:

```
d = 2 * 6371 * asin(√(sin²(dLat/2) + cos(lat1) * cos(lat2) * sin²(dLon/2)))
```

### Complexidade

| Operação             | Complexidade         |
| -------------------- | -------------------- |
| Buscar CEP origem    | O(1)                 |
| Encontrar candidatos | O(k) - Grid          |
| Calcular distâncias  | O(k) - Haversine     |
| **Total**            | **O(k)** onde k << n |

## 7. Telemetria

- **Formato:** JSON Lines
- **Arquivo:** `logs/telemetry.log`
- **Escrita:** Assíncrona (não bloqueia request)

```json
{
  "timestamp": "2026-04-16T10:30:00.000Z",
  "method": "GET",
  "path": "/api/ceps/search-by-radius",
  "query": { "cep": "38400001", "raioKm": "2" },
  "statusCode": 200,
  "responseTime": 45
}
```

## 8. Tratamento de Erros

| Cenário                        | Status                    |
| ------------------------------ | ------------------------- |
| CEP inválido                   | 400 Bad Request           |
| CEP não encontrado             | 404 Not Found             |
| Raio inválido (≤ 0 ou > 200km) | 400 Bad Request           |

## 9. Concorrencia e Performance

- **Concorrencia funcional:** `test/concurrency.e2e-spec.ts` dispara chamadas simultaneas de sucesso e de erro contra o servidor Nest em memoria. Isso valida que as respostas continuam corretas sob varias requisicoes ao mesmo tempo.
- **Carga/performance:** `scripts/load-test.js` usa `autocannon` contra a aplicacao rodando. O script mede requests/s, latencia media, p97.5 e respostas non-2xx.
- **Criterio de sucesso:** chamadas validas nao devem gerar non-2xx, e o p97.5 deve ficar abaixo do limite configurado em `LOAD_TEST_MAX_LATENCY_MS`.

## 10. Como escalar a solução

Para uma base nacional com muitos CEPs e alta concorrencia, a evolucao natural seria trocar o CSV em memoria por **PostgreSQL com PostGIS**.

Por que PostGIS seria uma boa escolha:

- Tem indice espacial nativo, como `GiST`, para consultas geograficas eficientes.
- Permite buscar por raio direto no banco com funcoes como `ST_DWithin`.
- Evita carregar toda a base em memoria no startup.
- Facilita atualizacao incremental da base sem reiniciar a aplicacao.
- Mantem a arquitetura atual: bastaria trocar o repositorio em memoria por um repositorio PostGIS.

Exemplo conceitual:

```sql
SELECT cep, city, state
FROM zip_codes
WHERE ST_DWithin(location, origin_location, radius_meters)
ORDER BY ST_Distance(location, origin_location);
```

Nesta versao do case, mantive CSV em memoria porque o requisito pedia base CSV e a entrega fica mais simples de executar localmente.

## 11. Configuração (.env)

```env
PORT=3000
CSV_PATH=data/ceps.csv
TELEMETRY_LOG_PATH=logs/telemetry.log
MAX_RADIUS_KM=200
GRID_CELL_SIZE_DEGREES=0.1
```

## 12. Regenerar Dados CSV

```bash
npm run data:convert-cnefe -- --input data/cnefe/3170206_UBERLANDIA.zip --output data/ceps.csv --state MG --city Uberlandia
```
