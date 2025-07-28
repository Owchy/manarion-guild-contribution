// ==UserScript==
// @name         Manarion Guild Contributions Logger
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Log total contributions for each guild member
// @match        https://manarion.com/guild*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const delayBetweenActions = 3000;

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function waitFor(fn) {
        return new Promise(resolve => {
            const check = () => fn() ? resolve() : setTimeout(check, 100);
            check();
        });
    }

    async function runContributionLogger() {
        const log = [];
        const rows = document.querySelectorAll('tr[data-slot="table-row"]');

        for (const row of rows) {
            const nameSpan = row.querySelector('span.cursor-pointer span');
            const name = nameSpan?.textContent.trim();
            nameSpan?.click();
            await waitFor(() => document.querySelector('div[role="menuitem"]'));

            const menuItems = [...document.querySelectorAll('div[role="menuitem"]')];
            const contribItem = menuItems.find(el => el.textContent.trim() === 'Contributions');
            if (!contribItem) continue;

            contribItem.click();
            await waitFor(() => document.querySelector('div[role="dialog"]'));
            const contribDialog = document.querySelector('div[role="dialog"]');
            const contribLines = contribDialog.querySelectorAll('div[data-slot="dialog-header"] > div');
            const contributions = [];

            for (const line of contribLines) {
                const label = line.querySelector('span')?.textContent?.replace(/[\[\]]/g, '') ?? line.textContent.split(' ')[0];
                const value = line.querySelector('span[title]')?.getAttribute('title');
                if (label && value) contributions.push(`${label}: ${value}`);
            }

            const okBtn = contribDialog.querySelector('button');
            okBtn?.click();

            log.push(`✅ ${name} Contributions:\n${contributions.join("\n")}`);
            await delay(delayBetweenActions);
        }

        console.log("=== Guild Contributions Log ===");
        log.forEach(entry => console.log(entry));
        alert("Contribution log complete. Check console for full details.");
    }

    const btn = document.createElement('button');
    btn.textContent = 'Fetch Guild Contributions';
    Object.assign(btn.style, {
        position: 'fixed', top: '10px', right: '10px', zIndex: 9999,
        padding: '10px', background: '#3498db', color: 'white',
        border: 'none', borderRadius: '5px', cursor: 'pointer'
    });
    btn.addEventListener('click', runContributionLogger);
    document.body.appendChild(btn);
})();
