'use client';
import { useEffect, useState } from "react";
import { getProducts, createProduct, updateProduct, deleteProduct, Product } from "@/lib/api";
import {
    Search, Trash2, Plus, X, UploadCloud, Loader2, Tag, ShoppingBag,
    Sparkles, DollarSign, FileText, Gift, Edit, Trash, ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

const CATEGORIES = ['Birthday', 'Anniversary', 'Family', 'Return Gift', 'Keychains', 'Frames'];

const PRESET_SIZES = [
    "A4 (8.3 x 11.7 inch)",
    "A3 (11.7 x 16.5 inch)",
    "6x8 inch",
    "8x10 inch",
    "12x12 inch",
    "12x18 inch",
    "16x20 inch",
    "20x24 inch",
    "Keychain (Standard)",
    "Keychain (Mini)"
];

interface ProductSize {
    name: string;
    extraPrice: number;
}

export default function ProductsPage() {
    const { data: session, status } = useSession();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    
    // Add/Edit Product Form State
    const [title, setTitle] = useState("");
    const [price, setPrice] = useState(""); // base purchase/selling price
    const [originalPrice, setOriginalPrice] = useState(""); // base strikethrough price
    const [category, setCategory] = useState("Birthday");
    const [productSize, setProductSize] = useState(""); // base/default size dropdown
    const [description, setDescription] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    
    // Multiple Images State
    const [existingUrls, setExistingUrls] = useState<string[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<{ file: File; preview: string }[]>([]);
    const allPreviews = [...existingUrls, ...uploadedFiles.map(f => f.preview)];

    // Sizes list
    const [sizes, setSizes] = useState<ProductSize[]>([]);

    const [submitting, setSubmitting] = useState(false);

    // Fetch Products
    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data } = await getProducts();
            setProducts(data);
        } catch {
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleMultipleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            const newUploaded = filesArray.map(file => ({
                file,
                preview: URL.createObjectURL(file)
            }));
            setUploadedFiles(prev => [...prev, ...newUploaded]);
        }
    };

    const removeExtraImage = (index: number) => {
        if (index < existingUrls.length) {
            setExistingUrls(prev => prev.filter((_, idx) => idx !== index));
        } else {
            const fileIndex = index - existingUrls.length;
            setUploadedFiles(prev => prev.filter((_, idx) => idx !== fileIndex));
        }
    };

    const addSizeField = () => {
        setSizes(prev => [...prev, { name: "", extraPrice: 0 }]);
    };

    const updateSizeField = (index: number, field: keyof ProductSize, value: any) => {
        setSizes(prev => prev.map((s, idx) => {
            if (idx === index) {
                return { ...s, [field]: value };
            }
            return s;
        }));
    };

    const removeSizeField = (index: number) => {
        setSizes(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleEditClick = (p: any) => {
        setEditingProduct(p);
        setTitle(p.title);
        setPrice(p.price ? p.price.replace(/[^\d]/g, '') : "");
        setOriginalPrice(p.originalPrice ? p.originalPrice.replace(/[^\d]/g, '') : "");
        setCategory(p.category);
        setProductSize(p.size || "");
        setDescription(p.description);
        
        // Setup image previews
        setImagePreview(p.image ? (p.image.startsWith('http') ? p.image : `${BACKEND_URL}${p.image}`) : null);
        setImageUrl(p.image ? (p.image.startsWith('http') ? p.image : "") : "");
        setImageFile(null);

        // Multiple images setup
        const imgList = p.images || (p.image ? [p.image] : []);
        setExistingUrls(imgList.map((url: string) => url.startsWith('http') ? url : `${BACKEND_URL}${url}`));
        setUploadedFiles([]);

        // Sizes setup
        setSizes(p.sizes || []);

        setShowAddModal(true);
    };

    const handleAddClick = () => {
        setEditingProduct(null);
        setTitle("");
        setPrice("");
        setOriginalPrice("");
        setCategory("Birthday");
        setProductSize("");
        setDescription("");
        setImagePreview(null);
        setImageUrl("");
        setImageFile(null);
        setExistingUrls([]);
        setUploadedFiles([]);
        setSizes([]);
        setShowAddModal(true);
    };

    const handleDelete = async (productId: string) => {
        if (!confirm("Are you sure you want to delete this product? It will be removed from storefront catalog.")) return;
        try {
            await deleteProduct(productId);
            toast.success("Product deleted successfully");
            setProducts(products.filter(p => p.productId !== productId));
        } catch {
            toast.error("Failed to delete product");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !price || !category || !description || !productSize) {
            toast.error("Please fill in all required fields");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('price', price);
            if (originalPrice) {
                formData.append('originalPrice', originalPrice);
            } else {
                formData.append('originalPrice', price); // If same or empty, default to sale price
            }
            formData.append('category', category);
            formData.append('size', productSize);
            formData.append('description', description);
            
            // Sizes list
            formData.append('sizes', JSON.stringify(sizes));

            // Main image
            if (imageFile) {
                formData.append('image', imageFile);
            } else if (imageUrl) {
                formData.append('imageUrl', imageUrl);
            }

            // Extra images
            if (uploadedFiles.length > 0) {
                uploadedFiles.forEach(item => {
                    formData.append('imageFiles', item.file);
                });
            }
            if (existingUrls.length > 0) {
                const cleanUrls = existingUrls.map(url => {
                    if (url.startsWith(BACKEND_URL)) {
                        return url.replace(BACKEND_URL, '');
                    }
                    return url;
                });
                formData.append('imageUrls', cleanUrls.join(','));
            } else {
                formData.append('imageUrls', '');
            }

            if (editingProduct) {
                await updateProduct(editingProduct.productId, formData);
                toast.success("Product updated successfully!");
            } else {
                await createProduct(formData);
                toast.success("Product created successfully!");
            }
            
            // Reset state
            handleAddClick();
            setShowAddModal(false);
            fetchProducts();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to submit product");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
    );

    // Helper to render discount tag
    const getDiscountPercentage = (sale: string, original?: string) => {
        if (!original) return null;
        const sNum = parseInt(sale.replace(/[^\d]/g, '')) || 0;
        const oNum = parseInt(original.replace(/[^\d]/g, '')) || 0;
        if (sNum <= 0 || oNum <= 0 || sNum >= oNum) return null;
        return Math.round(((oNum - sNum) / oNum) * 100);
    };

    return (
        <div className="max-w-6xl mx-auto relative px-4 sm:px-6 pb-20 sm:pb-32 pt-12 sm:pt-14">
            
            {/* Header Block */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-600">
                        STORE INVENTORY
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">
                        Manage products displaying in your customer storefront.
                    </p>
                </div>
                
                <button
                    onClick={handleAddClick}
                    className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[20px] font-bold text-sm tracking-tight transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                >
                    <Plus className="w-4 h-4" /> ADD NEW PRODUCT
                </button>
            </div>

            {/* Search Block */}
            <div className="relative mb-12 max-w-md mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all backdrop-blur-md text-white placeholder-zinc-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Products Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                        Products ({filteredProducts.length})
                    </h2>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-[380px] bg-zinc-900/40 border border-white/5 rounded-[32px] animate-pulse" />
                        ))}
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {filteredProducts.map((p: any) => {
                            const discount = getDiscountPercentage(p.price, p.originalPrice);
                            const productImages = p.images || (p.image ? [p.image] : []);
                            
                            return (
                                <motion.div
                                    key={p.productId}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-zinc-900/40 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-sm flex flex-col h-full hover:border-white/10 transition-all group"
                                >
                                    {/* Thumbnail Gallery Preview */}
                                    <div className="p-4 flex-shrink-0">
                                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-white/5 bg-zinc-950 flex items-center justify-center">
                                            <img
                                                src={p.image.startsWith('http') ? p.image : `${BACKEND_URL}${p.image}`}
                                                alt={p.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=800';
                                                }}
                                            />
                                            <div className="absolute top-3 left-3 px-3 py-1 bg-black/80 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-wider text-blue-400 border border-white/5">
                                                {p.category}
                                            </div>
                                            
                                            {/* Dynamic Price Display */}
                                            <div className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg">
                                                <span>{p.price}</span>
                                                {discount && (
                                                    <span className="text-[10px] line-through text-blue-200 font-bold">
                                                        {p.originalPrice}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Extra Images Indicator */}
                                            {productImages.length > 1 && (
                                                <div className="absolute bottom-3 left-3 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-lg text-[9px] font-bold text-zinc-300">
                                                    +{productImages.length - 1} Images
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="px-6 pb-6 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-white text-lg line-clamp-1 mb-2">{p.title}</h3>
                                            <p className="text-zinc-500 text-xs line-clamp-3 leading-relaxed mb-3">{p.description}</p>
                                            
                                            {/* Sizes list preview */}
                                            <div className="flex flex-wrap gap-1.5 mb-4">
                                                {p.size && (
                                                    <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md font-bold">
                                                        Base: {p.size}
                                                    </span>
                                                )}
                                                {p.sizes && p.sizes.map((s: ProductSize, idx: number) => (
                                                    <span key={idx} className="text-[9px] bg-white/5 border border-white/5 text-zinc-400 px-2 py-0.5 rounded-md">
                                                        {s.name} {s.extraPrice > 0 ? `(+₹${s.extraPrice})` : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="grid grid-cols-2 gap-3 mt-auto">
                                            <button
                                                onClick={() => handleEditClick(p)}
                                                className="flex items-center justify-center gap-1.5 py-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-blue-500/10"
                                            >
                                                <Edit className="w-3.5 h-3.5" /> EDIT
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p.productId)}
                                                className="flex items-center justify-center gap-1.5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/10"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> DELETE
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-zinc-900/10 border border-dashed border-white/5 rounded-[32px] p-6">
                        <ShoppingBag className="w-12 h-12 text-zinc-600 mb-4 animate-bounce" />
                        <h3 className="text-lg font-bold text-zinc-300">No products found</h3>
                        <p className="text-zinc-500 text-xs max-w-xs mt-1">
                            {search ? "No products match your current search query." : "Seed or upload products to fill up your dashboard gallery."}
                        </p>
                    </div>
                )}
            </div>

            {/* Add/Edit Product Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => {
                                setShowAddModal(false);
                                setEditingProduct(null);
                            }}
                        />
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#0b0b0b] border border-white/10 rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10 relative p-6 sm:p-8 shadow-[0_30px_70px_rgba(0,0,0,0.8)]"
                        >
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setEditingProduct(null);
                                }}
                                className="absolute right-6 top-6 p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-xl font-black tracking-tight text-white mb-6 uppercase flex items-center gap-2">
                                <Sparkles className="text-blue-500 w-5 h-5" /> {editingProduct ? "EDIT PRODUCT DETAILS" : "ADD NEW PRODUCT"}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Title */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Product Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Petite Memories Mini"
                                        className="w-full bg-zinc-900/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>

                                {/* Pricing Section (4 inputs for price, original price, size, category) */}
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                            Selling Price (₹)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            placeholder="e.g. 499"
                                            className="w-full bg-zinc-900/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-[46px]"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                            Original Price (Strikethrough ₹)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 999"
                                            className="w-full bg-zinc-900/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-[46px]"
                                            value={originalPrice}
                                            onChange={(e) => setOriginalPrice(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Size</label>
                                        <div className="relative">
                                            <select
                                                required
                                                className="w-full bg-zinc-900/40 border border-white/5 rounded-xl px-4 pr-10 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-[46px] appearance-none cursor-pointer placeholder-zinc-500"
                                                value={productSize}
                                                onChange={(e) => setProductSize(e.target.value)}
                                            >
                                                <option value="" disabled className="bg-zinc-950 text-white">Select Size...</option>
                                                {PRESET_SIZES.map(sz => (
                                                    <option key={sz} value={sz} className="bg-zinc-950 text-white">{sz}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Category</label>
                                        <div className="relative">
                                            <select
                                                className="w-full bg-zinc-900/40 border border-white/5 rounded-xl px-4 pr-10 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-[46px] appearance-none cursor-pointer placeholder-zinc-500"
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                            >
                                                {CATEGORIES.map(cat => (
                                                    <option key={cat} value={cat} className="bg-zinc-950 text-white">{cat}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Description</label>
                                    <textarea
                                        required
                                        placeholder="Detailed description of the materials, size options, and styling..."
                                        className="w-full bg-zinc-900/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-[100px] resize-none"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>

                                {/* Sizes Configuration */}
                                <div className="space-y-3 bg-zinc-950 p-4 rounded-2xl border border-white/5">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Available Sizes & Add-on Prices</span>
                                        <button
                                            type="button"
                                            onClick={addSizeField}
                                            className="flex items-center gap-1 text-[9px] font-black text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded-lg border border-blue-500/10"
                                        >
                                            <Plus className="w-3 h-3" /> ADD SIZE
                                        </button>
                                    </div>

                                    {sizes.length === 0 ? (
                                        <p className="text-[10px] text-zinc-600 italic">No sizes specified. The product will use base pricing.</p>
                                    ) : (
                                        <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                                            {sizes.map((s, idx) => {
                                                const isCustom = s.name !== "" && !PRESET_SIZES.includes(s.name);
                                                return (
                                                    <div key={idx} className="flex flex-col gap-2 bg-zinc-900/40 p-2.5 rounded-xl border border-white/5">
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                required
                                                                className="flex-1 bg-zinc-950 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                                value={isCustom ? "Custom..." : (s.name || "")}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === "Custom...") {
                                                                        updateSizeField(idx, 'name', "");
                                                                    } else {
                                                                        updateSizeField(idx, 'name', val);
                                                                    }
                                                                }}
                                                            >
                                                                <option value="" disabled>Select Size...</option>
                                                                {PRESET_SIZES.map(size => (
                                                                    <option key={size} value={size}>{size}</option>
                                                                ))}
                                                                <option value="Custom...">Custom...</option>
                                                            </select>
                                                            <input
                                                                type="number"
                                                                placeholder="Price (+₹)"
                                                                className="w-[100px] bg-zinc-950 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                                value={s.extraPrice || ""}
                                                                onChange={(e) => updateSizeField(idx, 'extraPrice', parseInt(e.target.value) || 0)}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeSizeField(idx)}
                                                                className="p-1.5 bg-red-500/10 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/20"
                                                            >
                                                                <Trash className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        {(isCustom || s.name === "") && (
                                                            <input
                                                                type="text"
                                                                placeholder="Enter custom size (e.g. 5x5 inch)"
                                                                required
                                                                className="w-full bg-zinc-950 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                                value={s.name}
                                                                onChange={(e) => updateSizeField(idx, 'name', e.target.value)}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Images Upload (Allows multiple images) */}
                                <div className="space-y-3 bg-zinc-950 p-4 rounded-2xl border border-white/5">
                                    <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">Product Images Gallery</span>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Upload Option */}
                                        <div className="relative border border-dashed border-white/10 rounded-xl hover:border-blue-500/30 transition-all p-4 flex flex-col items-center justify-center text-center group cursor-pointer bg-zinc-900/10">
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={handleMultipleFilesChange}
                                            />
                                            <UploadCloud className="w-8 h-8 text-zinc-500 mb-1 group-hover:text-blue-400 transition-colors" />
                                            <span className="text-[10px] font-bold text-zinc-400">Upload Images</span>
                                            <span className="text-[8px] text-zinc-600">You can select multiple files</span>
                                        </div>

                                        {/* URLs Option */}
                                        <div className="flex flex-col justify-center gap-1.5">
                                            <label className="text-[9px] font-bold text-zinc-500">Comma-separated image URLs</label>
                                            <input
                                                type="text"
                                                placeholder="http://example.com/1.jpg, http://example.com/2.jpg"
                                                className="w-full bg-zinc-900/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                                                value={existingUrls.join(', ')}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setExistingUrls(value.split(',').map(x => x.trim()).filter(Boolean));
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Gallery Preview Grid */}
                                    {allPreviews.length > 0 && (
                                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
                                            {allPreviews.map((url, idx) => (
                                                <div key={idx} className="relative rounded-xl overflow-hidden aspect-square border border-white/10">
                                                    <img src={url} alt="Gallery view" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeExtraImage(idx)}
                                                        className="absolute top-1 right-1 p-0.5 bg-black/70 hover:bg-black text-white rounded-full"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                                        editingProduct ? "UPDATE PRODUCT" : "CREATE PRODUCT"
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
