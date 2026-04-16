const devices = {
    nintendo: { 
        entity: 'switch.parental_control_nintendo_3', 
        statusId: 'status-nintendo', 
        cardId: 'card-nintendo',
        type: 'parental'
    },
    tv: { 
        entity: 'switch.parental_control_tv_2', 
        statusId: 'status-tv', 
        cardId: 'card-tv',
        type: 'parental'
    },
    termo: { 
        entity: 'switch.t54_termo_termo', 
        statusId: 'status-termo', 
        cardId: 'card-termo',
        type: 'normal'
    },
    piscina: { 
        entity: 'switch.t58_piscina_piscina', 
        statusId: 'status-piscina', 
        cardId: 'card-piscina',
        type: 'normal'
    },
    ac_buhardilla: { 
        entity: 'switch.t57_ventilacion_ventilacion', 
        statusId: 'status-ac-buhardilla', 
        cardId: 'card-ac-buhardilla',
        type: 'normal'
    },
    ac_comedor: { 
        entity: 'switch.aa_comedor_aire_comedor', 
        statusId: 'status-ac-comedor', 
        cardId: 'card-ac-comedor',
        type: 'normal'
    }
};

const mapSensors = {
    'm-buh-t': 'sensor.buhardilla_temperatura',
    'm-buh-h': 'sensor.buhardilla_humitat',
    'm-buh-ext-t': 'sensor.blink_terraza_buhardilla_temperatura',
    'm-pri-t': 'sensor.habitacion_raquel_temperatura',
    'm-pri-h': 'sensor.habitacion_raquel_humitat',
    'm-leo-t': 'sensor.habitacion_leo_temperatura',
    'm-leo-h': 'sensor.habitacion_leo_humitat',
    'm-bal-t': 'sensor.blink_balcon_temperatura',
    'm-cui-t': 'sensor.cocina_temperatura',
    'm-cui-h': 'sensor.cocina_humitat',
    'm-men-t': 'sensor.aa_comedor_analog_temperature',
    'm-pba-ext-t': 'sensor.blink_terraza_temperatura',
    'm-sot-t': 'sensor.sotano_temperatura',
    'm-sot-h': 'sensor.sotano_humitat'
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('--- App Home Control engegada ---');
    
    // Assignar els clics automàticament per a tots els dispositius
    for (const key in devices) {
        const card = document.getElementById(devices[key].cardId);
        if (card) {
            card.addEventListener('click', () => toggleDevice(key));
        }
    }

    updateAll();
    setInterval(updateAll, 10000); // Actualització cada 10 segons
});

async function updateAll() {
    // Actualitzar estats de botons
    for (const key in devices) {
        await fetchStatus(key);
    }
    // Actualitzar mapa de la casa
    await updateMap();
    // Actualitzar preus llum
    await updateElectricity();
    updateTime();
}

async function updateMap() {
    for (const [id, entity] of Object.entries(mapSensors)) {
        try {
            const response = await fetch(`${CONFIG.HA_URL}/api/states/${entity}`, {
                headers: { 'Authorization': `Bearer ${CONFIG.HA_TOKEN}` }
            });
            const data = await response.json();
            const element = document.getElementById(id);
            if (element && data.state !== 'unknown' && data.state !== 'unavailable') {
                element.innerText = parseFloat(data.state).toFixed(1);
            }
        } catch (e) { console.error('Error carregant sensor:', entity); }
    }
}

async function fetchStatus(key) {
    const device = devices[key];
    try {
        const response = await fetch(`${CONFIG.HA_URL}/api/states/${device.entity}`, {
            headers: {
                'Authorization': `Bearer ${CONFIG.HA_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        updateUI(key, data.state);
        document.getElementById('status-bar').innerText = 'Sincronitzat amb llar';
    } catch (e) {
        document.getElementById('status-bar').innerText = 'Error de connexió';
    }
}

function updateUI(key, state) {
    const device = devices[key];
    const card = document.getElementById(device.cardId);
    const statusText = document.getElementById(device.statusId);
    
    if (!card || !statusText) return;

    if (device.type === 'parental') {
        if (state === 'on') {
            card.className = 'card blocked';
            statusText.innerText = 'BLOQUEJAT';
        } else {
            card.className = 'card active';
            statusText.innerText = 'ACCÉS LLIURE';
        }
    } else {
        if (state === 'on') {
            card.className = 'card active';
            statusText.innerText = 'ENCÉS';
        } else {
            card.className = 'card blocked';
            statusText.innerText = 'APAGAT';
        }
    }
}

async function toggleDevice(key) {
    const device = devices[key];
    const card = document.getElementById(device.cardId);
    
    if (!card || card.classList.contains('loading')) return;
    
    card.classList.add('loading');
    document.getElementById('status-bar').innerText = 'Enviant ordre...';
    
    try {
        const response = await fetch(`${CONFIG.HA_URL}/api/services/switch/toggle`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.HA_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ entity_id: device.entity })
        });
        
        if (response.ok) {
            document.getElementById('status-bar').innerText = 'Ordre executada!';
            toggleUIOptimistic(key);
            setTimeout(() => fetchStatus(key), 1200);
        } else {
            const err = await response.text();
            alert(`Error de Home Assistant: ${err}`);
        }
    } catch (error) {
        alert(`Error de connexió: ${error.message}`);
    } finally {
        setTimeout(() => card.classList.remove('loading'), 1000);
    }
}

function toggleUIOptimistic(key) {
    const device = devices[key];
    const card = document.getElementById(device.cardId);
    const statusText = document.getElementById(device.statusId);
    
    if (card.classList.contains('active')) {
        card.classList.replace('active', 'blocked');
        statusText.innerText = (device.type === 'parental') ? 'BLOQUEJAT' : 'APAGAT';
    } else {
        card.classList.replace('blocked', 'active');
        statusText.innerText = (device.type === 'parental') ? 'ACCÉS LLIURE' : 'ENCÉS';
    }
}

function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timeElement = document.getElementById('last-update');
    if (timeElement) {
        timeElement.innerText = 'Actualitzat: ' + timeStr;
    }
}

// --- Electricity Price Logic ---
let priceChart = null;
let lastPriceFetch = 0;
window.lastPriceData = null;

async function updateElectricity() {
    const now = Date.now();
    // Cache per 30 minuts
    if (window.lastPriceData && (now - lastPriceFetch < 30 * 60 * 1000)) {
        updateCurrentPriceBadge();
        return;
    }

    try {
        const response = await fetch('https://api.preciodelaluz.org/v1/prices/all?zone=PCB');
        const data = await response.json();
        
        lastPriceFetch = now;
        window.lastPriceData = data;
        processPriceData(data);
    } catch (e) {
        console.error('Error fetching electricity prices:', e);
    }
}

function processPriceData(data) {
    const hours = Object.values(data).map(item => parseInt(item.hour.split('-')[0]));
    const prices = Object.values(data).map(item => item.price / 1000); // Convert to €/kWh
    
    // Summary Metrics
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    document.getElementById('min-price').innerText = min.toFixed(4) + ' €';
    document.getElementById('max-price').innerText = max.toFixed(4) + ' €';
    document.getElementById('avg-price').innerText = avg.toFixed(4) + ' €';

    renderChart(hours, prices);
    updateCurrentPriceBadge();
}

function updateCurrentPriceBadge() {
    if (!window.lastPriceData) return;

    const currentHour = new Date().getHours();
    const hourKey = `${currentHour.toString().padStart(2, '0')}-${(currentHour + 1).toString().padStart(2, '0')}`;
    
    const badge = document.getElementById('current-price-badge');
    if (badge && window.lastPriceData[hourKey]) {
        const price = window.lastPriceData[hourKey].price / 1000;
        badge.innerText = `${price.toFixed(3)} €/kWh`;
        
        // Color coding for badge
        if (price < 0.12) badge.style.borderColor = 'var(--accent-green)';
        else if (price > 0.20) badge.style.borderColor = 'var(--accent-red)';
        else badge.style.borderColor = '#fbd38d';
    }
}

function renderChart(hours, prices) {
    const options = {
        series: [{
            name: 'Preu',
            data: prices
        }],
        chart: {
            type: 'bar',
            height: 200,
            toolbar: { show: false },
            animations: { enabled: true },
            background: 'transparent',
            fontFamily: "'Outfit', sans-serif"
        },
        theme: { mode: 'dark' },
        plotOptions: {
            bar: {
                borderRadius: 4,
                columnWidth: '80%',
                distributed: true
            }
        },
        dataLabels: { enabled: false },
        colors: prices.map(p => {
            if (p < 0.12) return '#10b981'; // Green
            if (p > 0.20) return '#ef4444'; // Red
            return '#fbd38d'; // Yellow/Orange
        }),
        xaxis: {
            categories: hours.map(h => h.toString().padStart(2, '0')),
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                style: { colors: '#94a3b8', fontSize: '10px' }
            }
        },
        yaxis: {
            show: false
        },
        grid: {
            show: false,
            padding: { left: 0, right: 0 }
        },
        legend: { show: false },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: (val) => val.toFixed(4) + ' €/kWh'
            }
        }
    };

    if (priceChart) {
        priceChart.updateOptions(options);
    } else {
        priceChart = new ApexCharts(document.querySelector("#price-chart"), options);
        priceChart.render();
    }
}
