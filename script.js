class GUIBuilder {
    constructor() {
        // Bağıl yol kullanıyoruz. Hem lokalde hem de GitHub Pages'de kusursuz çalışır.
        this.ICONS_PATH = "icons/";
        
        this.TOTAL_SLOTS = 27;
        this.inventoryData = {};
        this.selectedSlotIndex = null;

        // DOM Elementleri
        this.gridEl = document.getElementById('inventory-grid');
        this.formEl = document.getElementById('properties-form');
        this.emptyStateEl = document.getElementById('empty-state');
        this.menuTitleEl = document.getElementById('menu-title');
        
        // Tooltip Elementleri
        this.tooltipEl = document.getElementById('mc-tooltip');
        this.tooltipNameEl = document.getElementById('mc-tooltip-name');
        this.tooltipLoreEl = document.getElementById('mc-tooltip-lore');

        this.inputs = {
            id: document.getElementById('item-id'),
            name: document.getElementById('item-name'),
            lore: document.getElementById('item-lore'),
            action: document.getElementById('item-action')
        };

        this.colorParser = new ColorCodeParser();

        this.init();
    }

    init() {
        this.createGrid();
        this.bindEvents();
    }

    createGrid() {
        for (let i = 0; i < this.TOTAL_SLOTS; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.dataset.index = i;
            slot.addEventListener('click', () => this.selectSlot(i));
            
            // TOOLTIP EVENTLERİ
            slot.addEventListener('mouseover', (e) => this.showTooltip(i, e));
            slot.addEventListener('mousemove', (e) => this.moveTooltip(e));
            slot.addEventListener('mouseout', () => this.hideTooltip());

            this.gridEl.appendChild(slot);
        }
    }

    bindEvents() {
        Object.keys(this.inputs).forEach(key => {
            this.inputs[key].addEventListener('input', (e) => this.handleInputChange(key, e.target.value));
        });
        document.getElementById('btn-generate').addEventListener('click', () => this.generateJSON());
    }

    // === TOOLTIP MANTIĞI ===
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

        const x = event.clientX + 20;
        const y = event.clientY - 30;

        const tooltipWidth = this.tooltipEl.offsetWidth;
        const tooltipHeight = this.tooltipEl.offsetHeight;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        let finalX = x;
        let finalY = y;

        if (x + tooltipWidth > screenWidth) finalX = event.clientX - tooltipWidth - 20;
        if (y + tooltipHeight > screenHeight) finalY = screenHeight - tooltipHeight - 10;
        if (finalY < 0) finalY = 10; 

        this.tooltipEl.style.left = `${finalX}px`;
        this.tooltipEl.style.top = `${finalY}px`;
    }

    hideTooltip() {
        this.tooltipEl.style.display = 'none';
    }

    // === SLOT SEÇİMİ VE VERİ YÖNETİMİ ===
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
        this.inputs.name.value = data.name || '';
        this.inputs.lore.value = data.lore ? data.lore.join('\n') : '';
        this.inputs.action.value = data.action || '';
        
        this.inputs.id.focus();
    }

    handleInputChange(key, value) {
        if (this.selectedSlotIndex === null) return;

        if (!this.inventoryData[this.selectedSlotIndex]) {
            this.inventoryData[this.selectedSlotIndex] = {};
        }

        if (key === 'lore') {
            this.inventoryData[this.selectedSlotIndex][key] = value ? value.split('\n') : [];
        } else {
            this.inventoryData[this.selectedSlotIndex][key] = value;
        }

        if (key === 'id') {
            this.updateSlotVisual(this.selectedSlotIndex, value);
        }

        this.updateActiveTooltipContent();
    }

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

    updateSlotVisual(index, rawId) {
        const slotEl = this.gridEl.children[index];
        slotEl.innerHTML = ''; 

        if (!rawId.trim()) {
            delete this.inventoryData[index];
            return;
        }

        // minecraft: önekini temizle
        let cleanId = rawId.replace("minecraft:", "").toLowerCase().trim();
        
        const img = new Image();
        img.className = 'mc-item';
        
        // Görsellerin artık tam ismine sahip, __0 takısına gerek yok!
        img.src = `${this.ICONS_PATH}${cleanId}.png`;

        img.onerror = () => {
            img.classList.add('not-found');
            img.title = `Görsel bulunamadı: ${cleanId}.png`;
        };

        slotEl.appendChild(img);
    }

    // === JSON ÇIKTISI ===
    formatCodeForJson(str) {
        if(!str) return "";
        return str.replace(/&/g, "§");
    }

    generateJSON() {
        const result = {
            title: this.formatCodeForJson(this.menuTitleEl.value),
            rows: 3,
            items: {}
        };

        Object.keys(this.inventoryData).forEach(slotIndex => {
            const data = this.inventoryData[slotIndex];
            if (data.id && data.id.trim() !== "") {
                result.items[slotIndex] = {
                    id: data.id.includes(":") ? data.id : `minecraft:${data.id}`,
                    name: this.formatCodeForJson(data.name),
                    lore: (data.lore || []).map(line => this.formatCodeForJson(line)),
                    action: data.action
                };
                if(!result.items[slotIndex].name) delete result.items[slotIndex].name;
                if(result.items[slotIndex].lore.length === 0) delete result.items[slotIndex].lore;
                if(!result.items[slotIndex].action) delete result.items[slotIndex].action;
            }
        });

        const outputArea = document.getElementById('json-output');
        outputArea.value = JSON.stringify(result, null, 2);
        
        const btn = document.getElementById('btn-generate');
        btn.innerHTML = "✓ JSON Üretildi!";
        btn.style.color = "#55FF55";
        setTimeout(() => {
            // İkonlu haline geri döndür
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> JSON Üret`;
            btn.style.color = "#000";
        }, 1500);
    }
}

// === MINECRAFT RENK KODU DÖNÜŞTÜRÜCÜ ===
class ColorCodeParser {
    constructor() {
        this.regex = /[&§]([0-9a-fk-or])/g;
    }

    parse(text) {
        if (!text) return "";
        let cleanText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        let htmlOutput = "";
        let currentStyles = [];
        let lastIndex = 0;
        let match;

        while ((match = this.regex.exec(cleanText)) !== null) {
            const part = cleanText.substring(lastIndex, match.index);
            if (part) {
                htmlOutput += this.wrapText(part, currentStyles);
            }

            const code = match[1].toLowerCase();

            if (code === 'r') {
                currentStyles = [];
            } else if (this.isColor(code)) {
                currentStyles = currentStyles.filter(s => !this.isColor(s));
                currentStyles.push(code);
            } else {
                if (!currentStyles.includes(code)) {
                    currentStyles.push(code);
                }
            }
            lastIndex = this.regex.lastIndex;
        }

        const finalPart = cleanText.substring(lastIndex);
        if (finalPart) {
            htmlOutput += this.wrapText(finalPart, currentStyles);
        }
        return htmlOutput;
    }

    wrapText(text, styles) {
        if (styles.length === 0) return text;
        const classes = styles.map(s => `mcc-${s}`).join(' ');
        return `<span class="${classes}">${text}</span>`;
    }

    isColor(code) {
        return /[0-9a-f]/.test(code);
    }
}

document.addEventListener('DOMContentLoaded', () => new GUIBuilder());