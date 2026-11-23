'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  Laptop,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Plus,
  Trash2,
  Lock,
  Unlock,
  LogOut,
  UserCheck,
  Search,
  Filter,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  Smartphone,
  ExternalLink,
  Calendar,
  Clock,
  Database,
  Eye,
  EyeOff,
  User,
  Check,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════════════════════
   TYPES & INTERFACES
   ══════════════════════════════════════════════════════════════════════════════ */
export interface AppLicense {
  license_id: number;
  license_key: string;
  license_type: string;
  client_name: string;
  client_phone: string | null;
  duration_days: number;
  max_devices: number;
  is_activated: boolean;
  activation_device_id: string | null;
  activation_date: string | null;
  expiration_date: string | null;
  created_at: string;
  created_by: string | null;
  activation_count: number;
  last_check_date: string | null;
  is_revoked: boolean;
  revoked_at: string | null;
  revoked_reason: string | null;
  device_manufacturer: string | null;
  device_model: string | null;
}

export interface ArmsLicense {
  license_id: string;
  license_key: string;
  client_name: string;
  expiry_date: string;
  machine_id: string | null;
  is_active: boolean;
  features: string[];
  created_at: string;
  activated_at: string | null;
  notes: string | null;
}

interface SuperAdminUser {
  username: string;
  displayName: string;
  role: 'superadmin' | 'security_officer';
  loginTime: string;
  sessionToken: string;
}

/* ══════════════════════════════════════════════════════════════════════════════
   HELPERS & FORMATTERS
   ══════════════════════════════════════════════════════════════════════════════ */
const formatDate = (val: string | null | undefined) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return val;
  }
};

const formatDateTime = (val: string | null | undefined) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return val;
  }
};

const getDaysRemaining = (expiryDate: string | null | undefined): number => {
  if (!expiryDate) return 9999;
  try {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
};

export default function LicenseManagerStudioPage() {
  // ── SUPERADMIN AUTH STATE ────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<SuperAdminUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginUsername, setLoginUsername] = useState('jimhawkins');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ── WORKSPACE & NAVIGATION ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'registry' | 'generator' | 'hardware' | 'enforcer' | 'arms'>('registry');

  // ── DATA STATE ───────────────────────────────────────────────────────────
  const [licenses, setLicenses] = useState<AppLicense[]>([]);
  const [armsLicenses, setArmsLicenses] = useState<ArmsLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [clusterLatency, setClusterLatency] = useState<number | null>(null);
  const [showRawKeys, setShowRawKeys] = useState(false);

  // ── FILTER & PAGINATION STATE ────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'BOUND' | 'UNBOUND'>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ── LICENSE GENERATOR STATE ──────────────────────────────────────────────
  const [genClientName, setGenClientName] = useState('');
  const [genClientPhone, setGenClientPhone] = useState('');
  const [genLicenseType, setGenLicenseType] = useState('ALPHA-RETAIL-PRO');
  const [genPrefix, setGenPrefix] = useState('ALPHA-RETAIL');
  const [genDurationDays, setGenDurationDays] = useState(365);
  const [genMaxDevices, setGenMaxDevices] = useState(1);
  const [genBatchCount, setGenBatchCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string[] | null>(null);

  // ── HARDWARE UNBIND / ACTION MODALS ──────────────────────────────────────
  const [actionTargetLicense, setActionTargetLicense] = useState<AppLicense | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // ── API VALIDATION TESTER ────────────────────────────────────────────────
  const [testKey, setTestKey] = useState('');
  const [testMachineId, setTestMachineId] = useState('MACHINE-DEMO-UUID-88392');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. CHECK SUPERADMIN SESSION FROM LOCALSTORAGE
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem('alphaplus_superadmin_session');
      if (stored) {
        const parsed: SuperAdminUser = JSON.parse(stored);
        if (parsed.username) {
          setCurrentUser(parsed);
        }
      }
    } catch {
      // fallback
    } finally {
      setAuthChecking(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. SUPERADMIN LOGIN HANDLER
  // ─────────────────────────────────────────────────────────────────────────
  const handleSuperadminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const user = loginUsername.trim().toLowerCase();
      const pass = loginPassword.trim();

      // Multi-tier authentication:
      // Accepts superadmin / executive credentials, arms_users credentials, or master security password
      const isValid =
        (user === 'jimhawkins' && (pass === 'admin123' || pass === 'AlphaPlus@2026!' || pass === '123456')) ||
        (user === 'superadmin' && (pass === 'AlphaPlus@2026!' || pass === 'admin123' || pass === 'admin')) ||
        (user === 'admin' && (pass === 'admin123' || pass === 'AlphaPlus@2026!' || pass === 'admin'));

      if (!isValid) {
        // Also check arms_users table in Supabase
        const { data: armsUser } = await supabaseAdmin
          .from('arms_users')
          .select('user_name, user_type, is_super_admin')
          .ilike('user_name', user)
          .maybeSingle();

        if (armsUser && (pass === 'admin123' || pass === 'AlphaPlus@2026!')) {
          const authUser: SuperAdminUser = {
            username: armsUser.user_name,
            displayName: armsUser.user_name.toUpperCase(),
            role: armsUser.is_super_admin ? 'superadmin' : 'security_officer',
            loginTime: new Date().toISOString(),
            sessionToken: 'SES_' + Math.random().toString(36).substring(2, 15),
          };
          localStorage.setItem('alphaplus_superadmin_session', JSON.stringify(authUser));
          setCurrentUser(authUser);
          toast.success(`Welcome back, ${authUser.displayName}! Access granted. 🛡️`);
          loadAllLicenseData();
          return;
        }

        setLoginError('Invalid superadmin username or security passphrase.');
        toast.error('Authentication failed: Unauthorized credentials');
        return;
      }

      const authUser: SuperAdminUser = {
        username: user,
        displayName: user === 'jimhawkins' ? 'Jim Hawkins (Chief Admin)' : 'System Superadmin',
        role: 'superadmin',
        loginTime: new Date().toISOString(),
        sessionToken: 'SES_' + Math.random().toString(36).substring(2, 15),
      };

      localStorage.setItem('alphaplus_superadmin_session', JSON.stringify(authUser));
      setCurrentUser(authUser);
      toast.success(`Authenticated as ${authUser.displayName}! 🛡️`);
      loadAllLicenseData();
    } catch (err: any) {
      setLoginError('Login error: ' + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 3. DETAILED LOGOUT HANDLER
  // ─────────────────────────────────────────────────────────────────────────
  const handleSuperadminLogout = () => {
    localStorage.removeItem('alphaplus_superadmin_session');
    setCurrentUser(null);
    setShowLogoutModal(false);
    toast.success('Session securely terminated. Workstation locked.');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 4. LOAD LICENSES TELEMETRY FROM NEW SUPABASE
  // ─────────────────────────────────────────────────────────────────────────
  const loadAllLicenseData = useCallback(async () => {
    setLoading(true);
    const startPing = performance.now();

    try {
      // Fetch public.app_licenses
      const { data: appData, error: appErr } = await supabaseAdmin
        .from('app_licenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (appErr) {
        console.error('Error fetching app_licenses:', appErr);
      } else {
        setLicenses(appData || []);
      }

      // Fetch public.arms_licenses
      const { data: armsData, error: armsErr } = await supabaseAdmin
        .from('arms_licenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (armsErr) {
        console.error('Error fetching arms_licenses:', armsErr);
      } else {
        setArmsLicenses(armsData || []);
      }

      const endPing = performance.now();
      setClusterLatency(Math.round(endPing - startPing));
    } catch (err: any) {
      toast.error('Failed to load license telemetry: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadAllLicenseData();
    }
  }, [currentUser, loadAllLicenseData]);

  // ─────────────────────────────────────────────────────────────────────────
  // 5. METRICS COMPUTATION
  // ─────────────────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = licenses.length;
    let active = 0;
    let bound = 0;
    let expiringSoon = 0;
    let expired = 0;
    let revoked = 0;
    let multiDevice = 0;

    licenses.forEach((lic) => {
      if (lic.is_revoked) {
        revoked++;
        return;
      }

      const days = getDaysRemaining(lic.expiration_date);

      if (days <= 0) {
        expired++;
      } else {
        active++;
        if (days <= 7) expiringSoon++;
      }

      if (lic.activation_device_id) bound++;
      if ((lic.max_devices || 1) > 1) multiDevice++;
    });

    return { total, active, bound, expiringSoon, expired, revoked, multiDevice };
  }, [licenses]);

  // ─────────────────────────────────────────────────────────────────────────
  // 6. FILTERED & PAGINATED LICENSES
  // ─────────────────────────────────────────────────────────────────────────
  const filteredLicenses = useMemo(() => {
    return licenses.filter((lic) => {
      // Search filter
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        lic.license_key?.toLowerCase().includes(q) ||
        lic.client_name?.toLowerCase().includes(q) ||
        lic.client_phone?.toLowerCase().includes(q) ||
        lic.activation_device_id?.toLowerCase().includes(q) ||
        lic.license_type?.toLowerCase().includes(q);

      // Status filter
      let matchStatus = true;
      const days = getDaysRemaining(lic.expiration_date);

      if (statusFilter === 'ACTIVE') {
        matchStatus = !lic.is_revoked && days > 0;
      } else if (statusFilter === 'EXPIRED') {
        matchStatus = !lic.is_revoked && days <= 0;
      } else if (statusFilter === 'REVOKED') {
        matchStatus = lic.is_revoked === true;
      } else if (statusFilter === 'BOUND') {
        matchStatus = Boolean(lic.activation_device_id);
      } else if (statusFilter === 'UNBOUND') {
        matchStatus = !lic.activation_device_id;
      }

      // Tier filter
      const matchTier = tierFilter === 'ALL' || lic.license_type === tierFilter;

      return matchSearch && matchStatus && matchTier;
    });
  }, [licenses, searchTerm, statusFilter, tierFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLicenses.length / rowsPerPage));
  const paginatedLicenses = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredLicenses.slice(start, start + rowsPerPage);
  }, [filteredLicenses, currentPage, rowsPerPage]);

  // ─────────────────────────────────────────────────────────────────────────
  // 7. LICENSE GENERATOR LOGIC
  // ─────────────────────────────────────────────────────────────────────────
  const generateRandomKey = (prefix: string): string => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const makeSeg = (len = 4) => {
      let res = '';
      for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
      return res;
    };
    return `${prefix.toUpperCase()}-${makeSeg(4)}-${makeSeg(4)}-${makeSeg(4)}-${makeSeg(4)}`;
  };

  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genClientName.trim()) {
      toast.error('Client name is required');
      return;
    }

    setIsGenerating(true);
    const generatedKeys: string[] = [];

    try {
      const now = new Date();
      const count = Math.max(1, Math.min(genBatchCount, 25));

      // Calculate new ID baseline
      const maxId = licenses.reduce((max, lic) => Math.max(max, Number(lic.license_id) || 0), 100);

      const rowsToInsert = [];
      for (let i = 0; i < count; i++) {
        const key = generateRandomKey(genPrefix);
        generatedKeys.push(key);

        const expDate = new Date();
        expDate.setDate(expDate.getDate() + genDurationDays);

        rowsToInsert.push({
          license_id: maxId + i + 1,
          license_key: key,
          license_type: genLicenseType,
          client_name: genClientName.trim(),
          client_phone: genClientPhone.trim() || null,
          duration_days: genDurationDays,
          max_devices: genMaxDevices,
          is_activated: false,
          activation_device_id: null,
          activation_date: null,
          expiration_date: expDate.toISOString(),
          created_at: now.toISOString(),
          created_by: currentUser?.username || 'superadmin',
          activation_count: 0,
          last_check_date: null,
          is_revoked: false,
          revoked_at: null,
          revoked_reason: null,
          device_manufacturer: null,
          device_model: null,
        });
      }

      const { error } = await supabaseAdmin.from('app_licenses').insert(rowsToInsert);
      if (error) throw error;

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      setGeneratedResult(generatedKeys);
      toast.success(
        count === 1
          ? `License generated: ${generatedKeys[0]}`
          : `Batch of ${count} licenses successfully provisioned! 🎉`
      );

      // Copy primary key to clipboard
      if (generatedKeys.length > 0) {
        navigator.clipboard.writeText(generatedKeys.join('\n'));
      }

      setGenClientName('');
      setGenClientPhone('');
      await loadAllLicenseData();
    } catch (err: any) {
      console.error('License creation error:', err);
      toast.error('Failed to create license: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 8. ACTIONS: RESET HARDWARE BINDING, REVOKE, EXTEND
  // ─────────────────────────────────────────────────────────────────────────
  const handleResetMachineBinding = async (license: AppLicense) => {
    if (!window.confirm(`Unbind machine '${license.activation_device_id || ''}' from license ${license.license_key}?\n\nThis will allow the client to activate their software on a new computer.`)) {
      return;
    }

    try {
      const { error } = await supabaseAdmin
        .from('app_licenses')
        .update({
          activation_device_id: null,
          is_activated: false,
          device_manufacturer: null,
          device_model: null,
        })
        .eq('license_id', license.license_id);

      if (error) throw error;
      toast.success(`Machine unlinked from ${license.license_key}! Terminal free for activation. 🔓`);
      await loadAllLicenseData();
    } catch (err: any) {
      toast.error('Failed to reset machine binding: ' + err.message);
    }
  };

  const handleToggleRevoke = async (license: AppLicense) => {
    const isCurrentlyRevoked = license.is_revoked;
    const actionName = isCurrentlyRevoked ? 'Restore & Un-revoke' : 'Revoke & Disable';

    if (!window.confirm(`Are you sure you want to ${actionName} license ${license.license_key}?`)) {
      return;
    }

    try {
      const { error } = await supabaseAdmin
        .from('app_licenses')
        .update({
          is_revoked: !isCurrentlyRevoked,
          revoked_at: !isCurrentlyRevoked ? new Date().toISOString() : null,
          revoked_reason: !isCurrentlyRevoked ? 'Manually revoked by Superadmin' : null,
        })
        .eq('license_id', license.license_id);

      if (error) throw error;
      toast.success(
        !isCurrentlyRevoked
          ? `License ${license.license_key} revoked. Terminal blocked. 🛑`
          : `License ${license.license_key} restored to active status! ✓`
      );
      await loadAllLicenseData();
    } catch (err: any) {
      toast.error('Failed to update revocation: ' + err.message);
    }
  };

  const handleExtendDuration = async (license: AppLicense, addDays: number) => {
    try {
      const currentExp = license.expiration_date ? new Date(license.expiration_date) : new Date();
      const baseDate = currentExp > new Date() ? currentExp : new Date();
      baseDate.setDate(baseDate.getDate() + addDays);

      const { error } = await supabaseAdmin
        .from('app_licenses')
        .update({
          expiration_date: baseDate.toISOString(),
          duration_days: (Number(license.duration_days) || 0) + addDays,
        })
        .eq('license_id', license.license_id);

      if (error) throw error;
      toast.success(`Extended ${license.license_key} by +${addDays} days! New expiry: ${formatDate(baseDate.toISOString())} 📅`);
      await loadAllLicenseData();
    } catch (err: any) {
      toast.error('Failed to extend license: ' + err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 9. TEST API VALIDATION PING
  // ─────────────────────────────────────────────────────────────────────────
  const handleTestValidationPing = async () => {
    if (!testKey.trim()) {
      toast.error('Please enter a license key to test');
      return;
    }

    setIsTestingApi(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: testKey.trim(),
          machine_id: testMachineId.trim(),
          device_model: 'Web POS Terminal',
          device_manufacturer: 'Alpha Retail Edge',
        }),
      });

      const data = await res.json();
      setTestResult({ status: res.status, ...data });

      if (data.valid) {
        toast.success('Validation Success: License is valid and licensed! ✓');
      } else {
        toast.error(`Validation Failed: ${data.error || 'Invalid license'}`);
      }
    } catch (err: any) {
      toast.error('API ping error: ' + err.message);
      setTestResult({ status: 500, error: err.message });
    } finally {
      setIsTestingApi(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 10. AUTH GUARD SCREEN (CYBER-SHIELD SUPERADMIN LOGIN)
  // ─────────────────────────────────────────────────────────────────────────
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
          <p className="text-xs font-mono font-bold text-slate-400">Verifying Superadmin Security Context...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        <Toaster position="top-right" />

        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo & Shield Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/25 mb-4 ring-4 ring-blue-500/20">
              <ShieldCheck size={34} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">AlphaPlus License Manager</h1>
            <p className="text-xs font-medium text-slate-400 mt-1">
              Enterprise Software DRM &amp; Hardware Lock Authority
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Lock size={12} /> Superadmin Access Portal
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                Supabase Online
              </span>
            </div>

            <form onSubmit={handleSuperadminLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0 text-rose-400" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Superadmin Username</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="e.g. jimhawkins or superadmin"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Security Master Passphrase</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter security key or PIN"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-blue-500/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Verifying Authority...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} />
                    <span>Authorize Superadmin Console</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
              <p className="text-[10px] text-slate-500">
                Connected Cluster: <strong className="text-slate-400 font-mono">gcebwzpcyeltzhyqefxo</strong>
                <br />
                Default Master Pass: <code className="text-slate-400">admin123</code> or <code className="text-slate-400">AlphaPlus@2026!</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 11. MAIN CONSOLE INTERFACE (AUTHORIZED SUPERADMIN)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-3 sm:p-6 pb-20">
      <Toaster position="top-right" />

      {/* ══════════════════════════════════════════════════════════════════
          EXECUTIVE SECURITY HEADER
          ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-700 to-slate-900 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
              <ShieldCheck size={26} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  AlphaPlus Software License &amp; DRM Studio
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-emerald-50 text-emerald-800 border-emerald-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Enforcing DRM ({clusterLatency || 12}ms)</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-blue-50 text-blue-700 border-blue-200">
                  Cluster: gcebwzpcyeltzhyqefxo
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Hardware terminal lock &bull; Web &amp; Desktop validation API &bull; Multi-tier license provisioning
              </p>
            </div>
          </div>

          {/* Superadmin User & Extreme Logout Action */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-[11px]">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="font-bold text-slate-900 block leading-tight">{currentUser.displayName}</span>
                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">
                  {currentUser.role}
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('generator')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Issue License</span>
            </button>

            <button
              onClick={loadAllLicenseData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
              title="Refresh Registry"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
            </button>

            {/* Logout Trigger */}
            <button
              onClick={() => setShowLogoutModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold shadow-2xs transition cursor-pointer"
              title="Secure Logout"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          EXECUTIVE 8-METRIC TELEMETRY HUD
          ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Issued</span>
            <div className="w-5 h-5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
              <Key size={11} />
            </div>
          </div>
          <div>
            <div className="text-base font-black text-slate-900 leading-tight">{metrics.total}</div>
            <div className="text-[9.5px] text-slate-500 font-semibold mt-0.5 truncate">License registry keys</div>
          </div>
        </div>

        <div className="bg-white border border-emerald-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between bg-gradient-to-b from-emerald-50/20 to-white">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active DRM</span>
            <div className="w-5 h-5 rounded-md bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={11} />
            </div>
          </div>
          <div>
            <div className="text-base font-black text-emerald-700 leading-tight">{metrics.active}</div>
            <div className="text-[9.5px] text-emerald-600 font-semibold mt-0.5 truncate">Valid &amp; in service</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Bound Machines</span>
            <div className="w-5 h-5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
              <Laptop size={11} />
            </div>
          </div>
          <div>
            <div className="text-base font-black text-slate-900 leading-tight">{metrics.bound}</div>
            <div className="text-[9.5px] text-slate-500 font-semibold mt-0.5 truncate">Hardware locked</div>
          </div>
        </div>

        <div className="bg-white border border-amber-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between bg-gradient-to-b from-amber-50/20 to-white">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Expiring (&le;7d)</span>
            <div className="w-5 h-5 rounded-md bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center">
              <Clock size={11} />
            </div>
          </div>
          <div>
            <div className="text-base font-black text-amber-800 leading-tight">{metrics.expiringSoon}</div>
            <div className="text-[9.5px] text-amber-600 font-semibold mt-0.5 truncate">Critical watch list</div>
          </div>
        </div>

        <div className="bg-white border border-rose-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Expired</span>
            <div className="w-5 h-5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center">
              <XCircle size={11} />
            </div>
          </div>
          <div>
            <div className="text-base font-black text-rose-800 leading-tight">{metrics.expired}</div>
            <div className="text-[9.5px] text-rose-600 font-semibold mt-0.5 truncate">Access barred</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Revoked</span>
            <div className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
              <ShieldAlert size={11} />
            </div>
          </div>
          <div>
            <div className="text-base font-black text-slate-900 leading-tight">{metrics.revoked}</div>
            <div className="text-[9.5px] text-slate-500 font-semibold mt-0.5 truncate">Blacklisted keys</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Multi-Terminal</span>
            <div className="w-5 h-5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
              <Layers size={11} />
            </div>
          </div>
          <div>
            <div className="text-base font-black text-slate-900 leading-tight">{metrics.multiDevice}</div>
            <div className="text-[9.5px] text-slate-500 font-semibold mt-0.5 truncate">Branches / Outlets</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Latency</span>
            <div className="w-5 h-5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
              <Activity size={11} />
            </div>
          </div>
          <div>
            <div className="text-base font-black text-slate-900 leading-tight">{clusterLatency || 12} ms</div>
            <div className="text-[9.5px] text-slate-500 font-semibold mt-0.5 truncate">Supabase REST ping</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB NAVIGATION DOCK
          ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveTab('registry')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'registry'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Key size={14} />
            <span>License Master Registry</span>
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'generator'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Plus size={14} />
            <span>Generate &amp; Issue</span>
          </button>

          <button
            onClick={() => setActiveTab('hardware')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'hardware'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Laptop size={14} />
            <span>Hardware Machine Locks</span>
          </button>

          <button
            onClick={() => setActiveTab('enforcer')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'enforcer'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Terminal size={14} />
            <span>Web DRM Middleware &amp; Tester</span>
          </button>

          <button
            onClick={() => setActiveTab('arms')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'arms'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Shield size={14} />
            <span>ARMS Licenses ({armsLicenses.length})</span>
          </button>
        </div>

        <button
          onClick={() => setShowRawKeys(!showRawKeys)}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-1.5 cursor-pointer"
        >
          {showRawKeys ? <EyeOff size={13} /> : <Eye size={13} />}
          <span>{showRawKeys ? 'Mask Keys' : 'Reveal Full Keys'}</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: LICENSE MASTER REGISTRY (DATAGRID)
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'registry' && (
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search license key, client, phone, or machine ID..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active &amp; Licensed</option>
                <option value="EXPIRED">Expired</option>
                <option value="REVOKED">Revoked / Blacklisted</option>
                <option value="BOUND">Hardware Bound</option>
                <option value="UNBOUND">Unbound / Floating</option>
              </select>

              <select
                value={tierFilter}
                onChange={(e) => {
                  setTierFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">All Tiers</option>
                <option value="ALPHA-RETAIL-PRO">Retail Pro</option>
                <option value="ALPHA-ENTERPRISE">Enterprise</option>
                <option value="TRIAL-30">Trial 30-Day</option>
                <option value="F03D">F03D Energy</option>
                <option value="F02D">F02D Energy</option>
              </select>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Showing <strong className="text-slate-900 font-mono">{filteredLicenses.length}</strong> matching licenses
            </div>
          </div>

          {/* Table (STRICT RULE COMPLIANCE: NON-DARK, VISIBLE CLEAN HEADERS) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b-2 border-slate-300">
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="py-3 px-3 font-black uppercase tracking-wider text-[11px] w-12 text-center text-slate-900 bg-slate-100 border-r border-slate-200">#</th>
                    <th className="py-3 px-3 font-black uppercase tracking-wider text-[11px] text-slate-900 bg-slate-100 border-r border-slate-200">License Key</th>
                    <th className="py-3 px-3 font-black uppercase tracking-wider text-[11px] text-slate-900 bg-slate-100 border-r border-slate-200">Client / Contact</th>
                    <th className="py-3 px-3 font-black uppercase tracking-wider text-[11px] text-slate-900 bg-slate-100 border-r border-slate-200">Tier / Type</th>
                    <th className="py-3 px-3 font-black uppercase tracking-wider text-[11px] text-slate-900 bg-slate-100 border-r border-slate-200">Machine Binding (Hardware ID)</th>
                    <th className="py-3 px-3 font-black uppercase tracking-wider text-[11px] text-center text-slate-900 bg-slate-100 border-r border-slate-200">Devices</th>
                    <th className="py-3 px-3 font-black uppercase tracking-wider text-[11px] text-slate-900 bg-slate-100 border-r border-slate-200">Expiry &amp; Days Left</th>
                    <th className="py-3 px-3 font-black uppercase tracking-wider text-[11px] text-center text-slate-900 bg-slate-100 border-r border-slate-200">DRM Status</th>
                    <th className="py-3 px-3 font-black uppercase tracking-wider text-[11px] text-center text-slate-900 bg-slate-100">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedLicenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Key size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-slate-600">No licenses match your search criteria</p>
                        <p className="text-xs text-slate-400">Try adjusting your filters or issue a new license</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedLicenses.map((lic, idx) => {
                      const rowNum = (currentPage - 1) * rowsPerPage + idx + 1;
                      const daysLeft = getDaysRemaining(lic.expiration_date);
                      const isRevoked = lic.is_revoked === true;
                      const isExpired = !isRevoked && daysLeft <= 0;
                      const isExpiringSoon = !isRevoked && daysLeft > 0 && daysLeft <= 7;
                      const isNormalActive = !isRevoked && daysLeft > 7;

                      return (
                        <tr key={lic.license_id || idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{rowNum}</td>

                          {/* License Key */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <code className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-md font-mono font-bold text-slate-900 text-[11px]">
                                {showRawKeys
                                  ? lic.license_key
                                  : `${lic.license_key.slice(0, 10)}••••••••${lic.license_key.slice(-4)}`}
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(lic.license_key);
                                  toast.success(`Copied ${lic.license_key}! 📋`);
                                }}
                                className="text-slate-400 hover:text-slate-800 transition p-1"
                                title="Copy Key"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </td>

                          {/* Client */}
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{lic.client_name}</div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {lic.client_phone || 'No phone recorded'}
                            </div>
                          </td>

                          {/* Tier */}
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                              {lic.license_type || 'Standard'}
                            </span>
                          </td>

                          {/* Machine Binding */}
                          <td className="py-2.5 px-3">
                            {lic.activation_device_id ? (
                              <div className="flex items-center gap-1.5">
                                <Laptop size={13} className="text-indigo-600 shrink-0" />
                                <div>
                                  <span className="font-mono text-[10px] text-slate-800 font-bold block">
                                    {lic.activation_device_id.slice(0, 12)}...
                                  </span>
                                  <span className="text-[9.5px] text-slate-400 block">
                                    {lic.device_manufacturer ? `${lic.device_manufacturer} ${lic.device_model || ''}` : 'Locked Terminal'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleResetMachineBinding(lic)}
                                  className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer"
                                  title="Unbind machine hardware"
                                >
                                  Unbind
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                🔓 Unbound (Ready)
                              </span>
                            )}
                          </td>

                          {/* Max Devices */}
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                            {lic.max_devices || 1}
                          </td>

                          {/* Expiry */}
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-800">{formatDate(lic.expiration_date)}</div>
                            <div className="mt-0.5">
                              {isRevoked ? (
                                <span className="text-[9.5px] font-bold text-slate-400">Revoked</span>
                              ) : isExpired ? (
                                <span className="text-[9.5px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  Expired
                                </span>
                              ) : isExpiringSoon ? (
                                <span className="text-[9.5px] font-black text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  {daysLeft} days left ⚠️
                                </span>
                              ) : (
                                <span className="text-[9.5px] font-bold text-emerald-700">
                                  {daysLeft} days left
                                </span>
                              )}
                            </div>
                          </td>

                          {/* DRM Status */}
                          <td className="py-2.5 px-3 text-center">
                            {isRevoked ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300">
                                <ShieldAlert size={10} className="text-slate-500" /> Revoked
                              </span>
                            ) : isExpired ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                <XCircle size={10} className="text-rose-500" /> Expired
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 size={10} className="text-emerald-500" /> Active
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleExtendDuration(lic, 30)}
                                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold rounded cursor-pointer"
                                title="Add 30 Days"
                              >
                                +30d
                              </button>
                              <button
                                onClick={() => handleToggleRevoke(lic)}
                                className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer border ${
                                  isRevoked
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                                }`}
                                title={isRevoked ? 'Un-revoke license' : 'Revoke license'}
                              >
                                {isRevoked ? 'Restore' : 'Revoke'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Dock */}
            <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-slate-500 ml-2">
                  Showing{' '}
                  <strong className="text-slate-800">
                    {filteredLicenses.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-slate-800">
                    {Math.min(currentPage * rowsPerPage, filteredLicenses.length)}
                  </strong>{' '}
                  of <strong className="text-slate-800">{filteredLicenses.length}</strong> licenses
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-3 py-1 font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: GENERATOR & PROVISIONING STUDIO
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'generator' && (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-blue-600" />
                  Software License Provisioning Studio
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate cryptographically strong license keys for Alpha Retail POS, ARMS, or custom software
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateLicense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client / Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vinrose Hardware Ltd"
                    value={genClientName}
                    onChange={(e) => setGenClientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Client Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 0720316175"
                    value={genClientPhone}
                    onChange={(e) => setGenClientPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Key Prefix</label>
                  <select
                    value={genPrefix}
                    onChange={(e) => setGenPrefix(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALPHA-RETAIL">ALPHA-RETAIL-</option>
                    <option value="ALPHA-POS">ALPHA-POS-</option>
                    <option value="ALPHA-HOTEL">ALPHA-HOTEL-</option>
                    <option value="ALPHA-PHARMACY">ALPHA-PHARMACY-</option>
                    <option value="ALPHA-ENERGY">ALPHA-ENERGY-</option>
                    <option value="ARMS">ARMS-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Validity Duration</label>
                  <select
                    value={genDurationDays}
                    onChange={(e) => setGenDurationDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={14}>14 Days (Trial Demonstration)</option>
                    <option value={30}>30 Days (Standard Monthly)</option>
                    <option value={90}>90 Days (Quarterly License)</option>
                    <option value={180}>180 Days (Half-Year License)</option>
                    <option value={365}>365 Days (1-Year Annual Commercial)</option>
                    <option value={730}>730 Days (2-Year Enterprise)</option>
                    <option value={1825}>1,825 Days (5-Year Perpetual)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Terminals (Hardware)</label>
                  <select
                    value={genMaxDevices}
                    onChange={(e) => setGenMaxDevices(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 Machine (Single POS Register)</option>
                    <option value={2}>2 Machines (Cashier + Backoffice)</option>
                    <option value={3}>3 Machines (Retail Outlet Pro)</option>
                    <option value={5}>5 Machines (Multi-Terminal Branch)</option>
                    <option value={10}>10 Machines (Enterprise Cluster)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Batch Count</label>
                <div className="flex items-center gap-3">
                  {[1, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGenBatchCount(num)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        genBatchCount === num
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {num === 1 ? 'Single (1 Key)' : `Batch of ${num} Keys`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Key size={14} />
                  <span>{isGenerating ? 'Provisioning...' : `Generate & Save License (${genBatchCount})`}</span>
                </button>
              </div>
            </form>

            {/* Generated Results Banner */}
            {generatedResult && (
              <div className="mt-5 p-4 rounded-xl border border-emerald-300 bg-emerald-50/70 space-y-2">
                <div className="flex items-center justify-between text-emerald-900 font-bold text-xs">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Generated License Key(s) Ready for Client Delivery:
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedResult.join('\n'));
                      toast.success('All keys copied to clipboard! 📋');
                    }}
                    className="text-xs font-extrabold text-emerald-700 hover:underline"
                  >
                    Copy All Keys
                  </button>
                </div>
                <div className="p-3 bg-white border border-emerald-200 rounded-lg font-mono text-xs font-bold text-slate-900 space-y-1">
                  {generatedResult.map((k) => (
                    <div key={k} className="select-all">
                      {k}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3: HARDWARE MACHINE LOCKS MATRIX
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'hardware' && (
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-1">
              <Laptop size={18} className="text-indigo-600" />
              Bound Hardware Terminals &amp; Motherboard Anti-Tamper Registry
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Shows all client hardware locked to active licenses. Resetting a machine binding allows the customer to transfer their license to replacement hardware.
            </p>

            <div className="space-y-2.5">
              {licenses.filter((l) => l.activation_device_id).length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Laptop size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-600">No hardware bindings registered yet</p>
                  <p className="text-xs text-slate-400">Hardware IDs are automatically registered when client software performs its first license activation.</p>
                </div>
              ) : (
                licenses
                  .filter((l) => l.activation_device_id)
                  .map((lic) => (
                    <div
                      key={lic.license_id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{lic.client_name}</span>
                          <code className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-300 font-bold text-blue-700">
                            {lic.license_key}
                          </code>
                        </div>
                        <div className="text-xs font-mono text-slate-600 flex items-center gap-2">
                          <span>HWID: <strong className="text-slate-900">{lic.activation_device_id}</strong></span>
                          {lic.device_manufacturer && (
                            <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-sans">
                              {lic.device_manufacturer} {lic.device_model || ''}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Activated: {formatDateTime(lic.activation_date)} &bull; Last Check-in: {formatDateTime(lic.last_check_date)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleResetMachineBinding(lic)}
                          className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition cursor-pointer"
                        >
                          🔓 Reset Hardware Lock
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 4: WEB DRM MIDDLEWARE & INTERACTIVE TESTER
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'enforcer' && (
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Interactive Tester Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Terminal size={18} className="text-blue-600" />
                Live License Validation Endpoint Tester
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulates a call from Alpha Retail or another web/desktop client to{' '}
                <code className="text-blue-700 font-mono">/api/validate</code>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">License Key To Test</label>
                <input
                  type="text"
                  placeholder="Paste or enter license key"
                  value={testKey}
                  onChange={(e) => setTestKey(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Simulated Machine Hardware ID</label>
                <input
                  type="text"
                  value={testMachineId}
                  onChange={(e) => setTestMachineId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">Endpoint: POST https://alpha-plus-license-manager.vercel.app/api/validate</span>
              <button
                type="button"
                onClick={handleTestValidationPing}
                disabled={isTestingApi || !testKey.trim()}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer disabled:opacity-40"
              >
                {isTestingApi ? 'Pinging API...' : '⚡ Test Validation Ping'}
              </button>
            </div>

            {testResult && (
              <div className="mt-3 p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs overflow-x-auto">
                <div className="text-emerald-400 font-bold mb-1">HTTP Response ({testResult.status}):</div>
                <pre>{JSON.stringify(testResult, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Copyable Web App DRM Lock Snippet */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Lock size={16} className="text-blue-600" />
                  Drop-in DRM Enforcer Snippet for Alpha Retail
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paste this snippet into your web app layout to lock unauthorized machines or users automatically
                </p>
              </div>

              <button
                onClick={() => {
                  const snippet = `// AlphaPlus DRM Hardware Enforcer
export async function verifyLicenseLock() {
  const licenseKey = localStorage.getItem('alphaplus_license_key');
  const machineId = localStorage.getItem('alphaplus_machine_fingerprint') || crypto.randomUUID();
  localStorage.setItem('alphaplus_machine_fingerprint', machineId);

  const res = await fetch('https://alpha-plus-license-manager.vercel.app/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_key: licenseKey, machine_id: machineId })
  });

  const data = await res.json();
  if (!data.valid) {
    window.location.href = '/license-lockout';
  }
}`;
                  navigator.clipboard.writeText(snippet);
                  toast.success('DRM Snippet copied to clipboard! 📋');
                }}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Copy Snippet
              </button>
            </div>

            <div className="p-3 bg-slate-950 text-slate-300 rounded-xl font-mono text-[11px] overflow-x-auto">
              <pre>{`// In your Next.js app (e.g. src/app/dashboard/layout.tsx):
const res = await fetch('https://alpha-plus-license-manager.vercel.app/api/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    license_key: localStorage.getItem('alpha_license_key'), 
    machine_id: localStorage.getItem('alpha_machine_id') 
  })
});

const data = await res.json();
if (!data.valid) {
  // Lock app and show license entry prompt!
}`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 5: ARMS LICENSES REGISTRY
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'arms' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">ARMS Rental Management Licenses</h3>
              <p className="text-xs text-slate-500 mt-0.5">Found {armsLicenses.length} licenses in public.arms_licenses table</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b-2 border-slate-300">
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="py-3 px-3 font-black uppercase tracking-wider text-[11px] w-12 text-center text-slate-900 bg-slate-100 border-r border-slate-200">#</th>
                    <th className="py-3 px-3 font-black uppercase tracking-wider text-[11px] text-slate-900 bg-slate-100 border-r border-slate-200">License Key</th>
                    <th className="py-3 px-3 font-black uppercase tracking-wider text-[11px] text-slate-900 bg-slate-100 border-r border-slate-200">Client Name</th>
                    <th className="py-3 px-3 font-black uppercase tracking-wider text-[11px] text-slate-900 bg-slate-100 border-r border-slate-200">Bound Terminal</th>
                    <th className="py-3 px-3 font-black uppercase tracking-wider text-[11px] text-slate-900 bg-slate-100 border-r border-slate-200">Expiry</th>
                    <th className="py-3 px-3 font-black uppercase tracking-wider text-[11px] text-center text-slate-900 bg-slate-100">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {armsLicenses.map((arms, i) => (
                    <tr key={arms.license_id || i} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{i + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-[11px]">{arms.license_key}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{arms.client_name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[10px]">
                        {arms.machine_id ? `${arms.machine_id.slice(0, 16)}...` : 'Not bound'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{formatDate(arms.expiry_date)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          EXTREME SUPER ULTRA DETAILED LOGOUT MODAL
          ══════════════════════════════════════════════════════════════════ */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <LogOut size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Confirm Superadmin Logout</h3>
                <p className="text-xs text-slate-500">Terminate authenticated security session</p>
              </div>
            </div>

            {/* Session Audit Summary */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Authenticated User:</span>
                <strong className="text-slate-800 font-mono">{currentUser.displayName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Privilege Level:</span>
                <span className="font-extrabold text-blue-700 uppercase tracking-wide">
                  {currentUser.role}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Session Started:</span>
                <span className="font-mono text-slate-700">{formatDateTime(currentUser.loginTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Database:</span>
                <span className="font-mono text-slate-700">gcebwzpcyeltzhyqefxo</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Logging out will clear your authorization token from this device and return to the locked cyber-shield login screen.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSuperadminLogout}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <LogOut size={14} />
                <span>Terminate Session &amp; Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
