import { useCallback, useEffect, useState } from "react";

const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

const DOSAGE_FORMS = [
  "Tablet",
  "Capsule",
  "Injection",
  "Syrup",
  "Drops",
  "Cream",
  "Ointment",
  "Inhaler",
  "Powder",
  "Gel",
  "Lotion",
  "Other",
];

const CATEGORY_OPTIONS = {
  "Pain Relief": ["Analgesics", "Anti-inflammatory"],
  Antibiotics: ["Penicillins", "Cephalosporins", "Other antibiotics"],
  "Cold & Cough": ["Cold", "Cough", "Allergy"],
  Vitamins: ["Multivitamins", "Vitamin supplements", "Minerals"],
  "Digestive Health": ["Antacids", "Digestive enzymes", "Other"],
  "First Aid": ["Antiseptics", "Wound care"],
  Other: ["General medicine", "Other"],
};

const emptyForm = {
  medicineName: "",
  strength: "",
  dosageForm: "Tablet",
  unitsPerStrip: "10",
  packaging: "1 strip",
  mrp: "",
  category: "",
  subcategory: "",
  description: "",
  isActive: true,
};

function getToken() {
  return localStorage.getItem("token");
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

function downloadTemplate() {
  const csv = [
    "medicineName,strength,dosageForm,unitsPerStrip,packaging,mrp,category,subcategory,description",
    'Paracetamol,500 mg,Tablet,10,1 strip,50,Pain Relief,Analgesics,Example only',
    'Example syrup,100 mg/5 ml,Syrup,,100 ml bottle,85,Cold & Cough,Cough,Example only',
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "getyourmed-products-template.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function Field({ label, children, required = false }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest(
        `/products?search=${encodeURIComponent(search)}`
      );
      setProducts(result.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function startAdd() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setNotice("");
    setView("form");
  }

  function startEdit(product) {
    setEditingId(product._id);
    setForm({
      medicineName: product.medicineName || "",
      strength: product.strength || "",
      dosageForm: product.dosageForm || "Tablet",
      unitsPerStrip: product.unitsPerStrip ?? "",
      packaging: product.packaging || "",
      mrp: product.mrp ?? "",
      category: product.category || "",
      subcategory: product.subcategory || "",
      description: product.description || "",
      isActive: product.isActive !== false,
    });
    setError("");
    setNotice("");
    setView("form");
  }

  function updateField(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => {
      const next = {
        ...previous,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "category") {
        next.subcategory = "";
      }

      return next;
    });
  }

  async function saveProduct(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        ...form,
        mrp: Number(form.mrp),
        unitsPerStrip:
          form.unitsPerStrip === "" ? null : Number(form.unitsPerStrip),
      };

      const path = editingId
        ? `/products/${editingId}`
        : "/products";

      await apiRequest(path, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      setNotice(editingId ? "Product updated." : "Product added.");
      setView("list");
      setEditingId(null);
      setForm({ ...emptyForm });
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Delete "${product.medicineName}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(`/products/${product._id}`, {
        method: "DELETE",
      });
      setNotice("Product deleted.");
      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  }

  async function importProducts(event) {
    event.preventDefault();

    if (!importFile) {
      setError("Choose a CSV file first.");
      return;
    }

    setImporting(true);
    setError("");
    setNotice("");
    setImportReport(null);

    try {
      const data = new FormData();
      data.append("file", importFile);

      const result = await apiRequest("/products/import", {
        method: "POST",
        body: data,
      });

      setImportReport(result);
      setNotice(result.message);
      setImportFile(null);
      event.target.reset();
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  const categories = Object.keys(CATEGORY_OPTIONS);
  const subcategories = CATEGORY_OPTIONS[form.category] || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your medicine catalogue.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setError("");
              setNotice("");
              setImportReport(null);
              setView("import");
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Import Products
          </button>

          <button
            onClick={startAdd}
            className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            + Add Product
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {view === "form" && (
        <form
          onSubmit={saveProduct}
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              {editingId ? "Edit Product" : "Add New Product"}
            </h2>
            <button
              type="button"
              onClick={() => setView("list")}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Medicine name" required>
              <input
                className={inputClass}
                name="medicineName"
                value={form.medicineName}
                onChange={updateField}
                required
                maxLength={150}
                placeholder="e.g. Paracetamol"
              />
            </Field>

            <Field label="Strength / dosage" required>
              <input
                className={inputClass}
                name="strength"
                value={form.strength}
                onChange={updateField}
                required
                maxLength={80}
                placeholder="e.g. 500 mg or 100 mg/5 ml"
              />
            </Field>

            <Field label="Dosage form" required>
              <select
                className={inputClass}
                name="dosageForm"
                value={form.dosageForm}
                onChange={updateField}
                required
              >
                {DOSAGE_FORMS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Units per strip">
              <input
                className={inputClass}
                type="number"
                min="1"
                step="1"
                name="unitsPerStrip"
                value={form.unitsPerStrip}
                onChange={updateField}
                placeholder="e.g. 10 tablets"
              />
              <span className="block text-xs text-slate-500">
                Leave blank if not sold in strips.
              </span>
            </Field>

            <Field label="Packaging">
              <input
                className={inputClass}
                name="packaging"
                value={form.packaging}
                onChange={updateField}
                placeholder="e.g. 1 strip or 100 ml bottle"
                maxLength={100}
              />
            </Field>

            <Field label="MRP (₹)" required>
              <input
                className={inputClass}
                type="number"
                name="mrp"
                value={form.mrp}
                onChange={updateField}
                min="0"
                step="0.01"
                required
                placeholder="0.00"
              />
            </Field>

            <Field label="Category" required>
              <select
                className={inputClass}
                name="category"
                value={form.category}
                onChange={updateField}
                required
              >
                <option value="">Select category</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Subcategory" required>
              <select
                className={inputClass}
                name="subcategory"
                value={form.subcategory}
                onChange={updateField}
                required
                disabled={!form.category}
              >
                <option value="">Select subcategory</option>
                {subcategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                className={inputClass}
                name="isActive"
                value={form.isActive ? "true" : "false"}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isActive: event.target.value === "true",
                  }))
                }
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </Field>

            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Description">
                <textarea
                  className={inputClass}
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  rows={3}
                  maxLength={2000}
                  placeholder="Optional product information"
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setView("list")}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Save Product"}
            </button>
          </div>
        </form>
      )}

      {view === "import" && (
        <form
          onSubmit={importProducts}
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Import Products</h2>
            <button
              type="button"
              onClick={() => setView("list")}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Back to products
            </button>
          </div>

          <p className="text-sm text-slate-600">
            Upload a CSV file with the required medicine columns. Check the
            template before importing. Duplicate products are reported as failed
            rows.
          </p>

          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Download CSV Template
          </button>

          <Field label="Choose CSV file" required>
            <input
              className={inputClass}
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setImportFile(event.target.files?.[0] || null)}
              required
            />
          </Field>

          <button
            disabled={importing}
            className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {importing ? "Importing..." : "Upload and Import"}
          </button>

          {importReport && (
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <p>Imported: {importReport.imported}</p>
              <p>Failed: {importReport.failed}</p>

              {importReport.errors?.length > 0 && (
                <div className="max-h-52 overflow-auto">
                  <h3 className="mb-2 font-semibold">Rows requiring attention</h3>
                  {importReport.errors.map((item, index) => (
                    <p key={`${item.row}-${index}`} className="text-red-700">
                      Row {item.row}: {item.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>
      )}

      {view === "list" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Total products</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {products.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Active products shown</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {products.filter((p) => p.isActive).length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Inactive products shown</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {products.filter((p) => !p.isActive).length}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <label className="flex max-w-lg items-center gap-2 rounded-lg border border-slate-300 px-3">
                <span aria-hidden="true">⌕</span>
                <input
                  className="w-full py-2.5 text-sm outline-none"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search medicine, strength or category..."
                />
              </label>
            </div>

            {loading ? (
              <p className="p-8 text-center text-sm text-slate-500">
                Loading products...
              </p>
            ) : products.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-semibold text-slate-800">No products found</p>
                <p className="mt-1 text-sm text-slate-500">
                  Add a medicine or change your search.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Medicine</th>
                      <th className="px-4 py-3">Strength</th>
                      <th className="px-4 py-3">Form</th>
                      <th className="px-4 py-3">Pack</th>
                      <th className="px-4 py-3">MRP</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((product) => (
                      <tr
                        key={product._id}
                        tabIndex={0}
                        role="button"
                        aria-label={`Edit ${product.medicineName}`}
                        onClick={() => startEdit(product)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") startEdit(product);
                        }}
                        className="cursor-pointer hover:bg-emerald-50/50 focus:bg-emerald-50"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">
                            {product.medicineName}
                          </p>
                          <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {product.subcategory}
                          </p>
                        </td>
                        <td className="px-4 py-4">{product.strength}</td>
                        <td className="px-4 py-4">{product.dosageForm}</td>
                        <td className="px-4 py-4">
                          {product.packaging || "—"}
                          {product.unitsPerStrip
                            ? ` (${product.unitsPerStrip}/strip)`
                            : ""}
                        </td>
                        <td className="px-4 py-4 font-medium">
                          ₹{Number(product.mrp).toFixed(2)}
                        </td>
                        <td className="px-4 py-4">{product.category}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              product.isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {product.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                startEdit(product);
                              }}
                              className="font-semibold text-emerald-700 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteProduct(product);
                              }}
                              className="font-semibold text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
              Showing {products.length} product(s) matching your search.
            </div>
          </div>
        </>
      )}
    </div>
  );
}