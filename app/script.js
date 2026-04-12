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
    const device = devices[key];
    const card = document.getElementById(device.cardId);
    card.classList.add('loading');
    
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
            // Immediate feedback poll
            setTimeout(() => fetchStatus(key), 500);
        }
    } catch (error) {
        console.error('Error toggling device:', error);
    } finally {
        setTimeout(() => card.classList.remove('loading'), 500);
    }
}

function updateTime() {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                    now.getMinutes().toString().padStart(2, '0');
    document.getElementById('last-update').innerText = `Actualitzat: ${timeStr}`;
}
