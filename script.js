class GUIBuilder {
    constructor() {
        this.LOCAL_ICONS_PATH = "icons/";
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

        // Renk kodu dönüştürücü
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
        if (!data || !data.id) return; // Boş slotta gösterme

        this.tooltipEl.style.display = 'block';

        // İsmi dönüştür ve doldur (Varsayılan isim yoksa ID'yi göster)
        const rawName = data.name || data.id.replace("__0", "").replace("minecraft:", "");
        this.tooltipNameEl.innerHTML = this.colorParser.parse(rawName);

        // Lore'u dönüştür ve doldur
        this.tooltipLoreEl.innerHTML = ''; // Temizle
        if (data.lore && data.lore.length > 0) {
            data.lore.forEach(line => {
                const lineSpan = document.createElement('span');
                lineSpan.innerHTML = this.colorParser.parse(line);
                this.tooltipLoreEl.appendChild(lineSpan);
            });
        }

        // İlk konumu ayarla
        this.moveTooltip(event);
    }

    moveTooltip(event) {
        if (this.tooltipEl.style.display === 'none') return;

        // Mouse'un biraz sağ üstünde göster (Oyun içi gibi)
        const x = event.clientX + 20;
        const y = event.clientY - 30;

        // Ekran sınırlarını kontrol et (Tooltip ekrandan taşmasın)
        const tooltipWidth = this.tooltipEl.offsetWidth;
        const tooltipHeight = this.tooltipEl.offsetHeight;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        let finalX = x;
        let finalY = y;

        if (x + tooltipWidth > screenWidth) {
            finalX = event.clientX - tooltipWidth - 20; // Sola kaydır
        }

        if (y + tooltipHeight > screenHeight) {
            finalY = screenHeight - tooltipHeight - 10; // Yukarı kaydır
        }
        
        if (finalY < 0) finalY = 10; // Çok yukarı gitmesin

        this.tooltipEl.style.left = `${finalX}px`;
        this.tooltipEl.style.top = `${finalY}px`;
    }

    hideTooltip() {
        this.tooltipEl.style.display = 'none';
    }
    // ========================

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

        // Eğer özellikler değişirse, açık olan tooltip'i de anlık güncelle
        this.updateActiveTooltipContent();
    }

    updateActiveTooltipContent() {
        if (this.tooltipEl.style.display === 'none' || this.selectedSlotIndex === null) return;
        const data = this.inventoryData[this.selectedSlotIndex];
        
        // İsmi anlık güncelle
        const rawName = data.name || data.id.replace("__0", "").replace("minecraft:", "");
        this.tooltipNameEl.innerHTML = this.colorParser.parse(rawName);

        // Lore'u anlık güncelle
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

        let cleanId = rawId.replace("minecraft:", "").toLowerCase().trim();
        let fileName = cleanId;

        if (!fileName.includes("__")) {
            fileName += "__0";
        }
        
        const img = new Image();
        img.className = 'mc-item';
        img.src = `${this.LOCAL_ICONS_PATH}${fileName}.png`;

        img.onerror = () => {
            img.classList.add('not-found');
            img.title = `Görsel bulunamadı: ${fileName}.png`;
        };

        slotEl.appendChild(img);
    }

    // JSON ÇIKTISI İÇİN YARDIMCI (JS formatCode metodu)
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

        document.getElementById('json-output').value = JSON.stringify(result, null, 2);
        
        const btn = document.getElementById('btn-generate');
        btn.innerText = "✓ JSON Üretildi!";
        btn.style.color = "#55FF55";
        setTimeout(() => {
            btn.innerText = "JSON Üret";
            btn.style.color = "#000";
        }, 1500);
    }
}

// === MINECRAFT RENK KODU DÖNÜŞTÜRÜCÜ (SENIOR LOGIC) ===
class ColorCodeParser {
    constructor() {
        // Minecraft renk/format kodları regex'i (& veya § sembollerini yakalar)
        this.regex = /[&§]([0-9a-fk-or])/g;
    }

    parse(text) {
        if (!text) return "";
        
        // Önce HTML taglarını temizle (XSS güvenliği)
        let cleanText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        let htmlOutput = "";
        let currentStyles = [];
        let lastIndex = 0;
        let match;

        // Metni tara ve kodları bul
        while ((match = this.regex.exec(cleanText)) !== null) {
            // Koddan önceki düz metni ekle
            const part = cleanText.substring(lastIndex, match.index);
            if (part) {
                htmlOutput += this.wrapText(part, currentStyles);
            }

            const code = match[1].toLowerCase();

            if (code === 'r') {
                // Reset kodu: Tüm stilleri temizle
                currentStyles = [];
            } else if (this.isColor(code)) {
                // Renk kodu: Önceki rengi temizle, yeni rengi ekle
                currentStyles = currentStyles.filter(s => !this.isColor(s));
                currentStyles.push(code);
            } else {
                // Format kodu (l, o, n, m, k): Stili ekle (varsa tekrar etme)
                if (!currentStyles.includes(code)) {
                    currentStyles.push(code);
                }
            }

            lastIndex = this.regex.lastIndex;
        }

        // Kalan son metni ekle
        const finalPart = cleanText.substring(lastIndex);
        if (finalPart) {
            htmlOutput += this.wrapText(finalPart, currentStyles);
        }

        return htmlOutput;
    }

    // Yardımcı: Metni aktif stillerle sarmalar
    wrapText(text, styles) {
        if (styles.length === 0) return text;
        
        // CSS sınıflarını oluştur (örn: mcc-a mcc-l)
        const classes = styles.map(s => `mcc-${s}`).join(' ');
        return `<span class="${classes}">${text}</span>`;
    }

    // Yardımcı: Kodun bir renk mi yoksa format mı olduğunu kontrol eder
    isColor(code) {
        return /[0-9a-f]/.test(code);
    }
}

document.addEventListener('DOMContentLoaded', () => new GUIBuilder());