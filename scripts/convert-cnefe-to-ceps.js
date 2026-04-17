const { createReadStream, createWriteStream } = require('node:fs');
const { mkdir } = require('node:fs/promises');
const { basename, dirname, extname, resolve } = require('node:path');
const { spawn } = require('node:child_process');
const csv = require('csv-parser');

const args = parseArgs(process.argv.slice(2));

if (!args.input) {
  console.error('Uso: node scripts/convert-cnefe-to-ceps.js --input <arquivo.csv|arquivo.zip> [--output data/ceps.csv] [--state MG] [--city Uberlandia]');
  process.exit(1);
}

const inputPath = resolve(args.input);
const outputPath = resolve(args.output ?? 'data/ceps.csv');
const state = args.state ?? '';
const city = args.city ?? cityFromFileName(inputPath);
const byCep = new Map();

async function main() {
  await mkdir(dirname(outputPath), { recursive: true });

  await readCnefe(inputPath);
  await writeOutput(outputPath);

  console.info(`CEPs gerados: ${byCep.size}`);
  console.info(`Arquivo: ${outputPath}`);
}

function readCnefe(filePath) {
  return new Promise((resolveRead, rejectRead) => {
    const stream = inputStream(filePath);

    stream
      .pipe(csv({ separator: ';' }))
      .on('data', (row) => {
        const cep = normalizeCep(row.CEP);
        const latitude = parseNumber(row.LATITUDE);
        const longitude = parseNumber(row.LONGITUDE);

        if (!cep || latitude === null || longitude === null) {
          return;
        }

        const current = byCep.get(cep) ?? {
          cep,
          latitudeSum: 0,
          longitudeSum: 0,
          count: 0,
          state,
          city,
          neighborhood: clean(row.DSC_LOCALIDADE),
          street: buildStreet(row),
        };

        current.latitudeSum += latitude;
        current.longitudeSum += longitude;
        current.count += 1;

        if (!current.neighborhood) {
          current.neighborhood = clean(row.DSC_LOCALIDADE);
        }

        if (!current.street) {
          current.street = buildStreet(row);
        }

        byCep.set(cep, current);
      })
      .on('error', rejectRead)
      .on('end', resolveRead);
  });
}

function inputStream(filePath) {
  if (extname(filePath).toLowerCase() !== '.zip') {
    return createReadStream(filePath);
  }

  const unzip = spawn('unzip', ['-p', filePath]);
  unzip.on('error', (error) => {
    throw error;
  });

  return unzip.stdout;
}

function writeOutput(filePath) {
  return new Promise((resolveWrite, rejectWrite) => {
    const output = createWriteStream(filePath);
    output.on('error', rejectWrite);
    output.on('finish', resolveWrite);

    output.write('cep,latitude,longitude,state,city,neighborhood,street\n');

    for (const record of [...byCep.values()].sort((a, b) => a.cep.localeCompare(b.cep))) {
      const row = [
        record.cep,
        round(record.latitudeSum / record.count),
        round(record.longitudeSum / record.count),
        record.state,
        record.city,
        record.neighborhood,
        record.street,
      ];
      output.write(`${row.map(csvEscape).join(',')}\n`);
    }

    output.end();
  });
}

function parseArgs(rawArgs) {
  const parsed = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const key = rawArgs[index];

    if (!key.startsWith('--')) {
      continue;
    }

    parsed[key.slice(2)] = rawArgs[index + 1];
    index += 1;
  }

  return parsed;
}

function normalizeCep(value) {
  const cep = String(value ?? '').replace(/\D/g, '');
  return /^\d{8}$/.test(cep) ? cep : null;
}

function parseNumber(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function buildStreet(row) {
  return [row.NOM_TIPO_SEGLOGR, row.NOM_TITULO_SEGLOGR, row.NOM_SEGLOGR]
    .map(clean)
    .filter(Boolean)
    .join(' ');
}

function clean(value) {
  return String(value ?? '').trim();
}

function csvEscape(value) {
  const text = String(value ?? '');

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function round(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function cityFromFileName(filePath) {
  const name = basename(filePath, extname(filePath));
  const cityPart = name.replace(/^\d+_/, '').replace(/_/g, ' ').toLowerCase();

  return cityPart.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
