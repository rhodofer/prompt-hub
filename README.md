# Prompt Hub

Prompt Hub, VS Code içerisinde sık kullandığınız promptları (metin ve resim destekli olarak) kaydetmenizi, yönetmenizi ve AI asistanlarına (Antigravity IDE, GitHub Copilot vb.) tek tıkla aktarmanızı sağlayan güçlü bir eklentidir.

## Özellikler

* **Prompt Kaydetme:** Sık kullandığınız komut dizilerini (prompt) başlıklarıyla beraber saklayabilirsiniz.
* **Resim Desteği:** Promptlarınıza ekran görüntüleri veya resim dosyaları iliştirebilirsiniz (Clipboard'dan veya dosyadan sürükle/bırak/yapıştır desteği).
* **AI Chat Entegrasyonu:** Kaydettiğiniz prompta tek tıkladığınızda:
  * Resim eklentisi otomatik olarak arka planda sohbete (Antigravity IDE) bir "bağlam (context)" dosyası olarak iliştirilir.
  * Prompt metniniz panoya kopyalanır.
  * Chat alanında sadece `Ctrl+V` (Yapıştır) yaparak kontrolü kaybetmeden mesajınızı hazırlayabilirsiniz.
* **Sürükle ve Bırak (Drag & Drop):** İsterseniz listeden bir promptu tutup doğrudan chat penceresinin içine sürükleyerek de aktarım sağlayabilirsiniz.

## Kurulum (Yerel Kullanım İçin)

Bu eklenti henüz VS Code Marketplace'te yayınlanmadığı için, yerel (local) ortamda klasör olarak kullanabilir veya bir `.vsix` dosyası halinde paketleyip kurabilirsiniz.

### Yöntem 1: Kaynak Koddan Doğrudan Kullanım (Geliştirici Modu)
1. Bu projeyi bilgisayarınıza klonlayın veya indirin.
2. Proje klasörünü VS Code ile açın.
3. Terminali açın ve bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
4. Kodu derleyin:
   ```bash
   npm run compile
   ```
5. Klavyeden `F5` tuşuna basarak eklentiyi "Extension Development Host" adlı yeni bir pencerede test edebilir ve kullanabilirsiniz.

### Yöntem 2: Kendi VS Code'unuza Kalıcı Kurulum (.vsix Paketleme)
Eklentiyi kalıcı olarak kendi ana VS Code'unuza kurmak isterseniz:
1. Terminalde `vsce` (VS Code Extension Manager) aracını global olarak kurun:
   ```bash
   npm install -g @vscode/vsce
   ```
2. Proje dizininde eklentiyi paketleyin:
   ```bash
   vsce package
   ```
   *Bu komut, bulunduğunuz klasöre `prompt-hub-1.0.0.vsix` adında bir dosya oluşturacaktır.*
3. VS Code'da sol menüden **Extensions (Eklentiler)** sekmesini açın.
4. Üstteki üç noktaya (`...`) tıklayın ve **"Install from VSIX..."** seçeneğini seçin.
5. Oluşturduğunuz `.vsix` dosyasını seçerek kurulumu tamamlayın.

## Nasıl Kullanılır?

1. VS Code yan menüsünde (veya alt panelde) **"Prompt Hub"** sekmesini bulun.
2. Yeni bir prompt eklemek için başlığın yanındaki **`+`** (Add Prompt) butonuna tıklayın.
3. Açılan web görünümünde (webview) başlığı ve metninizi girin.
4. *(İsteğe Bağlı)* Resim eklemek isterseniz, aldığınız ekran görüntüsünü sayfaya `Ctrl+V` ile yapıştırın.
5. **Save** butonuna basarak kaydedin.
6. Kaydettiğiniz prompta listeden tıkladığınızda, resim varsa otomatik olarak chat eklentisi olarak bağlanır ve metin kopyalanır. Ardından chat kutusuna girip `Ctrl+V` yaparak mesajı tamamlayabilirsiniz.

## Gereksinimler

* VS Code sürüm 1.93.0 veya üzeri.
* Resim kopyalama ve aktarım otomasyonları şu an ağırlıklı olarak **Windows** (`win32`) işletim sistemine optimize edilmiştir (PowerShell aracılığıyla).

---
*Developed with ❤️ by [rhodofer](https://github.com/rhodofer).*
