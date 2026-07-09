'use client';
import { useEffect, useState } from "react";
import { getOrders, deleteOrder, updateOrder, Order } from "@/lib/api";
import {
    Search, Trash2, Calendar, User, Phone, MapPin, Receipt, ExternalLink,
    Download, Type, Video, Music, ImageIcon, FileText, Loader2, Sparkles, Edit, X, ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

const STATUS_OPTIONS = ["Pending", "Processing", "Shipped", "Completed", "Cancelled"];

const formatJustDate = (dateObj: Date) => {
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yy = String(dateObj.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
};

const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yy = String(date.getFullYear()).slice(-2);
        
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const strTime = `${hours}:${minutes}:${seconds} ${ampm}`;
        
        return `${dd}/${mm}/${yy}, ${strTime}`;
    } catch {
        return dateString;
    }
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterTab, setFilterTab] = useState("all");
    
    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [orderStatus, setOrderStatus] = useState("Pending");
    const [customerName, setCustomerName] = useState("");
    const [customerContact, setCustomerContact] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [customerPincode, setCustomerPincode] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data } = await getOrders();
            // Sort ascending (oldest first / FIFO) so first order is at the top
            const sorted = data.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            setOrders(sorted);
        } catch {
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleEditClick = (o: Order) => {
        setEditingOrder(o);
        setOrderStatus(o.status);
        setCustomerName(o.customerDetails.name);
        setCustomerContact(o.customerDetails.contact);
        setCustomerAddress(o.customerDetails.address);
        setCustomerPincode(o.customerDetails.pincode);
        setShowEditModal(true);
    };

    const handleUpdateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingOrder) return;

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('status', orderStatus);
            formData.append('customerName', customerName);
            formData.append('customerContact', customerContact);
            formData.append('customerAddress', customerAddress);
            formData.append('customerPincode', customerPincode);

            await updateOrder(editingOrder.orderId, formData);
            toast.success("Order updated successfully!");
            
            setShowEditModal(false);
            setEditingOrder(null);
            fetchOrders();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to update order");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (orderId: string) => {
        if (!confirm("Are you sure you want to delete/cancel this order? This action cannot be undone.")) return;
        try {
            await deleteOrder(orderId);
            toast.success("Order deleted successfully");
            setOrders(orders.filter(o => o.orderId !== orderId));
        } catch {
            toast.error("Failed to delete order");
        }
    };

    const getArIcon = (type: string) => {
        switch (type) {
            case 'text': return <Type className="w-4 h-4 text-yellow-400" />;
            case 'video': return <Video className="w-4 h-4 text-red-400" />;
            case 'audio': return <Music className="w-4 h-4 text-purple-400" />;
            case 'image': return <ImageIcon className="w-4 h-4 text-green-400" />;
            default: return <FileText className="w-4 h-4 text-orange-400" />;
        }
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch = 
            o.customerDetails.name.toLowerCase().includes(search.toLowerCase()) ||
            o.customerDetails.contact.toLowerCase().includes(search.toLowerCase()) ||
            o.orderId.toLowerCase().includes(search.toLowerCase());

        if (!matchesSearch) return false;

        if (filterTab === "pending") {
            return o.status.toLowerCase() === "pending";
        }

        if (filterTab.startsWith("daily-")) {
            const targetDateStr = filterTab.replace("daily-", "");
            return formatJustDate(new Date(o.createdAt)) === targetDateStr;
        }

        if (filterTab === "weekly") {
            const orderDate = new Date(o.createdAt);
            const now = new Date();
            return (now.getTime() - orderDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
        }

        if (filterTab === "monthly") {
            const orderDate = new Date(o.createdAt);
            const now = new Date();
            return (now.getTime() - orderDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
        }

        return true;
    });

    const getCountForTab = (tabId: string) => {
        return orders.filter(o => {
            if (tabId === "pending") {
                return o.status.toLowerCase() === "pending";
            }
            if (tabId.startsWith("daily-")) {
                const targetDateStr = tabId.replace("daily-", "");
                return formatJustDate(new Date(o.createdAt)) === targetDateStr;
            }
            if (tabId === "weekly") {
                const orderDate = new Date(o.createdAt);
                const now = new Date();
                return (now.getTime() - orderDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
            }
            if (tabId === "monthly") {
                const orderDate = new Date(o.createdAt);
                const now = new Date();
                return (now.getTime() - orderDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
            }
            return true;
        }).length;
    };

    // Get unique dates from all orders to show date-wise daily options
    const getUniqueDailyDates = () => {
        // Only return today's date so there is exactly 1 daily filter option
        return [formatJustDate(new Date())];
    };

    return (
        <div className="max-w-6xl mx-auto relative px-4 sm:px-6 pb-20 sm:pb-32 pt-12 sm:pt-14">
            
            {/* Header & Controls Block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/5">
                <div className="max-w-md">
                    <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-600">
                        CUSTOMER ORDERS
                    </h1>
                    <p className="text-zinc-500 text-xs mt-1">
                        View orders placed from the customer storefront and download custom frame assets.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto md:max-w-xl flex-1 justify-end">
                    {/* Search input */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all backdrop-blur-md text-white placeholder-zinc-500 h-[46px]"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {/* Filter Dropdown */}
                    <div className="relative min-w-[180px]">
                        <select
                            value={filterTab}
                            onChange={(e) => setFilterTab(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 pr-10 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-[46px] appearance-none cursor-pointer font-bold uppercase tracking-wider"
                        >
                            <option value="all" className="bg-zinc-950 text-white">All Orders ({getCountForTab("all")})</option>
                            <option value="pending" className="bg-zinc-950 text-white">Pending ({getCountForTab("pending")})</option>
                            {getUniqueDailyDates().map(dateStr => (
                                <option key={dateStr} value={`daily-${dateStr}`} className="bg-zinc-950 text-white">
                                    Daily - {dateStr} ({getCountForTab(`daily-${dateStr}`)})
                                </option>
                            ))}
                            <option value="weekly" className="bg-zinc-950 text-white">Weekly ({getCountForTab("weekly")})</option>
                            <option value="monthly" className="bg-zinc-950 text-white">Monthly ({getCountForTab("monthly")})</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Orders List */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                        Orders ({filteredOrders.length})
                    </h2>
                </div>

                {loading ? (
                    <div className="space-y-6">
                        {[1, 2].map(i => (
                            <div key={i} className="h-80 bg-zinc-900/40 border border-white/5 rounded-[32px] animate-pulse" />
                        ))}
                    </div>
                ) : filteredOrders.length > 0 ? (
                    <div className="space-y-6">
                        {filteredOrders.map((o) => (
                            <motion.div
                                key={o.orderId}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#0b0b0b]/60 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-sm p-6 sm:p-8 hover:border-white/10 transition-all group"
                            >
                                {/* Top Row */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6 mb-6">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-blue-500 tracking-wider">ORDER ID: {o.orderId.substring(0, 8).toUpperCase()}</span>
                                            <span className="px-2.5 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/10 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                {o.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500 font-medium">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatDate(o.createdAt)}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Paid</span>
                                            <span className="text-2xl font-black text-white">{o.total}</span>
                                        </div>
                                        
                                        <button
                                            onClick={() => handleEditClick(o)}
                                            className="p-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/10 rounded-2xl transition-all active:scale-95"
                                            title="Edit Order Details/Status"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={() => handleDelete(o.orderId)}
                                            className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/10 rounded-2xl transition-all active:scale-95"
                                            title="Delete Order"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Main Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {/* Customer & Address */}
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Customer Details</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-sm text-zinc-300">
                                                <User className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                                                <span className="font-bold">{o.customerDetails.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-zinc-300">
                                                <Phone className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                                                <span>{o.customerDetails.contact}</span>
                                            </div>
                                            <div className="flex items-start gap-3 text-sm text-zinc-300">
                                                <MapPin className="w-4 h-4 text-zinc-500 mt-1 flex-shrink-0" />
                                                <div>
                                                    <p className="leading-relaxed">{o.customerDetails.address}</p>
                                                    <p className="text-xs font-black text-zinc-500 mt-1">PIN: {o.customerDetails.pincode}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ordered Items</h4>
                                        <div className="space-y-3 bg-zinc-900/20 border border-white/5 rounded-2xl p-4">
                                            {o.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm gap-4">
                                                    <div>
                                                        <span className="block text-white font-bold line-clamp-1">{item.title}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-zinc-500 font-medium">Qty: {item.quantity}</span>
                                                            {item.selectedSize && (
                                                                <span className="text-xs text-zinc-400 font-medium bg-zinc-800/60 px-1.5 py-0.5 rounded-md">
                                                                    Size: {item.selectedSize}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-zinc-300 font-semibold flex-shrink-0">{item.price}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Assets & Files */}
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Custom Frame Assets</h4>
                                        <div className="space-y-3">
                                            {/* Custom Photo */}
                                            {o.framePhoto ? (
                                                <a
                                                    href={o.framePhoto.startsWith('http') ? o.framePhoto : `${BACKEND_URL}${o.framePhoto}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/10 rounded-2xl text-xs font-bold transition-all"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <ImageIcon className="w-4 h-4" /> Frame Image
                                                    </span>
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            ) : (
                                                <div className="p-3 bg-zinc-900/40 border border-white/5 rounded-2xl text-xs text-zinc-600 font-medium">
                                                    No frame image uploaded
                                                </div>
                                            )}

                                            {/* Hidden AR Content */}
                                            <div className="p-4 bg-zinc-900/20 border border-white/5 rounded-2xl space-y-3">
                                                <div className="flex items-center gap-2 text-xs text-zinc-400 font-black uppercase tracking-wider">
                                                    {getArIcon(o.arType)}
                                                    <span>AR Content ({o.arType})</span>
                                                </div>

                                                {o.arType === 'text' && o.arText && (
                                                    <p className="text-xs text-zinc-300 leading-relaxed bg-black/40 p-2.5 rounded-xl border border-white/5 italic">
                                                        "{o.arText}"
                                                    </p>
                                                )}

                                                {o.arLink && (
                                                    <a
                                                        href={o.arLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-between text-xs text-blue-400 hover:underline gap-2"
                                                    >
                                                        <span className="truncate">{o.arLink}</span>
                                                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                                    </a>
                                                )}

                                                {o.arFile && (
                                                    <a
                                                        href={o.arFile.startsWith('http') ? o.arFile : `${BACKEND_URL}${o.arFile}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-between p-2.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 hover:text-purple-300 border border-purple-500/10 rounded-xl text-[11px] font-bold transition-all w-full mt-2"
                                                    >
                                                        <span>Download Asset File</span>
                                                        <Download className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-zinc-900/10 border border-dashed border-white/5 rounded-[32px] p-6">
                        <Receipt className="w-12 h-12 text-zinc-600 mb-4 animate-bounce" />
                        <h3 className="text-lg font-bold text-zinc-300">No orders found</h3>
                        <p className="text-zinc-500 text-xs max-w-xs mt-1">
                            {search ? "No customer orders match your search parameters." : "Orders placed by customers on localhost:3000 will appear here."}
                        </p>
                    </div>
                )}
            </div>

            {/* Edit Order Modal */}
            <AnimatePresence>
                {showEditModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => {
                                setShowEditModal(false);
                                setEditingOrder(null);
                            }}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#0b0b0b] border border-white/10 rounded-[32px] w-full max-w-xl max-h-[90vh] overflow-y-auto z-10 relative p-6 sm:p-8 shadow-[0_30px_70px_rgba(0,0,0,0.8)]"
                        >
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingOrder(null);
                                }}
                                className="absolute right-6 top-6 p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-xl font-black tracking-tight text-white mb-6 uppercase flex items-center gap-2">
                                <Sparkles className="text-blue-500 w-5 h-5" /> EDIT ORDER DETAILS
                            </h3>

                            <form onSubmit={handleUpdateOrder} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Order Status</label>
                                    <select
                                        className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={orderStatus}
                                        onChange={(e) => setOrderStatus(e.target.value)}
                                    >
                                        {STATUS_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Customer Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-zinc-900/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Contact Number</label>
                                        <input
                                            type="tel"
                                            required
                                            className="w-full bg-zinc-900/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            value={customerContact}
                                            onChange={(e) => setCustomerContact(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Pincode</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-zinc-900/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            value={customerPincode}
                                            onChange={(e) => setCustomerPincode(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Shipping Address</label>
                                    <textarea
                                        required
                                        rows={3}
                                        className="w-full bg-zinc-900/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                        value={customerAddress}
                                        onChange={(e) => setCustomerAddress(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[20px] font-bold text-sm uppercase tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> SUBMITTING...
                                        </>
                                    ) : (
                                        "UPDATE ORDER"
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
