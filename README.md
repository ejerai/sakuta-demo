# Demo Sakuta Coffee — Pesan via QR, Bayar Midtrans

Demo statis (HTML/CSS/JS murni, tanpa build step) untuk ditunjukkan ke client cafe Sakuta.
Tidak ada backend, tidak ada API Midtrans sungguhan — semua disimulasikan di browser
memakai localStorage + BroadcastChannel supaya tab pelanggan dan tab admin saling sinkron secara live.

## Isi proyek
- `index.html` — halaman pembuka demo, menjelaskan alur ke client, tautan ke sisi pelanggan & admin
- `menu.html` — sisi pelanggan: scan meja, pilih menu, bayar (simulasi Midtrans Snap), lihat status pesanan
- `admin.html` — login peran (Kasir/Admin) + dashboard: ringkasan, papan pesanan real-time, menu, meja & QR, log webhook, pengaturan
- `sakuta-core.js` — "server" tiruan: data menu asli Sakuta, perhitungan harga, status pesanan, simulasi notifikasi Midtrans
- `sakuta.css` — desain bersama (mode terang & gelap)
- `qrcode.js` — pustaka pembuat QR code (MIT license, Kazuhiko Arase)

## Menjalankan lokal
Buka `index.html` langsung di browser, atau jalankan server statis sederhana:
```
python3 -m http.server 8000
```
lalu buka `http://localhost:8000`.

## Publish ke GitHub Pages
1. Push folder ini ke repo GitHub (bisa di root repo, atau di folder `/docs`).
2. Settings → Pages → Source: pilih branch dan folder yang sesuai.
3. Buka `https://<username>.github.io/<repo>/` — itu akan memuat `index.html`.

## Cara terbaik menunjukkan ke client
Buka dua tab berdampingan: satu `menu.html` (peran pelanggan), satu `admin.html` (peran Kasir).
Selesaikan pemesanan dan simulasi pembayaran di tab pelanggan, lalu tunjukkan pesanan
langsung muncul di tab admin tanpa refresh, lengkap dengan bunyi notifikasi.

## Catatan penting untuk demo
Ini murni demo tampilan dan alur kerja. Versi produksi tetap membutuhkan server sungguhan
(database, endpoint order, endpoint webhook Midtrans yang terverifikasi tanda tangannya)
seperti yang sudah dibahas sebelumnya.
