// Location Lists App
class LocationListsApp {
    constructor() {
        this.stores = [];
        this.currentPosition = null;
        this.activeStore = null;
        this.watchId = null;
        this.updateInterval = 10000; // 10 seconds default
        this.editingStoreId = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.startLocationTracking();
        this.render();
    }

    // Data Management
    loadData() {
        const stored = localStorage.getItem('locationLists');
        if (stored) {
            const data = JSON.parse(stored);
            this.stores = data.stores || [];
            this.updateInterval = data.settings?.updateInterval || 10000;
        }
    }

    saveData() {
        const data = {
            stores: this.stores,
            settings: {
                updateInterval: this.updateInterval
            }
        };
        localStorage.setItem('locationLists', JSON.stringify(data));
    }

    // Location Tracking
    startLocationTracking() {
        if (!navigator.geolocation) {
            this.updateStatus('Location not supported', 'error');
            return;
        }

        this.updateStatus('Getting location...', 'loading');

        // Get initial position
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.handlePositionUpdate(position);
            },
            (error) => {
                this.updateStatus('Location access denied', 'error');
                console.error('Location error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );

        // Watch position
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.handlePositionUpdate(position);
            },
            (error) => {
                console.error('Location error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }

    handlePositionUpdate(position) {
        this.currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
        };

        this.checkNearbyStores();
        this.updateStatus(`Location active (±${Math.round(this.currentPosition.accuracy)}m)`, 'active');
    }

    checkNearbyStores() {
        let nearestStore = null;
        let minDistance = Infinity;

        this.stores.forEach(store => {
            const distance = this.calculateDistance(
                this.currentPosition.lat,
                this.currentPosition.lng,
                store.location.lat,
                store.location.lng
            );

            if (distance <= store.triggerRadius && distance < minDistance) {
                nearestStore = store;
                minDistance = distance;
            }
        });

        if (nearestStore && nearestStore.id !== this.activeStore?.id) {
            this.activeStore = nearestStore;
            this.activeStore.distance = minDistance;
            this.showActiveList();
        } else if (!nearestStore && this.activeStore) {
            this.activeStore = null;
            this.showStoresOverview();
        } else if (nearestStore) {
            this.activeStore.distance = minDistance;
            this.updateActiveDistance();
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        // Haversine formula
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    }

    updateStatus(text, type = '') {
        const statusEl = document.getElementById('status-text');
        const indicatorEl = document.getElementById('location-status');
        
        statusEl.textContent = text;
        indicatorEl.className = 'status-indicator';
        if (type) {
            indicatorEl.classList.add(type);
        }
    }

    // Store Management
    addStore(name, address, location, triggerRadius) {
        const store = {
            id: Date.now().toString(),
            name,
            address,
            location,
            triggerRadius,
            items: [],
            createdAt: new Date().toISOString()
        };
        this.stores.push(store);
        this.saveData();
        return store;
    }

    updateStore(id, updates) {
        const store = this.stores.find(s => s.id === id);
        if (store) {
            Object.assign(store, updates);
            this.saveData();
        }
    }

    deleteStore(id) {
        this.stores = this.stores.filter(s => s.id !== id);
        this.saveData();
        if (this.activeStore?.id === id) {
            this.activeStore = null;
        }
    }

    getStore(id) {
        return this.stores.find(s => s.id === id);
    }

    // List Management
    addItem(storeId, text) {
        const store = this.getStore(storeId);
        if (store) {
            store.items.push({
                id: Date.now().toString(),
                text,
                checked: false,
                createdAt: new Date().toISOString()
            });
            this.saveData();
        }
    }

    toggleItem(storeId, itemId) {
        const store = this.getStore(storeId);
        if (store) {
            const item = store.items.find(i => i.id === itemId);
            if (item) {
                item.checked = !item.checked;
                this.saveData();
            }
        }
    }

    deleteItem(storeId, itemId) {
        const store = this.getStore(storeId);
        if (store) {
            store.items = store.items.filter(i => i.id !== itemId);
            this.saveData();
        }
    }

    // UI Rendering
    render() {
        this.renderStoresList();
    }

    renderStoresList() {
        const container = document.getElementById('stores-list');
        
        if (this.stores.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No stores yet. Add your first store to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.stores.map(store => {
            let distanceText = '';
            if (this.currentPosition) {
                const distance = this.calculateDistance(
                    this.currentPosition.lat,
                    this.currentPosition.lng,
                    store.location.lat,
                    store.location.lng
                );
                distanceText = this.formatDistance(distance);
            }

            return `
                <div class="store-card" data-store-id="${store.id}">
                    <h3>${store.name}</h3>
                    ${store.address ? `<p>${store.address}</p>` : ''}
                    <div class="store-meta">
                        <span>${store.items.length} items</span>
                        ${distanceText ? `<span>${distanceText}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Add click listeners
        container.querySelectorAll('.store-card').forEach(card => {
            card.addEventListener('click', () => {
                const storeId = card.dataset.storeId;
                this.showListModal(storeId);
            });
        });
    }

    showActiveList() {
        document.getElementById('active-list-view').classList.remove('hidden');
        document.getElementById('stores-overview').classList.add('hidden');
        
        document.getElementById('active-store-name').textContent = this.activeStore.name;
        this.updateActiveDistance();
        this.renderActiveItems();
    }

    showStoresOverview() {
        document.getElementById('active-list-view').classList.add('hidden');
        document.getElementById('stores-overview').classList.remove('hidden');
        this.renderStoresList();
    }

    updateActiveDistance() {
        if (this.activeStore && this.activeStore.distance !== undefined) {
            document.getElementById('active-store-distance').textContent = 
                `${this.formatDistance(this.activeStore.distance)} away`;
        }
    }

    renderActiveItems() {
        const list = document.getElementById('active-items-list');
        const items = this.activeStore.items;

        if (items.length === 0) {
            list.innerHTML = '<li style="text-align: center; color: var(--text-muted);">No items in this list yet</li>';
            return;
        }

        list.innerHTML = items.map(item => `
            <li class="${item.checked ? 'checked' : ''}">
                <input type="checkbox" 
                       id="item-${item.id}" 
                       ${item.checked ? 'checked' : ''}
                       data-item-id="${item.id}">
                <label for="item-${item.id}">${item.text}</label>
                <button class="item-delete" data-item-id="${item.id}">×</button>
            </li>
        `).join('');

        // Add event listeners
        list.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.toggleItem(this.activeStore.id, e.target.dataset.itemId);
                this.renderActiveItems();
            });
        });

        list.querySelectorAll('.item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteItem(this.activeStore.id, e.target.dataset.itemId);
                this.renderActiveItems();
            });
        });
    }

    showListModal(storeId) {
        const store = this.getStore(storeId);
        if (!store) return;

        this.editingStoreId = storeId;
        
        document.getElementById('list-modal-title').textContent = store.name;
        document.getElementById('list-modal').classList.remove('hidden');
        
        this.renderModalItems(storeId);
    }

    renderModalItems(storeId) {
        const store = this.getStore(storeId);
        const list = document.getElementById('modal-items-list');

        if (store.items.length === 0) {
            list.innerHTML = '<li style="text-align: center; color: var(--text-muted); padding: 2rem;">No items yet</li>';
            return;
        }

        list.innerHTML = store.items.map(item => `
            <li class="${item.checked ? 'checked' : ''}">
                <input type="checkbox" 
                       id="modal-item-${item.id}" 
                       ${item.checked ? 'checked' : ''}
                       data-item-id="${item.id}">
                <label for="modal-item-${item.id}">${item.text}</label>
                <button class="item-delete" data-item-id="${item.id}">×</button>
            </li>
        `).join('');

        // Add event listeners
        list.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.toggleItem(storeId, e.target.dataset.itemId);
                this.renderModalItems(storeId);
            });
        });

        list.querySelectorAll('.item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteItem(storeId, e.target.dataset.itemId);
                this.renderModalItems(storeId);
            });
        });
    }

    formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.round(meters)}m`;
        } else {
            return `${(meters / 1000).toFixed(1)}km`;
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Add Store Button
        document.getElementById('add-store-btn').addEventListener('click', () => {
            this.showStoreModal();
        });

        // Store Form
        document.getElementById('store-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleStoreFormSubmit();
        });

        document.getElementById('cancel-store-btn').addEventListener('click', () => {
            this.hideStoreModal();
        });

        document.getElementById('use-current-location-btn').addEventListener('click', () => {
            if (this.currentPosition) {
                document.getElementById('coord-lat').textContent = this.currentPosition.lat.toFixed(6);
                document.getElementById('coord-lng').textContent = this.currentPosition.lng.toFixed(6);
                document.getElementById('location-coords').classList.remove('hidden');
            }
        });

        // Quick Add Item (Active List)
        document.getElementById('quick-add-btn').addEventListener('click', () => {
            const input = document.getElementById('quick-add-input');
            if (input.value.trim() && this.activeStore) {
                this.addItem(this.activeStore.id, input.value.trim());
                input.value = '';
                this.renderActiveItems();
            }
        });

        document.getElementById('quick-add-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('quick-add-btn').click();
            }
        });

        // Add Item (Modal)
        document.getElementById('add-item-btn').addEventListener('click', () => {
            const input = document.getElementById('new-item-input');
            if (input.value.trim() && this.editingStoreId) {
                this.addItem(this.editingStoreId, input.value.trim());
                input.value = '';
                this.renderModalItems(this.editingStoreId);
            }
        });

        document.getElementById('new-item-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('add-item-btn').click();
            }
        });

        // Close List Modal
        document.getElementById('close-list-btn').addEventListener('click', () => {
            document.getElementById('list-modal').classList.add('hidden');
            this.editingStoreId = null;
            this.renderStoresList();
        });

        // Delete Store
        document.getElementById('delete-store-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this store and all its items?')) {
                this.deleteStore(this.editingStoreId);
                document.getElementById('list-modal').classList.add('hidden');
                this.editingStoreId = null;
                this.renderStoresList();
            }
        });

        // Modal Close Buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.add('hidden');
            });
        });

        // Settings
        document.getElementById('location-update-interval').addEventListener('change', (e) => {
            this.updateInterval = parseInt(e.target.value);
            this.saveData();
        });

        document.getElementById('export-data-btn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('import-data-btn').addEventListener('click', () => {
            document.getElementById('import-file-input').click();
        });

        document.getElementById('import-file-input').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });
    }

    switchView(view) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Hide all views
        document.getElementById('active-list-view').classList.add('hidden');
        document.getElementById('stores-overview').classList.add('hidden');
        document.getElementById('settings-view').classList.add('hidden');

        // Show selected view
        if (view === 'home') {
            if (this.activeStore) {
                this.showActiveList();
            } else {
                this.showStoresOverview();
            }
        } else if (view === 'stores') {
            this.showStoresOverview();
        } else if (view === 'settings') {
            document.getElementById('settings-view').classList.remove('hidden');
            document.getElementById('location-update-interval').value = this.updateInterval;
        }
    }

    showStoreModal() {
        document.getElementById('store-modal-title').textContent = 'Add Store';
        document.getElementById('store-form').reset();
        document.getElementById('location-coords').classList.add('hidden');
        document.getElementById('store-modal').classList.remove('hidden');
    }

    hideStoreModal() {
        document.getElementById('store-modal').classList.add('hidden');
    }

    handleStoreFormSubmit() {
        const name = document.getElementById('store-name').value.trim();
        const address = document.getElementById('store-address').value.trim();
        const triggerRadius = parseInt(document.getElementById('trigger-radius').value);

        if (!name) return;

        // Get location from current position
        if (!this.currentPosition) {
            alert('Please wait for location to be acquired');
            return;
        }

        const location = {
            lat: this.currentPosition.lat,
            lng: this.currentPosition.lng
        };

        this.addStore(name, address, location, triggerRadius);
        this.hideStoreModal();
        this.renderStoresList();
    }

    exportData() {
        const data = {
            stores: this.stores,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `location-lists-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.stores && Array.isArray(data.stores)) {
                    if (confirm('This will replace all current data. Continue?')) {
                        this.stores = data.stores;
                        this.saveData();
                        this.render();
                        alert('Data imported successfully!');
                    }
                }
            } catch (error) {
                alert('Invalid file format');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LocationListsApp();
});
