import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { 
  Folder, 
  RefreshCcw, 
  Trash2, 
  Cookie, 
  Save, 
  Info, 
  Cpu, 
  HardDrive,
  History,
  ShoppingBag,
  CreditCard,
  User,
  LogOut,
  Mail,
  ExternalLink,
  Code2,
  Plus,
  ChevronLeft,
  Coins,
  Wallet,
  Banknote,
  CheckCircle2,
  Download,
  Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TOKEN_PLANS = [
  {
    id: "mini",
    name: "Mini Pack",
    tokens: "5.000",
    price: "Rp 15.000",
    popular: false,
    color: "bg-blue-500",
  },
  {
    id: "pro",
    name: "Pro Pack",
    tokens: "20.000",
    originalPrice: "Rp 60.000",
    price: "Rp 50.000",
    popular: true,
    color: "bg-orange-500",
    discount: "Save 15%",
  },
  {
    id: "whale",
    name: "Whale Pack",
    tokens: "50.000",
    originalPrice: "Rp 150.000",
    price: "Rp 100.000",
    popular: false,
    color: "bg-purple-500",
    discount: "Save 33%",
  }
];

const PAYMENT_METHODS = [
  { id: "qris", name: "QRIS", icon: <Code2 className="w-5 h-5" /> },
  { id: "gopay", name: "GoPay", icon: <Wallet className="w-5 h-5" /> },
  { id: "bank", name: "Bank Transfer", icon: <Banknote className="w-5 h-5" /> },
];

const ORDERS = [
  {
    id: "#5475",
    product: "Claude Pro - 1 Bulan",
    qty: 1,
    date: "17 April 2026",
    status: "Completed",
    price: 119000,
    admin: 5950,
    surcharge: 1583,
    total: 126533,
    paymentMethod: "QRIS",
    refNo: "T694232610007KYIXX",
    expiry: "17 April 2026 12:35 WIB"
  },
  {
    id: "#5321",
    product: "Token Refill - 50k",
    qty: 1,
    date: "12 April 2026",
    status: "Completed",
    price: 45000,
    admin: 2500,
    surcharge: 2500,
    total: 50000,
    paymentMethod: "GoPay",
    refNo: "G881234567890GPXXX",
    expiry: "12 April 2026 14:00 WIB"
  }
];

type StorageEntry = {
  id: string;
  kind: "project" | "clip_job";
  label: string;
  sizeLabel: string;
  modifiedAt: string;
};

export function SettingsView({ onLogout }: { onLogout?: () => void }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<typeof ORDERS[0] | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [userName, setUserName] = useState("Defajar17");
  const [userEmail, setUserEmail] = useState("defajar17@gmail.com");
  const [storageTotal, setStorageTotal] = useState("0 B");
  const [storageEntries, setStorageEntries] = useState<StorageEntry[]>([]);
  const [storageLoading, setStorageLoading] = useState(true);
  const [storageBusy, setStorageBusy] = useState<string | null>(null);

  const loadStorage = async () => {
    setStorageLoading(true);
    try {
      const res = await fetch("/api/storage");
      const data = await res.json();
      if (res.ok) {
        setStorageTotal(data.totalLabel || "0 B");
        setStorageEntries(Array.isArray(data.entries) ? data.entries : []);
      }
    } catch {
      setStorageEntries([]);
      setStorageTotal("0 B");
    } finally {
      setStorageLoading(false);
    }
  };

  useEffect(() => {
    const storedName = localStorage.getItem("dis_auth_name");
    const storedEmail = localStorage.getItem("dis_auth_email");
    if (storedName) setUserName(storedName);
    if (storedEmail) setUserEmail(storedEmail);
    void loadStorage();
  }, []);

  const handleDeleteEntry = async (entry: StorageEntry) => {
    setStorageBusy(entry.id);
    try {
      await fetch(`/api/storage/${entry.kind}/${encodeURIComponent(entry.id)}`, {
        method: "DELETE",
      });
      await loadStorage();
    } finally {
      setStorageBusy(null);
    }
  };

  const handlePurgeAll = async () => {
    if (!confirm("Delete all cached projects and clip jobs? This cannot be undone.")) return;
    setStorageBusy("purge");
    try {
      await fetch("/api/storage/purge", { method: "POST" });
      await loadStorage();
    } finally {
      setStorageBusy(null);
    }
  };

  const handleDownloadReceipt = async () => {
    const element = document.getElementById("receipt-pdf-content");
    if (!element) return;
    
    try {
      setIsDownloading(true);
      // Wait for font loading and rendering frames
      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = await toPng(element, { 
        backgroundColor: "#050505",
        pixelRatio: 2,
        width: 900,
        style: {
          transform: 'none',
          width: '900px',
          margin: '0',
          left: '0',
          top: '0',
        }
      });
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      // Calculate perfect height based on desktop width aspect ratio
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (img.height * pdfWidth) / img.width;
      
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: [pdfWidth, pdfHeight]
      });
      
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${selectedOrder?.id?.replace("#", "") || "Invoice"}.pdf`);
    } catch (error) {
      console.error("Error generating receipt PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (selectedOrder) {
    // Define the receipt PDF layout
    const receiptPdfContent = selectedOrder ? (
      <div 
        className="fixed top-0 left-0 pointer-events-none" 
        style={{ zIndex: -9999, opacity: 0.01, width: "700px" }}
      >
        <div 
          id="receipt-pdf-content" 
          className="p-12 flex flex-col gap-10 bg-[#050505] text-white rounded-[32px] border border-white/10" 
          style={{ width: "700px" }}
        >
          <div className="flex flex-col gap-4 pb-8 border-b border-white/5">
            <Receipt className="w-16 h-16 text-emerald-400 opacity-20 mb-4" />
            <p className="text-white/60 text-lg font-medium tracking-tight leading-relaxed">
              Order with ID <span className="text-white font-black">{selectedOrder.id}</span> created on <span className="text-white font-bold">{selectedOrder.date}</span> and current status is <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-md font-bold uppercase text-[12px] tracking-widest ml-1 inline-block border border-emerald-500/20">{selectedOrder.status}</span>.
            </p>
          </div>

          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-black text-white/20 uppercase tracking-[0.2em]">Payment Method</p>
                <p className="text-xl font-bold text-white tracking-tight">{selectedOrder.paymentMethod}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-xs font-black text-white/20 uppercase tracking-[0.2em]">Reference No.</p>
                <p className="text-xl font-mono font-bold text-cyan-400 tracking-tight break-all">{selectedOrder.refNo}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-xs font-black text-white/20 uppercase tracking-[0.2em]">Payment Time</p>
                <p className="text-xl font-bold text-white/60 tracking-tight">{selectedOrder.expiry}</p>
              </div>
            </div>

            <div className="flex flex-col gap-8 bg-white/[0.02] border border-white/5 p-8 rounded-[32px] relative overflow-hidden mt-4">
              <h3 className="text-2xl font-black text-white tracking-tighter">Details</h3>
              
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start text-base font-medium text-white/60 gap-4">
                  <span className="shrink">{selectedOrder.product} x {selectedOrder.qty}</span>
                  <span className="text-white font-bold font-mono shrink-0">Rp {selectedOrder.price.toLocaleString('id-ID')}</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex justify-between items-center text-base">
                  <span className="text-white/40 font-bold uppercase tracking-widest text-[12px]">Subtotal</span>
                  <span className="text-white/80 font-bold font-mono">Rp {selectedOrder.price.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-base">
                  <span className="text-white/40 font-bold uppercase tracking-widest text-[12px]">Admin</span>
                  <span className="text-white/80 font-bold font-mono">Rp {selectedOrder.admin.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-base">
                  <span className="text-white/40 font-bold uppercase tracking-widest text-[12px]">Surcharge</span>
                  <span className="text-white/80 font-bold font-mono">Rp {selectedOrder.surcharge.toLocaleString('id-ID')}</span>
                </div>
                <div className="h-px bg-white/10 mt-2" />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xl font-black text-white uppercase tracking-widest">Total</span>
                  <span className="text-3xl font-black text-emerald-400 font-mono">Rp {selectedOrder.total.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 flex flex-col gap-6">
                 <div className="flex justify-between items-center">
                   <span className="text-[12px] font-black text-white/20 uppercase tracking-[0.2em]">Payment Method</span>
                   <span className="text-sm font-bold text-white uppercase tracking-wider">{selectedOrder.paymentMethod}</span>
                 </div>
                 <div className="flex flex-col gap-2">
                   <span className="text-[12px] font-black text-white/20 uppercase tracking-[0.2em]">Note</span>
                   <p className="text-[14px] text-white/40 font-medium leading-relaxed">
                     Payment was made via <span className="text-white/60">TriPay</span> with Reference No. <span className="text-cyan-400/60 font-mono break-all">{selectedOrder.refNo}</span>
                   </p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null;

    return (
      <div className="w-full max-w-[900px] mx-auto px-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col gap-10 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-6">
              <Button 
                variant="ghost" 
                onClick={() => setSelectedOrder(null)}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-white shrink-0"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
              <div className="flex flex-col gap-0.5 sm:gap-1">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-white">Order Details</h1>
                <p className="text-white/40 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em]">{selectedOrder.id} • {selectedOrder.date}</p>
              </div>
            </div>
            <Button onClick={handleDownloadReceipt} disabled={isDownloading} className="h-11 sm:h-12 px-4 sm:px-8 rounded-xl sm:rounded-2xl bg-white text-black font-black text-[11px] sm:text-[12px] tracking-widest uppercase shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 w-full sm:w-auto justify-center">
              <Download className="w-4 h-4" />
              <span className="inline">{isDownloading ? "Generating..." : "Download Receipt"}</span>
            </Button>
          </div>

          <div id="receipt-content" className="ios-squircle glass-panel p-6 sm:p-8 md:p-12 flex flex-col gap-8 sm:gap-10">
            <div className="flex flex-col gap-2 pb-6 sm:pb-8 border-b border-white/5">
              <p className="text-white/60 text-sm sm:text-base font-medium tracking-tight leading-relaxed">
                Order with ID <span className="text-white font-black">{selectedOrder.id}</span> created on <span className="text-white font-bold">{selectedOrder.date}</span> and current status is <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md font-bold uppercase text-[9px] sm:text-[10px] tracking-widest ml-1 inline-block border border-emerald-500/20">{selectedOrder.status}</span>.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
              <div className="flex flex-col gap-6 sm:gap-8">
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Payment Method</p>
                  <p className="text-base sm:text-lg font-bold text-white tracking-tight">{selectedOrder.paymentMethod}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Reference No.</p>
                  <p className="text-base sm:text-lg font-mono font-bold text-cyan-400 tracking-tight break-all">{selectedOrder.refNo}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Payment Time</p>
                  <p className="text-base sm:text-lg font-bold text-white/60 tracking-tight">{selectedOrder.expiry}</p>
                </div>
              </div>

              <div className="flex flex-col gap-6 sm:gap-8 bg-white/[0.02] border border-white/5 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] relative overflow-hidden">
                <Receipt className="absolute -top-4 -right-4 w-20 sm:w-24 h-20 sm:h-24 text-white opacity-[0.02] -rotate-12 pointer-events-none" />
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tighter">Details</h3>
                
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex justify-between items-start text-[13px] sm:text-sm font-medium text-white/60 gap-4">
                    <span className="shrink">{selectedOrder.product} x {selectedOrder.qty}</span>
                    <span className="text-white font-bold font-mono shrink-0">Rp {selectedOrder.price.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between items-center text-[13px] sm:text-sm">
                    <span className="text-white/40 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">Subtotal</span>
                    <span className="text-white/80 font-bold font-mono">Rp {selectedOrder.price.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px] sm:text-sm">
                    <span className="text-white/40 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">Admin</span>
                    <span className="text-white/80 font-bold font-mono">Rp {selectedOrder.admin.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px] sm:text-sm">
                    <span className="text-white/40 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">Surcharge</span>
                    <span className="text-white/80 font-bold font-mono">Rp {selectedOrder.surcharge.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="h-px bg-white/10 mt-2" />
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm sm:text-base font-black text-white uppercase tracking-widest">Total</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">Rp {selectedOrder.total.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="mt-4 pt-6 border-t border-white/5 flex flex-col gap-4">
                   <div className="flex justify-between items-center">
                     <span className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Payment Method</span>
                     <span className="text-[10px] sm:text-[11px] font-bold text-white uppercase tracking-wider">{selectedOrder.paymentMethod}</span>
                   </div>
                   <div className="flex flex-col gap-1.5 sm:gap-2">
                     <span className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Note</span>
                     <p className="text-[11px] sm:text-[12px] text-white/40 font-medium leading-relaxed">
                       Payment was made via <span className="text-white/60">TriPay</span> with Reference No. <span className="text-cyan-400/60 font-mono break-all">{selectedOrder.refNo}</span>
                     </p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {typeof document !== 'undefined' && createPortal(receiptPdfContent, document.body)}
      </div>
    );
  }
  if (showPurchase) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 pb-20">
        <div className="flex flex-col gap-12 pt-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <Button 
              variant="ghost" 
              onClick={() => setShowPurchase(false)}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-white shrink-0"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tighter text-white">Purchase Tokens</h1>
              <p className="text-white/40 text-[9px] sm:text-sm font-medium uppercase tracking-[0.1em] sm:tracking-[0.2em]">Select your package and payment method</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TOKEN_PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative ios-squircle glass-panel p-5 sm:p-6 md:p-8 flex flex-col gap-5 md:gap-8 text-left transition-all duration-500 group ${
                  selectedPlan === plan.id ? "border-white/40 scale-[1.02] bg-white/[0.06]" : "hover:border-white/20"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-black text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full shadow-2xl z-20">
                    Most Popular
                  </div>
                )}

                {plan.discount && (
                  <div className="absolute top-6 left-6 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full z-10 transition-transform group-hover:scale-105 pointer-events-none">
                    {plan.discount}
                  </div>
                )}
                
                <div className="flex items-center justify-between pointer-events-none mt-6 sm:mt-2">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shadow-xl ${plan.color}/20 border ${plan.color}/30`}>
                    <Coins className={`w-5 h-5 md:w-6 md:h-6 text-white`} />
                  </div>
                  {selectedPlan === plan.id ? (
                    <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-emerald-400 opacity-100" />
                  ) : (
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-white/10" />
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="text-lg md:text-xl lg:text-2xl font-black text-white tracking-tight leading-tight">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-2xl sm:text-3xl md:text-4xl font-black text-white">{plan.tokens}</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Tokens</span>
                  </div>
                </div>

                <div className="pt-2 mt-auto">
                  <div className="flex flex-col gap-1">
                    {plan.originalPrice && (
                      <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.15em] line-through decoration-white/40">
                        {plan.originalPrice}
                      </span>
                    )}
                    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                      <span className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">{plan.price}</span>
                      {plan.discount && (
                        <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-emerald-500 text-black text-[9px] md:text-[10px] font-black uppercase tracking-tighter rounded-[4px] shadow-[0_4px_15px_rgba(16,185,129,0.3)] shrink-0">
                          {plan.discount.replace('Save ', '-')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[9px] md:text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-2">One-time payment</div>
                </div>
              </button>
            ))}
          </div>

          {/* Token Usage Explanation Card */}
          <div className="ios-squircle glass-panel p-5 sm:p-6 md:p-9 flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6 md:gap-8 relative overflow-hidden group">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl shrink-0">
               <Info className="w-6 h-6 sm:w-8 sm:h-8 text-white/30" />
            </div>
            <div className="flex flex-col gap-1 text-center md:text-left overflow-hidden">
               <h3 className="text-xl font-black text-white tracking-tight truncate">Token Usage Information</h3>
               <p className="text-white/40 text-[13px] md:text-sm font-medium leading-relaxed max-w-full whitespace-normal">
                 Every time you run an <span className="text-white font-black">AI Video Generation</span> (including clipping, auto-subtitle, and reframing), the system will deduct <span className="text-emerald-400 font-bold">1 Token</span> per successfully processed video.
               </p>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-2 text-white/30">
              <CreditCard className="w-4 h-4" />
              <span className="text-[11px] font-black uppercase tracking-[0.3em]">Payment Method</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={`flex items-center gap-3 sm:gap-4 p-4 md:p-6 ios-squircle glass-panel transition-all duration-500 ${
                    selectedPayment === method.id ? "bg-white/[0.08] border-white/30" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                    selectedPayment === method.id ? "bg-white/10 border-white/20" : "bg-white/5 border-white/5"
                  }`}>
                    {method.icon}
                  </div>
                  <span className={`text-xs md:text-sm font-bold tracking-tight truncate ${selectedPayment === method.id ? "text-white" : "text-white/40"}`}>
                    {method.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Button 
            disabled={!selectedPlan || !selectedPayment}
            className="w-full h-20 rounded-3xl bg-white text-black font-black text-lg tracking-widest uppercase shadow-[0_20px_80px_rgba(255,255,255,0.15)] hover:scale-[0.99] active:scale-[0.95] disabled:opacity-20 disabled:grayscale transition-all mt-8"
          >
            Checkout Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col gap-12 pt-4">
        
        {/* Header Section */}
        <div className="flex flex-col gap-2">
           <h1 className="text-5xl font-extrabold tracking-tight text-white">Settings</h1>
           <p className="text-white/40 text-lg font-medium tracking-tight">Configure your storage and environment for peak performance.</p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-12 gap-6">
           
           {/* Card 1: User Profile */}
           <div className="col-span-12 lg:col-span-7 ios-squircle glass-panel p-6 sm:p-9 flex flex-col gap-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity duration-1000">
                 <User size={240} />
              </div>
              
              <div className="flex items-center gap-2 text-white/30">
                 <User className="w-4 h-4" />
                 <span className="text-[11px] font-black uppercase tracking-[0.3em]">Account Profile</span>
              </div>
              
              <div className="flex flex-col gap-6">
               <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center relative shadow-2xl shrink-0">
                     <User className="w-8 h-8 sm:w-10 sm:h-10 text-white/20" />
                     <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-500 rounded-full border-[3px] sm:border-4 border-[#0a0a0a] animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-1 items-center sm:items-start text-center sm:text-left">
                     <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter truncate max-w-[200px] sm:max-w-[300px]">{userName}</h2>
                     <div className="flex flex-col sm:flex-row items-center gap-2 text-white/40 font-bold text-xs sm:text-sm tracking-tight">
                        <span className="flex items-center gap-1.5 whitespace-nowrap"><Mail className="w-3 h-3" /> {userEmail}</span>
                        <span className="hidden sm:block w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-emerald-400/60 uppercase text-[9px] sm:text-[10px] font-black tracking-[0.2em] mt-1 sm:mt-0">Verified</span>
                     </div>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Button variant="outline" className="h-11 sm:h-12 rounded-2xl bg-white/5 border-white/10 text-white font-bold text-[11px] sm:text-[12px] tracking-widest uppercase hover:bg-white/10 transition-all flex items-center justify-center gap-2 px-6">
                     Change Password
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onLogout}
                    className="h-11 sm:h-12 rounded-2xl bg-white/5 border-red-500/10 text-red-400/60 font-bold text-[11px] sm:text-[12px] tracking-widest uppercase hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center justify-center gap-2 px-6"
                  >
                     <LogOut className="w-3 h-3" />
                     Sign Out
                  </Button>
               </div>
              </div>
           </div>

           {/* Card 2: Cache Management */}
           <div className="col-span-12 lg:col-span-5 ios-squircle glass-panel p-6 sm:p-9 flex flex-col gap-6 sm:gap-8">
              <div className="flex items-center gap-2 text-white/30">
                 <RefreshCcw className="w-4 h-4" />
                 <span className="text-[11px] font-black uppercase tracking-[0.3em]">Storage Management</span>
              </div>

              <div className="flex flex-col gap-2">
                 <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest leading-none">Total cached data</p>
                 <div className="text-5xl font-extrabold text-white tracking-tighter">
                   {storageLoading ? "…" : storageTotal}
                 </div>
              </div>

              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                {storageEntries.length === 0 && !storageLoading && (
                  <p className="text-white/30 text-xs">No cached folders on disk.</p>
                )}
                {storageEntries.map((entry) => (
                  <div
                    key={`${entry.kind}-${entry.id}`}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-xs font-bold truncate">{entry.label}</p>
                      <p className="text-white/30 text-[10px] font-mono">
                        {entry.sizeLabel} · {new Date(entry.modifiedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={storageBusy === entry.id}
                      onClick={() => handleDeleteEntry(entry)}
                      className="h-8 px-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 shrink-0"
                    >
                      {storageBusy === entry.id ? "…" : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={handlePurgeAll}
                disabled={storageBusy === "purge" || storageEntries.length === 0}
                className="w-full h-14 rounded-2xl bg-white/5 border border-white/5 text-red-400/80 font-bold text-[13px] tracking-tight hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all flex items-center gap-2 group"
              >
                 <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                 {storageBusy === "purge" ? "Purging…" : "Purge all cache"}
              </Button>
           </div>           {/* Card 3: Token Purchase Log (Replacing YouTube Authentication) */}
           <div className="col-span-12 ios-squircle glass-panel p-4 sm:p-6 md:p-7 lg:p-9 flex flex-col gap-4 sm:gap-8 relative overflow-hidden group border border-white/5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                 <div className="flex items-center gap-2 text-white/30">
                    <History className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em]">Purchase Log</span>
                 </div>
                 <Button 
                   onClick={() => setShowPurchase(true)}
                   className="h-10 sm:h-12 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-white text-black font-black text-[10px] md:text-[11px] tracking-widest uppercase shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                 >
                   <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                   Add Token
                 </Button>
              </div>

              <div className="w-full overflow-x-auto pb-2">
                <table className="w-full text-left border-collapse min-w-[280px]">
                  <thead>
                    <tr className="text-[8px] md:text-[10px] lg:text-[11px] font-bold text-white/20 uppercase tracking-widest border-b border-white/5">
                      <th className="pb-3 md:pb-6 font-black w-10 sm:w-20 pl-2">ID</th>
                      <th className="pb-3 md:pb-6 font-black">Product</th>
                      <th className="pb-3 md:pb-6 font-black hidden md:table-cell">Date</th>
                      <th className="pb-3 md:pb-6 font-black hidden sm:table-cell text-center">Status</th>
                      <th className="pb-3 md:pb-6 font-black text-center pr-2 sm:pr-4">Total</th>
                      <th className="pb-3 md:pb-6 font-black text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    <tr className="group/row transition-all hover:bg-white/[0.01]">
                      <td className="py-3 md:py-8 text-[10px] md:text-[13px] lg:text-sm font-bold tracking-tight text-white/40 pl-2">#5475</td>
                      <td className="py-3 md:py-8">
                        <div className="flex items-center gap-2 md:gap-4">
                          <div className="w-6 h-6 md:w-10 lg:w-12 rounded-md sm:rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shrink-0">
                             <div className="relative">
                               <CreditCard className="w-3 h-3 md:w-5 lg:w-5 text-orange-400" />
                             </div>
                          </div>
                          <div className="flex flex-col gap-0.5 overflow-hidden">
                            <span className="text-[10px] md:text-[14px] lg:text-base font-bold text-white tracking-tighter sm:tracking-tight truncate max-w-[80px] sm:max-w-none">Claude Pro</span>
                            <div className="flex items-center gap-1.5">
                               <span className="text-[7px] md:text-[10px] lg:text-[11px] text-white/20 font-black uppercase tracking-widest">x1</span>
                               <span className="md:hidden text-[7px] text-white/20 font-bold">• 17 Apr</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 md:py-8 text-xs md:text-[13px] lg:text-sm font-medium text-white/60 tracking-tight hidden md:table-cell">17 April 2026</td>
                      <td className="py-3 md:py-8 hidden sm:table-cell text-center">
                        <span className="text-[8px] md:text-[11px] lg:text-sm font-black text-white uppercase tracking-wider px-2 sm:px-3 py-1 sm:py-1.5 bg-white/5 rounded-md sm:rounded-lg border border-white/5">Done</span>
                      </td>
                      <td className="py-3 md:py-8 text-[10px] md:text-[13px] lg:text-sm font-bold text-white/60 tracking-tight text-center pr-2 sm:pr-4">
                         <span>126k</span>
                      </td>
                      <td className="py-3 md:py-8 text-right pr-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedOrder(ORDERS[0])}
                          className="h-6 sm:h-9 lg:h-10 px-2 sm:px-6 lg:px-8 rounded-md sm:rounded-2xl bg-white/5 border-white/10 text-[8px] md:text-[10px] lg:text-[12px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                        >
                          Detail
                        </Button>
                      </td>
                    </tr>
                    <tr className="group/row transition-all hover:bg-white/[0.01]">
                      <td className="py-3 md:py-8 text-[10px] md:text-[13px] lg:text-sm font-bold tracking-tight text-white/40 pl-2">#5321</td>
                      <td className="py-3 md:py-8">
                        <div className="flex items-center gap-2 md:gap-4">
                          <div className="w-6 h-6 md:w-10 lg:w-12 rounded-md sm:rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shrink-0">
                             <ShoppingBag className="w-3 h-3 md:w-5 lg:w-5 text-cyan-400" />
                          </div>
                          <div className="flex flex-col gap-0.5 overflow-hidden">
                            <span className="text-[10px] md:text-[14px] lg:text-base font-bold text-white tracking-tighter sm:tracking-tight truncate max-w-[80px] sm:max-w-none">Token Refill</span>
                            <div className="flex items-center gap-1.5">
                               <span className="text-[7px] md:text-[10px] lg:text-[11px] text-white/20 font-black uppercase tracking-widest">x1</span>
                               <span className="md:hidden text-[7px] text-white/20 font-bold">• 12 Apr</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 md:py-8 text-xs md:text-[13px] lg:text-sm font-medium text-white/60 tracking-tight hidden md:table-cell">12 April 2026</td>
                      <td className="py-3 md:py-8 hidden sm:table-cell text-center">
                        <span className="text-[8px] md:text-[11px] lg:text-sm font-black text-white uppercase tracking-wider px-2 sm:px-3 py-1 sm:py-1.5 bg-white/5 rounded-md sm:rounded-lg border border-white/5">Done</span>
                      </td>
                      <td className="py-3 md:py-8 text-[10px] md:text-[13px] lg:text-sm font-bold text-white/60 tracking-tight text-center pr-2 sm:pr-4">
                         <span>50k</span>
                      </td>
                      <td className="py-3 md:py-8 text-right pr-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedOrder(ORDERS[1])}
                          className="h-6 sm:h-9 lg:h-10 px-2 sm:px-6 lg:px-8 rounded-md sm:rounded-2xl bg-white/5 border-white/10 text-[8px] md:text-[10px] lg:text-[12px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                        >
                          Detail
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
           </div>

           {/* Card 4: System Information */}
           <div className="col-span-12 lg:col-span-4 ios-squircle glass-panel p-6 sm:p-9 flex flex-col justify-between gap-8 sm:gap-12 group">
              <div className="flex flex-col gap-8">
                 <div className="flex items-center gap-2 text-white/30">
                    <Info className="w-4 h-4" />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em]">System Info</span>
                 </div>

                 <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                          <Cpu className="w-6 h-6 text-cyan-400/50" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[10px] text-white/20 font-black tracking-widest uppercase">Version Control</span>
                          <span className="text-xl font-bold text-white">1.0.0 Stable</span>
                       </div>
                    </div>

                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                          <Code2 className="w-6 h-6 text-emerald-400/50" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[10px] text-white/20 font-black tracking-widest uppercase">Native Build</span>
                          <span className="text-xl font-bold text-white">2024.12.A</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col gap-2 pt-12 border-t border-white/5">
                 <p className="text-[10px] font-bold text-white/10 uppercase tracking-widest">Environment Status</p>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="text-[11px] font-bold text-emerald-400 tracking-tight uppercase">Operational</span>
                 </div>
              </div>
           </div>

        </div>

      </div>
    </div>
  );
}
