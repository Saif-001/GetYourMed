
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Outlet,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  FileUp,
  HeartPulse,
  LogOut,
  Mail,
  Menu,
  Minus,
  Package,
  Phone,
  Pill,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { request } from "./api.js";
import ProductsPage from "./pages/admin/ProductsPage";
// import { useAuth } from "./context/AuthContext";

const adminMenu = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", path: "/admin/dashboard", icon: "▦" },
    ],
  },
  {
    title: "SALES",
    items: [
      { label: "Orders", path: "/admin/dashboard/orders", icon: "▤" },
      { label: "Order Customers", path: "/admin/dashboard/order-customers", icon: "♙" },
      { label: "Prescriptions", path: "/admin/dashboard/prescriptions", icon: "▧" },
      { label: "Manual Orders", path: "/admin/dashboard/manual-orders", icon: "＋" },
    ],
  },
  {
    title: "CATALOG",
    items: [
      { label: "Products", path: "/admin/dashboard/products", icon: "▣" },
      { label: "Collections", path: "/admin/dashboard/collections", icon: "▦" },
      { label: "Categories", path: "/admin/dashboard/categories", icon: "▤" },
    ],
  },
  {
    title: "INVENTORY & SUPPLY",
    items: [
      { label: "Suppliers", path: "/admin/dashboard/suppliers", icon: "♧" },
      { label: "Purchase Orders", path: "/admin/dashboard/purchase-orders", icon: "▣" },
      { label: "Batch & Expiry", path: "/admin/dashboard/batches", icon: "◷" },
    ],
  },
  {
    title: "CUSTOMERS",
    items: [
      { label: "All Customers", path: "/admin/dashboard/customers", icon: "♙" },
      { label: "Customer Addresses", path: "/admin/dashboard/addresses", icon: "⌖" },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { label: "Payments", path: "/admin/dashboard/payments", icon: "₹" },
      { label: "Invoices", path: "/admin/dashboard/invoices", icon: "▤" },
      { label: "Refunds", path: "/admin/dashboard/refunds", icon: "↩" },
    ],
  },
  {
    title: "REPORTS",
    items: [
      { label: "Sales Reports", path: "/admin/dashboard/reports/sales", icon: "▥" },
      { label: "Product Reports", path: "/admin/dashboard/reports/products", icon: "▥" },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { label: "Admin Profile", path: "/admin/dashboard/profile", icon: "⚙" },
      { label: "Store Settings", path: "/admin/dashboard/settings", icon: "⚙" },
    ],
  },
];

const AuthContext = createContext(null);
const CartContext = createContext(null);

const PHONE = "8787200743";
const EMAIL = "care@getyourmed.in";

/*
 * DEMO CATALOG
 * Replace this array with products from your backend catalog API.
 * Do not use these sample products or prices as verified sale listings.
 */
const DEMO_MEDICINES = [
  {
    id: "med-1",
    name: "Paracetamol",
    brand: "Generic",
    strength: "500 mg",
    form: "Tablet",
    pack: "Strip of 10 tablets",
    price: 25,
    prescriptionRequired: false,
    description: "Paracetamol tablets. Check the product label before use.",
  },
  {
    id: "med-2",
    name: "Paracetamol",
    brand: "Generic",
    strength: "650 mg",
    form: "Tablet",
    pack: "Strip of 15 tablets",
    price: 38,
    prescriptionRequired: false,
    description: "Paracetamol tablets. Check the product label before use.",
  },
  {
    id: "med-3",
    name: "Paracetamol Suspension",
    brand: "Generic",
    strength: "120 mg/5 mL",
    form: "Syrup",
    pack: "60 mL bottle",
    price: 42,
    prescriptionRequired: false,
    description: "Oral suspension. Check age-appropriate instructions and label.",
  },
  {
    id: "med-4",
    name: "Vitamin C",
    brand: "Generic",
    strength: "500 mg",
    form: "Tablet",
    pack: "Pack of 10 tablets",
    price: 35,
    prescriptionRequired: false,
    description: "Vitamin supplement. Check the ingredient list and label.",
  },
  {
    id: "med-5",
    name: "Cetirizine",
    brand: "Generic",
    strength: "10 mg",
    form: "Tablet",
    pack: "Strip of 10 tablets",
    price: 22,
    prescriptionRequired: false,
    description: "Check the label and suitability before use.",
  },
  {
    id: "med-6",
    name: "Amoxicillin",
    brand: "Generic",
    strength: "500 mg",
    form: "Capsule",
    pack: "Strip of 10 capsules",
    price: 85,
    prescriptionRequired: true,
    description: "Prescription medicine. Valid prescription and pharmacist review required.",
  },
];

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

function useAuth() {
  return useContext(AuthContext);
}

function useCart() {
  return useContext(CartContext);
}

/* ---------------- AUTH AND CART PROVIDERS ---------------- */

function Providers({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("getyourmed-cart") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let active = true;

    request("/auth/me")
      .then((data) => {
        if (active) setUser(data.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("getyourmed-cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (medicine) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === medicine.id);

      if (existing) {
        return current.map((item) =>
          item.id === medicine.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { ...medicine, quantity: 1 }];
    });
  };

  const updateQuantity = (id, quantity) => {
    setCart((current) =>
      quantity < 1
        ? current.filter((item) => item.id !== id)
        : current.map((item) =>
            item.id === id ? { ...item, quantity } : item
          )
    );
  };

  const removeFromCart = (id) => {
    setCart((current) => current.filter((item) => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const cartValue = useMemo(
    () => ({
      cart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      cartCount,
      cartTotal,
    }),
    [cart, cartCount, cartTotal]
  );

  return (
    <AuthContext.Provider
      value={{ user, setUser, authLoading }}
    >
      <CartContext.Provider value={cartValue}>
        {children}
      </CartContext.Provider>
    </AuthContext.Provider>
  );
}

/* ---------------- SHARED STYLES ---------------- */

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10";

function PageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-teal-100 border-t-teal-700" />
        <p className="mt-3 text-sm text-slate-500">Loading GetYourMed...</p>
      </div>
    </div>
  );
}

/* ---------------- NAVBAR ---------------- */

function Navbar() {
  const { user, setUser } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    setLogoutError("");

    try {
      await request("/auth/logout", { method: "POST" });
    } catch (error) {
      setLogoutError(error.message || "Unable to contact the server.");
    } finally {
      setUser(null);
      setProfileOpen(false);
      navigate("/", { replace: true });
    }
  }

  function openProfile() {
    setProfileOpen(false);
    navigate(user ? "/profile" : "/register");
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-100 text-teal-800">
              <Pill size={25} />
            </span>

            <span>
              <span className="block text-xl font-extrabold tracking-tight text-teal-900">
                GetYourMed
              </span>
              <span className="hidden text-[11px] text-slate-500 sm:block">
                Healthcare, made simpler.
              </span>
            </span>
          </Link>

          <div className="ml-auto hidden items-center gap-5 lg:flex">
            <a
              href={`tel:+91${PHONE}`}
              className="flex items-center gap-2 text-sm text-slate-700 hover:text-teal-700"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <Phone size={17} />
              </span>
              <span>
                <span className="block text-xs text-slate-500">
                  Call to place an order
                </span>
                <span className="font-semibold">{PHONE}</span>
              </span>
            </a>

            <a
              href={`mailto:${EMAIL}`}
              className="flex items-center gap-2 text-sm text-slate-700 hover:text-teal-700"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <Mail size={17} />
              </span>
              <span>
                <span className="block text-xs text-slate-500">
                  Email for enquiries
                </span>
                <span className="font-semibold">{EMAIL}</span>
              </span>
            </a>
          </div>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <button
              type="button"
              onClick={() => navigate("/cart")}
              aria-label={`Shopping cart, ${cartCount} items`}
              className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-700 hover:border-teal-200 hover:bg-teal-50"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-teal-700 px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    navigate("/register");
                    return;
                  }

                  setProfileOpen((open) => !open);
                }}
                className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-slate-700 hover:border-teal-200 hover:bg-teal-50"
                aria-expanded={profileOpen}
              >
                <UserRound size={19} />
                <span className="hidden max-w-28 truncate text-sm font-medium sm:block">
                  {user ? user.name || "My account" : "Sign in"}
                </span>
                {user && <ChevronDown size={15} />}
              </button>

              {profileOpen && user && (
                <div className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="border-b border-slate-100 px-3 py-3">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {user.email}
                    </p>
                  </div>

                  <button
                    onClick={openProfile}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-700 hover:bg-teal-50"
                  >
                    <UserRound size={17} />
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/orders");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-700 hover:bg-teal-50"
                  >
                    <ClipboardList size={17} />
                    Your Orders
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={17} />
                    Log out
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 lg:hidden"
              aria-label="Toggle navigation"
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="space-y-3 border-t border-slate-100 bg-white px-5 py-4 lg:hidden">
            <a
              href={`tel:+91${PHONE}`}
              className="flex items-center gap-3 text-sm text-slate-700"
            >
              <Phone size={18} className="text-teal-700" />
              <span>
                <span className="block text-xs text-slate-500">
                  Call to place an order
                </span>
                {PHONE}
              </span>
            </a>

            <a
              href={`mailto:${EMAIL}`}
              className="flex items-center gap-3 break-all text-sm text-slate-700"
            >
              <Mail size={18} className="text-teal-700" />
              <span>
                <span className="block text-xs text-slate-500">
                  Email for enquiries
                </span>
                {EMAIL}
              </span>
            </a>

            <button
              onClick={() => navigate("/cart")}
              className="flex items-center gap-2 text-sm text-slate-700"
            >
              <ShoppingCart size={18} />
              View cart ({cartCount})
            </button>
          </div>
        )}
      </header>

      {logoutError && (
        <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
          {logoutError}
        </div>
      )}
    </>
  );
}

/* ---------------- FOOTER ---------------- */

function Footer() {
  return (
    <footer className="mt-16 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-white">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-700">
              <Pill size={22} />
            </span>
            <span className="text-xl font-bold">GetYourMed</span>
          </div>

          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
            A simpler way to search medicines, submit prescriptions, and
            manage your orders.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-white">Quick links</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <Link to="/" className="hover:text-teal-300">
              Search medicines
            </Link>
            <Link to="/cart" className="hover:text-teal-300">
              Your cart
            </Link>
            <Link to="/orders" className="hover:text-teal-300">
              Your orders
            </Link>
            <Link to="/profile" className="hover:text-teal-300">
              Profile
            </Link>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-white">Contact us</h3>
          <div className="mt-4 flex flex-col gap-4 text-sm">
            <a
              href={`tel:+91${PHONE}`}
              className="flex items-center gap-2 break-all hover:text-teal-300"
            >
              <Phone size={17} />
              {PHONE}
            </a>
            <a
              href={`mailto:${EMAIL}`}
              className="flex items-center gap-2 break-all hover:text-teal-300"
            >
              <Mail size={17} />
              {EMAIL}
            </a>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-white">Order assistance</h3>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Need help with a medicine enquiry or an order? Contact our team
            directly by phone or email.
          </p>
          <a
            href={`tel:+91${PHONE}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-600"
          >
            <Phone size={16} />
            Call us
          </a>
        </div>
      </div>

      <div className="border-t border-slate-800 px-5 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} GetYourMed. All rights reserved.
        <p className="mx-auto mt-2 max-w-3xl">
          Prescription medicines are subject to applicable prescription
          requirements and pharmacy review. Product availability and prices
          must be confirmed by GetYourMed.
        </p>
      </div>
    </footer>
  );
}

/* ---------------- MEDICINE SEARCH ---------------- */

function MedicineCard({ medicine, onAdd, compact = false }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg">
      <div className="flex items-start gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700">
          <Pill size={27} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-5 text-slate-900">
            {medicine.name}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {medicine.brand}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <p className="text-slate-700">
          <span className="text-slate-500">Strength:</span>{" "}
          {medicine.strength}
        </p>
        <p className="text-slate-700">
          <span className="text-slate-500">Form:</span> {medicine.form}
        </p>
        <p className="text-slate-700">
          <span className="text-slate-500">Pack:</span> {medicine.pack}
        </p>
      </div>

      {medicine.prescriptionRequired && (
        <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-800">
          Prescription required
        </p>
      )}

      {!compact && (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {medicine.description}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="text-lg font-extrabold text-slate-900">
          {money(medicine.price)}
        </span>

        <button
          onClick={() => onAdd(medicine)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
        >
          <Plus size={16} />
          Add
        </button>
      </div>
    </article>
  );
}

function Home() {
  const { user } = useAuth();
  const { addToCart, cartCount } = useCart();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addedMessage, setAddedMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return [];

    return DEMO_MEDICINES.filter((medicine) =>
      [
        medicine.name,
        medicine.brand,
        medicine.strength,
        medicine.form,
        medicine.pack,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [query]);

  function handleAdd(medicine) {
    addToCart(medicine);
    setAddedMessage(`${medicine.name} added to cart.`);
    setShowSuggestions(false);
  }

  function handlePrescription(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      setSelectedFile(null);
      event.target.value = "";
      window.alert("Please select a JPG, PNG, WEBP, or PDF file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSelectedFile(null);
      event.target.value = "";
      window.alert("Please choose a file smaller than 10 MB.");
      return;
    }

    setSelectedFile(file);
  }

  function submitPrescription() {
    if (!selectedFile) return;

    if (!user) {
      navigate("/register", {
        state: { from: "/prescriptions", message: "Sign in to submit your prescription." },
      });
      return;
    }

    navigate("/prescriptions", {
      state: { fileName: selectedFile.name },
    });
  }

  return (
    <>
      <Navbar />

      <main>
        <section className="relative overflow-visible bg-gradient-to-br from-[#e4f7f2] via-[#f4fbfa] to-[#e8f0ff]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-teal-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-0 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-widest text-teal-800">
                <HeartPulse size={15} />
                Your healthcare companion
              </span>

              <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Find your medicines.
                <span className="mt-2 block text-teal-700">
                  Feel cared for.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Search by medicine name, brand, strength, or dosage form.
                Need assistance? Place an enquiry by phone or email.
              </p>

              <div className="mt-8 max-w-2xl">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setShowSuggestions(true);
                  }}
                  className="relative z-20 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-teal-900/10 sm:flex-row"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
                    <Search className="shrink-0 text-teal-700" size={22} />
                    <input
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setShowSuggestions(true);
                        setAddedMessage("");
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          setShowSuggestions(false);
                        }
                      }}
                      placeholder="Search medicines, e.g. Paracetamol"
                      aria-label="Search medicines"
                      className="w-full border-0 bg-transparent py-3 text-sm outline-none placeholder:text-slate-400 focus:ring-0"
                    />
                    {query && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => {
                          setQuery("");
                          setShowSuggestions(false);
                        }}
                      >
                        <X size={17} className="text-slate-400" />
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white hover:bg-teal-800"
                  >
                    Search <ArrowRight size={17} />
                  </button>

                  {showSuggestions && query.trim() && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[430px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Search results
                      </div>

                      {results.length === 0 ? (
                        <div className="px-3 py-5 text-sm text-slate-600">
                          No matching demo products found. Try another
                          keyword or contact us for assistance.
                          <div className="mt-3 flex flex-wrap gap-3">
                            <a
                              href={`tel:+91${PHONE}`}
                              className="font-semibold text-teal-700"
                            >
                              Call us
                            </a>
                            <a
                              href={`mailto:${EMAIL}`}
                              className="font-semibold text-teal-700"
                            >
                              Email us
                            </a>
                          </div>
                        </div>
                      ) : (
                        results.map((medicine) => (
                          <div
                            key={medicine.id}
                            className="flex items-center gap-3 rounded-xl p-3 hover:bg-teal-50"
                          >
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-800">
                              <Pill size={22} />
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setQuery(medicine.name);
                                setShowSuggestions(false);
                                document
                                  .getElementById("medicine-results")
                                  ?.scrollIntoView({ behavior: "smooth" });
                              }}
                              className="min-w-0 flex-1 text-left"
                            >
                              <span className="block truncate text-sm font-semibold text-slate-900">
                                {medicine.name}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {medicine.strength} · {medicine.form} ·{" "}
                                {medicine.pack}
                              </span>
                              <span className="mt-1 block text-sm font-bold text-teal-800">
                                {money(medicine.price)}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAdd(medicine)}
                              aria-label={`Add ${medicine.name} to cart`}
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-700 text-white hover:bg-teal-800"
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </form>

                {addedMessage && (
                  <p
                    role="status"
                    className="mt-3 text-sm font-medium text-teal-800"
                  >
                    <Check size={16} className="mr-1 inline" />
                    {addedMessage}
                    <button
                      onClick={() => navigate("/cart")}
                      className="ml-2 underline"
                    >
                      View cart ({cartCount})
                    </button>
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Check size={15} className="text-teal-700" />
                    Browse without signing in
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check size={15} className="text-teal-700" />
                    Cart saved in this browser
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="relative mx-auto max-w-md">
                <div className="absolute inset-4 rounded-[3rem] bg-teal-300/30 blur-2xl" />

                <div className="relative rounded-[2rem] border border-white bg-white/85 p-7 shadow-2xl shadow-teal-900/10 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
                      Welcome to GetYourMed
                    </span>
                    <HeartPulse className="text-teal-700" size={24} />
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-teal-50 p-5">
                      <Pill size={32} className="text-teal-700" />
                      <h3 className="mt-4 font-bold text-slate-900">
                        Medicine search
                      </h3>
                      <p className="mt-2 text-sm leading-5 text-slate-500">
                        Find products by name and strength.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-sky-50 p-5">
                      <FileUp size={32} className="text-sky-700" />
                      <h3 className="mt-4 font-bold text-slate-900">
                        Prescriptions
                      </h3>
                      <p className="mt-2 text-sm leading-5 text-slate-500">
                        Start a prescription enquiry.
                      </p>
                    </div>

                    <div className="col-span-2 flex items-center gap-4 rounded-2xl border border-slate-100 p-4">
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-700">
                        <Phone size={23} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          Need help placing an order?
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Call our team at {PHONE}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="medicine-results"
          className="mx-auto max-w-7xl scroll-mt-28 px-5 py-14 lg:px-8"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
                Explore the catalog
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {query.trim()
                  ? `Results for "${query.trim()}"`
                  : "Explore medicines"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Product details and prices shown here are demonstration data.
              </p>
            </div>

            {query.trim() && (
              <button
                onClick={() => {
                  setQuery("");
                  setShowSuggestions(false);
                }}
                className="self-start text-sm font-semibold text-teal-700 hover:text-teal-900 sm:self-auto"
              >
                Clear search
              </button>
            )}
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(query.trim() ? results : DEMO_MEDICINES.slice(0, 3)).map(
              (medicine) => (
                <MedicineCard
                  key={medicine.id}
                  medicine={medicine}
                  onAdd={handleAdd}
                />
              )
            )}
          </div>

          {query.trim() && results.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
              <Search size={30} className="mx-auto text-slate-400" />
              <h3 className="mt-3 font-semibold text-slate-800">
                No matching products
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Try another search or contact us to enquire about a product.
              </p>
              <a
                href={`mailto:${EMAIL}`}
                className="mt-4 inline-flex items-center gap-2 font-semibold text-teal-700"
              >
                Email an enquiry <ArrowRight size={16} />
              </a>
            </div>
          )}
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-8 lg:px-8">
          <div className="grid gap-7 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-950 to-teal-800 p-6 text-white sm:p-9 lg:grid-cols-2 lg:items-center lg:p-12">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-100">
                <FileUp size={15} />
                PRESCRIPTION ASSISTANCE
              </span>

              <h2 className="mt-5 text-3xl font-extrabold leading-tight">
                Have a prescription?
                <span className="mt-1 block text-teal-200">
                  Start your order enquiry.
                </span>
              </h2>

              <p className="mt-4 max-w-lg text-sm leading-6 text-teal-100">
                Select an image or PDF to start. Your prescription must be
                reviewed by the pharmacy before prescription medicines can be
                fulfilled.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-teal-900 hover:bg-teal-50">
                  <FileUp size={18} />
                  Choose prescription
                  <input
                    type="file"
                    className="sr-only"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handlePrescription}
                  />
                </label>

                {selectedFile && (
                  <button
                    onClick={submitPrescription}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Continue <ArrowRight size={17} />
                  </button>
                )}
              </div>

              {selectedFile && (
                <p className="mt-3 break-all text-sm text-teal-100">
                  Selected: {selectedFile.name}
                </p>
              )}

              <p className="mt-3 text-xs text-teal-200">
                Maximum file size: 10 MB. This demo selects a file locally;
                upload and secure storage require a backend integration.
              </p>
            </div>

            <div className="hidden justify-center lg:flex">
              <div className="grid h-64 w-64 place-items-center rounded-full border border-white/20 bg-white/5">
                <div className="grid h-48 w-48 place-items-center rounded-full border border-white/20 bg-white/10">
                  <FileUp size={86} strokeWidth={1.2} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            <Feature
              icon={<Search size={22} />}
              title="Search with ease"
              description="Find catalog products by name, strength, brand, or dosage form."
            />
            <Feature
              icon={<Package size={22} />}
              title="Manage your cart"
              description="Add products and review quantities before proceeding to checkout."
            />
            <Feature
              icon={<Phone size={22} />}
              title="Direct order assistance"
              description="Contact our team by phone or email for order enquiries."
            />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function Feature({ icon, title, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
        {icon}
      </div>
      <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

/* ---------------- CART ---------------- */

function CartPage() {
  const { cart, updateQuantity, removeFromCart, cartTotal } = useCart();
  const navigate = useNavigate();

  return (
    <>
      <Navbar />

      <main className="mx-auto min-h-[55vh] max-w-7xl px-5 py-10 lg:px-8">
        <button
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-700"
        >
          <ArrowLeft size={17} /> Continue browsing
        </button>

        <h1 className="text-3xl font-extrabold text-slate-900">Your cart</h1>
        <p className="mt-2 text-sm text-slate-500">
          Review your selected products before checkout.
        </p>

        {cart.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 p-10 text-center">
            <ShoppingCart size={42} className="mx-auto text-slate-300" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Your cart is empty
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Search for medicines and add products to get started.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-5 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Browse medicines
            </button>
          </div>
        ) : (
          <div className="mt-8 grid items-start gap-7 lg:grid-cols-[1fr_340px]">
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
                >
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                    <Pill size={25} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900">{item.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.strength} · {item.form}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{item.pack}</p>
                    {item.prescriptionRequired && (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        Prescription required
                      </p>
                    )}
                    <p className="mt-2 font-semibold text-slate-800">
                      {money(item.price)} each
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      aria-label={`Decrease ${item.name} quantity`}
                      onClick={() =>
                        updateQuantity(item.id, item.quantity - 1)
                      }
                      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="min-w-5 text-center font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      aria-label={`Increase ${item.name} quantity`}
                      onClick={() =>
                        updateQuantity(item.id, item.quantity + 1)
                      }
                      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200"
                    >
                      <Plus size={15} />
                    </button>
                    <button
                      aria-label={`Remove ${item.name}`}
                      onClick={() => removeFromCart(item.id)}
                      className="ml-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="text-right font-bold text-slate-900">
                    {money(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Order summary
              </h2>

              <div className="mt-5 flex justify-between text-sm text-slate-600">
                <span>Items ({cart.reduce((n, item) => n + item.quantity, 0)})</span>
                <span>{money(cartTotal)}</span>
              </div>

              <div className="mt-3 flex justify-between text-sm text-slate-600">
                <span>Delivery</span>
                <span>Calculated later</span>
              </div>

              <div className="my-5 border-t border-slate-200" />

              <div className="flex justify-between text-base font-extrabold text-slate-900">
                <span>Subtotal</span>
                <span>{money(cartTotal)}</span>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Final price, availability, prescription requirements, and
                delivery charges must be confirmed before an order is accepted.
              </p>

              <button
                onClick={() => navigate("/checkout")}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3.5 font-semibold text-white hover:bg-teal-800"
              >
                Proceed to checkout <ArrowRight size={17} />
              </button>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

/* ---------------- CHECKOUT GATE ---------------- */

function CheckoutPage() {
  const { user } = useAuth();
  const { cart, cartTotal } = useCart();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Navigate
        to="/register"
        replace
        state={{
          from: "/checkout",
          message: "Create an account or log in to continue to checkout.",
        }}
      />
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[55vh] max-w-4xl px-5 py-10">
        <h1 className="text-3xl font-extrabold text-slate-900">Checkout</h1>
        <p className="mt-2 text-sm text-slate-500">
          Welcome, {user.name}. Your account is signed in.
        </p>

        {cart.length === 0 ? (
          <div className="mt-7 rounded-2xl border border-slate-200 p-6">
            Your cart is empty.
            <button
              onClick={() => navigate("/")}
              className="ml-2 font-semibold text-teal-700"
            >
              Browse medicines
            </button>
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-bold text-slate-900">Items in your cart</h2>
            <div className="mt-4 space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-4 text-sm"
                >
                  <span className="text-slate-600">
                    {item.name} · {item.strength} × {item.quantity}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {money(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="my-5 border-t border-slate-200" />
            <div className="flex justify-between font-bold">
              <span>Subtotal</span>
              <span>{money(cartTotal)}</span>
            </div>

            <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Checkout is not connected to an order-creation or payment API
              yet. Before accepting orders, integrate customer addresses,
              verified catalog prices, prescription checks, delivery charges,
              and payment handling.
            </div>

            <button
              onClick={() =>
                window.alert(
                  "Checkout API is not configured yet. No order has been placed."
                )
              }
              className="mt-5 w-full rounded-xl bg-teal-700 px-4 py-3.5 font-semibold text-white hover:bg-teal-800"
            >
              Continue to delivery details
            </button>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

/* ---------------- AUTH PAGES ---------------- */

function AuthShell({ children }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-sky-50 px-4 py-10">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">
        <aside className="hidden flex-col justify-between bg-teal-800 p-10 text-white md:flex">
          <Link to="/" className="flex items-center gap-3">
            <span className="rounded-2xl bg-white/15 p-3">
              <Pill size={26} />
            </span>
            <b className="text-xl">GetYourMed</b>
          </Link>
          <div>
            <h1 className="text-4xl font-bold leading-tight">
              Healthcare essentials, made simpler.
            </h1>
            <p className="mt-5 leading-7 text-teal-100">
              Search medicines, manage your cart, and access your account in
              one place.
            </p>
          </div>
          <a href={`tel:+91${PHONE}`} className="text-sm text-teal-100">
            Need help? Call {PHONE}
          </a>
        </aside>

        <section className="px-6 py-9 sm:px-10 sm:py-12">
          {children}
        </section>
      </div>
    </main>
  );
}

function Register() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const destination = location.state?.from || "/";

  if (user) return <Navigate to={destination} replace />;

  function change(event) {
    const { name, value } = event.target;
    setForm((old) => ({
      ...old,
      [name]:
        name === "mobile"
          ? value.replace(/\D/g, "").slice(0, 10)
          : value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const data = await request("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setUser(data.user);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || "Unable to create your account.");
    } finally {
      setBusy(false);
    }
  }

  async function googleSuccess(response) {
    setError("");
    setBusy(true);

    try {
      const data = await request("/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: response.credential }),
      });

      if (data.user) {
        setUser(data.user);
        navigate(destination, { replace: true });
      } else {
        setError(
          data.message ||
            "Google sign-in could not complete account creation."
        );
      }
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700"
      >
        <ArrowLeft size={16} /> Back to GetYourMed
      </Link>

      <p className="mt-6 text-sm font-semibold text-teal-700">GET STARTED</p>
      <h2 className="mt-2 text-3xl font-bold text-slate-900">
        Create your account
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Create an account when you are ready to checkout.
      </p>

      {location.state?.message && (
        <p className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-800">
          {location.state.message}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        {[
          ["name", "Full name", "text", "Enter your name"],
          ["mobile", "Mobile number", "tel", "10-digit Indian mobile number"],
          ["email", "Email address", "email", "you@example.com"],
          ["password", "Password", "password", "At least 8 characters"],
          ["confirmPassword", "Confirm password", "password", "Re-enter password"],
        ].map(([name, label, type, placeholder]) => (
          <div key={name}>
            <label
              htmlFor={name}
              className="text-sm font-semibold text-slate-700"
            >
              {label}
            </label>
            <input
              id={name}
              name={name}
              type={type}
              className={`${inputClass} mt-1.5`}
              placeholder={placeholder}
              value={form[name]}
              onChange={change}
              required
              autoComplete={
                name === "password"
                  ? "new-password"
                  : name === "confirmPassword"
                    ? "new-password"
                    : name
              }
              minLength={
                name === "password" || name === "confirmPassword"
                  ? 8
                  : name === "name"
                    ? 2
                    : undefined
              }
              maxLength={
                name === "mobile"
                  ? 10
                  : name === "password" || name === "confirmPassword"
                    ? 72
                    : undefined
              }
              pattern={name === "mobile" ? "[6-9][0-9]{9}" : undefined}
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-teal-700 px-4 py-3.5 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>

      {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
        <>
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">OR</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={googleSuccess}
              onError={() => setError("Google sign-in failed.")}
              text="continue_with"
              theme="outline"
              shape="rectangular"
            />
          </div>
        </>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link
          to="/login"
          state={location.state}
          className="font-semibold text-teal-700"
        >
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}

function Login() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const destination = location.state?.from || "/";

  if (user) return <Navigate to={destination} replace />;

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setUser(data.user);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || "Unable to log in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700"
      >
        <ArrowLeft size={16} /> Back to GetYourMed
      </Link>

      <h2 className="mt-7 text-3xl font-bold text-slate-900">Welcome back</h2>
      <p className="mt-2 text-sm text-slate-500">
        Log in to continue with your order.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="mt-7 space-y-5">
        <div>
          <label htmlFor="loginEmail" className="text-sm font-semibold">
            Email address
          </label>
          <input
            id="loginEmail"
            type="email"
            className={`${inputClass} mt-1.5`}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label htmlFor="loginPassword" className="text-sm font-semibold">
            Password
          </label>
          <input
            id="loginPassword"
            type="password"
            className={`${inputClass} mt-1.5`}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-teal-700 px-4 py-3.5 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {busy ? "Signing in..." : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New customer?{" "}
        <Link
          to="/register"
          state={location.state}
          className="font-semibold text-teal-700"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

/* ---------------- PROFILE ---------------- */

function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [gstin, setGstin] = useState(user?.gstin || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setMobile(user?.mobile || "");
    setGstin(user?.gstin || "");
  }, [user]);

  if (!user) {
    return <Navigate to="/register" replace state={{ from: "/profile" }} />;
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanedMobile = mobile.trim();
    const cleanedGstin = gstin.trim().toUpperCase();

    if (cleanedMobile && !/^[6-9]\d{9}$/.test(cleanedMobile)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (
      cleanedGstin &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(cleanedGstin)
    ) {
      setError("Enter a valid GSTIN or leave it blank.");
      return;
    }

    setBusy(true);

    try {
      const data = await request("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          mobile: cleanedMobile || null,
          gstin: cleanedGstin || null,
        }),
      });

      setUser(data.user);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to update profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[55vh] max-w-3xl px-5 py-10">
        <button
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-700"
        >
          <ArrowLeft size={16} /> Back to home
        </button>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-extrabold text-slate-900">
            My profile
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage your contact details.
          </p>

          {error && (
            <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="mt-5 rounded-xl bg-teal-50 p-3 text-sm text-teal-800">
              {success}
            </p>
          )}

          <form onSubmit={submit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="profileName" className="text-sm font-semibold">
                Full name
              </label>
              <input
                id="profileName"
                className={`${inputClass} mt-1.5`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="profileEmail" className="text-sm font-semibold">
                Email address
              </label>
              <input
                id="profileEmail"
                className={`${inputClass} mt-1.5 bg-slate-50`}
                value={user.email || ""}
                readOnly
              />
            </div>

            <div>
              <label htmlFor="profileMobile" className="text-sm font-semibold">
                Mobile number (optional)
              </label>
              <input
                id="profileMobile"
                type="tel"
                inputMode="numeric"
                className={`${inputClass} mt-1.5`}
                value={mobile}
                onChange={(event) =>
                  setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="Enter 10-digit mobile number"
              />
            </div>

            <div>
              <label htmlFor="profileGstin" className="text-sm font-semibold">
                GSTIN (optional)
              </label>
              <input
                id="profileGstin"
                className={`${inputClass} mt-1.5`}
                value={gstin}
                onChange={(event) =>
                  setGstin(event.target.value.toUpperCase().slice(0, 15))
                }
                placeholder="Enter GSTIN if applicable"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save profile"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

/* ---------------- ORDERS AND PRESCRIPTION PLACEHOLDERS ---------------- */

function OrdersPage() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/register" replace state={{ from: "/orders" }} />;
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[55vh] max-w-5xl px-5 py-10">
        <h1 className="text-3xl font-extrabold text-slate-900">Your orders</h1>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8">
          <ClipboardList size={34} className="text-teal-700" />
          <h2 className="mt-4 font-bold text-slate-900">No order history loaded</h2>
          <p className="mt-2 text-sm text-slate-500">
            Connect this page to your orders API to display real order history.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white"
          >
            Browse medicines
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

function PrescriptionPage() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <Navigate
        to="/register"
        replace
        state={{ from: "/prescriptions", message: "Sign in to continue." }}
      />
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[55vh] max-w-3xl px-5 py-10">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Prescription enquiry
        </h1>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <FileUp size={32} className="text-teal-700" />
          <p className="mt-4 text-slate-700">
            {location.state?.fileName
              ? `You selected: ${location.state.fileName}`
              : "Select your prescription from the homepage to begin."}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Secure upload and submission are not connected yet. No file has
            been sent to the server. This page must be connected to protected
            file storage and pharmacy review before use.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white"
          >
            Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

/* ---------------- ROUTING ---------------- */

function ProtectedAdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Checking admin access...</div>;
  }

  if (!user) {
    return <Navigate to="/admin" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function CustomerOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Checking access...</div>;
  }

  // Admin should never enter customer dashboard routes
  if (user?.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Customer routes require login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function AppRoutes() {
  const { authLoading } = useAuth();

  if (authLoading) return <PageLoader />;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />  
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/prescriptions" element={<PrescriptionPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/admin" element={<AdminLogin />} />
      

<Route element={<ProtectedAdminRoute />}>
<Route path="/admin/dashboard" element={<AdminDashboard />}>
  <Route index element={<AdminOverview />} />

  <Route
    path="orders"
    element={<AdminSection title="Orders" description="Manage medicine orders." />}
  />

  <Route
    path="order-customers"
    element={<AdminSection title="Order Customers" description="Manage customers linked to orders." />}
  />

  <Route
    path="prescriptions"
    element={<AdminSection title="Prescriptions" description="Review prescription submissions." />}
  />

  <Route
    path="manual-orders"
    element={<AdminSection title="Manual Orders" description="Create phone and email orders." />}
  />

  <Route
  path="products"
  element={<ProductsPage />}
/>

  <Route
    path="collections"
    element={<AdminSection title="Collections" description="Group medicines into collections." />}
  />

  <Route
    path="categories"
    element={<AdminSection title="Categories" description="Manage medicine categories." />}
  />

  <Route
    path="suppliers"
    element={<AdminSection title="Suppliers" description="Manage authorized suppliers." />}
  />

  <Route
    path="purchase-orders"
    element={<AdminSection title="Purchase Orders" description="Manage procurement." />}
  />

  <Route
    path="batches"
    element={<AdminSection title="Batch & Expiry" description="Manage batch and expiry details." />}
  />

  <Route
    path="customers"
    element={<AdminSection title="All Customers" description="View and manage customers." />}
  />

  <Route
    path="addresses"
    element={<AdminSection title="Customer Addresses" description="Manage delivery addresses." />}
  />

  <Route
    path="payments"
    element={<AdminSection title="Payments" description="Review payment transactions." />}
  />

  <Route
    path="invoices"
    element={<AdminSection title="Invoices" description="Manage invoices." />}
  />

  <Route
    path="refunds"
    element={<AdminSection title="Refunds" description="Manage refunds." />}
  />

  <Route
    path="reports/sales"
    element={<AdminSection title="Sales Reports" description="View sales reports." />}
  />

  <Route
    path="reports/products"
    element={<AdminSection title="Product Reports" description="View product reports." />}
  />

  <Route
    path="profile"
    element={<AdminSection title="Admin Profile" description="Manage administrator profile." />}
  />

  <Route
    path="settings"
    element={<AdminSection title="Store Settings" description="Manage store settings." />}
  />
</Route>
</Route>

    </Routes>
  );
}

/* ---------------- APP ENTRY ---------------- */

export default function App() {
  return (
    <BrowserRouter>
      <Providers>
        <AppRoutes />
      </Providers>
    </BrowserRouter>
  );
}


function AdminLogin() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user?.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (data.user?.role !== "admin") {
        // Do not leave a customer session active on the admin login page.
        try {
          await request("/auth/logout", { method: "POST" });
        } catch {
          // The role check below still prevents access to admin pages.
        }

        setUser(null);
        setError("Access denied. Admin credentials are required.");
        return;
      }

      setUser(data.user);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Invalid admin credentials.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-100 text-teal-800">
          <Pill size={29} />
        </div>

        <h1 className="mt-5 text-center text-2xl font-extrabold text-slate-900">
          GetYourMed Admin
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Sign in to manage the platform.
        </p>

        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={submit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="adminEmail" className="text-sm font-semibold">
              Admin email
            </label>
            <input
              id="adminEmail"
              type="email"
              autoComplete="username"
              className={`${inputClass} mt-1.5`}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="adminPassword" className="text-sm font-semibold">
              Password
            </label>
            <input
              id="adminPassword"
              type="password"
              autoComplete="current-password"
              className={`${inputClass} mt-1.5`}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-teal-800 px-4 py-3.5 font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
          >
            {busy ? "Verifying..." : "Sign in to Admin"}
          </button>
        </form>

        <Link
          to="/"
          className="mt-6 block text-center text-sm font-medium text-teal-700"
        >
          Return to GetYourMed
        </Link>
      </div>
    </main>
  );
}


function AdminDashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <Navigate to="/admin" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  async function logout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      navigate("/admin", { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      {/* LEFT SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 border-b px-6">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-100 text-2xl text-teal-800">
            ✚
          </div>

          <div>
            <h1 className="font-extrabold text-slate-900">
              GetYourMed
            </h1>
            <p className="text-xs text-teal-700">
              ADMIN PANEL
            </p>
          </div>
        </div>

        {/* Menu options */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          {adminMenu.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-xs font-bold tracking-wider text-slate-400">
                {section.title}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/admin/dashboard"}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                        isActive
                          ? "bg-teal-50 text-teal-800"
                          : "text-slate-600 hover:bg-slate-50"
                      }`
                    }
                  >
                    <span className="w-5 text-lg">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t p-4">
          <button
            onClick={logout}
            className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            ↪ Log out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="min-h-screen lg:pl-72">

        {/* TOP NAVBAR */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b bg-white px-5 sm:px-8">

          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border px-3 py-2 text-lg lg:hidden"
              aria-label="Open sidebar"
            >
              ☰
            </button>

            <div>
              <p className="text-xs text-slate-400">
                GetYourMed / Admin
              </p>
              <p className="font-bold text-slate-900">
                Management Panel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {user.name}
              </p>
              <p className="text-xs text-slate-500">
                Administrator
              </p>
            </div>

            <div className="grid h-10 w-10 place-items-center rounded-full bg-teal-100 font-bold text-teal-800">
              {user.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        <main className="p-5 sm:p-8">
          <Outlet />
        </main>

      </div>
    </div>
  );
}


function AdminOverview() {
  const stats = [
    { label: "Total Orders", value: "—" },
    { label: "Total Customers", value: "—" },
    { label: "Products", value: "—" },
    { label: "Pending Prescriptions", value: "—" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-slate-900">
        Dashboard
      </h1>

      <p className="mt-2 text-slate-500">
        Manage your medicine ordering platform.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border bg-white p-6 shadow-sm"
          >
            <p className="text-sm text-slate-500">
              {stat.label}
            </p>
            <p className="mt-4 text-3xl font-extrabold text-slate-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">
          Recent Orders
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Orders will appear here after connecting the orders API.
        </p>
      </div>
    </div>
  );
}

function AdminSection({ title, description }) {
  return (
    <div>
      <h1 className="text-3xl font-extrabold text-slate-900">
        {title}
      </h1>

      <p className="mt-2 text-slate-500">{description}</p>

      <div className="mt-8 rounded-2xl border bg-white p-8">
        <h2 className="text-lg font-bold">{title} management</h2>
        <p className="mt-2 text-sm text-slate-500">
          This section is ready for backend integration.
        </p>
      </div>
    </div>
  );
}
