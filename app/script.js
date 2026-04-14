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
    setInterval(updateAll, 10000); // Actualització cada 10 segons (més relaxat pels mapes)
});

async function updateAll() {
    // Actualitzar estats de botons
    for (const key in devices) {
        await fetchStatus(key);
    }
    // Actualitzar mapa de la casa
    await updateMap();
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
        // Lògica per a control parental (on = bloquejat/vermell, off = lliure/verd)
        if (state === 'on') {
            card.className = 'card blocked';
            statusText.innerText = 'BLOQUEJAT';
        } else {
            card.className = 'card active';
            statusText.innerText = 'ACCÉS LLIURE';
        }
    } else {
        // Lògica normal (on = encès/verd, off = apagat/vermell)
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
    console.log('CLIC DETECTAT PER:', key);
    
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
            // Actualització ràpida de l'estat visual abans del fetch
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
