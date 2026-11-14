import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cake,
  Check,
  ClipboardList,
  ExternalLink,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquareHeart,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { buildWhatsAppUrl, formatINR } from '../lib/config';
import { uploadImageToStorage, validateImageFile } from '../lib/storageUpload';
import {
  ORDER_STATUS_SEQUENCE,
  type CakeCategory,
  type CustomCakeRequest,
  type CustomCakeStatus,
  type Order,
  type OrderStatus,
  type PaymentStatus,
  type Product,
} from '../types/bakery';

type AdminTab = 'overview' | 'orders' | 'products' | 'custom-cakes';

interface SummaryMetrics {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  totalProducts: number;
  availableProducts: number;
  openCustomRequests: number;
}

const CATEGORIES: CakeCategory[] = ['Chocolate', 'Signature Crunch', 'Fruit & Cream', 'Specials'];
const CUSTOM_STATUSES: CustomCakeStatus[] = ['New', 'Quoted', 'Accepted', 'Declined'];

export function AdminDashboardPage() {
  const { user, loading, isAdmin, adminChecking, signInWithGoogle, logout, getIdToken } =
    useAuth();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [dataLoading, setDataLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryMetrics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customRequests, setCustomRequests] = useState<CustomCakeRequest[]>([]);

  // Order filters & detail drawer
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderNotesDraft, setOrderNotesDraft] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  // Product modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCategory, setProdCategory] = useState<CakeCategory>('Chocolate');
  const [prodPrice500, setProdPrice500] = useState('449');
  const [prodPrice1kg, setProdPrice1kg] = useState('849');
  const [prodDiscount, setProdDiscount] = useState('10');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodAvailable, setProdAvailable] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Custom cake quotation modal
  const [selectedRequest, setSelectedRequest] = useState<CustomCakeRequest | null>(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteStatus, setQuoteStatus] = useState<CustomCakeStatus>('Quoted');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [savingQuote, setSavingQuote] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const adminFetch = useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated.');
      const res = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init?.headers || {}),
        },
      });
      const json = (await res.json()) as T & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }
      return json;
    },
    [getIdToken]
  );

  const loadAllAdminData = useCallback(async () => {
    if (!isAdmin) return;
    setDataLoading(true);
    setActionError(null);
    try {
      const [sumRes, ordRes, prodRes, ccRes] = await Promise.all([
        adminFetch<SummaryMetrics>('/api/admin/summary'),
        adminFetch<{ orders: Order[] }>('/api/admin/orders'),
        adminFetch<{ products: Product[] }>('/api/admin/products'),
        adminFetch<{ requests: CustomCakeRequest[] }>('/api/admin/custom-cakes'),
      ]);
      setSummary(sumRes);
      setOrders(ordRes.orders);
      setProducts(prodRes.products);
      setCustomRequests(ccRes.requests);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
    } finally {
      setDataLoading(false);
    }
  }, [isAdmin, adminFetch]);

  useEffect(() => {
    if (isAdmin) {
      void loadAllAdminData();
    }
  }, [isAdmin, loadAllAdminData]);

  const handleSeedProducts = async () => {
    setActionError(null);
    try {
      const res = await adminFetch<{ seededCount: number; products: Product[] }>(
        '/api/admin/seed-products',
        { method: 'POST' }
      );
      setProducts(res.products);
      showToast(
        res.seededCount > 0
          ? `Seeded ${res.seededCount} cakes into Firestore.`
          : 'All 10 initial cakes are already in Firestore.'
      );
      await loadAllAdminData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Seeding failed.');
    }
  };

  const handleUpdateOrder = async (
    orderId: string,
    updates: { status?: OrderStatus; paymentStatus?: PaymentStatus; adminNotes?: string }
  ) => {
    setSavingOrder(true);
    setActionError(null);
    try {
      const res = await adminFetch<{ order: Order }>(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setOrders((prev) => prev.map((o) => (o.orderId === orderId ? res.order : o)));
      if (selectedOrder?.orderId === orderId) {
        setSelectedOrder(res.order);
      }
      showToast(`Order ${orderId} updated.`);
      const sumRes = await adminFetch<SummaryMetrics>('/api/admin/summary');
      setSummary(sumRes);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update order.');
    } finally {
      setSavingOrder(false);
    }
  };

  const openCreateProductModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdCategory('Chocolate');
    setProdPrice500('449');
    setProdPrice1kg('849');
    setProdDiscount('10');
    setProdImageUrl('/assets/aistudio/c1_9ae462a4.jpg');
    setProdAvailable(true);
    setProductModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdDesc(product.description);
    setProdCategory(product.category);
    setProdPrice500(String(product.price500g));
    setProdPrice1kg(String(product.price1kg));
    setProdDiscount(String(product.discountPercent));
    setProdImageUrl(product.imageUrl);
    setProdAvailable(product.isAvailable);
    setProductModalOpen(true);
  };

  const handleUploadCakePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) {
      setActionError(err);
      return;
    }
    setUploadingImage(true);
    setActionError(null);
    try {
      const url = await uploadImageToStorage(file, 'cakes');
      setProdImageUrl(url);
      showToast('Cake photograph uploaded to Firebase Storage.');
    } catch (uploadErr) {
      setActionError(uploadErr instanceof Error ? uploadErr.message : 'Upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    setActionError(null);
    try {
      const payload = {
        name: prodName.trim(),
        description: prodDesc.trim(),
        category: prodCategory,
        price500g: Number(prodPrice500),
        price1kg: Number(prodPrice1kg),
        discountPercent: Number(prodDiscount),
        imageUrl: prodImageUrl.trim(),
        isAvailable: prodAvailable,
      };
      if (editingProduct) {
        const res = await adminFetch<{ product: Product }>(
          `/api/admin/products/${editingProduct.id}`,
          { method: 'PATCH', body: JSON.stringify(payload) }
        );
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? res.product : p)));
        showToast(`Updated ${res.product.name}.`);
      } else {
        const res = await adminFetch<{ product: Product }>('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setProducts((prev) => [...prev, res.product].sort((a, b) => a.name.localeCompare(b.name)));
        showToast(`Added ${res.product.name} to menu.`);
      }
      setProductModalOpen(false);
      await loadAllAdminData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save cake.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleProductAvailability = async (product: Product) => {
    try {
      const res = await adminFetch<{ product: Product }>(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: !product.isAvailable }),
      });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? res.product : p)));
      showToast(`${product.name} marked ${res.product.isAvailable ? 'Available' : 'Unavailable'}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to toggle availability.');
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      await adminFetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      showToast(`Deleted ${product.name} from catalog.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete cake.');
    }
  };

  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setSavingQuote(true);
    setActionError(null);
    try {
      const res = await adminFetch<{ request: CustomCakeRequest }>(
        `/api/admin/custom-cakes/${selectedRequest.requestId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: quoteStatus,
            quotedAmount: quoteAmount === '' ? undefined : Number(quoteAmount),
            adminNotes: quoteNotes,
          }),
        }
      );
      setCustomRequests((prev) =>
        prev.map((r) => (r.requestId === selectedRequest.requestId ? res.request : r))
      );
      setSelectedRequest(res.request);
      showToast(`Quotation saved for ${res.request.requestId}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save quotation.');
    } finally {
      setSavingQuote(false);
    }
  };

  if (loading || adminChecking) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#765447]" />
          <p className="text-sm text-[#765447]">Verifying bakery admin session...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="max-w-md mx-auto px-4 py-20">
        <div className="bg-white rounded-2xl border border-[#765447]/15 p-8 text-center space-y-5">
          <h1 className="font-display text-3xl font-semibold text-[#4A332B]">
            Muskan&rsquo;s Admin Dashboard
          </h1>
          <p className="text-sm text-[#765447]">
            Sign in with your authorized Google account to manage orders, cake prices, and custom
            cake requests.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="w-full py-3 px-5 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium hover:bg-[#5E4136] transition-colors cursor-pointer"
          >
            Sign in with Google
          </button>
          <Link to="/" className="block text-xs text-[#765447] hover:underline">
            Return to Customer Storefront
          </Link>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="max-w-lg mx-auto px-4 py-20">
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-red-700 mx-auto" />
          <h1 className="font-display text-3xl font-semibold text-[#4A332B]">
            Unauthorized Account
          </h1>
          <p className="text-sm text-[#765447]">
            Signed in as <strong>{user.email}</strong>, which is not listed as an authorized
            administrator for The Little Bakehouse. Customer accounts cannot access or promote
            themselves to the admin dashboard.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => void logout()}
              className="px-5 py-2.5 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium cursor-pointer"
            >
              Sign Out
            </button>
            <Link
              to="/"
              className="px-5 py-2.5 rounded-lg border border-[#765447]/25 text-sm font-medium text-[#4A332B]"
            >
              Back to Storefront
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'All' && o.status !== orderStatusFilter) return false;
    const q = orderSearch.trim().toLowerCase();
    if (
      q &&
      !o.orderId.toLowerCase().includes(q) &&
      !o.customerName.toLowerCase().includes(q) &&
      !o.phone.toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FFF5E9]/60 flex flex-col lg:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-[#765447]/15 p-5 flex flex-col justify-between gap-6 shrink-0">
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#9B4D3E] font-medium">
              Owner Console
            </p>
            <h1 className="font-display text-2xl font-semibold text-[#4A332B]">
              The Little Bakehouse
            </h1>
            <p className="text-xs text-[#765447] truncate mt-0.5">{user.email}</p>
          </div>

          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto">
            {[
              { id: 'overview' as AdminTab, label: 'Overview', icon: LayoutDashboard },
              { id: 'orders' as AdminTab, label: `Orders (${orders.length})`, icon: ClipboardList },
              { id: 'products' as AdminTab, label: `Cake Menu (${products.length})`, icon: Cake },
              {
                id: 'custom-cakes' as AdminTab,
                label: `Custom Requests (${customRequests.length})`,
                icon: MessageSquareHeart,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    tab === item.id
                      ? 'bg-[#765447] text-[#FFF5E9]'
                      : 'text-[#765447] hover:bg-[#FFF5E9] hover:text-[#4A332B]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex lg:flex-col gap-2 pt-4 border-t border-[#765447]/10">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#765447]/20 text-xs font-medium text-[#4A332B] hover:bg-[#FFF5E9]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Live Storefront</span>
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 p-5 sm:p-8 space-y-6 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-3xl font-semibold text-[#4A332B] capitalize">
            {tab === 'custom-cakes' ? 'Custom Cake Requests' : tab}
          </h2>
          <div className="flex items-center gap-3">
            {products.length < 10 && (
              <button
                type="button"
                onClick={() => void handleSeedProducts()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C99183] text-white text-xs font-medium hover:bg-[#B47A6C] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Seed Initial 10 Cakes to Firestore</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void loadAllAdminData()}
              disabled={dataLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#765447]/20 text-xs font-medium text-[#4A332B] hover:bg-[#FFF5E9] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {toast && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center justify-between">
            <span>{toast}</span>
            <button type="button" onClick={() => setToast(null)} className="cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 flex items-center justify-between">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} className="cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Orders', value: String(summary?.totalOrders ?? 0) },
                { label: 'Pending Action', value: String(summary?.pendingOrders ?? 0) },
                {
                  label: 'Active Revenue',
                  value: formatINR(summary?.totalRevenue ?? 0),
                },
                {
                  label: 'New Custom Requests',
                  value: String(summary?.openCustomRequests ?? 0),
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="bg-white rounded-xl border border-[#765447]/15 p-5 space-y-1"
                >
                  <p className="text-xs text-[#765447]">{kpi.label}</p>
                  <p className="font-mono-num text-2xl font-semibold text-[#4A332B]">
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-[#765447]/15 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-2xl font-semibold text-[#4A332B]">
                  Recent Incoming Orders
                </h3>
                <button
                  type="button"
                  onClick={() => setTab('orders')}
                  className="text-xs font-medium text-[#9B4D3E] hover:underline cursor-pointer"
                >
                  Manage All Orders
                </button>
              </div>
              {orders.length === 0 ? (
                <p className="text-sm text-[#765447] py-6">
                  No orders have been placed yet. Once customers check out, orders will appear here
                  in real time from Firestore.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-[#765447]/15 text-xs text-[#765447]">
                        <th className="py-2.5 pr-4">Order ID</th>
                        <th className="py-2.5 pr-4">Customer</th>
                        <th className="py-2.5 pr-4">Total</th>
                        <th className="py-2.5 pr-4">Status</th>
                        <th className="py-2.5">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#765447]/10">
                      {orders.slice(0, 5).map((ord) => (
                        <tr key={ord.orderId} className="hover:bg-[#FFF5E9]/50">
                          <td className="py-3 pr-4 font-mono-num font-medium">{ord.orderId}</td>
                          <td className="py-3 pr-4">
                            {ord.customerName} · <span className="font-mono-num">{ord.phone}</span>
                          </td>
                          <td className="py-3 pr-4 font-mono-num font-semibold">
                            {formatINR(ord.totalAmount)}
                          </td>
                          <td className="py-3 pr-4 font-medium text-[#765447]">{ord.status}</td>
                          <td className="py-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrder(ord);
                                setOrderNotesDraft(ord.adminNotes || '');
                                setTab('orders');
                              }}
                              className="text-xs font-medium text-[#9B4D3E] hover:underline cursor-pointer"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-1.5">
                {['All', ...ORDER_STATUS_SEQUENCE].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                      orderStatusFilter === st
                        ? 'bg-[#765447] text-[#FFF5E9]'
                        : 'bg-white border border-[#765447]/15 text-[#765447]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <label className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-[#765447] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search Order ID, name, or phone..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-[#765447]/20 text-sm"
                />
              </label>
            </div>

            <div className="bg-white rounded-xl border border-[#765447]/15 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#765447]/15 text-xs text-[#765447]">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#765447]/10">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[#765447]">
                        No orders match your current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr key={ord.orderId} className="hover:bg-[#FFF5E9]/40">
                        <td className="py-3 px-4 font-mono-num font-medium whitespace-nowrap">
                          {ord.orderId}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#4A332B]">{ord.customerName}</div>
                          <div className="text-xs font-mono-num text-[#765447]">{ord.phone}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#765447]">
                          {ord.items.map((i) => `${i.name} (${i.size}) ×${i.quantity}`).join(', ')}
                        </td>
                        <td className="py-3 px-4 font-mono-num font-semibold whitespace-nowrap">
                          {formatINR(ord.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-xs whitespace-nowrap">
                          {ord.paymentMethod} · {ord.paymentStatus}
                        </td>
                        <td className="py-3 px-4 font-medium whitespace-nowrap">{ord.status}</td>
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                          {ord.status === 'Pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleUpdateOrder(ord.orderId, { status: 'Confirmed' })
                                }
                                className="px-2.5 py-1 rounded bg-emerald-700 text-white text-xs cursor-pointer"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleUpdateOrder(ord.orderId, { status: 'Cancelled' })
                                }
                                className="px-2.5 py-1 rounded bg-red-700 text-white text-xs cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(ord);
                              setOrderNotesDraft(ord.adminNotes || '');
                            }}
                            className="px-2.5 py-1 rounded border border-[#765447]/25 text-xs text-[#4A332B] cursor-pointer"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {tab === 'products' && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <p className="text-sm text-[#765447]">
                Edit live cake prices, launch discounts, descriptions, photos, or availability.
              </p>
              <button
                type="button"
                onClick={openCreateProductModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium hover:bg-[#5E4136] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Cake</span>
              </button>
            </div>

            <div className="bg-white rounded-xl border border-[#765447]/15 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#765447]/15 text-xs text-[#765447]">
                    <th className="py-3 px-4">Cake</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">500g Base</th>
                    <th className="py-3 px-4">1kg Base</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Availability</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#765447]/10">
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-[#FFF5E9]/40">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-lg object-cover bg-[#FFF5E9]"
                          />
                          <div>
                            <div className="font-medium text-[#4A332B]">{prod.name}</div>
                            <div className="text-xs text-[#765447] line-clamp-1 max-w-xs">
                              {prod.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#765447] whitespace-nowrap">
                        {prod.category}
                      </td>
                      <td className="py-3 px-4 font-mono-num">{formatINR(prod.price500g)}</td>
                      <td className="py-3 px-4 font-mono-num">{formatINR(prod.price1kg)}</td>
                      <td className="py-3 px-4 font-mono-num">{prod.discountPercent}%</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => void handleToggleProductAvailability(prod)}
                          className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                            prod.isAvailable
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          {prod.isAvailable ? 'Available' : 'Unavailable'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditProductModal(prod)}
                          aria-label={`Edit ${prod.name}`}
                          className="p-1.5 rounded border border-[#765447]/20 text-[#4A332B] hover:bg-[#FFF5E9] cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteProduct(prod)}
                          aria-label={`Delete ${prod.name}`}
                          className="p-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CUSTOM CAKES TAB */}
        {tab === 'custom-cakes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {customRequests.length === 0 ? (
              <div className="md:col-span-2 bg-white rounded-xl border border-[#765447]/15 p-10 text-center text-sm text-[#765447]">
                No custom cake requests submitted yet.
              </div>
            ) : (
              customRequests.map((req) => (
                <div
                  key={req.requestId}
                  className="bg-white rounded-xl border border-[#765447]/15 p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono-num text-xs text-[#765447]">{req.requestId}</p>
                      <h3 className="font-display text-2xl font-semibold text-[#4A332B]">
                        {req.occasion} · {req.preferredFlavour}
                      </h3>
                      <p className="text-xs text-[#765447]">
                        {req.customerName} · <span className="font-mono-num">{req.phone}</span>
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#F6DDE2] text-[#4A332B]">
                      {req.status}
                    </span>
                  </div>

                  <p className="text-sm text-[#4A332B] leading-relaxed">{req.designDescription}</p>

                  <div className="text-xs text-[#765447] flex flex-wrap gap-4">
                    <span>Weight: {req.weight}</span>
                    <span>Delivery Date: {req.deliveryDate}</span>
                    {req.quotedAmount !== undefined && (
                      <span className="font-mono-num font-semibold text-[#4A332B]">
                        Quoted: {formatINR(req.quotedAmount)}
                      </span>
                    )}
                  </div>

                  {req.referenceImageUrl && (
                    <a
                      href={req.referenceImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={req.referenceImageUrl}
                        alt="Custom cake reference"
                        className="w-32 h-24 rounded-lg object-cover border border-[#765447]/15"
                      />
                    </a>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[#765447]/10">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequest(req);
                        setQuoteAmount(req.quotedAmount !== undefined ? String(req.quotedAmount) : '');
                        setQuoteStatus(req.status === 'New' ? 'Quoted' : req.status);
                        setQuoteNotes(req.adminNotes || '');
                      }}
                      className="px-4 py-2 rounded-lg bg-[#765447] text-[#FFF5E9] text-xs font-medium cursor-pointer"
                    >
                      Respond with Quotation
                    </button>
                    <a
                      href={buildWhatsAppUrl(
                        `Hello ${req.customerName}, thank you for your custom cake request (${req.requestId}) at The Little Bakehouse!${
                          req.quotedAmount
                            ? ` Your estimated quote for the ${req.weight} ${req.preferredFlavour} cake is ${formatINR(req.quotedAmount)}.`
                            : ''
                        }`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-[#256D4F] text-white text-xs font-medium"
                    >
                      WhatsApp Customer
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#4A332B]/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-[#765447]/15 pb-4">
              <div>
                <p className="font-mono-num text-xs text-[#765447]">{selectedOrder.orderId}</p>
                <h3 className="font-display text-3xl font-semibold text-[#4A332B]">
                  {selectedOrder.customerName}
                </h3>
                <p className="text-xs font-mono-num text-[#765447]">{selectedOrder.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-[#765447] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 text-sm">
              <p className="font-semibold text-[#4A332B]">Delivery / Pickup Address</p>
              <p className="text-[#765447]">{selectedOrder.address}</p>
              {selectedOrder.deliveryNotes && (
                <p className="text-xs text-[#765447]">Notes: {selectedOrder.deliveryNotes}</p>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-semibold text-[#4A332B]">Ordered Items</p>
              <ul className="divide-y divide-[#765447]/10 border-y border-[#765447]/10">
                {selectedOrder.items.map((item, idx) => (
                  <li key={idx} className="py-2.5 flex justify-between">
                    <div>
                      <span className="font-medium">
                        {item.name} ({item.size}) × {item.quantity}
                      </span>
                      {item.inscription && (
                        <p className="text-xs text-[#765447] italic">
                          Message: &ldquo;{item.inscription}&rdquo;
                        </p>
                      )}
                    </div>
                    <span className="font-mono-num">{formatINR(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between font-semibold text-base pt-1">
                <span>Total ({selectedOrder.paymentMethod})</span>
                <span className="font-mono-num">{formatINR(selectedOrder.totalAmount)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#4A332B]">Order Status</label>
                <select
                  value={selectedOrder.status}
                  disabled={savingOrder}
                  onChange={(e) =>
                    void handleUpdateOrder(selectedOrder.orderId, {
                      status: e.target.value as OrderStatus,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#765447]/25 text-sm"
                >
                  {ORDER_STATUS_SEQUENCE.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#4A332B]">
                  Payment Status
                </label>
                <select
                  value={selectedOrder.paymentStatus}
                  disabled={savingOrder}
                  onChange={(e) =>
                    void handleUpdateOrder(selectedOrder.orderId, {
                      paymentStatus: e.target.value as PaymentStatus,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#765447]/25 text-sm"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#4A332B]">
                Kitchen / Admin Notes
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={orderNotesDraft}
                  onChange={(e) => setOrderNotesDraft(e.target.value)}
                  placeholder="Optional internal note..."
                  className="flex-1 px-3 py-2 rounded-lg border border-[#765447]/25 text-sm"
                />
                <button
                  type="button"
                  disabled={savingOrder}
                  onClick={() =>
                    void handleUpdateOrder(selectedOrder.orderId, {
                      adminNotes: orderNotesDraft,
                    })
                  }
                  className="px-4 py-2 rounded-lg bg-[#765447] text-[#FFF5E9] text-xs font-medium cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Product Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#4A332B]/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#765447]/15 pb-3">
              <h3 className="font-display text-2xl font-semibold text-[#4A332B]">
                {editingProduct ? `Edit ${editingProduct.name}` : 'Add New Cake'}
              </h3>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="p-1 text-[#765447] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#4A332B]">Cake Name *</label>
              <input
                type="text"
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[#765447]/25 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#4A332B]">Description *</label>
              <textarea
                rows={3}
                required
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[#765447]/25 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#4A332B]">Category</label>
                <select
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value as CakeCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-[#765447]/25 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#4A332B]">
                  Launch Discount (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={prodDiscount}
                  onChange={(e) => setProdDiscount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#765447]/25 text-sm font-mono-num"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#4A332B]">
                  500g Base Price (INR)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={prodPrice500}
                  onChange={(e) => setProdPrice500(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#765447]/25 text-sm font-mono-num"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#4A332B]">
                  1kg Base Price (INR)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={prodPrice1kg}
                  onChange={(e) => setProdPrice1kg(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#765447]/25 text-sm font-mono-num"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#4A332B]">
                Cake Photograph (Upload to Firebase Storage or Image Path)
              </label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-dashed border-[#765447]/40 text-xs font-medium cursor-pointer hover:bg-[#FFF5E9]">
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4" />
                  )}
                  <span>{uploadingImage ? 'Uploading...' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleUploadCakePhoto}
                    className="sr-only"
                  />
                </label>
                {prodImageUrl && (
                  <img
                    src={prodImageUrl}
                    alt="Preview"
                    className="w-12 h-12 rounded-lg object-cover border border-[#765447]/20"
                  />
                )}
              </div>
              <input
                type="text"
                required
                value={prodImageUrl}
                onChange={(e) => setProdImageUrl(e.target.value)}
                placeholder="https://... or /assets/aistudio/..."
                className="w-full px-3 py-2 rounded-lg border border-[#765447]/20 text-xs"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-[#4A332B] cursor-pointer">
              <input
                type="checkbox"
                checked={prodAvailable}
                onChange={(e) => setProdAvailable(e.target.checked)}
                className="accent-[#765447]"
              />
              <span>Available for customer orders</span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#765447]/25 text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProduct}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium cursor-pointer"
              >
                {savingProduct ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{editingProduct ? 'Save Changes' : 'Create Cake'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Cake Quotation Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-[#4A332B]/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveQuotation}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#765447]/15 pb-3">
              <h3 className="font-display text-2xl font-semibold text-[#4A332B]">
                Quote {selectedRequest.requestId}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="p-1 text-[#765447] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#4A332B]">Status</label>
              <select
                value={quoteStatus}
                onChange={(e) => setQuoteStatus(e.target.value as CustomCakeStatus)}
                className="w-full px-3 py-2 rounded-lg border border-[#765447]/25 text-sm"
              >
                {CUSTOM_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#4A332B]">
                Quoted Price (INR)
              </label>
              <input
                type="number"
                min={0}
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                placeholder="e.g., 1450"
                className="w-full px-3 py-2 rounded-lg border border-[#765447]/25 text-sm font-mono-num"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#4A332B]">
                Quotation Notes
              </label>
              <textarea
                rows={3}
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                placeholder="Include tier details, lead time, or delivery fee..."
                className="w-full px-3 py-2 rounded-lg border border-[#765447]/25 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 rounded-lg border border-[#765447]/25 text-sm cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={savingQuote}
                className="px-5 py-2 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium cursor-pointer"
              >
                {savingQuote ? 'Saving...' : 'Save Quotation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
