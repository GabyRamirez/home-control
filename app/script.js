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

// Initial update
document.addEventListener('DOMContentLoaded', () => {
    updateAllStatuses();
    // Poll every 5 seconds
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
        
        if (!response.ok) throw new Error('Error de xarxa');
        
        const data = await response.json();
        updateUI(key, data.state);
        document.getElementById('status-bar').innerText = 'Sincronitzat amb la llar';
    } catch (error) {
        console.error('Error fetching status:', error);
        document.getElementById('status-bar').innerText = 'Error de connexió';
    }
}

function updateUI(key, state) {
    const device = devices[key];
    const card = document.getElementById(device.cardId);
    const statusText = document.getElementById(device.statusId);
    
    // Switch state in HA: 'on' means blocked (rule enabled), 'off' means free
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
    console.log('--- Intentant toggle per:', key);
    const device = devices[key];
    const card = document.getElementById(device.cardId);
    
    // Evitar múltiples clics mentre carrega
    if (card.classList.contains('loading')) {
        console.log('Bloquejat: Card està en estat loading');
        return;
    }
    
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
            // Esperem una mica a que HA actualitzi l'estat real
            setTimeout(() => fetchStatus(key), 800);
        } else {
            const errorBody = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorBody}`);
        }
    } catch (error) {
        console.error('Error toggling device:', error);
        document.getElementById('status-bar').innerText = 'Error en l\'ordre';
        alert('No s\'ha pogut canviar l\'estat. Revisa els permisos CORS a Home Assistant.');
    } finally {
        setTimeout(() => card.classList.remove('loading'), 1000);
    }
}

function updateTime() {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                    now.getMinutes().toString().padStart(2, '0');
    document.getElementById('last-update').innerText = `Actualitzat: ${timeStr}`;
}
