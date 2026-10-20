import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, getProductImageUrl } from "./api.js";
import "./AdminPage.css";

const emptyForm = {
  id: "",
  name: "",
  category: "",
  price: "",
  size: "",
  status: "available",
};

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}

function AdminPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Gagal mengambil produk.");
        }

        setProducts(data);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
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

  function clearForm() {
    setEditingProductId(null);
    setFormData(emptyForm);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openCreateForm() {
    clearForm();
    setError("");
    setShowForm(true);
  }

  function openEditForm(product) {
    setEditingProductId(product.id);
    setFormData({
      id: product.id,
      name: product.name,
      category: product.category,
      price: String(product.price),
      size: product.size,
      status: product.status,
    });
    setImageFile(null);
    setError("");
    setShowForm(true);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleSaveProduct(event) {
    event.preventDefault();
    setError("");

    if (!editingProductId && !imageFile) {
      setError("Pilih foto produk terlebih dahulu.");
      return;
    }

    setSaving(true);

    try {
      const body = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        body.append(key, value);
      });
      if (imageFile) {
        body.append("image", imageFile);
      }

      const isEditing = Boolean(editingProductId);
      const url = isEditing
        ? `${API_BASE_URL}/api/products/${encodeURIComponent(editingProductId)}`
        : `${API_BASE_URL}/api/products`;
      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        credentials: "include",
        body,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal menyimpan produk.");
      }

      setProducts((current) =>
        isEditing
          ? current.map((product) =>
              product.id === result.id ? result : product,
            )
          : [result, ...current],
      );
      clearForm();
      setShowForm(false);
    } catch (requestError) {
      setError(requestError.message || "Tidak dapat menyimpan produk.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(product) {
    if (
      !window.confirm(
        `Yakin ingin menghapus produk "${product.name}"? Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }

    setError("");
    setDeletingProductId(product.id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/products/${encodeURIComponent(product.id)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal menghapus produk.");
      }

      setProducts((current) =>
        current.filter((item) => item.id !== product.id),
      );
      if (editingProductId === product.id) {
        clearForm();
        setShowForm(false);
      }
    } catch (requestError) {
      setError(requestError.message || "Tidak dapat menghapus produk.");
    } finally {
      setDeletingProductId(null);
    }
  }

  async function handleLogout() {
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal logout.");
      }

      navigate("/admin/login", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Tidak dapat logout.");
    }
  }

  const availableCount = products.filter(
    (product) => product.status === "available",
  ).length;
  const soldCount = products.length - availableCount;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">KLASSISCH STORE</p>
          <h1>Kelola Produk</h1>
        </div>
        <div className="admin-header-actions">
          <button
            className="admin-add-button"
            type="button"
            onClick={() => {
              if (showForm) {
                clearForm();
                setShowForm(false);
              } else {
                openCreateForm();
              }
            }}
          >
            {showForm ? "Batal" : "+ Tambah Produk"}
          </button>
          <button
            className="admin-logout-button"
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      <section className="admin-summary" aria-label="Ringkasan produk">
        <article className="admin-summary-card">
          <span>Total Produk</span>
          <strong>{products.length}</strong>
        </article>
        <article className="admin-summary-card">
          <span>Tersedia</span>
          <strong>{availableCount}</strong>
        </article>
        <article className="admin-summary-card">
          <span>Terjual</span>
          <strong>{soldCount}</strong>
        </article>
      </section>

      <section className="admin-products">
        <h2>Daftar Produk</h2>
        {loading && <p role="status">Memuat produk...</p>}
        {!loading && error && <p role="alert">Gagal memuat produk: {error}</p>}
        {!loading && !error && products.length === 0 && (
          <p>Belum ada produk.</p>
        )}

        {showForm && (
          <form className="admin-product-form" onSubmit={handleSaveProduct}>
            <label>
              ID produk
              <input
                name="id"
                value={formData.id}
                onChange={handleFormChange}
                readOnly={Boolean(editingProductId)}
                maxLength={20}
                required
              />
            </label>
            <label>
              Nama
              <input
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                maxLength={150}
                required
              />
            </label>
            <label>
              Kategori
              <input
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                maxLength={80}
                required
              />
            </label>
            <label>
              Harga (Rupiah)
              <input
                name="price"
                type="number"
                min="0"
                step="1"
                value={formData.price}
                onChange={handleFormChange}
                required
              />
            </label>
            <label>
              Ukuran
              <input
                name="size"
                value={formData.size}
                onChange={handleFormChange}
                maxLength={20}
                required
              />
            </label>
            <label>
              Status
              <select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
              >
                <option value="available">Tersedia</option>
                <option value="sold">Terjual</option>
              </select>
            </label>
            <label>
              Foto produk {editingProductId ? "(opsional)" : ""}
              <input
                ref={fileInputRef}
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setImageFile(event.target.files?.[0] ?? null)
                }
                required={!editingProductId}
              />
              <span>
                {imageFile
                  ? imageFile.name
                  : editingProductId
                    ? "Kosongkan untuk mempertahankan foto saat ini."
                    : "Pilih JPG, PNG, atau WebP. Maksimal 5 MB."}
              </span>
            </label>
            <button type="submit" disabled={saving}>
              {saving
                ? "Menyimpan..."
                : editingProductId
                  ? "Simpan Perubahan"
                  : "Simpan Produk"}
            </button>
          </form>
        )}

        {!loading && products.length > 0 && (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Kategori</th>
                  <th>Harga</th>
                  <th>Ukuran</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-product-cell">
                        <img
                          src={getProductImageUrl(product.image)}
                          alt=""
                        />
                        <div>
                          <strong>{product.name}</strong>
                          <span>{product.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>{product.category}</td>
                    <td>{formatPrice(product.price)}</td>
                    <td>{product.size}</td>
                    <td>
                      {product.status === "sold" ? "Terjual" : "Tersedia"}
                    </td>
                    <td className="admin-row-actions">
                      <button
                        className="admin-edit-button"
                        type="button"
                        onClick={() => openEditForm(product)}
                        disabled={saving || deletingProductId !== null}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-delete-button"
                        type="button"
                        onClick={() => handleDeleteProduct(product)}
                        disabled={saving || deletingProductId !== null}
                      >
                        {deletingProductId === product.id
                          ? "Menghapus..."
                          : "Hapus"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminPage;
