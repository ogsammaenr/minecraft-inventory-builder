import os
import requests
import time

SAVE_DIR = "icons"
# Senin bulduğun o harika render klasörü!
BASE_URL = "https://www.mcworldtools.com/textures/rendered/"

if not os.path.exists(SAVE_DIR):
    os.makedirs(SAVE_DIR)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Referer": "https://www.mcworldtools.com/"
}

print("📦 Aşama 1: Minecraft'ın devasa veri tabanından geçerli tam liste çekiliyor...")

# PrismarineJS veritabanından sadece "Gerçek Envanter Eşyalarının" listesini alıyoruz
api_url = "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/refs/heads/master/data/pc/1.21.11/items.json"

try:
    req = requests.get(api_url)
    items_data = req.json()
    # Sadece ismi olan geçerli eşyaları listeye ekle
    items_to_check = [item['name'] for item in items_data]
    print(f"📋 Harika! Toplam {len(items_to_check)} adet geçerli envanter eşyası bulundu.\n")
except Exception as e:
    print("❌ Liste çekilemedi! İnternet bağlantını kontrol et.", e)
    items_to_check = []

print("🚀 Aşama 2: İndirme işlemi başlıyor...\n")

success_count = 0
fail_count = 0

for item in items_to_check:
    url = f"{BASE_URL}{item}.png"
    file_path = os.path.join(SAVE_DIR, f"{item}.png")
    
    # Dosya zaten klasörde varsa tekrar indirip kotayı doldurmasın
    if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
        # Konsolu çok kirletmemek için 'Zaten var' yazısını gizliyoruz
        success_count += 1
        continue

    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        if res.status_code == 200:
            with open(file_path, "wb") as f:
                f.write(res.content)
            print(f"✅ İndi: {item}.png")
            success_count += 1
        else:
            # Sitede render'ı olmayan nadir eşyalar olabilir
            print(f"⚠️ Render bulunamadı: {item}.png")
            fail_count += 1
    except Exception as e:
        print(f"❌ Bağlantı Hatası ({item}): {e}")
        fail_count += 1
        
    # Siteyi çökertmemek ve ban yememek için her resimde 0.1 saniye (100ms) bekle
    time.sleep(0.1)

print(f"\n✨ İŞLEM TAMAMLANDI!")
print(f"🎉 İnen ve Zaten Var Olan Toplam: {success_count}")
print(f"❓ Başarısız (Renderı olmayan): {fail_count}")