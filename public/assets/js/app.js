// filepath: public/assets/js/app.js
// Script: app.js
// Purpose: fetch normalized provider data from edge aggregator and render UI
(async function () {
  const API = 'https://YOUR_WORKER_SUBDOMAIN.workers.dev/api/providers'; // replace after deploy
  const refreshBtn = document.getElementById('refreshBtn');
  const statusEl = document.getElementById('status');
  const cards = document.getElementById('cards');
  const tableWrap = document.getElementById('tableWrap');
  const regionFilter = document.getElementById('regionFilter');
  const chartCtx = document.getElementById('priceChart').getContext('2d');
  let chart;

  function setStatus(s) { statusEl.textContent = s; }

  function renderCards(providers, region) {
    cards.innerHTML = '';
    Object.entries(providers).forEach(([name, p]) => {
      const card = document.createElement('div'); card.className = 'card';
      const compute = p.compute?.name || '—';
      const price = p.compute?.price_usd_per_hour != null ? `$${p.compute.price_usd_per_hour.toFixed(3)}` : '—';
      const regions = p.regions || '—';
      const db = p.database?.managed ? 'Managed' : 'Self‑managed';
      card.innerHTML = `<h3>${name} <span class="tag">${p.kubernetes?.managed ? 'K8s' : ''}</span></h3>
        <p class="metric">${compute} · ${price}</p>
        <p>Storage: ${p.storage?.gb_month_usd ? '$'+p.storage.gb_month_usd+'/GB' : '—'}</p>
        <p>DB: ${db} · Engines: ${p.database?.engines ? p.database.engines.join(', ') : '—'}</p>
        <p>Regions: ${regions} · SLA: ${p.sla || '—'}%</p>`;
      cards.appendChild(card);
    });
  }

  function renderTable(providers) {
    const names = Object.keys(providers);
    if (!names.length) { tableWrap.innerHTML = '<p>No provider data.</p>'; return; }
    let html = '<table><thead><tr><th>Metric</th>';
    names.forEach(n => html += `<th>${n}</th>`);
    html += '</tr></thead><tbody>';
    const rows = [
      ['Compute', p=>p.compute?.name || '—'],
      ['Compute $/hr', p=>p.compute?.price_usd_per_hour ?? '—'],
      ['Storage $/GB·mo', p=>p.storage?.gb_month_usd ?? '—'],
      ['Network $/GB', p=>p.network?.bandwidth_gb_price_usd ?? '—'],
      ['Managed DB', p=>p.database?.managed ? 'Yes' : 'No'],
      ['K8s managed', p=>p.kubernetes?.managed ? 'Yes' : 'No'],
      ['Regions', p=>p.regions ?? '—'],
      ['SLA (%)', p=>p.sla ?? '—'],
    ];
    rows.forEach(([label, fn])=>{
      html += `<tr><th>${label}</th>`;
      names.forEach(n=>{
        const v = fn(providers[n]);
        html += `<td>${Array.isArray(v) ? v.join(', ') : v}</td>`;
      });
      html += `</tr>`;
    });
    html += '</tbody></table>';
    tableWrap.innerHTML = html;
  }

  function renderChart(providers) {
    const labels = [], data = [];
    Object.entries(providers).forEach(([name,p])=>{
      labels.push(name);
      const v = p.compute?.price_usd_per_hour;
      data.push(typeof v === 'number' ? Number(v.toFixed(4)) : null);
    });
    if (chart) chart.destroy();
    chart = new Chart(chartCtx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Compute $/hr', data, backgroundColor: '#2b7cff' }] },
      options: { responsive: true, scales: { y: { beginAtZero:true } } }
    });
  }

  async function populateRegions(providers) {
    const set = new Set(['global']);
    Object.values(providers).forEach(p=>{
      if (Array.isArray(p.region_list)) p.region_list.forEach(r=>set.add(r));
    });
    regionFilter.innerHTML = '';
    Array.from(set).forEach(r => regionFilter.appendChild(new Option(r, r)));
  }

  async function load(refresh=false) {
    try {
      setStatus('Loading…');
      const url = new URL(API);
      if (refresh) url.searchParams.set('refresh','1');
      const res = await fetch(url.toString(), {cache: 'no-store'});
      if (!res.ok) throw new Error('Network ' + res.status);
      const json = await res.json();
      const providers = json.providers || {};
      renderCards(providers);
      renderTable(providers);
      renderChart(providers);
      await populateRegions(providers);
      setStatus('Updated: ' + new Date(json.lastUpdated || Date.now()).toLocaleString());
    } catch (err) {
      setStatus('Error: ' + err.message);
      console.error(err);
    }
  }

  refreshBtn.addEventListener('click', ()=>load(true));
  regionFilter.addEventListener('change', ()=>{/* optional region-filtered UI */});

  // initial
  load();
  // auto refresh every 6 minutes
  setInterval(()=>load(false), 6 * 60 * 1000);
})();
