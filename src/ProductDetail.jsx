import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TIKTOK_PROFILE_URL } from "./storeConfig";
import "./ProductDetail.css";

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}

function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      try {
        const response = await fetch(
          `http://localhost:3000/api/products/${encodeURIComponent(id)}`,
          { signal: controller.signal },
        );

        if (response.status === 404) {
          setProduct(null);
          return;
        }

        if (!response.ok) {
          throw new Error(`Gagal mengambil produk: ${response.status}`);
        }

        setProduct(await response.json());
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

    loadProduct();
    return () => controller.abort();
  }, [id]);

      if (loading) {
      return <p role="status">Memuat detail produk...</p>;
    }

    if (loadError) {
      return <p role="alert">Gagal memuat produk: {loadError}</p>;
    }

  if (!product) {
    return (
      <section className="detail-not-found">
        <p className="eyebrow">PRODUCT NOT FOUND</p>
        <h1>Produk tidak ditemukan.</h1>
        <p>Mungkin produk ini sudah tidak tersedia atau URL-nya salah.</p>
        <Link to="/#catalog" className="primary-button">
          Kembali ke koleksi
        </Link>
      </section>
    );
  }

  const isSold = product.status === "sold";

  return (
    <main className="product-detail">
      <Link to="/#catalog" className="detail-back">
        ← Kembali ke koleksi
      </Link>

      <div className="detail-layout">
        <div className="detail-image">
          <img src={product.image} alt={product.name} />
          <span className={`detail-status ${isSold ? "sold" : ""}`}>
            {isSold ? "TERJUAL" : "TERSEDIA"}
          </span>
        </div>

        <div className="detail-content">
          <p className="eyebrow">
            {product.category} · {product.id}
          </p>

          <h1>{product.name}</h1>

          <p className="detail-price">{formatPrice(product.price)}</p>

          <div className="detail-divider" />

          <div className="detail-specs">
            <div>
              <span>Kategori</span>
              <strong>{product.category}</strong>
            </div>
            <div>
              <span>Ukuran</span>
              <strong>{product.size}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{isSold ? "Terjual" : "Tersedia"}</strong>
            </div>
          </div>

          <p className="detail-description">
            Temukan gaya unik dengan koleksi preloved KLASSISCH.
            Setiap item memiliki karakter dan ketersediaan yang terbatas.
          </p>

          {isSold ? (
            <button className="detail-buy-button" disabled>
              Produk Sudah Terjual
            </button>
          ) : TIKTOK_PROFILE_URL ? (
            <a
              className="detail-buy-button"
              href={TIKTOK_PROFILE_URL}
              target="_blank"
              rel="noreferrer"
            >
              Kunjungi TikTok ↗
            </a>
          ) : (
            <button className="detail-buy-button" disabled>
              TikTok segera hadir
            </button>
          )}

          <p className="detail-note">
            ✳ Pastikan ketersediaan barang sebelum melakukan pemesanan.
          </p>
        </div>
      </div>
    </main>
  );
}

export default ProductDetail;