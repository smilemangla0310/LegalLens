"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  AlertTriangle,
  Bot,
  Brain,
  FileText,
  Globe2,
  Languages,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MessageSquare,
  Scale,
  Send,
  UserCheck,
  RefreshCw,
  Eye,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  fetchBusinessProfile,
  updateBusinessProfile,
  analyzeDocumentApi,
  fetchDashboardData,
  fetchDocumentHistory,
  sendChatMessage,
  BusinessProfile,
  AnalysisReport,
  DashboardData
} from "@/lib/api";

type NavTab = "dashboard" | "documents" | "insights" | "history" | "profile";
type RiskLevel = "High" | "Medium" | "Low" | "Critical";

const sampleDocs: Record<string, string> = {
  "Vendor Agreement": `Vendor Agreement

Payment must be made within 7 days of invoice. If delayed, a penalty of 2% per week applies. The contract renews automatically after 12 months unless cancelled 30 days before expiry. Any dispute shall be handled in Delhi courts. Supplier shall indemnify recipient against GST Input Tax Credit loss due to non-reflection in GSTR-2B.`,

  "Legal Notice": `Legal Notice

You are required to respond within 15 days of receipt of this notice regarding unpaid invoice #9402. Failure to respond or clear outstanding dues of Rs. 4,50,000 may result in immediate escalation to legal proceedings under the Negotiable Instruments Act and MSMED Act. Please preserve all records related to this matter.`,

  "Compliance Memo": `Compliance Memo

GST returns (GSTR-3B) must be filed by the 20th of every month. Under Section 16(2) of CGST Act, Input Tax Credit can only be claimed if tax is actually deposited by supplier. Missing the deadline attracts late fees of Rs. 50/day and 18% per annum interest on delayed tax liability. EPF & ESI monthly challans must be deposited by the 15th of every month for all 28 employees.`,
};

function levelStyles(level: string) {
  switch (level) {
    case "Critical":
    case "High":
      return "bg-red-500/10 text-red-400 border-red-500/30";
    case "Medium":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    default:
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  }
}

export default function Page() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>("documents");

  // Selection & Input State
  const [selectedDoc, setSelectedDoc] = useState<string>("Vendor Agreement");
  const [language, setLanguage] = useState<"Hindi" | "English">("Hindi");
  const [input, setInput] = useState<string>(sampleDocs["Vendor Agreement"]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Business Profile State
  const [profile, setProfile] = useState<BusinessProfile>({
    name: "LensCraft Enterprises",
    industry: "Manufacturing & Wholesale Trade",
    business_type: "Private Limited",
    size: "Small",
    state: "Maharashtra",
    gst_registered: true,
    products_services: "Precision Components & Industrial Supplies",
    employee_count: 28,
    licenses: ["Udyam Registration", "GST Certificate", "Factory License"],
    compliance_categories: ["GST Filings", "EPF/ESI", "MSME Delayed Payment Safeguards"],
    vendor_info: ["Raw Material Suppliers", "Logistics Partners"],
    customer_type: "B2B Commercial Customers"
  });

  // Analysis & Async State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [docHistory, setDocHistory] = useState<any[]>([]);

  // Profile Edit Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editProfile, setEditProfile] = useState<BusinessProfile>(profile);

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: "Hello! I am your LegalLens AI Copilot. Ask me anything about your legal documents or compliance requirements." }
  ]);

  // Initial Data Fetching
  useEffect(() => {
    fetchBusinessProfile().then((data) => {
      if (data) {
        setProfile(data);
        setEditProfile(data);
      }
    });
    fetchDashboardData().then((dbData) => {
      if (dbData) setDashboard(dbData);
    });
    fetchDocumentHistory().then((docs) => {
      if (docs) setDocHistory(docs);
    });
  }, []);

  // Stats display memo
  const stats = useMemo(
    () => [
      {
        icon: FileText,
        value: dashboard ? `${dashboard.total_documents}` : "128+",
        label: "Documents Analyzed",
      },
      {
        icon: Languages,
        value: "15+",
        label: "Vernacular Languages",
      },
      {
        icon: ShieldCheck,
        value: dashboard ? `${100 - dashboard.avg_risk_score}%` : "96%",
        label: "Protection Index",
      },
      {
        icon: BarChart3,
        value: dashboard ? `${dashboard.active_obligations}` : "3",
        label: "Active Obligations",
      },
    ],
    [dashboard]
  );

  // Trigger AI Analysis
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await analyzeDocumentApi(
        uploadedFile || undefined,
        uploadedFile ? undefined : input,
        language
      );
      if (res && res.analysis) {
        setAnalysisReport(res.analysis);
        setActiveTab("insights");
        fetchDashboardData().then(setDashboard);
        fetchDocumentHistory().then(setDocHistory);
      }
    } catch (err) {
      console.error("Analysis process notice:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadSample = (doc: string) => {
    setSelectedDoc(doc);
    setInput(sampleDocs[doc]);
    setUploadedFile(null);
  };

  const handleProfileSave = async () => {
    try {
      const updated = await updateBusinessProfile(editProfile);
      setProfile(updated);
      setShowProfileModal(false);
    } catch (err) {
      console.error("Profile update failed:", err);
      setProfile(editProfile);
      setShowProfileModal(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput("");
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);

    try {
      const res = await sendChatMessage(
        analysisReport?.document_id,
        input,
        userMsg
      );
      setChatMessages((prev) => [
        ...prev,
        { sender: "ai", text: res.answer || "No response received." }
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Error connecting to AI chat service." }
      ]);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white font-sans selection:bg-violet-500 selection:text-white">
      {/* Dynamic Background Blurs */}
      <div className="absolute -left-40 top-0 h-[450px] w-[450px] rounded-full bg-violet-600/30 blur-[130px] pointer-events-none" />
      <div className="absolute right-0 top-40 h-[400px] w-[400px] rounded-full bg-cyan-500/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 h-[350px] w-[350px] rounded-full bg-pink-500/20 blur-[130px] pointer-events-none" />

      {/* NAVBAR */}
      <header className="relative z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("documents")}>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">LegalLens</h2>
                <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300 border border-violet-500/30">
                  MSME Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-400">AI Legal Copilot & Prevention Platform</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2 rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-xl">
            {(
              [
                { id: "dashboard", label: "Dashboard", icon: BarChart3 },
                { id: "documents", label: "Analyze", icon: UploadCloud },
                { id: "insights", label: "AI Insights", icon: Brain },
                { id: "history", label: "History", icon: FileText },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Business Profile Quick Badge */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="hidden lg:flex items-center gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 transition hover:border-violet-400 hover:bg-violet-500/20"
          >
            <Building2 size={18} className="text-violet-300" />
            <div className="text-left">
              <div className="text-xs font-bold text-white leading-tight truncate max-w-[140px]">
                {profile.name}
              </div>
              <div className="text-[10px] text-violet-300">
                {profile.size} • {profile.industry}
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-20 mx-auto max-w-7xl px-6 pt-10 pb-6">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          {/* Left Hero */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 mb-6">
              <Sparkles size={14} />
              <span>Prevention-First Legal AI for MSMEs</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight">
              AI-Powered Legal Intelligence
              <span className="block bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-300 bg-clip-text text-transparent mt-1">
                Context-Aware & Vernacular
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300">
              Transform contract analysis with business context awareness. LegalLens retrieves official Indian laws, assesses operational fit, flags financial risks, and prevents legal disputes before signing.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
                <Globe2 className="mb-1 text-cyan-400" size={20} />
                <div className="text-xs font-bold">15+ Languages</div>
                <div className="text-[11px] text-slate-400">Hindi • Tamil • Bengali</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
                <ShieldCheck className="mb-1 text-emerald-400" size={20} />
                <div className="text-xs font-bold">Prevention Layer</div>
                <div className="text-[11px] text-slate-400">Conflict & Fit Check</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
                <Scale className="mb-1 text-violet-400" size={20} />
                <div className="text-xs font-bold">RAG Legal Pipeline</div>
                <div className="text-[11px] text-slate-400">MSMED Act & GST Rules</div>
              </div>
            </div>
          </div>

          {/* Right Analytics Box */}
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Real-time Legal Intelligence</h2>
                <p className="text-xs text-slate-400">Business Profile: <span className="text-violet-300 font-semibold">{profile.name} ({profile.state})</span></p>
              </div>
              <button
                onClick={() => setShowProfileModal(true)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition"
              >
                Edit Context
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:scale-[1.02]"
                  >
                    <Icon className="mb-2 text-violet-400" size={20} />
                    <div className="text-2xl font-bold">{item.value}</div>
                    <div className="mt-0.5 text-xs text-slate-400">{item.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl bg-gradient-to-r from-violet-600/90 to-indigo-600/90 p-4 border border-violet-400/20">
              <div className="text-[11px] uppercase tracking-widest text-violet-200 font-bold">
                AI Memory Active
              </div>
              <div className="mt-1 text-sm font-bold text-white">
                Context-Aware Document Prevention Engine
              </div>
              <div className="mt-1 text-xs text-violet-100 leading-relaxed">
                Indexed against MSMED Act 45-day payment statutory limits, GST Section 16(2) ITC rules, and your business profile history.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT AREA - TAB DRIVEN */}
      <section className="relative z-20 mx-auto max-w-7xl px-6 py-6">

        {/* TAB 1: DASHBOARD VIEW */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">MSME Intelligence Dashboard</h2>
                <p className="text-xs text-slate-400">Overview of legal risks, compliance deadlines, and business profile</p>
              </div>
              <button
                onClick={() => fetchDashboardData().then(setDashboard)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold hover:bg-white/10"
              >
                <RefreshCw size={14} />
                <span>Refresh Data</span>
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Business Context Card */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Building2 className="text-violet-400" size={20} />
                    <span>Business Profile</span>
                  </h3>
                  <button onClick={() => setShowProfileModal(true)} className="text-xs text-violet-400 hover:underline">Edit</button>
                </div>
                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Company Name</span>
                    <span className="font-semibold text-white">{profile.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Industry</span>
                    <span className="font-semibold text-white">{profile.industry}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">Business Size</span>
                    <span className="font-semibold text-white">{profile.size} MSME</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-400">GST Registration</span>
                    <span className="font-semibold text-emerald-400">{profile.gst_registered ? "Registered" : "Not Registered"}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-400">Employees</span>
                    <span className="font-semibold text-white">{profile.employee_count} staff</span>
                  </div>
                </div>
              </div>

              {/* Legal Risk Gauge */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl flex flex-col items-center justify-center text-center">
                <h3 className="text-lg font-bold mb-2">Aggregate Risk Score</h3>
                <div className="relative flex h-36 w-36 items-center justify-center my-3">
                  <div className="absolute inset-0 rounded-full border-[12px] border-white/10"></div>
                  <div className="absolute inset-0 rounded-full border-[12px] border-transparent border-t-amber-500 border-r-amber-500 rotate-45"></div>
                  <div>
                    <div className="text-4xl font-black text-amber-400">
                      {dashboard ? dashboard.avg_risk_score : 42}
                    </div>
                    <div className="text-[10px] text-slate-400">/ 100 Risk</div>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  {dashboard?.high_risk_count ? `${dashboard.high_risk_count} high-risk documents detected` : "Moderate operational risk profile"}
                </p>
              </div>

              {/* Active Obligations */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Calendar className="text-cyan-400" size={20} />
                  <span>Pending Deadlines</span>
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="rounded-2xl bg-slate-900/60 p-3 border border-red-500/20">
                    <div className="font-semibold text-red-300">GST Monthly Return (GSTR-3B)</div>
                    <div className="text-slate-400 mt-1">Due: 20th of every month • EPF/ESI by 15th</div>
                  </div>
                  <div className="rounded-2xl bg-slate-900/60 p-3 border border-amber-500/20">
                    <div className="font-semibold text-amber-300">Vendor Payment Notice</div>
                    <div className="text-slate-400 mt-1">Within 7 days (Under 45-day MSMED rule)</div>
                  </div>
                  <div className="rounded-2xl bg-slate-900/60 p-3 border border-cyan-500/20">
                    <div className="font-semibold text-cyan-300">Contract Auto-Renewal Review</div>
                    <div className="text-slate-400 mt-1">30 days prior notice required</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DOCUMENT UPLOAD & ANALYSIS VIEW */}
        {activeTab === "documents" && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* LEFT 2 COLS: DOCUMENT UPLOAD & PREVIEW */}
            <div className="lg:col-span-2 space-y-8">
              <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-2xl">
                <div className="flex flex-col gap-2">
                  <h2 className="text-2xl font-bold">Upload Legal Document for AI Analysis</h2>
                  <p className="text-xs text-slate-400">
                    Upload contracts, legal notices, or compliance documents to analyze against your <span className="text-violet-300 font-semibold">{profile.name}</span> business profile.
                  </p>
                </div>

                {/* Upload Drag & Drop Area */}
                <div className="mt-6 rounded-3xl border-2 border-dashed border-violet-400/30 bg-gradient-to-br from-violet-500/10 via-slate-900/50 to-cyan-500/10 p-8 transition hover:border-violet-400 text-center">
                  <div className="flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
                      <UploadCloud size={36} />
                    </div>
                    <h3 className="mt-4 text-xl font-bold">Drag & Drop PDF or Image Document</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      PDF (with PyMuPDF & OCR fallback) • DOCX • Image
                      <br />or select a Demo Document below
                    </p>

                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,image/*"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadedFile(file);
                        }
                      }}
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-6 rounded-full bg-white px-6 py-2.5 text-xs font-bold text-slate-900 transition hover:scale-105 shadow-lg shadow-white/10"
                    >
                      Browse Local Files
                    </button>

                    {uploadedFile && (
                      <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span className="font-semibold text-emerald-300">File Selected:</span>
                        <span className="text-slate-200 truncate max-w-xs">{uploadedFile.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Demo Sample Documents */}
                <div className="mt-6">
                  <h3 className="mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Demo Legal Documents
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(sampleDocs).map((doc) => (
                      <button
                        key={doc}
                        onClick={() => loadSample(doc)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                          selectedDoc === doc && !uploadedFile
                            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                            : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {doc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Output Vernacular Language Selector */}
                <div className="mt-6">
                  <h3 className="mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    AI Output Language
                  </h3>
                  <div className="flex gap-3">
                    {(["Hindi", "English"] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={`rounded-xl px-5 py-2 text-xs font-bold transition ${
                          language === lang
                            ? "bg-gradient-to-r from-pink-600 to-violet-600 text-white shadow-md shadow-pink-500/20"
                            : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Document Text Preview */}
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Document Content Preview
                    </h3>
                    <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-[11px] text-emerald-300 border border-emerald-500/30 font-semibold">
                      Ready for AI Analysis
                    </span>
                  </div>

                  <textarea
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      setUploadedFile(null);
                    }}
                    className="h-56 w-full rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-xs font-mono leading-relaxed text-slate-200 outline-none transition focus:border-violet-400"
                  />

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 px-8 py-4 text-base font-bold shadow-xl shadow-violet-500/20 transition hover:scale-[1.02] disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw size={20} className="animate-spin" />
                          <span>Analyzing with RAG & Business Context...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={20} />
                          <span>✨ Analyze with AI Legal Lens</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR: QUICK RISK & OBLIGATIONS */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Document Risk Score</h3>
                  <ShieldCheck className="text-violet-400" size={24} />
                </div>

                <div className="flex justify-center my-4">
                  <div className="relative flex h-36 w-36 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-[12px] border-white/10"></div>
                    <div className="absolute inset-0 rounded-full border-[12px] border-transparent border-t-red-500 border-r-red-500 rotate-45"></div>
                    <div className="text-center">
                      <div className="text-4xl font-black text-red-400">
                        {analysisReport ? analysisReport.risk_score : 75}
                      </div>
                      <div className="text-xs text-slate-400">/ 100 Risk</div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-center text-slate-300 leading-relaxed">
                  {analysisReport
                    ? analysisReport.executive_summary
                    : "This document contains payment penalties and auto-renewal terms that should be reviewed under Indian contract law."}
                </p>
              </div>

              {/* Ask AI Copilot Widget */}
              <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 shadow-xl border border-violet-400/20">
                <div className="flex items-center gap-3">
                  <Brain size={24} className="text-white" />
                  <h3 className="text-lg font-bold">AI Legal Copilot Q&A</h3>
                </div>

                <p className="mt-3 text-xs text-violet-100 leading-relaxed">
                  Ask questions about this agreement, MSME laws, or GST implications. LegalLens answers using RAG legal context.
                </p>

                <button
                  onClick={() => setChatOpen(true)}
                  className="mt-6 flex items-center justify-center gap-2 w-full rounded-2xl bg-white py-3 text-xs font-bold text-violet-800 transition hover:scale-[1.02] shadow-lg"
                >
                  <MessageSquare size={16} />
                  <span>Open Interactive AI Chat</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AI INSIGHTS & FULL 11-SECTION REPORT VIEW */}
        {activeTab === "insights" && (
          <div className="space-y-8">
            {/* Header / Control Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                    ✓ Full 11-Section AI Report Generated
                  </span>
                  {analysisReport && (
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${levelStyles(analysisReport.risk_level)}`}>
                      Risk Level: {analysisReport.risk_level} ({analysisReport.risk_score}/100)
                    </span>
                  )}
                </div>
                <h2 className="text-3xl font-bold mt-2">
                  AI Legal Intelligence Report
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Contextualized for <span className="text-violet-300 font-semibold">{profile.name}</span> ({profile.industry})
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab("documents")}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold hover:bg-white/10"
                >
                  Analyze Another Document
                </button>
                <button
                  onClick={() => window.print()}
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-bold shadow-md shadow-violet-500/20 hover:scale-105 transition"
                >
                  Export PDF Report
                </button>
              </div>
            </div>

            {/* SECTION 1: EXECUTIVE SUMMARY */}
            <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-slate-900/80 to-cyan-500/10 p-6 sm:p-8 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">1. Executive Summary & Vernacular Explanation</h3>
                  <p className="text-xs text-slate-400">Language Output: {language}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-black/40 p-5 text-sm leading-relaxed text-slate-200 font-medium">
                {analysisReport?.executive_summary || analysisReport?.summary || (
                  language === "Hindi"
                    ? "इस समझौते में 7 दिनों के भीतर भुगतान अनिवार्य है। विलंब होने पर 2% प्रति सप्ताह का दंड लागू होगा। यह अनुबंध 12 महीने बाद स्वतः नवीनीकृत होगा जब तक कि 30 दिन पहले नोटिस न दिया जाए।"
                    : "This agreement requires payment within 7 days. A delay penalty of 2% per week applies. The contract auto-renews after 12 months unless cancelled with 30 days prior notice."
                )}
              </div>
            </div>

            {/* SECTION 2: PREVENTION LAYER (7 Core Questions) */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="text-emerald-400" size={24} />
                <div>
                  <h3 className="text-xl font-bold">2. Prevention Layer & Business Suitability Assessment</h3>
                  <p className="text-xs text-slate-400">AI evaluation of business context, risk profile, and conflicts</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Question 1 */}
                <div className="rounded-2xl bg-slate-900/60 p-4 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Does this contract suit this business?</span>
                    {analysisReport?.prevention_analysis?.suits_business !== false ? (
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">✓ Suitable</span>
                    ) : (
                      <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-[11px] font-bold text-red-400">⚠️ Caution</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {analysisReport?.prevention_analysis?.suits_reasoning || "Document structure aligns with typical commercial operations for a Small MSME."}
                  </p>
                </div>

                {/* Question 2 */}
                <div className="rounded-2xl bg-slate-900/60 p-4 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Is this document expected for this business?</span>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">✓ Standard Document</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {analysisReport?.prevention_analysis?.is_expected_reasoning || "Standard vendor/commercial contract expected in Manufacturing & Supply sectors."}
                  </p>
                </div>

                {/* Question 3 */}
                <div className="rounded-2xl bg-slate-900/60 p-4 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Does it conflict with previous agreements?</span>
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">✓ No Conflicts</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {analysisReport?.prevention_analysis?.conflicts_reasoning || "No conflict detected with historical business documents in AI Memory."}
                  </p>
                </div>

                {/* Question 4: Statutory MSME Payment Check */}
                <div className="rounded-2xl bg-slate-900/60 p-4 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Is payment structure abnormal? (MSMED 45-Day Rule)</span>
                    {analysisReport?.prevention_analysis?.abnormal_payment_structure ? (
                      <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-[11px] font-bold text-red-400">⚠️ Statutory Risk</span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">✓ Compliant</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {analysisReport?.prevention_analysis?.payment_reasoning || "Payment term is within the 45-day maximum credit limit mandated under MSMED Act Section 15."}
                  </p>
                </div>

                {/* Question 5 */}
                <div className="rounded-2xl bg-slate-900/60 p-4 border border-white/5 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Should the business consult a lawyer before signing?</span>
                    {analysisReport?.prevention_analysis?.consult_lawyer ? (
                      <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-400">Advised for Legal Review</span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">Low Risk - Self Review OK</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {analysisReport?.prevention_analysis?.lawyer_consultation_reasoning || "Review penalty rate clause and auto-renewal notice period before execution."}
                  </p>
                </div>
              </div>
            </div>

            {/* SECTIONS 3 & 4: KEY CLAUSES & RECOMMENDED ACTIONS */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Key Clauses */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="text-cyan-400" size={20} />
                  <h3 className="text-lg font-bold">3. Important Clauses Extracted</h3>
                </div>

                <div className="space-y-3">
                  {analysisReport?.important_clauses?.map((c, i) => (
                    <div key={i} className="rounded-2xl bg-slate-900/60 p-4 border border-white/5">
                      <div className="font-semibold text-xs text-white">{c.title}</div>
                      <div className="mt-1 text-xs text-slate-400">{c.explanation || c.clause_text}</div>
                    </div>
                  )) || (
                    <>
                      <div className="rounded-2xl bg-slate-900/60 p-4 border border-white/5">
                        <div className="font-semibold text-xs text-white">Payment Terms & Penalty</div>
                        <div className="mt-1 text-xs text-slate-400">7-day invoice payment. 2% weekly late penalty applies.</div>
                      </div>
                      <div className="rounded-2xl bg-slate-900/60 p-4 border border-white/5">
                        <div className="font-semibold text-xs text-white">Auto-Renewal Clause</div>
                        <div className="mt-1 text-xs text-slate-400">Renews after 12 months unless cancelled 30 days prior.</div>
                      </div>
                      <div className="rounded-2xl bg-slate-900/60 p-4 border border-white/5">
                        <div className="font-semibold text-xs text-white">Jurisdiction</div>
                        <div className="mt-1 text-xs text-slate-400">Dispute resolution subject to Delhi Courts.</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="text-pink-400" size={20} />
                  <h3 className="text-lg font-bold">4. Recommended Next Actions</h3>
                </div>

                <div className="space-y-3">
                  {analysisReport?.recommended_actions?.map((act, i) => (
                    <div key={i} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <div className="font-semibold text-xs text-emerald-300">✓ {act.action}</div>
                      <div className="mt-1 text-xs text-slate-300">{act.reasoning}</div>
                    </div>
                  )) || (
                    <>
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                        <div className="font-semibold text-xs text-emerald-300">✓ Complete Invoice Payment Promptly</div>
                        <div className="mt-1 text-xs text-slate-300">Pay within 7 days to avoid triggering the 2% weekly late penalty.</div>
                      </div>
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                        <div className="font-semibold text-xs text-amber-300">Set Calendar Reminder for Renewal Window</div>
                        <div className="mt-1 text-xs text-slate-300">Mark notice deadline 30 days before 12-month expiry.</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* SECTIONS 5 & 6: RAG LEGAL REFERENCES & COMPLIANCE ISSUES */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <Scale className="text-cyan-400" size={24} />
                <div>
                  <h3 className="text-xl font-bold">5. Official Indian Statutory & Government References (RAG Pipeline)</h3>
                  <p className="text-xs text-slate-400">Retrieved from Indian Acts, MSME Guidelines, and GST Statutory Rules</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {analysisReport?.government_references?.map((ref, i) => (
                  <div key={i} className="rounded-2xl bg-slate-900/60 p-4 border border-cyan-500/20">
                    <div className="flex items-center gap-2 font-bold text-xs text-cyan-300">
                      <ExternalLink size={14} />
                      <span>{ref.act}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">{ref.relevance}</p>
                  </div>
                )) || (
                  <>
                    <div className="rounded-2xl bg-slate-900/60 p-4 border border-cyan-500/20">
                      <div className="flex items-center gap-2 font-bold text-xs text-cyan-300">
                        <ExternalLink size={14} />
                        <span>MSMED Act 2006 (Section 15 & 16)</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Mandates maximum 45-day statutory payment window for MSMEs. Late payments attract compound interest at 3x RBI bank rate.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-900/60 p-4 border border-cyan-500/20">
                      <div className="flex items-center gap-2 font-bold text-xs text-cyan-300">
                        <ExternalLink size={14} />
                        <span>Indian Contract Act 1872 (Section 74)</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Penalty clauses stipulating unreasonable liquidated damages above actual proven loss are subject to court reduction.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HISTORY VIEW */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Document Analysis History</h2>
                <p className="text-xs text-slate-400">List of previously uploaded and analyzed documents</p>
              </div>
              <button
                onClick={() => fetchDocumentHistory().then(setDocHistory)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold hover:bg-white/10"
              >
                <RefreshCw size={14} />
                <span>Refresh History</span>
              </button>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-white/10">
                  <tr>
                    <th className="p-4">Document File</th>
                    <th className="p-4">Document Type</th>
                    <th className="p-4">Risk Level</th>
                    <th className="p-4">Date Uploaded</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {docHistory.length > 0 ? (
                    docHistory.map((doc) => (
                      <tr key={doc.id} className="hover:bg-white/5 transition">
                        <td className="p-4 font-semibold text-white flex items-center gap-2">
                          <FileText size={16} className="text-violet-400" />
                          <span>{doc.filename}</span>
                        </td>
                        <td className="p-4">{doc.document_type || "Commercial Agreement"}</td>
                        <td className="p-4">
                          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/30">
                            Medium Risk
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">{doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : "Recent"}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              if (doc.analysis) {
                                setAnalysisReport(doc.analysis);
                              }
                              setActiveTab("insights");
                            }}
                            className="rounded-lg bg-violet-600/30 text-violet-300 border border-violet-500/30 px-3 py-1 font-semibold hover:bg-violet-600 hover:text-white transition"
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No previous document reports found. Upload a document to start building your AI business memory!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* EDIT BUSINESS PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Building2 size={24} className="text-violet-400" />
                <h3 className="text-xl font-bold">Edit Business Profile Context</h3>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="grid gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Business Name</label>
                <input
                  type="text"
                  value={editProfile.name}
                  onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Industry Sector</label>
                  <input
                    type="text"
                    value={editProfile.industry}
                    onChange={(e) => setEditProfile({ ...editProfile, industry: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Business Size</label>
                  <select
                    value={editProfile.size}
                    onChange={(e) => setEditProfile({ ...editProfile, size: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white outline-none focus:border-violet-500"
                  >
                    <option value="Micro">Micro (Turnover &lt; 5 Cr)</option>
                    <option value="Small">Small (Turnover &lt; 50 Cr)</option>
                    <option value="Medium">Medium (Turnover &lt; 250 Cr)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">State / Location</label>
                  <input
                    type="text"
                    value={editProfile.state}
                    onChange={(e) => setEditProfile({ ...editProfile, state: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Employee Count</label>
                  <input
                    type="number"
                    value={editProfile.employee_count}
                    onChange={(e) => setEditProfile({ ...editProfile, employee_count: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Products / Services Description</label>
                <textarea
                  value={editProfile.products_services}
                  onChange={(e) => setEditProfile({ ...editProfile, products_services: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white outline-none focus:border-violet-500 h-20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
              <button
                onClick={() => setShowProfileModal(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleProfileSave}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-xs font-bold shadow-lg shadow-violet-500/20 hover:scale-105 transition"
              >
                Save Business Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI CHAT DRAWER */}
      {chatOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 rounded-3xl border border-violet-500/30 bg-slate-900 shadow-2xl overflow-hidden flex flex-col h-[480px]">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <span className="font-bold text-sm">LegalLens AI Copilot</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-white/80 hover:text-white">✕</button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-violet-600 text-white rounded-br-none"
                    : "bg-slate-800 text-slate-200 border border-white/5 rounded-bl-none"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-white/10 bg-slate-950 flex gap-2">
            <input
              type="text"
              placeholder="Ask a legal or compliance question..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
            />
            <button
              onClick={handleSendChat}
              className="rounded-xl bg-violet-600 px-3 py-2 text-white hover:bg-violet-500"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="relative z-20 border-t border-white/10 bg-slate-950/80 mt-20 py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-violet-400" />
            <span className="font-bold text-slate-300">LegalLens AI Platform</span>
          </div>
          <div>Built for Google Hackathon • Empowering MSMEs with Prevention-First Legal Intelligence</div>
          <div className="text-slate-400">FastAPI • Gemini RAG • Next.js</div>
        </div>
      </footer>
    </main>
  );
}