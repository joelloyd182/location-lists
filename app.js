// Location Lists App
import { commonItems, categoryColors, searchCommonItems } from './commonItems.js';

class LocationListsApp {
    constructor() {
        this.stores = [];
        this.currentPosition = null;
        this.fakePosition = null; // For debug mode
        this.debugMode = false;
        this.activeStore = null;
        this.watchId = null;
        this.updateInterval = 10000; // 10 seconds default
        this.editingStoreId = null;
        this.notificationLog = [];
        this.starredItems = new Set(); // User's favorite items
        this.customItems = []; // User's customized versions of items
        
        this.init();
    }

    init() {
        this.loadData();
        this.loadStarredItems();
        this.loadCustomItems();
        this.registerServiceWorker();
        this.setupEventListeners();
        this.setupAutocomplete('quick-add-input', 'quick-add-autocomplete');
        this.setupAutocomplete('new-item-input', 'modal-autocomplete');
        this.startLocationTracking();
        this.handleDeepLink();
        this.render();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                console.log('Attempting to register service worker...');
                const registration = await navigator.serviceWorker.register('./sw.js', {
                    scope: './'
                });
                console.log('Service Worker registered successfully:', registration);
                
                // Wait for service worker to be ready
                console.log('Waiting for service worker to be ready...');
                const readyRegistration = await navigator.serviceWorker.ready;
                console.log('Service Worker is ready:', readyRegistration);
                
                this.serviceWorkerRegistration = readyRegistration;
                
                // Check if it's actually active
                if (readyRegistration.active) {
                    console.log('Service Worker is active!');
                    this.logNotification('test', 'Service Worker ready', 'Notifications enabled');
                } else {
                    console.warn('Service worker registered but not active yet');
                }
                
                // Request notification permission
                this.requestNotificationPermission();
            } catch (error) {
                console.error('Service Worker registration failed:', error);
                this.logNotification('error', 'Service Worker failed', error.message);
                alert('Service Worker failed to register: ' + error.message + '\n\nCheck if sw.js file exists at: ' + window.location.origin + '/sw.js');
            }
        } else {
            console.error('Service Workers not supported in this browser');
            alert('Service Workers not supported in this browser. Notifications will not work.');
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            // Show a friendly prompt first
            const banner = document.createElement('div');
            banner.className = 'notification-banner';
            banner.innerHTML = `
                <div class="notification-banner-content">
                    <p><strong>🔔 Get notified when you arrive at stores?</strong></p>
                    <p style="font-size: 0.875rem; opacity: 0.9;">You'll get a notification when you're near a store on your list.</p>
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                        <button id="enable-notifications-btn" class="btn-primary" style="flex: 1;">Enable</button>
                        <button id="skip-notifications-btn" class="btn-secondary" style="flex: 1;">Maybe Later</button>
                    </div>
                </div>
            `;
            document.body.appendChild(banner);

            document.getElementById('enable-notifications-btn').addEventListener('click', async () => {
                const permission = await Notification.requestPermission();
                banner.remove();
                if (permission === 'granted') {
                    this.showToast('✅ Notifications enabled!');
                }
            });

            document.getElementById('skip-notifications-btn').addEventListener('click', () => {
                banner.remove();
            });
        }
    }

    handleDeepLink() {
        // Check if opened from notification with store parameter
        const urlParams = new URLSearchParams(window.location.search);
        const storeId = urlParams.get('store');
        if (storeId) {
            const store = this.getStore(storeId);
            if (store) {
                this.activeStore = store;
                this.showActiveList();
            }
        }

        // Listen for messages from service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data.type === 'SHOW_STORE') {
                    const store = this.getStore(event.data.storeId);
                    if (store) {
                        this.activeStore = store;
                        this.showActiveList();
                    }
                }
            });
        }
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
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
        // Use fake position if debug mode is active, otherwise use real GPS
        if (this.fakePosition) {
            this.currentPosition = this.fakePosition;
        } else {
            this.currentPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
        }

        this.checkNearbyStores();
        
        const statusText = this.fakePosition 
            ? `Using fake location (debug mode)` 
            : `Location active (±${Math.round(this.currentPosition.accuracy)}m)`;
        this.updateStatus(statusText, 'active');
    }

    checkNearbyStores() {
        let nearestStore = null;
        let minDistance = Infinity;
        const nearbyStores = []; // Track all stores within reasonable distance

        this.stores.forEach(store => {
            const distance = this.calculateDistance(
                this.currentPosition.lat,
                this.currentPosition.lng,
                store.location.lat,
                store.location.lng
            );

            // Track stores within 1km that have items
            if (distance <= 1000 && store.items.length > 0) {
                nearbyStores.push({ store, distance });
            }

            // Find nearest store within trigger radius
            if (distance <= store.triggerRadius && distance < minDistance) {
                nearestStore = store;
                minDistance = distance;
            }
        });

        // ENTERING a new store zone
        if (nearestStore && nearestStore.id !== this.activeStore?.id) {
            this.activeStore = nearestStore;
            this.activeStore.distance = minDistance;
            
            // Always send arrival notification
            this.sendArrivalNotification(nearestStore, minDistance);
            
            this.showActiveList();
        } 
        // LEAVING a store zone
        else if (!nearestStore && this.activeStore) {
            const previousStore = this.activeStore;
            this.activeStore = null;
            
            // Send departure notification with nearby stores
            this.sendDepartureNotification(previousStore, nearbyStores);
            
            this.showStoresOverview();
        } 
        // Still in same store zone
        else if (nearestStore) {
            this.activeStore.distance = minDistance;
            this.updateActiveDistance();
        }
    }

    async sendArrivalNotification(store, distance) {
        if ('Notification' in window && Notification.permission === 'granted' && this.serviceWorkerRegistration) {
            // Check if we've notified recently (within last hour)
            const notificationKey = `arrived_${store.id}`;
            const lastNotified = parseInt(localStorage.getItem(notificationKey) || '0');
            const now = Date.now();
            
            // Only notify once per hour per store
            if (now - lastNotified > 3600000) { // 1 hour
                try {
                    await this.serviceWorkerRegistration.showNotification(
                        `📍 You're at ${store.name}!`,
                        {
                            body: `${Math.round(distance)}m away. ${store.items.length} items on your list.`,
                            icon: '/icon-192.png',
                            badge: '/icon-192.png',
                            tag: `arrival-${store.id}`,
                            data: { storeId: store.id },
                            requireInteraction: false,
                            vibrate: [200, 100, 200]
                        }
                    );
                    localStorage.setItem(notificationKey, now.toString());
                    this.logNotification('arrival', store.name, `${Math.round(distance)}m away`);
                } catch (error) {
                    console.error('Arrival notification error:', error);
                    this.logNotification('error', 'Arrival notification failed', error.message);
                }
            } else {
                this.logNotification('skipped', `${store.name} arrival`, 'Cooldown active');
            }
        }
    }

    async sendDepartureNotification(departedStore, nearbyStores) {
        if ('Notification' in window && Notification.permission === 'granted' && this.serviceWorkerRegistration) {
            // Filter out the store we just left and sort by distance
            const otherStores = nearbyStores
                .filter(({ store }) => store.id !== departedStore.id)
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 3); // Max 3 stores

            if (otherStores.length > 0) {
                // Check cooldown for departure notifications
                const notificationKey = `departed_${departedStore.id}`;
                const lastNotified = parseInt(localStorage.getItem(notificationKey) || '0');
                const now = Date.now();
                
                // Only notify once per 30 minutes for departures
                if (now - lastNotified > 1800000) { // 30 minutes
                    const storeList = otherStores.map(({ store, distance }) => 
                        `${store.name} (${Math.round(distance)}m, ${store.items.length} items)`
                    ).join('\n');

                    try {
                        await this.serviceWorkerRegistration.showNotification(
                            `🛒 Nearby stores with items:`,
                            {
                                body: storeList,
                                icon: '/icon-192.png',
                                badge: '/icon-192.png',
                                tag: `departure-${departedStore.id}`,
                                requireInteraction: false,
                                vibrate: [100, 50, 100]
                            }
                        );
                        localStorage.setItem(notificationKey, now.toString());
                        this.logNotification('departure', departedStore.name, `${otherStores.length} nearby stores`);
                    } catch (error) {
                        console.error('Departure notification error:', error);
                        this.logNotification('error', 'Departure notification failed', error.message);
                    }
                } else {
                    this.logNotification('skipped', `${departedStore.name} departure`, 'Cooldown active');
                }
            }
        }
    }

    logNotification(type, title, message) {
        const timestamp = new Date().toLocaleTimeString();
        this.notificationLog.unshift({ type, title, message, timestamp });
        
        // Keep only last 20 logs
        if (this.notificationLog.length > 20) {
            this.notificationLog.pop();
        }
        
        // Update log display if in debug mode
        if (this.debugMode) {
            this.updateNotificationLog();
        }
    }

    updateNotificationLog() {
        const logContainer = document.getElementById('notification-log');
        if (!logContainer) return;

        if (this.notificationLog.length === 0) {
            logContainer.innerHTML = '<small style="color: var(--text-muted);">No notifications sent yet</small>';
            return;
        }

        logContainer.innerHTML = this.notificationLog.map(log => {
            const emoji = {
                'arrival': '📍',
                'departure': '🛒',
                'error': '❌',
                'skipped': '⏭️',
                'test': '🧪'
            }[log.type] || '•';

            return `
                <div class="log-entry">
                    <div><strong>${emoji} ${log.title}</strong> <small style="opacity: 0.7;">${log.timestamp}</small></div>
                    <div style="font-size: 0.875rem; opacity: 0.8;">${log.message}</div>
                </div>
            `;
        }).join('');
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
    addItem(storeId, text, isCustom = false, originalItemId = null) {
        const store = this.getStore(storeId);
        if (store) {
            store.items.push({
                id: Date.now().toString(),
                text,
                checked: false,
                isCustom,
                originalItemId, // Reference to common item if customized
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

    updateItem(storeId, itemId, newText) {
        const store = this.getStore(storeId);
        if (store) {
            const item = store.items.find(i => i.id === itemId);
            if (item) {
                item.text = newText;
                this.saveData();
            }
        }
    }

    saveAsCustomItem(itemText, originalItemId) {
        // Save to custom items list
        if (!this.customItems) {
            this.customItems = [];
        }
        
        const existing = this.customItems.find(i => i.originalItemId === originalItemId);
        if (existing) {
            existing.text = itemText;
        } else {
            this.customItems.push({
                id: Date.now().toString(),
                text: itemText,
                originalItemId,
                createdAt: new Date().toISOString()
            });
        }
        
        localStorage.setItem('customItems', JSON.stringify(this.customItems));
    }

    loadCustomItems() {
        const saved = localStorage.getItem('customItems');
        if (saved) {
            this.customItems = JSON.parse(saved);
        } else {
            this.customItems = [];
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
            <li class="${item.checked ? 'checked' : ''}" data-item-id="${item.id}">
                <input type="checkbox" 
                       id="item-${item.id}" 
                       ${item.checked ? 'checked' : ''}
                       data-item-id="${item.id}">
                <label for="item-${item.id}">
                    ${item.text}
                    ${item.isCustom ? '<span class="custom-badge">✨</span>' : ''}
                </label>
                <button class="item-edit" data-item-id="${item.id}" title="Edit">✏️</button>
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

        list.querySelectorAll('.item-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.itemId;
                this.showEditItemDialog(this.activeStore.id, itemId);
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
            <li class="${item.checked ? 'checked' : ''}" data-item-id="${item.id}">
                <input type="checkbox" 
                       id="modal-item-${item.id}" 
                       ${item.checked ? 'checked' : ''}
                       data-item-id="${item.id}">
                <label for="modal-item-${item.id}">
                    ${item.text}
                    ${item.isCustom ? '<span class="custom-badge">✨</span>' : ''}
                </label>
                <button class="item-edit" data-item-id="${item.id}" title="Edit">✏️</button>
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

        list.querySelectorAll('.item-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.itemId;
                this.showEditItemDialog(storeId, itemId);
            });
        });

        list.querySelectorAll('.item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteItem(storeId, e.target.dataset.itemId);
                this.renderModalItems(storeId);
            });
        });
    }

    showEditItemDialog(storeId, itemId) {
        const store = this.getStore(storeId);
        const item = store.items.find(i => i.id === itemId);
        if (!item) return;

        const newText = prompt('Edit item:', item.text);
        if (newText && newText.trim() && newText !== item.text) {
            this.updateItem(storeId, itemId, newText.trim());
            
            // Ask if they want to save as custom
            if (item.originalItemId || !item.isCustom) {
                const saveAsCustom = confirm('Save this as your default version of this item?');
                if (saveAsCustom) {
                    item.isCustom = true;
                    const originalId = item.originalItemId || itemId;
                    this.saveAsCustomItem(newText.trim(), originalId);
                    item.originalItemId = originalId;
                    this.saveData();
                }
            }
            
            // Re-render the appropriate list
            if (this.activeStore && this.activeStore.id === storeId) {
                this.renderActiveItems();
            }
            if (this.editingStoreId === storeId) {
                this.renderModalItems(storeId);
            }
        }
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
                document.getElementById('location-coords').dataset.source = 'current';
            }
        });

        document.getElementById('search-address-btn').addEventListener('click', () => {
            this.geocodeAddress();
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

        // Debug Mode
        document.getElementById('debug-mode-toggle').addEventListener('change', (e) => {
            this.debugMode = e.target.checked;
            document.getElementById('debug-panel').classList.toggle('hidden', !this.debugMode);
            if (this.debugMode) {
                this.updateNotificationLog();
            }
        });

        document.getElementById('test-arrival-btn').addEventListener('click', () => {
            this.testArrivalNotification();
        });

        document.getElementById('test-departure-btn').addEventListener('click', () => {
            this.testDepartureNotification();
        });

        document.getElementById('fake-location-btn').addEventListener('click', () => {
            this.setFakeLocation();
        });

        document.getElementById('reset-location-btn').addEventListener('click', () => {
            this.fakePosition = null;
            document.getElementById('fake-coords-display').classList.add('hidden');
            this.showToast('Reset to real GPS location');
            this.logNotification('test', 'Location reset', 'Using real GPS');
        });

        document.getElementById('clear-notification-cooldowns-btn').addEventListener('click', () => {
            // Clear all notification cooldowns from localStorage
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('arrived_') || key.startsWith('departed_')) {
                    localStorage.removeItem(key);
                }
            });
            this.showToast('All notification cooldowns cleared!');
            this.logNotification('test', 'Cooldowns cleared', 'All stores can notify again');
        });
    }

    async testArrivalNotification() {
        if (this.stores.length === 0) {
            alert('Add a store first!');
            return;
        }

        const store = this.stores[0]; // Use first store for testing
        
        if (Notification.permission !== 'granted') {
            alert('Please enable notifications first!');
            return;
        }

        if (!this.serviceWorkerRegistration) {
            alert('Service worker not ready yet. Wait a moment and try again.');
            this.logNotification('error', 'Test failed', 'Service worker not registered');
            return;
        }

        try {
            await this.serviceWorkerRegistration.showNotification(
                `📍 [TEST] You're at ${store.name}!`,
                {
                    body: `This is a test arrival notification. ${store.items.length} items on your list.`,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    tag: `test-arrival`,
                    requireInteraction: false,
                    vibrate: [200, 100, 200]
                }
            );
            this.logNotification('test', `Arrival test: ${store.name}`, 'Notification sent successfully');
            this.showToast('Test arrival notification sent!');
        } catch (error) {
            this.logNotification('error', 'Test arrival failed', error.message);
            alert('Failed to send notification: ' + error.message);
        }
    }

    async testDepartureNotification() {
        if (this.stores.length < 2) {
            alert('Add at least 2 stores to test departure notifications!');
            return;
        }

        if (Notification.permission !== 'granted') {
            alert('Please enable notifications first!');
            return;
        }

        if (!this.serviceWorkerRegistration) {
            alert('Service worker not ready yet. Wait a moment and try again.');
            this.logNotification('error', 'Test failed', 'Service worker not registered');
            return;
        }

        const nearbyStores = this.stores.slice(0, 3).map((store, i) => 
            `${store.name} (${100 + i * 150}m, ${store.items.length} items)`
        ).join('\n');

        try {
            await this.serviceWorkerRegistration.showNotification(
                `🛒 [TEST] Nearby stores with items:`,
                {
                    body: nearbyStores,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    tag: `test-departure`,
                    requireInteraction: false,
                    vibrate: [100, 50, 100]
                }
            );
            this.logNotification('test', 'Departure test', 'Notification sent successfully');
            this.showToast('Test departure notification sent!');
        } catch (error) {
            this.logNotification('error', 'Test departure failed', error.message);
            alert('Failed to send notification: ' + error.message);
        }
    }

    setFakeLocation() {
        if (this.stores.length === 0) {
            alert('Add a store first!');
            return;
        }

        // Use first store's location as fake location
        const store = this.stores[0];
        this.fakePosition = {
            lat: store.location.lat,
            lng: store.location.lng,
            accuracy: 10
        };

        document.getElementById('fake-lat').textContent = this.fakePosition.lat.toFixed(6);
        document.getElementById('fake-lng').textContent = this.fakePosition.lng.toFixed(6);
        document.getElementById('fake-coords-display').classList.remove('hidden');

        this.showToast(`Fake location set to ${store.name}`);
        this.logNotification('test', 'Fake location set', `${store.name} (${store.location.lat.toFixed(4)}, ${store.location.lng.toFixed(4)})`);
        
        // Trigger location check with fake position
        this.checkNearbyStores();
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

        // Get location from the displayed coordinates
        const coordsDisplay = document.getElementById('location-coords');
        if (coordsDisplay.classList.contains('hidden')) {
            alert('Please set a location using "Search Address" or "Use Current Location"');
            return;
        }

        const lat = parseFloat(document.getElementById('coord-lat').textContent);
        const lng = parseFloat(document.getElementById('coord-lng').textContent);

        const location = { lat, lng };

        this.addStore(name, address, location, triggerRadius);
        this.hideStoreModal();
        this.renderStoresList();
    }

    async geocodeAddress() {
        const address = document.getElementById('store-address').value.trim();
        
        if (!address) {
            alert('Please enter an address to search');
            return;
        }

        const searchBtn = document.getElementById('search-address-btn');
        const originalText = searchBtn.textContent;
        searchBtn.textContent = 'Searching...';
        searchBtn.disabled = true;

        try {
            // Using Nominatim (OpenStreetMap) free geocoding API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
                {
                    headers: {
                        'User-Agent': 'LocationListsApp/1.0'
                    }
                }
            );

            const results = await response.json();

            if (results && results.length > 0) {
                const result = results[0];
                document.getElementById('coord-lat').textContent = parseFloat(result.lat).toFixed(6);
                document.getElementById('coord-lng').textContent = parseFloat(result.lon).toFixed(6);
                document.getElementById('location-coords').classList.remove('hidden');
                document.getElementById('location-coords').dataset.source = 'geocoded';
                
                // Update address field with the formatted address from geocoding
                if (result.display_name) {
                    document.getElementById('store-address').value = result.display_name;
                }
            } else {
                alert('Address not found. Please try a different address or use "Use Current Location"');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            alert('Failed to look up address. Please check your connection or use "Use Current Location"');
        } finally {
            searchBtn.textContent = originalText;
            searchBtn.disabled = false;
        }
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

    // Autocomplete functionality
    setupAutocomplete(inputId, dropdownId) {
        const input = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        
        if (!input || !dropdown) return;

        input.addEventListener('input', (e) => {
            const query = e.target.value;
            this.showAutocomplete(query, dropdown);
        });

        input.addEventListener('focus', (e) => {
            if (e.target.value) {
                this.showAutocomplete(e.target.value, dropdown);
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    }

    showAutocomplete(query, dropdownEl) {
        if (!query || query.length < 2) {
            dropdownEl.classList.add('hidden');
            return;
        }

        // Search custom items first
        const customResults = this.customItems.filter(item => 
            item.text.toLowerCase().includes(query.toLowerCase())
        );

        // Then search common items
        const commonResults = searchCommonItems(query);
        
        // Combine, custom items first
        const allResults = [
            ...customResults.map(c => ({ ...c, isCustomItem: true })),
            ...commonResults
        ];

        if (allResults.length === 0) {
            dropdownEl.classList.add('hidden');
            return;
        }

        dropdownEl.innerHTML = allResults.slice(0, 8).map(item => {
            const isStarred = this.starredItems.has(item.id);
            const categoryColor = item.isCustomItem 
                ? '#FF6B6B' 
                : (categoryColors[item.category] || '#999');
            const categoryName = item.isCustomItem ? 'Custom' : item.category;
            const itemName = item.text || item.name; // Handle both custom items (text) and common items (name)
            
            return `
                <div class="autocomplete-item" data-item-id="${item.id}" data-item-name="${itemName}">
                    <span class="autocomplete-item-category" style="background: ${categoryColor}">
                        ${item.isCustomItem ? '✨' : ''} ${categoryName}
                    </span>
                    <span class="autocomplete-item-name">${itemName}</span>
                    ${!item.isCustomItem ? `
                        <span class="autocomplete-item-star ${isStarred ? 'starred' : ''}" 
                              data-star-id="${item.id}">
                            ${isStarred ? '⭐' : '☆'}
                        </span>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Add click listeners
        dropdownEl.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('autocomplete-item-star')) {
                    return; // Let star handler deal with it
                }
                const itemName = e.currentTarget.dataset.itemName;
                const inputEl = dropdownEl.previousElementSibling;
                inputEl.value = itemName;
                dropdownEl.classList.add('hidden');
                
                // Auto-add the item
                if (dropdownEl.id === 'quick-add-autocomplete') {
                    document.getElementById('quick-add-btn').click();
                } else {
                    document.getElementById('add-item-btn').click();
                }
            });
        });

        // Add star toggle listeners
        dropdownEl.querySelectorAll('.autocomplete-item-star').forEach(star => {
            star.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = parseInt(e.target.dataset.starId);
                this.toggleStarredItem(itemId);
                
                // Update just this star icon
                if (this.starredItems.has(itemId)) {
                    e.target.textContent = '⭐';
                    e.target.classList.add('starred');
                } else {
                    e.target.textContent = '☆';
                    e.target.classList.remove('starred');
                }
            });
        });

        dropdownEl.classList.remove('hidden');
    }

    toggleStarredItem(itemId) {
        if (this.starredItems.has(itemId)) {
            this.starredItems.delete(itemId);
        } else {
            this.starredItems.add(itemId);
        }
        // Save to localStorage
        localStorage.setItem('starredItems', JSON.stringify([...this.starredItems]));
    }

    loadStarredItems() {
        const saved = localStorage.getItem('starredItems');
        if (saved) {
            this.starredItems = new Set(JSON.parse(saved));
        }
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LocationListsApp();
});
