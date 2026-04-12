const devices = {
    nintendo: {
        entity: 'switch.parental_control_nintendo',
        statusId: 'status-nintendo',
        cardId: 'card-nintendo'
    },
    tv: {
        entity: 'switch.parental_control_tv',
        statusId: 'status-tv',
        cardId: 'card-tv'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('--- App Home Control engegada ---');
    
    // Assignar els clics via Javascript (més robust)
    document.getElementById('card-nintendo').addEventListener('click', () => toggleDevice('nintendo'));
    document.getElementById('card-tv').addEventListener('click', () => toggleDevice('tv'));

    updateAllStatuses();
    setInterval(updateAllStatuses, 5000);
});

async function updateAllStatuses() {
    for (const key in devices) {
        await fetchStatus(key);
    }
    updateTime();
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
        document.getElementById('status-bar').innerText = 'Sincronitzat amb la llar';
    } catch (e) {
        document.getElementById('status-bar').innerText = 'Error de connexió';
    }
}

function updateUI(key, state) {
    const device = devices[key];
    const card = document.getElementById(device.cardId);
    const statusText = document.getElementById(device.statusId);
    
    if (state === 'on') {
        card.classList.add('blocked');
        card.classList.remove('active');
        statusText.innerText = 'BLOQUEJAT';
    } else {
        card.classList.add('active');
        card.classList.remove('blocked');
        statusText.innerText = 'ACCÉS LLIURE';
    }
}

async function toggleDevice(key) {
    // Alerta immediata per confirmar que el clic arriba al codi
    console.log('CLIC DETECTAT PER:', key);
    
    const device = devices[key];
    const card = document.getElementById(device.cardId);
    
    if (card.classList.contains('loading')) return;
    
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
            setTimeout(() => fetchStatus(key), 800);
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

function updateTime() {
    const now = new Date();
    document.getElementById('last-update').innerText = 'Actualitzat: ' + now.toLocaleTimeString();
}
