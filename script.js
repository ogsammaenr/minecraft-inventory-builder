class GUIBuilder {
    constructor() {
        this.ICONS_PATH = "icons/";
        this.TOTAL_SLOTS = 27; // Varsayılan 3 satır
        this.inventoryData = {};
        this.selectedSlotIndex = null;

        // --- DOM Elementleri ---
        this.gridEl = document.getElementById('inventory-grid');
        this.formEl = document.getElementById('properties-form');
        this.emptyStateEl = document.getElementById('empty-state');
        
        this.menuTitleEl = document.getElementById('menu-title');
        this.rowSelector = document.getElementById('row-selector');
        this.btnGenerate = document.getElementById('btn-generate-json');
        
        this.sidebarGrid = document.getElementById('sidebar-item-grid');
        this.searchInput = document.getElementById('item-search');
        
        this.tooltipEl = document.getElementById('mc-tooltip');
        this.tooltipNameEl = document.getElementById('mc-tooltip-name');
        this.tooltipLoreEl = document.getElementById('mc-tooltip-lore');

        this.jsonModal = document.getElementById('json-modal');
        this.jsonOutput = document.getElementById('json-output');
        this.btnCloseModal = document.getElementById('close-json-modal');
        this.btnCopyJson = document.getElementById('btn-copy-json');
        this.chkCompressJson = document.getElementById('toggle-compress-json'); // YENİ EKLENDİ

        // Kayıtlı Eşyalar (LocalStorage) Elementleri
        this.savedGridEl = document.getElementById('saved-items-grid');
        this.SAVED_SLOTS_COUNT = 9; 
        this.savedData = []; 

        this.inputs = {
            id: document.getElementById('item-id'),
            amount: document.getElementById('item-amount'),
            name: document.getElementById('item-name'),
            lore: document.getElementById('item-lore'),
            action: document.getElementById('item-action')
        };

        this.allItems = typeof MINECRAFT_ITEMS !== 'undefined' ? MINECRAFT_ITEMS : [];
        this.colorParser = new ColorCodeParser();

        this.init();
    }

    init() {
        this.allItems.sort(); 
        this.loadSavedData(); // Hafızayı yükle
        this.setupSavedGrid(); // Alt barı çiz
        this.setupGrid(); // Sandığı çiz
        this.renderSidebarItems(); // Kütüphaneyi çiz
        this.bindEvents();
    }

    // === 1. DİNAMİK SANDIK MANTIĞI ===
    setupGrid() {
        this.gridEl.innerHTML = ''; 
        for (let i = 0; i < this.TOTAL_SLOTS; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.dataset.index = i;
            
            slot.addEventListener('click', () => this.selectSlot(i));
            
            // Sandıktaki eşyayı sürüklemeye başlama
            slot.addEventListener('dragstart', (e) => {
                if (!this.inventoryData[i] || !this.inventoryData[i].id) {
                    e.preventDefault(); 
                    return;
                }
                const payload = JSON.stringify({ source: 'chest', index: i });
                e.dataTransfer.setData('text/plain', payload);
                e.dataTransfer.effectAllowed = 'copyMove';
            });

            slot.addEventListener('dragover', (e) => this.handleDragOver(e));
            slot.addEventListener('dragenter', (e) => this.handleDragEnter(e, slot));
            slot.addEventListener('dragleave', (e) => this.handleDragLeave(e, slot));
            slot.addEventListener('drop', (e) => this.handleDrop(e, i, slot));

            slot.addEventListener('mouseover', (e) => this.showTooltip(i, e));
            slot.addEventListener('mousemove', (e) => this.moveTooltip(e));
            slot.addEventListener('mouseout', () => this.hideTooltip());

            this.gridEl.appendChild(slot);
            if (this.inventoryData[i] && this.inventoryData[i].id) {
                this.updateSlotVisual(i, this.inventoryData[i].id);
            }
        }
    }

    changeRowCount(rows) {
        this.TOTAL_SLOTS = rows * 9;
        this.selectedSlotIndex = null;
        this.formEl.style.display = 'none';
        this.emptyStateEl.style.display = 'block';
        this.setupGrid(); 
    }

    // === 2. KÜTÜPHANE MANTIĞI ===
    renderSidebarItems() {
        this.sidebarGrid.innerHTML = '';
        this.allItems.forEach(itemId => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'sidebar-item';
            itemDiv.dataset.id = itemId;
            
            itemDiv.draggable = true; 
            itemDiv.addEventListener('dragstart', (e) => {
                const payload = JSON.stringify({ source: 'sidebar', itemId: itemId });
                e.dataTransfer.setData('text/plain', payload);
                e.dataTransfer.effectAllowed = 'copy';
            });

            itemDiv.addEventListener('click', () => {
                if (this.selectedSlotIndex !== null) {
                    this.inputs.id.value = itemId;
                    this.handleInputChange('id', itemId);
                }
            });

            itemDiv.innerHTML = `
                <img src="${this.ICONS_PATH}${itemId}.png" alt="${itemId}" loading="lazy">
                <span title="${itemId}">${itemId}</span>
            `;
            this.sidebarGrid.appendChild(itemDiv);
        });
    }

    filterSidebarItems(query) {
        const lowerQuery = query.toLowerCase().trim();
        const items = this.sidebarGrid.children;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.dataset.id.includes(lowerQuery)) item.classList.remove('hidden');
            else item.classList.add('hidden');
        }
    }

    // === 3. KAYITLI EŞYALAR (LOCALSTORAGE) MANTIĞI ===
    loadSavedData() {
        const data = localStorage.getItem('mcGuiSavedItems');
        this.savedData = data ? JSON.parse(data) : Array(this.SAVED_SLOTS_COUNT).fill(null);
    }

    saveDataToStorage() {
        localStorage.setItem('mcGuiSavedItems', JSON.stringify(this.savedData));
    }

    setupSavedGrid() {
        this.savedGridEl.innerHTML = '';
        for (let i = 0; i < this.SAVED_SLOTS_COUNT; i++) {
            const slot = document.createElement('div');
            slot.className = 'saved-slot';
            slot.dataset.index = i;

            slot.addEventListener('dragover', (e) => this.handleDragOver(e));
            slot.addEventListener('dragenter', (e) => { e.preventDefault(); slot.classList.add('drag-over-saved'); });
            slot.addEventListener('dragleave', (e) => slot.classList.remove('drag-over-saved'));
            slot.addEventListener('drop', (e) => this.handleSavedDrop(e, i, slot));

            slot.addEventListener('dragstart', (e) => {
                if (!this.savedData[i]) { e.preventDefault(); return; }
                const payload = JSON.stringify({ source: 'saved', index: i });
                e.dataTransfer.setData('text/plain', payload);
                e.dataTransfer.effectAllowed = 'copyMove';
            });

            this.savedGridEl.appendChild(slot);
            this.updateSavedSlotVisual(i);
        }
    }

    updateSavedSlotVisual(index) {
        const slotEl = this.savedGridEl.children[index];
        slotEl.innerHTML = ''; 
        
        const data = this.savedData[index];
        if (!data || !data.id) {
            slotEl.draggable = false;
            return;
        }

        let cleanId = data.id.replace("minecraft:", "").toLowerCase().trim();
        const img = new Image();
        img.className = 'mc-item';
        img.src = `${this.ICONS_PATH}${cleanId}.png`;
        slotEl.appendChild(img);

        // YENİ: Kayıtlı eşyada da miktarı göster
        if (data.amount && data.amount > 1) {
            const amountSpan = document.createElement('span');
            amountSpan.className = 'item-amount-badge';
            amountSpan.innerText = data.amount;
            slotEl.appendChild(amountSpan);
        }

        slotEl.draggable = true;
    }

    handleSavedDrop(e, index, slot) {
        e.preventDefault();
        slot.classList.remove('drag-over-saved');

        const rawData = e.dataTransfer.getData('text/plain');
        if (!rawData) return;

        try {
            const data = JSON.parse(rawData);
            
            if (data.source === 'chest') {
                // Sandıktan Kayıtlılara (Kopyala ve Kaydet)
                const chestItem = this.inventoryData[data.index];
                if (chestItem && chestItem.id) {
                    this.savedData[index] = JSON.parse(JSON.stringify(chestItem));
                    this.updateSavedSlotVisual(index);
                    this.saveDataToStorage();
                }
            } else if (data.source === 'saved') {
                // Kayıtlılar kendi arasında yer değiştirsin (Takas)
                const fromIndex = data.index;
                const targetData = this.savedData[index];
                const sourceData = this.savedData[fromIndex];
                
                this.savedData[index] = sourceData;
                this.savedData[fromIndex] = targetData;
                
                this.updateSavedSlotVisual(index);
                this.updateSavedSlotVisual(fromIndex);
                this.saveDataToStorage();
            }
        } catch (err) { console.error("Drop hatası:", err); }
    }

    // === 4. ORTAK SÜRÜKLE BIRAK MANTIĞI ===
    handleDragOver(e) {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'copy';
    }

    handleDragEnter(e, slot) {
        e.preventDefault();
        slot.classList.add('drag-over'); 
    }

    handleDragLeave(e, slot) {
        slot.classList.remove('drag-over'); 
    }

    handleDrop(e, index, slot) {
        e.preventDefault();
        slot.classList.remove('drag-over');
        
        const rawData = e.dataTransfer.getData('text/plain');
        if (!rawData) return;

        try {
            const data = JSON.parse(rawData);

            if (data.source === 'sidebar') {
                this.selectSlot(index);
                this.inputs.id.value = data.itemId;
                this.handleInputChange('id', data.itemId);
                
            } else if (data.source === 'chest') {
                const fromIndex = data.index;
                if (fromIndex === index) return; 

                const targetData = this.inventoryData[index] ? { ...this.inventoryData[index] } : null;
                const sourceData = this.inventoryData[fromIndex] ? { ...this.inventoryData[fromIndex] } : null;

                if (sourceData) this.inventoryData[index] = sourceData;
                else delete this.inventoryData[index];

                if (targetData) this.inventoryData[fromIndex] = targetData;
                else delete this.inventoryData[fromIndex];

                this.updateSlotVisual(index, sourceData ? sourceData.id : "");
                this.updateSlotVisual(fromIndex, targetData ? targetData.id : "");
                this.selectSlot(index);

            } else if (data.source === 'saved') {
                // Kayıtlı eşyayı sandığa kopyala
                const savedItem = this.savedData[data.index];
                if (savedItem) {
                    this.inventoryData[index] = JSON.parse(JSON.stringify(savedItem)); 
                    this.updateSlotVisual(index, savedItem.id);
                    this.selectSlot(index);
                }
            }
        } catch (err) { console.error("Sürükleme Hatası:", err); }
    }

    // === DİĞER FONKSİYONLAR ===
    bindEvents() {
        Object.keys(this.inputs).forEach(key => {
            this.inputs[key].addEventListener('input', (e) => this.handleInputChange(key, e.target.value));
        });
        
        this.searchInput.addEventListener('input', (e) => this.filterSidebarItems(e.target.value));
        this.rowSelector.addEventListener('change', (e) => this.changeRowCount(parseInt(e.target.value)));
        
        // === JSON MODAL OLAYLARI ===
        
        // 1. Üret Butonuna Basılınca Modalı Aç ve Doldur
        this.btnGenerate.addEventListener('click', () => {
            const jsonString = this.generateJSON();
            this.jsonOutput.value = jsonString;
            this.jsonModal.style.display = 'flex'; // Ekranı karart ve Modalı göster
        });

        // Kutucuk her işaretlendiğinde/kaldırıldığında JSON'u canlı güncelle
        this.chkCompressJson.addEventListener('change', () => {
            this.updateJsonOutput();
        });

        // 2. Çarpı (X) Butonuyla Modalı Kapat
        this.btnCloseModal.addEventListener('click', () => {
            this.jsonModal.style.display = 'none';
        });

        // 3. Modalın dışındaki siyah alana tıklanırsa da kapat
        this.jsonModal.addEventListener('click', (e) => {
            if (e.target === this.jsonModal) {
                this.jsonModal.style.display = 'none';
            }
        });

        // 4. Şık "Panoya Kopyala" Butonu
        this.btnCopyJson.addEventListener('click', () => {
            // Modern tarayıcı kopyalama API'si
            navigator.clipboard.writeText(this.jsonOutput.value).then(() => {
                // Kopyalandıktan sonra butona havalı bir efekt ver
                const originalText = this.btnCopyJson.innerHTML;
                this.btnCopyJson.innerHTML = "Kopyalandı! ✔️";
                this.btnCopyJson.style.backgroundColor = "#55FF55"; // Başarı Yeşili
                this.btnCopyJson.style.color = "#000";
                
                // 2 Saniye sonra butonu eski haline çevir
                setTimeout(() => {
                    this.btnCopyJson.innerHTML = originalText;
                    this.btnCopyJson.style.backgroundColor = ""; 
                    this.btnCopyJson.style.color = "";
                }, 2000);
            }).catch(err => {
                console.error("Kopyalama başarısız oldu:", err);
                alert("Kopyalama başarısız oldu, lütfen manuel seçip kopyalayın.");
            });
        });
    }

    selectSlot(index) {
        if (this.selectedSlotIndex !== null) {
            const oldSlot = this.gridEl.children[this.selectedSlotIndex];
            if(oldSlot) oldSlot.classList.remove('selected');
        }

        this.selectedSlotIndex = index;
        this.gridEl.children[index].classList.add('selected');

        this.emptyStateEl.style.display = 'none';
        this.formEl.style.display = 'block';

        const data = this.inventoryData[index] || { id: '', name: '', lore: '', action: '' };
        this.inputs.id.value = data.id || '';
        this.inputs.amount.value = data.amount || 1; 
        this.inputs.name.value = data.name || '';
        this.inputs.lore.value = data.lore ? data.lore.join('\n') : '';
        this.inputs.action.value = data.action || '';
        this.inputs.name.focus(); 
    }

    handleInputChange(key, value) {
        if (this.selectedSlotIndex === null) return;

        if (!this.inventoryData[this.selectedSlotIndex]) {
            this.inventoryData[this.selectedSlotIndex] = {};
        }

        if (key === 'lore') {
            this.inventoryData[this.selectedSlotIndex][key] = value ? value.split('\n') : [];
        } else if (key === 'amount') {
            // YENİ: Miktarı sayıya (integer) çevirerek kaydet
            this.inventoryData[this.selectedSlotIndex][key] = parseInt(value) || 1;
        } else {
            this.inventoryData[this.selectedSlotIndex][key] = value;
        }

        // Eğer değişen şey ID veya Miktar ise görseli anında güncelle
        if (key === 'id' || key === 'amount') {
            this.updateSlotVisual(this.selectedSlotIndex, this.inventoryData[this.selectedSlotIndex].id);
        }
        this.updateActiveTooltipContent();
    }

    updateSlotVisual(index, rawId) {
        const slotEl = this.gridEl.children[index];
        slotEl.innerHTML = ''; 

        if (!rawId || !rawId.trim()) {
            delete this.inventoryData[index];
            slotEl.draggable = false;
            return;
        }

        let cleanId = rawId.replace("minecraft:", "").toLowerCase().trim();
        const img = new Image();
        img.className = 'mc-item';
        img.src = `${this.ICONS_PATH}${cleanId}.png`;
        slotEl.appendChild(img);

        // YENİ: Miktar 1'den büyükse sağ alta sayı rozetini ekle
        const data = this.inventoryData[index];
        if (data && data.amount && data.amount > 1) {
            const amountSpan = document.createElement('span');
            amountSpan.className = 'item-amount-badge';
            amountSpan.innerText = data.amount;
            slotEl.appendChild(amountSpan);
        }

        slotEl.draggable = true; 
    }

    showTooltip(index, event) {
        const data = this.inventoryData[index];
        if (!data || !data.id) return; 
        this.tooltipEl.style.display = 'block';
        const rawName = data.name || data.id.replace("minecraft:", "");
        this.tooltipNameEl.innerHTML = this.colorParser.parse(rawName);
        this.tooltipLoreEl.innerHTML = '';
        if (data.lore && data.lore.length > 0) {
            data.lore.forEach(line => {
                const lineSpan = document.createElement('span');
                lineSpan.innerHTML = this.colorParser.parse(line);
                this.tooltipLoreEl.appendChild(lineSpan);
            });
        }
        this.moveTooltip(event);
    }

    moveTooltip(event) {
        if (this.tooltipEl.style.display === 'none') return;
        let finalX = event.clientX + 20;
        let finalY = event.clientY - 30;
        if (finalX + this.tooltipEl.offsetWidth > window.innerWidth) finalX = event.clientX - this.tooltipEl.offsetWidth - 20;
        if (finalY + this.tooltipEl.offsetHeight > window.innerHeight) finalY = window.innerHeight - this.tooltipEl.offsetHeight - 10;
        if (finalY < 0) finalY = 10; 
        this.tooltipEl.style.left = `${finalX}px`;
        this.tooltipEl.style.top = `${finalY}px`;
    }

    hideTooltip() { this.tooltipEl.style.display = 'none'; }

    updateActiveTooltipContent() {
        if (this.tooltipEl.style.display === 'none' || this.selectedSlotIndex === null) return;
        const data = this.inventoryData[this.selectedSlotIndex];
        const rawName = data.name || data.id.replace("minecraft:", "");
        this.tooltipNameEl.innerHTML = this.colorParser.parse(rawName);
        this.tooltipLoreEl.innerHTML = '';
        if (data.lore && data.lore.length > 0) {
            data.lore.forEach(line => {
                const lineSpan = document.createElement('span');
                lineSpan.innerHTML = this.colorParser.parse(line);
                this.tooltipLoreEl.appendChild(lineSpan);
            });
        }
    }

    formatCodeForJson(str) { return str ? str.replace(/&/g, "§") : ""; }

// === 5. JSON ÜRETİMİ VE SIKIŞTIRMA (GÜNCELLENDİ) ===
    updateJsonOutput() {
        const isCompressed = this.chkCompressJson.checked;
        this.jsonOutput.value = this.generateJSON(isCompressed);
    }

    buildItemData(data) {
        const item = {
            id: data.id.includes(":") ? data.id : `minecraft:${data.id}`,
            amount: data.amount > 1 ? data.amount : undefined, // YENİ: Sadece 1'den büyükse JSON'a ekle
            name: this.formatCodeForJson(data.name),
            lore: (data.lore || []).map(line => this.formatCodeForJson(line)),
            action: data.action
        };
        if (!item.amount) delete item.amount;
        if (!item.name) delete item.name;
        if (item.lore.length === 0) delete item.lore;
        if (!item.action) delete item.action;
        return item;
    }

    // YENİ: Numaraları SADECE ardışık ise gruplayan algoritma 
    // (Örn: [1,2, 4,5,6] geldiğinde tek parça değil, ["1-2", "4-6"] olarak iki parça döndürür)
    getContiguousRanges(slots) {
        if (!slots || slots.length === 0) return [];
        slots.sort((a, b) => a - b);
        let ranges = [];
        let start = slots[0], end = slots[0];

        for (let i = 1; i < slots.length; i++) {
            if (slots[i] === end + 1) {
                end = slots[i]; // Ardışık devam ediyor, ucu uzat
            } else {
                // Zincir koptu! Mevcut grubu diziye ekle ve yeni zincir başlat
                ranges.push(start === end ? `${start}` : `${start}-${end}`);
                start = slots[i];
                end = slots[i];
            }
        }
        // Son kalan zinciri de ekle
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        return ranges; // String değil, Array döndürüyoruz
    }

    generateJSON(isCompressed = false) {
        const result = {
            title: this.formatCodeForJson(this.menuTitleEl.value),
            rows: this.TOTAL_SLOTS / 9,
            items: {}
        };

        if (!isCompressed) {
            // KLASİK MOD
            Object.keys(this.inventoryData).forEach(slotIndex => {
                const data = this.inventoryData[slotIndex];
                if (data.id && data.id.trim() !== "") {
                    result.items[slotIndex] = this.buildItemData(data);
                }
            });
        } else {
            // ARDIŞIK SIKIŞTIRILMIŞ MOD
            const groupedItems = {}; 

            Object.keys(this.inventoryData).forEach(slotIndex => {
                const data = this.inventoryData[slotIndex];
                if (data.id && data.id.trim() !== "") {
                    const itemData = this.buildItemData(data);
                    const hash = JSON.stringify(itemData); 
                    
                    if (!groupedItems[hash]) {
                        groupedItems[hash] = { slots: [], data: itemData };
                    }
                    groupedItems[hash].slots.push(parseInt(slotIndex));
                }
            });

            // YENİ: Gruplanan slot dizisini al, koptuğu yerlerden ayrı ayrı JSON'a bas
            Object.values(groupedItems).forEach(group => {
                const rangesArray = this.getContiguousRanges(group.slots);
                
                // Her bir kopuk ardışık grubu ayrı bir item objesi olarak yazdır
                rangesArray.forEach(rangeString => {
                    result.items[rangeString] = group.data;
                });
            });
        }

        return JSON.stringify(result, null, 2);
    }
}

class ColorCodeParser {
    constructor() { this.regex = /[&§]([0-9a-fk-or])/g; }
    parse(text) {
        if (!text) return "";
        let cleanText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        let htmlOutput = "";
        let currentStyles = [];
        let lastIndex = 0;
        let match;
        while ((match = this.regex.exec(cleanText)) !== null) {
            const part = cleanText.substring(lastIndex, match.index);
            if (part) htmlOutput += this.wrapText(part, currentStyles);
            const code = match[1].toLowerCase();
            if (code === 'r') currentStyles = [];
            else if (this.isColor(code)) {
                currentStyles = currentStyles.filter(s => !this.isColor(s));
                currentStyles.push(code);
            } else if (!currentStyles.includes(code)) currentStyles.push(code);
            lastIndex = this.regex.lastIndex;
        }
        const finalPart = cleanText.substring(lastIndex);
        if (finalPart) htmlOutput += this.wrapText(finalPart, currentStyles);
        return htmlOutput;
    }
    wrapText(text, styles) {
        if (styles.length === 0) return text;
        const classes = styles.map(s => `mcc-${s}`).join(' ');
        return `<span class="${classes}">${text}</span>`;
    }
    isColor(code) { return /[0-9a-f]/.test(code); }
}

document.addEventListener('DOMContentLoaded', () => new GUIBuilder());