/**
 * Script: app.js
 * Purpose: fetch provider data and render comparison table on GitHub Pages
 * Note: data is pulled from ./data/providers.json. For live updates use CI or an API to update that file.
 */
(async function(){
  const tableWrap = document.getElementById('table-wrap');
  const metricSel = document.getElementById('metric');
  const refreshBtn = document.getElementById('refresh');
  const lastUpdatedSpan = document.getElementById('lastUpdated');
  const DATA_URL = 'data/providers.json';

  function getByPath(obj, path) {
    return path.split('.').reduce((o,k) => (o && o[k] !== undefined) ? o[k] : null, obj);
  }

  function render(data){
    const providers = Object.keys(data.providers || {});
    lastUpdatedSpan.textContent = data.lastUpdated ? `Last updated: ${new Date(data.lastUpdated).toLocaleString()}` : '';
    if (!providers.length) {
      tableWrap.innerHTML = '<p>No provider data available. Update <code>data/providers.json</code>.</p>';
      return;
    }

    const rows = [
      {label:'Compute (name)', key:'compute.name'},
      {label:'Compute ($/hour)', key:'compute.price_usd_per_hour'},
      {label:'Storage ($/GB·month)', key:'storage.gb_month_usd'},
      {label:'Network ($/GB)', key:'network.bandwidth_gb_price_usd'},
      {label:'Managed DB', key:'database.managed'},
      {label:'DB engines', key:'database.engines'},
      {label:'Kubernetes managed', key:'kubernetes.managed'},
      {label:'Regions', key:'regions'},
      {label:'SLA (%)', key:'sla'},
      {label:'Free tier', key:'free_tier'}
    ];

    let html = '<table aria-live="polite"><thead><tr><th>Service / Metric</th>';
    providers.forEach(p => html += `<th>${p}</th>`);
    html += '</tr></thead><tbody>';

    rows.forEach(r => {
      html += `<tr><th>${r.label}</th>`;
      providers.forEach(p => {
        const v = getByPath(data.providers[p], r.key);
        let cell = '-';
        if (Array.isArray(v)) cell = v.join(', ');
        else if (v === true) cell = '<span class="badge ok">Yes</span>';
        else if (v === false) cell = '<span class="badge no">No</span>';
        else if (v !== null && v !== undefined) cell = String(v);
        html += `<td>${cell}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    tableWrap.innerHTML = html;
  }

  async function loadData(){
    try {
      const res = await fetch(DATA_URL, {cache: 'no-store'});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      render(json);
    } catch (e) {
      tableWrap.innerHTML = `<p>Error loading data: ${e.message}</p>`;
    }
  }

  refreshBtn.addEventListener('click', loadData);
  metricSel.addEventListener('change', loadData);

  // initial load
  loadData();
})();
