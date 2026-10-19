import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import "./App.css";
import { TIKTOK_PROFILE_URL } from "./storeConfig";
import ProductDetail from "./ProductDetail.jsx";

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}

function ProductCard({ product }) {
  const isSold = product.status === "sold";

  return (
    <article className="product-card">
      <div className={`product-image ${isSold ? "sold" : ""}`}>
        <img src={product.image} alt={product.name} loading="lazy" />

        <span className={`product-status ${isSold ? "sold" : ""}`}>
          {isSold ? "TERJUAL" : "TERSEDIA"}
        </span>
      </div>

      <div className="product-info">
        <p className="product-category">
          {product.category} · {product.id}
        </p>

        <h3>
          <Link className="product-name-link" to={`/products/${product.id}`}>
            {product.name}
          </Link>
        </h3>

        <p className="product-size">Ukuran {product.size}</p>

        <div className="product-bottom">
          <strong>{formatPrice(product.price)}</strong>

          {isSold ? (
            <span className="sold-label">Terjual</span>
          ) : TIKTOK_PROFILE_URL ? (
            <a
              className="detail-link"
              href={TIKTOK_PROFILE_URL}
              target="_blank"
              rel="noreferrer"
            >
              Lihat TikTok ↗
            </a>
          ) : (
            <span className="detail-link contact-unavailable" aria-disabled="true">
              TikTok segera hadir
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function CatalogPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const response = await fetch("http://localhost:3000/api/products", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Gagal mengambil produk: ${response.status}`);
        }

        const data = await response.json();
        setProducts(data);
      } catch (error) {
        if (error.name !== "AbortError") {
          setLoadError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => controller.abort();
  }, []);

  const categories = [...new Set(products.map((product) => product.category))];

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(normalizedSearch) ||
      product.id.toLowerCase().includes(normalizedSearch);
    const matchesCategory =
      !selectedCategory || product.category === selectedCategory;
    const matchesStatus =
      !selectedStatus || product.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  function resetFilters() {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedStatus("");
  }

  return (
    <div className="store">
      <div className="announcement">UNIQUE FINDS. SECOND LIFE. YOUR STYLE.</div>

      <header className="navbar">
        <a href="#home" className="brand">
          KLASSI<span>SCH.</span>
        </a>

        <nav>
          <a href="#home">Home</a>
          <a href="#catalog">Collection</a>
          <a href="#about">About</a>
        </nav>

        <a href="#catalog" className="nav-button">
          Explore Collection ↗
        </a>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <p className="eyebrow">PRELOVED FASHION STORE</p>

            <h1>
              Good clothes.
              <br />
              <span>Second stories.</span>
            </h1>

            <p className="hero-description">
              Temukan baju thrift pilihan dengan gaya unik, harga terjangkau,
              dan cerita baru untuk setiap pakaian.
            </p>

            <a href="#catalog" className="primary-button">
              Lihat Koleksi <span>↗</span>
            </a>

            <p className="hero-note">✳ Setiap barang punya stok unik</p>
          </div>

          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900"
              alt="Inspirasi gaya fashion"
            />

            <div className="image-label">
              <span>CURATED THRIFT</span>
              <strong>Wear it your way.</strong>
            </div>
          </div>
        </section>

        <section className="benefits" id="about">
          <span>✳ Selected Pieces</span>
          <span>✳ Unique Finds</span>
          <span>✳ Affordable Style</span>
          <span>✳ One Piece per Item</span>
        </section>

        <section className="catalog" id="catalog">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE LATEST FINDS</p>
              <h2>Freshly picked.</h2>
            </div>

            <p>
              Cari baju favoritmu sebelum keduluan orang lain. Setiap barang
              memiliki stok terbatas.
            </p>
          </div>

          <div className="catalog-filters">
            <label className="filter-field search-field">
              <span>Cari produk</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Nama atau kode produk"
              />
            </label>

            <label className="filter-field">
              <span>Kategori</span>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                <option value="">Semua Kategori</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span>Status</span>
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="available">Tersedia</option>
                <option value="sold">Terjual</option>
              </select>
            </label>

            <button
              className="filter-reset"
              type="button"
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>

          {loading && <p role="status">Memuat produk...</p>}
          {loadError && <p role="alert">Gagal memuat produk: {loadError}</p>}

          <p className="catalog-result-count" aria-live="polite">
            Menampilkan {filteredProducts.length} dari {products.length} produk
          </p>

          <div
            className="product-grid-scroll"
            tabIndex={filteredProducts.length > 8 ? 0 : undefined}
            aria-label="Daftar produk; gulir untuk melihat produk lainnya"
          >
            <div className="product-grid">
              {loading ? null : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
              ) : loadError ? null : (
                <p className="catalog-empty" role="status">
                  Produk tidak ditemukan
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="closing">
          <p className="eyebrow">FIND YOUR NEXT FAVORITE</p>
          <h2>Style has no expiration date.</h2>
          <a href="#catalog" className="primary-button">
            Jelajahi Koleksi ↗
          </a>
        </section>
      </main>

      <footer className="footer">
        <a href="#home" className="brand">
          KLASSI<span>SCH.</span>
        </a>
        <p>Preloved pieces, new possibilities.</p>
        <span>© 2026 KLASSISCH. Demo website.</span>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/products/:id" element={<ProductDetail />} />
    </Routes>
  );
}

export default App;
