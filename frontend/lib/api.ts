import axios from 'axios';

// Use environment variable or fallback to 127.0.0.1
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
});

export interface ARContent {
    _id: string;
    contentId: string;
    originalImageName: string;
    imagePath: string;
    videoPath: string;
    descriptorPath: string;
    createdAt: string;
    type: string;
    title?: string;
    text?: string;
    url?: string;
    metadata?: {
        keypointsCount: number;
        fileSize: number;
    };
    analytics?: {
        totalScans: number;
        countryScans: Record<string, number>;
        engagementTime?: number;
        ctaClicks?: number;
    };
}

// ── Step 2: Attached content types ──────────────────────────────────────

export interface AttachedContent {
    _id?: string;
    attachmentId: string;
    contentId: string;
    type: 'video' | 'audio' | 'image' | 'text' | 'pdf';
    url?: string | null;
    videoPath?: string | null;
    text?: string | null;
    title: string;
    order: number;
    createdAt: string;
}

export interface ScanResponse {
    matchFound: boolean;
    confidence: number;
    content?: ARContent;
    attachments: AttachedContent[];
    message: string;
}

export interface UploadContentResponse {
    message: string;
    contentId: string;
    videoUrl: string;
    imageUrl: string;
    descriptorUrl: string;
    isDuplicateSource?: boolean;
    duplicateOfContentId?: string | null;
    duplicateScore?: number;
}

// ── API functions ───────────────────────────────────────────────────────

export const getContentList = (email?: string) =>
    api.get<ARContent[]>('/contents', { params: { email } });
export const deleteContent = (id: string) => api.delete(`/content/${id}`);
export const uploadContent = (formData: FormData, onProgress: (progress: number) => void) => {
    return api.post<UploadContentResponse>('/upload', formData, {
        onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
            onProgress(progress);
        },
    });
};
export const updateContent = (id: string, formData: FormData) => {
    return api.put(`/content/${id}`, formData);
};

// Step 2: Attach multimedia content
export const attachContent = (formData: FormData) => {
    return api.post('/attach-content', formData);
};
export const getAttachedContents = (contentId: string) =>
    api.get<AttachedContent[]>(`/attached-contents/${contentId}`);
export const deleteAttachedContent = (attachmentId: string) =>
    api.delete(`/attached-content/${attachmentId}`);

// Step 3: Scan a frame
export const scanFrame = (formData: FormData) => {
    return api.post<ScanResponse>('/scan', formData);
};

export const getTargetDetails = (contentId: string) =>
    api.get<ARContent>(`/content/${contentId}`);

export const registerUser = (email: string, userId: string) =>
    api.post('/register-user', { email, userId });

// Products & Orders API Integration
export interface Product {
    productId: string;
    title: string;
    price: string;
    category: string;
    size?: string;
    sizes?: { name: string; extraPrice: number }[];
    description: string;
    image: string;
    createdAt: string;
}

export interface OrderItem {
    title: string;
    price: string;
    quantity: number;
    selectedSize?: string;
}

export interface Order {
    orderId: string;
    customerDetails: {
        name: string;
        contact: string;
        address: string;
        pincode: string;
        email?: string;
    };
    items: OrderItem[];
    total: string;
    arType: string;
    arText?: string;
    arLink?: string;
    framePhoto?: string;
    arFile?: string;
    status: string;
    createdAt: string;
}

export const getProducts = () => api.get<Product[]>('/products');
export const createProduct = (formData: FormData) => api.post('/products', formData);
export const updateProduct = (id: string, formData: FormData) => api.put(`/products/${id}`, formData);
export const deleteProduct = (id: string) => api.delete(`/products/${id}`);

export const getOrders = () => api.get<Order[]>('/orders');
export const updateOrder = (id: string, formData: FormData) => api.put(`/orders/${id}`, formData);
export const deleteOrder = (id: string) => api.delete(`/orders/${id}`);

export default api;
