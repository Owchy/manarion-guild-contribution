// ==UserScript==
// @name         Manarion Guild Contributions Logger
// @namespace    http://tampermonkey.net/
// @version      2.7
// @description  Log total contributions for each guild member and export to CSV
// @match        https://manarion.com/guild*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const delayBetweenActions = 3000;
    const contributionsData = [];
    const contributionFields = ['Mana Dust', 'Elemental Shards', 'Codex', 'Fish', 'Wood', 'Iron', 'Battle XP'];

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function waitFor(fn, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const check = () => {
                try {
                    const result = fn();
                    if (result) return resolve(result);
                } catch (e) {}
                if (Date.now() - start > timeout) return reject('Timeout');
                setTimeout(check, 100);
            };
            check();
        });
    }

    function simulateClick(el) {
        if (!el) return;
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }

    function parseNumber(str) {
        if (!str) return '';
        str = str.trim().replace(/,/g, '');
        const suffixes = { 'K': 1e3, 'M': 1e6, 'B': 1e9, 'T': 1e12 };
        const match = str.match(/^(-?[\d.]+)([KMBT])?$/);
        if (match) {
            const num = parseFloat(match[1]);
            const mult = suffixes[match[2]] || 1;
            return Math.round(num * mult).toString();
        }
        const digitsOnly = str.replace(/[^\d.-]/g, '');
        return digitsOnly;
    }

    function downloadCSV(data) {
        if (data.length === 0) return;

        const headers = ['Name', ...contributionFields];
        const rows = data.map(entry => headers.map(field => JSON.stringify(entry[field] || '')).join(','));
        const csvContent = [headers.join(','), ...rows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', 'manarion_contributions.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function createResultsModal(data) {
        const existing = document.getElementById('contrib-results-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'contrib-results-modal';
        Object.assign(modal.style, {
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 10000, background: '#1e1e1e', color: '#fff', padding: '20px',
            maxHeight: '80vh', overflowY: 'auto', width: '700px', borderRadius: '10px',
            boxShadow: '0 0 15px rgba(0,0,0,0.5)', fontFamily: 'monospace'
        });

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        Object.assign(closeBtn.style, {
            float: 'right', background: '#e74c3c', color: '#fff',
            border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer'
        });
        closeBtn.addEventListener('click', () => modal.remove());

        const header = document.createElement('h3');
        header.textContent = 'Guild Contributions Summary';

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';

        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        ['Name', ...contributionFields].forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            th.style.borderBottom = '1px solid #999';
            th.style.padding = '4px';
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);

        const tbody = document.createElement('tbody');
        data.forEach(entry => {
            const row = document.createElement('tr');
            ['Name', ...contributionFields].forEach(key => {
                const td = document.createElement('td');
                td.textContent = entry[key] || '';
                td.style.padding = '4px';
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        modal.appendChild(closeBtn);
        modal.appendChild(header);
        modal.appendChild(table);
        document.body.appendChild(modal);
    }

    async function runContributionLogger() {
        const log = [];
        const rows = document.querySelectorAll('tr[data-slot="table-row"]');
        console.log(`Found ${rows.length} members.`);

        for (const row of rows) {
            const nameSpan = row.querySelector('span.cursor-pointer[aria-haspopup="menu"]');
            const name = nameSpan?.textContent?.trim();

            if (!nameSpan || !name) {
                console.warn("❌ Could not find name span in row.");
                continue;
            }

            console.log(`→ Clicking ${name}`);
            logToPanel(`▶ ${name}`);
            simulateClick(nameSpan);
            await delay(800);

            const foundMenu = await waitFor(() => {
                const menuItems = [...document.querySelectorAll('div[role="menuitem"]')];
                return menuItems.some(el => el.textContent.trim() === 'Contributions');
            }, 2000).catch(() => null);

            if (!foundMenu) {
                const err = `❌ Menu didn't open properly for ${name}`;
                console.warn(err);
                logToPanel(err);
                continue;
            }

            const menuItems = [...document.querySelectorAll('div[role="menuitem"]')];
            const contribItem = menuItems.find(el => el.textContent.trim() === 'Contributions');

            if (!contribItem) {
                const err = `❌ Could not find 'Contributions' item for ${name}`;
                console.warn(err);
                logToPanel(err);
                continue;
            }

            simulateClick(contribItem);
            await delay(1000);

            const dialog = await waitFor(() => document.querySelector('div[role="dialog"]'), 3000).catch(() => null);
            if (!dialog || typeof dialog.querySelectorAll !== 'function') {
                const err = `❌ Dialog did not open or is invalid for ${name}`;
                console.warn(err);
                logToPanel(err);
                continue;
            }

            let contributions = { Name: name };
            try {
                const header = dialog.querySelector('div[data-slot="dialog-header"]');
                if (!header) throw new Error(`Header section not found`);

                const contribLines = header.querySelectorAll('div');
                for (const line of contribLines) {
                    const spans = line.querySelectorAll('span');
                    if (spans.length === 2) {
                        const labelRaw = spans[0].textContent || '';
                        const label = labelRaw.replace(/\[|\]/g, '').trim();
                        const valueRaw = spans[1].getAttribute('title') || spans[1].textContent || '';
                        const value = parseNumber(valueRaw);
                        if (label && contributionFields.includes(label)) {
                            contributions[label] = value;
                        }
                    } else if (spans.length === 0 && line.textContent.includes('Battle XP')) {
                        const raw = line.textContent.split('Battle XP')[1].trim();
                        const value = parseNumber(raw);
                        contributions['Battle XP'] = value;
                    }
                }

                const okBtn = dialog.querySelector('button');
                simulateClick(okBtn);

                contributionsData.push(contributions);
                log.push(`✅ ${name}`);
                logToPanel(`✅ ${name}`);
            } catch (err) {
                const errMsg = `❌ Failed to parse contributions for ${name}: ${err.message}`;
                console.warn(errMsg);
                logToPanel(errMsg);
            }

            await delay(delayBetweenActions);
        }

        console.log("=== Guild Contributions Log ===");
        log.forEach(entry => console.log(entry));
        createResultsModal(contributionsData);
        alert("Contribution log complete. Results shown on-screen and console.");
    }

    const container = document.createElement('div');
    Object.assign(container.style, {
        position: 'fixed', bottom: '10px', right: '10px', zIndex: 9999,
        display: 'flex', gap: '10px', background: '#1e1e1e', padding: '10px', borderRadius: '8px'
    });

    const fetchBtn = document.createElement('button');
    fetchBtn.textContent = 'Fetch Guild Contributions';
    Object.assign(fetchBtn.style, {
        padding: '10px', background: '#3498db', color: 'white',
        border: 'none', borderRadius: '5px', cursor: 'pointer'
    });
    fetchBtn.addEventListener('click', runContributionLogger);

    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Export CSV';
    Object.assign(exportBtn.style, {
        padding: '10px', background: '#2ecc71', color: 'white',
        border: 'none', borderRadius: '5px', cursor: 'pointer'
    });
    exportBtn.addEventListener('click', () => downloadCSV(contributionsData));

    container.appendChild(fetchBtn);
    container.appendChild(exportBtn);
    document.body.appendChild(container);

    function createLogPanel() {
        const panel = document.createElement('div');
        panel.id = 'contrib-log-panel';
        Object.assign(panel.style, {
            position: 'fixed', bottom: '60px', right: '10px', zIndex: 9999,
            background: '#111', color: '#fff', padding: '10px', maxHeight: '200px',
            overflowY: 'auto', width: '300px', borderRadius: '8px', fontSize: '12px',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)'
        });
        panel.textContent = 'Contribution Log:';
        document.body.appendChild(panel);
    }

    function logToPanel(text) {
        const panel = document.getElementById('contrib-log-panel');
        if (panel) {
            const line = document.createElement('div');
            line.textContent = text;
            panel.appendChild(line);
        }
    }

    createLogPanel();
})();
