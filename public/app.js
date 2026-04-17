const form = document.querySelector('#search-form');
const button = document.querySelector('#submit');
const clearButton = document.querySelector('#clear');
const statusEl = document.querySelector('#status');
const resultsEl = document.querySelector('#results');
const resultCountEl = document.querySelector('#result-count');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function renderResults(payload) {
  resultsEl.innerHTML = '';

  if (!payload.items.length) {
    setStatus('Nenhum CEP encontrado dentro do raio informado.');
    resultCountEl.textContent = '0 resultados';
    return;
  }

  setStatus(`${payload.total} resultado(s) encontrado(s).`);
  resultCountEl.textContent = `${payload.total} resultado(s)`;

  for (const item of payload.items) {
    const li = document.createElement('li');
    li.className = 'result-item';
    li.innerHTML = `
      <span class="cep">${item.cep}</span>
      <span>${[item.street, item.neighborhood, item.city, item.state].filter(Boolean).join(' - ')}</span>
      <span class="distance">${item.distanceKm.toFixed(3)} km</span>
    `;
    resultsEl.appendChild(li);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  clearButton.disabled = true;
  resultsEl.innerHTML = '';
  resultCountEl.textContent = 'Buscando...';
  setStatus('Buscando...');

  const params = new URLSearchParams(new FormData(form));

  try {
    const response = await fetch(`/api/ceps/search-by-radius?${params.toString()}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || 'Erro ao buscar CEPs.');
    }

    renderResults(payload);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Erro inesperado.', true);
    resultCountEl.textContent = 'Erro na busca';
  } finally {
    button.disabled = false;
    clearButton.disabled = false;
  }
});

clearButton.addEventListener('click', () => {
  form.reset();
  resultsEl.innerHTML = '';
  resultCountEl.textContent = 'Nenhuma busca executada';
  setStatus('');
});
