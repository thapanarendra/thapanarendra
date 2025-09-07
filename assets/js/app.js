/**
 * File: app.js
 * Absolute path shown above.
 * Summary: Client-side logic for the static GitHub Pages site.
 * - Loads data from /data/providers.json
 * - Renders UI cards and a comparison table
 * - Simple refresh button to bypass cache
 *
 * Comments:
 * - Keep providers.json updated via the provided GitHub Action.
 * - For richer features (filters, charts, TCO), extend this file or add modules.
 */
(function () {
  'use strict';

  const DATA_URL = 'data/providers.json'; // relative path used on GitHub Pages
  const cardsEl = document.getElementById('cards');
  const tableWrap = document.getElementById('tableWrap');
  const statusEl = document.getElementById('status');
  const refreshBtn = document.getElementById('refreshBtn');

  // Set visible status text
  function setStatus(text) { statusEl.textContent = text; }

  // Safe access helper
  function safeGet(obj, path, fallback = '-') {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : fallback, obj);
  }

  // Fetch providers JSON; append cache-buster when force==true
  async function fetchData(force = false) {
    try {
      setStatus('Loading…');
      const url = DATA_URL + (force ? '?_=' + Date.now() : '');
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('Network ' + res.status);
      return await res.json();
    } catch (err) {
      setStatus('Error');
      throw err;
    }
  }

  // Render provider cards
  function renderCards(providers) {
    cardsEl.innerHTML = '';
    Object.entries(providers).forEach(([name, p]) => {
      const price = (p.compute && typeof p.compute.price_usd_per_hour === 'number') ? `$${Number(p.compute.price_usd_per_hour).toFixed(3)}` : '—';
      const storage = (p.storage && typeof p.storage.gb_month_usd === 'number') ? `$${p.storage.gb_month_usd}/GB` : '—';
      const dbMode = (p.database && p.database.managed) ? 'Managed' : 'Self';
      const sla = p.sla ? `${p.sla}%` : '—';
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${name}</h3>
        <div class="muted">${safeGet(p, 'compute.name', 'Compute')} · <strong>${price}</strong></div>
        <div style="margin-top:8px">Storage: ${storage} · Network: ${safeGet(p, 'network.bandwidth_gb_price_usd', '—')}</div>
        <div style="margin-top:8px">DB: ${dbMode} · ${Array.isArray(p.database && p.database.engines) ? p.database.engines.join(', ') : ''}</div>
        <div style="margin-top:8px" class="muted">Regions: ${safeGet(p, 'regions', '—')} · SLA: ${sla}</div>
      `;
      cardsEl.appendChild(card);
    });
  }

  // Render comparison table
  function renderTable(providers) {
    const names = Object.keys(providers);
    if (!names.length) {
      tableWrap.innerHTML = '<p>No provider data available.</p>';
      return;
    }
    const rows = [
      ['Compute', p => safeGet(p, 'compute.name', '—')],
      ['Compute $/hr', p => safeGet(p, 'compute.price_usd_per_hour', '—')],
      ['Storage $/GB·mo', p => safeGet(p, 'storage.gb_month_usd', '—')],
      ['Network $/GB', p => safeGet(p, 'network.bandwidth_gb_price_usd', '—')],
      ['Managed DB', p => (p.database && p.database.managed) ? 'Yes' : 'No'],
      ['DB engines', p => Array.isArray(p.database && p.database.engines) ? p.database.engines.join(', ') : '—'],
      ['K8s managed', p => (p.kubernetes && p.kubernetes.managed) ? 'Yes' : 'No'],
      ['Regions', p => safeGet(p, 'regions', '—')],
      ['SLA (%)', p => safeGet(p, 'sla', '—')]
    ];

    let html = '<table><thead><tr><th>Metric</th>';
    names.forEach(n => html += `<th>${n}</th>`);
    html += '</tr></thead><tbody>';
    rows.forEach(([label, fn]) => {
      html += `<tr><th>${label}</th>`;
      names.forEach(n => html += `<td>${fn(providers[n])}</td>`);
      html += '</tr>';
    });
    html += '</tbody></table>';
    tableWrap.innerHTML = html;
  }

  // Main load
  async function load(force = false) {
    try {
      const data = await fetchData(force);
      const providers = data.providers || {};
      renderCards(providers);
      renderTable(providers);
      setStatus('Updated: ' + (data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'unknown'));
    } catch (err) {
      console.error(err);
      setStatus('Error loading data');
      tableWrap.innerHTML = `<p>Error: ${err.message}</p>`;
    }
  }

  // Attach events
  refreshBtn.addEventListener('click', () => load(true));
  // initial render
  load();
})();
