# KLASSISCH Store

Katalog thrift berbasis React dan Vite dengan backend Express, MySQL, serta
dashboard admin untuk mengelola produk dan foto.

## Persiapan

1. Buat database MySQL bernama `klassisch_store` atau sesuaikan dengan
   `DB_NAME`.
2. Jalankan `server/schema.sql` pada database tersebut. Jika tabel sudah ada,
   skema hanya membuat tabel yang belum tersedia.
3. Salin `server/.env.example` menjadi `server/.env`, lalu isi konfigurasi
   database dan `SESSION_SECRET` dengan nilai rahasia yang unik.
4. Install dependensi frontend dari root proyek:

   ```bash
   npm install
   ```

5. Install dependensi backend:

   ```bash
   cd server
   npm install
   ```

## Akun admin

Isi sementara `ADMIN_EMAIL` dan `ADMIN_PASSWORD` di `server/.env`. Password
harus memiliki panjang 12-72 byte. Dari folder `server`, jalankan:

```bash
npm run admin:reset
```

Perintah ini membuat akun admin atau mereset password untuk email yang sama.
Hapus nilai `ADMIN_PASSWORD` dari file `.env` setelah selesai. Jangan pernah
commit `.env`.

## Menjalankan secara lokal

Jalankan backend dan frontend di dua terminal.

Backend, dari folder `server`:

```bash
npm run dev
```

Frontend, dari root proyek:

```bash
npm run dev
```

Secara default, frontend tersedia di `http://localhost:5173` dan API di
`http://localhost:3000`. Buka `http://localhost:5173/admin/login` untuk login
dan mengelola produk. Jika frontend berjalan pada origin lain, sesuaikan
`FRONTEND_ORIGIN` di `server/.env`.

Foto upload disimpan lokal di `server/uploads/` dan tidak seharusnya ikut
di-commit. Foto katalog yang dibutuhkan saat deploy perlu disediakan di folder
upload pada server target atau dipindahkan ke object storage.

## Endpoint utama

- `GET /api/products` dan `GET /api/products/:id` untuk katalog publik.
- `POST /api/products`, `PUT /api/products/:id`, dan
  `DELETE /api/products/:id` hanya dapat dipakai dengan sesi admin.
- `POST /api/auth/login`, `GET /api/auth/me`, dan `POST /api/auth/logout`
  mengelola sesi admin.
- `GET /api/health` dan `GET /api/db-health` untuk pemeriksaan layanan.
