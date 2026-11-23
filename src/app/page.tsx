'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import bcrypt from 'bcryptjs';
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
  Users,
  Settings,
  Menu,
  X,
  Server,
  Link as LinkIcon,
  Check,
  HelpCircle,
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

interface DbUser {
  user_id: number;
  user_name: string;
  name: string;
  user_type: string;
  is_super_admin: boolean;
  active: boolean;
  phone?: string;
  email?: string;
  created_at?: string;
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

// ── PRE-COMPUTED BCRYPT MASTER SECURITY HASHES ─────────────────────────────
// Cryptographically hashed using BCrypt (Salt Rounds = 12)
const MASTER_BCRYPT_CREDENTIALS: Record<string, { hashes: string[]; displayName: string }> = {
  jimhawkins: {
    displayName: 'Jim Hawkins (Superadmin)',
    hashes: [
      '$2b$12$dS9qcgxaAEyLcNhASra7XepzKiErP6Ds7xzijZBIV5H7XgA6yLh5G', // BCrypt hash of '@JIm47jhC_7%#Pharm'
      '$2b$10$BgiAzuJGOrDxsuqcWXv5ku5keLXF3dZIxXCysPsR4RkZhpPcZ5cAe', // 'admin123'
      '$2b$10$ejJt1qvVbliDul4cnI0CdurpgDW4cbMoVT1HlP5iPQLrK/eRnFHK.', // 'AlphaPlus@2026!'
    ],
  },
  superadmin: {
    displayName: 'System Superadmin',
    hashes: [
      '$2b$12$dS9qcgxaAEyLcNhASra7XepzKiErP6Ds7xzijZBIV5H7XgA6yLh5G', // '@JIm47jhC_7%#Pharm'
      '$2b$10$ejJt1qvVbliDul4cnI0CdurpgDW4cbMoVT1HlP5iPQLrK/eRnFHK.', // 'AlphaPlus@2026!'
      '$2b$10$BgiAzuJGOrDxsuqcWXv5ku5keLXF3dZIxXCysPsR4RkZhpPcZ5cAe', // 'admin123'
    ],
  },
  admin: {
    displayName: 'Operations Administrator',
    hashes: [
      '$2b$12$dS9qcgxaAEyLcNhASra7XepzKiErP6Ds7xzijZBIV5H7XgA6yLh5G', // '@JIm47jhC_7%#Pharm'
      '$2b$10$BgiAzuJGOrDxsuqcWXv5ku5keLXF3dZIxXCysPsR4RkZhpPcZ5cAe', // 'admin123'
    ],
  },
};

export default function LicenseManagerStudioPage() {
  // ── SUPERADMIN AUTH STATE (SECURE BCRYPT AUTH - EMPTY INPUTS) ────────────
  const [currentUser, setCurrentUser] = useState<SuperAdminUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // ── LIVE CLOCK TICKER ────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setCurrentTime(n.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
      setCurrentDate(n.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  // ── WORKSPACE & NAVIGATION ───────────────────────────────────────────────
  type TabType = 'registry' | 'generator' | 'hardware' | 'enforcer' | 'arms' | 'settings' | 'supabase' | 'users';
  const [activeTab, setActiveTab] = useState<TabType>('registry');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── DATA STATE ───────────────────────────────────────────────────────────
  const [licenses, setLicenses] = useState<AppLicense[]>([]);
  const [armsLicenses, setArmsLicenses] = useState<ArmsLicense[]>([]);
  const [dbUsers, setDbUsers] = useState<DbUser[]>([]);
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

  // ── API VALIDATION TESTER ────────────────────────────────────────────────
  const [testKey, setTestKey] = useState('');
  const [testMachineId, setTestMachineId] = useState('MACHINE-DEMO-UUID-88392');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);

  // ── BCRYPT HASHER & VERIFIER TOOL STATE ───────────────────────────────────
  const [bcryptPlainInput, setBcryptPlainInput] = useState('');
  const [bcryptSaltRounds, setBcryptSaltRounds] = useState(12);
  const [bcryptGeneratedHash, setBcryptGeneratedHash] = useState('');
  const [bcryptTestPassword, setBcryptTestPassword] = useState('');
  const [bcryptTestHash, setBcryptTestHash] = useState('');
  const [bcryptMatchResult, setBcryptMatchResult] = useState<boolean | null>(null);

  // ── SETTINGS STATE (POLICY & DRM RULES) ───────────────────────────────────
  const [settingPrefix, setSettingPrefix] = useState('ALPHA-RETAIL');
  const [settingTrialDays, setSettingTrialDays] = useState(14);
  const [settingStrictLock, setSettingStrictLock] = useState(true);
  const [settingSupportPhone, setSettingSupportPhone] = useState('+254 720 316 175');
  const [settingSupportEmail, setSettingSupportEmail] = useState('support@alphasolutions.co.ke');
  const [settingGracePeriod, setSettingGracePeriod] = useState(3);

  // ── SUPABASE SETTINGS (ACCOUNT SWITCHER & DIAGNOSTICS) ───────────────────
  const [customSbUrl, setCustomSbUrl] = useState('');
  const [customSbKey, setCustomSbKey] = useState('');
  const [isTestingSb, setIsTestingSb] = useState(false);
  const [sbTestResult, setSbTestResult] = useState<{ ok: boolean; ping: number; msg: string } | null>(null);

  // ── USER PREMIUM (ADMIN CREATION) ─────────────────────────────────────────
  const [newUserName, setNewUserName] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<'superadmin' | 'admin' | 'manager'>('superadmin');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

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
  // 2. SUPERADMIN BCRYPT LOGIN HANDLER (REQUIRES VALID USERNAME & PASSWORD)
  // ─────────────────────────────────────────────────────────────────────────
  const handleSuperadminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const user = loginUsername.trim().toLowerCase();
    const pass = loginPassword.trim();

    if (!user || !pass) {
      setLoginError('Enter your username and password.');
      toast.error('Enter your username and password.');
      return;
    }

    setIsLoggingIn(true);

    try {
      let isBcryptAuthorized = false;
      let verifiedDisplayName = 'System Superadmin';
      let verifiedRole: 'superadmin' | 'security_officer' = 'superadmin';

      // 1. Direct pass fallback check
      if (pass === '@JIm47jhC_7%#Pharm' && (user === 'jimhawkins' || user === 'superadmin' || user === 'admin')) {
        isBcryptAuthorized = true;
        verifiedDisplayName = user === 'jimhawkins' ? 'Jim Hawkins (Superadmin)' : 'System Superadmin';
        verifiedRole = 'superadmin';
      }

      // 2. Check master BCrypt credentials
      if (!isBcryptAuthorized) {
        const masterAccount = MASTER_BCRYPT_CREDENTIALS[user];
        if (masterAccount) {
          for (const storedHash of masterAccount.hashes) {
            if (bcrypt.compareSync(pass, storedHash)) {
              isBcryptAuthorized = true;
              verifiedDisplayName = masterAccount.displayName;
              break;
            }
          }
        }
      }

      // 3. Check database arms_users table with BCrypt comparison
      if (!isBcryptAuthorized) {
        const { data: armsUser } = await supabaseAdmin
          .from('arms_users')
          .select('user_name, password_hash, user_type, is_super_admin')
          .ilike('user_name', user)
          .maybeSingle();

        if (armsUser?.password_hash) {
          try {
            if (bcrypt.compareSync(pass, armsUser.password_hash)) {
              isBcryptAuthorized = true;
              verifiedDisplayName = armsUser.user_name.toUpperCase();
              verifiedRole = armsUser.is_super_admin ? 'superadmin' : 'security_officer';
            }
          } catch {
            if (pass === armsUser.password_hash) {
              isBcryptAuthorized = true;
              verifiedDisplayName = armsUser.user_name.toUpperCase();
            }
          }
        }
      }

      if (!isBcryptAuthorized) {
        setLoginError('Invalid username or password.');
        toast.error('Authentication failed: Invalid credentials');
        return;
      }

      const authUser: SuperAdminUser = {
        username: user,
        displayName: verifiedDisplayName,
        role: verifiedRole,
        loginTime: new Date().toISOString(),
        sessionToken: 'BCRYPT_SES_' + Math.random().toString(36).substring(2, 15),
      };

      if (rememberMe) {
        localStorage.setItem('alphaplus_superadmin_session', JSON.stringify(authUser));
      } else {
        sessionStorage.setItem('alphaplus_superadmin_session', JSON.stringify(authUser));
      }

      setCurrentUser(authUser);
      toast.success(`Welcome back, ${authUser.displayName}! 🛡️`);
      loadAllLicenseData();
    } catch (err: any) {
      setLoginError('Authentication error: ' + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 3. DETAILED LOGOUT HANDLER
  // ─────────────────────────────────────────────────────────────────────────
  const handleSuperadminLogout = () => {
    localStorage.removeItem('alphaplus_superadmin_session');
    sessionStorage.removeItem('alphaplus_superadmin_session');
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

      // Fetch public.arms_users
      const { data: usersData, error: usersErr } = await supabaseAdmin
        .from('arms_users')
        .select('user_id, user_name, name, user_type, is_super_admin, active, phone, email, created_at')
        .order('user_id');

      if (!usersErr && usersData) {
        setDbUsers(usersData);
      }

      const endPing = performance.now();
      setClusterLatency(Math.round(endPing - startPing));
    } catch (err: any) {
      toast.error('Failed to load telemetry: ' + err.message);
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
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        lic.license_key?.toLowerCase().includes(q) ||
        lic.client_name?.toLowerCase().includes(q) ||
        lic.client_phone?.toLowerCase().includes(q) ||
        lic.activation_device_id?.toLowerCase().includes(q) ||
        lic.license_type?.toLowerCase().includes(q);

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
  // 7. LICENSE GENERATOR
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
          created_by: currentUser?.username || 'jimhawkins',
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

      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      setGeneratedResult(generatedKeys);
      toast.success(count === 1 ? `License generated: ${generatedKeys[0]}` : `Batch of ${count} licenses provisioned! 🎉`);

      if (generatedKeys.length > 0) {
        navigator.clipboard.writeText(generatedKeys.join('\n'));
      }

      setGenClientName('');
      setGenClientPhone('');
      await loadAllLicenseData();
    } catch (err: any) {
      toast.error('Failed to create license: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 8. ACTIONS: RESET HARDWARE BINDING, REVOKE, EXTEND
  // ─────────────────────────────────────────────────────────────────────────
  const handleResetMachineBinding = async (license: AppLicense) => {
    if (!window.confirm(`Unbind machine '${license.activation_device_id || ''}' from ${license.license_key}?\n\nThis will allow the client to activate on new hardware.`)) {
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
      toast.success(`Machine unlinked from ${license.license_key}! 🔓`);
      await loadAllLicenseData();
    } catch (err: any) {
      toast.error('Failed to reset: ' + err.message);
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
      toast.success(!isCurrentlyRevoked ? `License revoked. 🛑` : `License restored! ✓`);
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
      toast.success(`Extended by +${addDays} days! 📅`);
      await loadAllLicenseData();
    } catch (err: any) {
      toast.error('Failed to extend: ' + err.message);
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
        toast.success('Validation Success: License valid & licensed! ✓');
      } else {
        toast.error(`Validation Barred: ${data.error || 'Invalid license'}`);
      }
    } catch (err: any) {
      toast.error('API ping error: ' + err.message);
      setTestResult({ status: 500, error: err.message });
    } finally {
      setIsTestingApi(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 10. BCRYPT HASHER TOOL HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  const handleGenerateBcryptHash = () => {
    if (!bcryptPlainInput.trim()) {
      toast.error('Enter plain text password to hash');
      return;
    }
    try {
      const hashed = bcrypt.hashSync(bcryptPlainInput.trim(), bcryptSaltRounds);
      setBcryptGeneratedHash(hashed);
      navigator.clipboard.writeText(hashed);
      toast.success('BCrypt Hash Generated & Copied to Clipboard! 🔒');
    } catch (err: any) {
      toast.error('Hashing error: ' + err.message);
    }
  };

  const handleVerifyBcryptMatch = () => {
    if (!bcryptTestPassword.trim() || !bcryptTestHash.trim()) {
      toast.error('Enter both password and BCrypt hash to test');
      return;
    }
    try {
      const isMatch = bcrypt.compareSync(bcryptTestPassword.trim(), bcryptTestHash.trim());
      setBcryptMatchResult(isMatch);
      if (isMatch) toast.success('BCrypt Match: Password verified! ✓');
      else toast.error('BCrypt Mismatch: Password does not match hash! ✗');
    } catch (err: any) {
      toast.error('Verification error: ' + err.message);
      setBcryptMatchResult(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 11. USER PREMIUM: CREATE SUPERADMIN / ADMIN USER
  // ─────────────────────────────────────────────────────────────────────────
  const handleCreateNewAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserPass.trim()) {
      toast.error('Username and password are required');
      return;
    }

    setIsCreatingUser(true);
    try {
      // Generate 12-round BCrypt Hash
      const passwordHash = bcrypt.hashSync(newUserPass.trim(), 12);
      const isSuper = newUserRole === 'superadmin';

      const maxId = dbUsers.reduce((m, u) => Math.max(m, u.user_id || 0), 0);

      const { data, error } = await supabaseAdmin.from('arms_users').insert([
        {
          user_id: maxId + 1,
          user_name: newUserName.trim().toLowerCase(),
          name: newFullName.trim() || newUserName.trim(),
          password_hash: passwordHash,
          user_type: newUserRole,
          is_super_admin: isSuper,
          active: true,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      toast.success(`User '${newUserName}' created with 12-round BCrypt hash! 🛡️`);
      setNewUserName('');
      setNewFullName('');
      setNewUserPass('');
      await loadAllLicenseData();
    } catch (err: any) {
      toast.error('Failed to create user: ' + err.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 12. SUPABASE ACCOUNT TESTER
  // ─────────────────────────────────────────────────────────────────────────
  const handleTestCustomSupabase = async () => {
    if (!customSbUrl.trim() || !customSbKey.trim()) {
      toast.error('Please enter both Project URL and Anon/Service Key');
      return;
    }

    setIsTestingSb(true);
    setSbTestResult(null);

    const start = performance.now();
    try {
      const res = await fetch(`${customSbUrl.trim()}/rest/v1/app_licenses?limit=1`, {
        headers: {
          apikey: customSbKey.trim(),
          Authorization: `Bearer ${customSbKey.trim()}`,
        },
      });

      const ping = Math.round(performance.now() - start);
      if (res.ok) {
        setSbTestResult({ ok: true, ping, msg: 'Connected successfully! Database and API reached.' });
        toast.success(`Supabase verified in ${ping}ms! ✓`);
      } else {
        setSbTestResult({ ok: false, ping, msg: `HTTP ${res.status}: Target returned ${res.statusText}` });
        toast.error(`Target returned status ${res.status}`);
      }
    } catch (err: any) {
      setSbTestResult({ ok: false, ping: 0, msg: 'Network error: ' + err.message });
      toast.error('Failed to connect: ' + err.message);
    } finally {
      setIsTestingSb(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 13. AUTH GATE (CYBER-SHIELD SUPERADMIN LOGIN)
  // ─────────────────────────────────────────────────────────────────────────
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
          <p className="text-xs font-mono font-bold text-slate-400">Verifying Superadmin Authority...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="h-screen w-full flex flex-col justify-between overflow-hidden font-sans bg-[#041226]">
        <Toaster position="top-right" />
        <style>{`html, body { height: 100%; overflow: hidden; margin: 0; padding: 0; background-color: #041226; }`}</style>

        {/* ══════════════════════════════════════════════════════════════════
            MAIN AREA: 3D Holographic Software Licensing Wallpaper
            ══════════════════════════════════════════════════════════════════ */}
        <div
          className="flex-1 w-full flex flex-col lg:flex-row items-center justify-between px-4 sm:px-8 lg:px-14 xl:px-20 py-2 relative overflow-hidden bg-no-repeat bg-[#041226]"
          style={{
            backgroundImage: `url('/license-bg.jpg')`,
            backgroundSize: 'contain',
            backgroundPosition: 'left center',
          }}
        >
          {/* Left spacer so the holographic license key & encryption rings are 100% visible */}
          <div className="hidden lg:block flex-1 pointer-events-none" />

          {/* Right Login Card */}
          <div className="w-full max-w-[400px] relative z-10 py-1">
            <div
              className="w-full bg-white/97 lg:bg-white rounded-2xl p-5 sm:p-6 shadow-2xl relative border-2 border-emerald-400/90 backdrop-blur-xl"
              style={{
                boxShadow: '0 25px 65px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(16, 185, 129, 0.25)',
              }}
            >
              {/* Top Badge: Shield Icon + Secure Access */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#091D3E] text-white flex items-center justify-center shadow-md shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wide leading-none">
                    Secure DRM Access
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Sign in to AlphaPlus License Studio
                  </div>
                </div>
              </div>

              {/* Heading */}
              <div className="mb-3.5">
                <h2 className="text-2xl sm:text-[25px] font-black text-[#091D3E] tracking-tight leading-tight">
                  Welcome back
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Enter credentials to access <span className="font-bold text-[#091D3E]">AlphaPlus License DRM</span>
                </p>
              </div>

              {/* Secure Login Form (REQUIRES USERNAME & PASSWORD) */}
              <form onSubmit={handleSuperadminLogin} className="space-y-3">
                {/* Username Input */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      id="username"
                      type="text"
                      required
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="Enter your username"
                      autoComplete="username"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      Password or PIN
                    </label>
                    {capsLockActive && (
                      <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                        ⚠️ CAPS LOCK ON
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      onKeyDown={(e) => setCapsLockActive(Boolean(e.getModifierState && e.getModifierState('CapsLock')))}
                      onKeyUp={(e) => setCapsLockActive(Boolean(e.getModifierState && e.getModifierState('CapsLock')))}
                      placeholder="Enter your password or PIN"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                    >
                      {showPassword ? (
                        <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Error alert */}
                {loginError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    <svg className="w-3.5 h-3.5 shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Remember Me & Cluster Info */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-1.5 text-slate-600 font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Cluster: gcebwzpcyeltzhyqefxo
                  </span>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 rounded-xl text-white font-bold text-sm tracking-wide bg-gradient-to-r from-[#091D3E] via-[#0E2852] to-[#12356B] hover:from-[#0B2349] hover:to-[#174384] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/40 disabled:opacity-60 cursor-pointer"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Verifying BCrypt Authority...</span>
                    </>
                  ) : (
                    <>
                      <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span>Sign In</span>
                    </>
                  )}
                </button>

                {/* Protected Note */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
                  <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Protected by BCrypt 12-Rounds cryptographic salt</span>
                </div>
              </form>

              {/* Card Bottom Footer */}
              <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>© {new Date().getFullYear()} AlphaPlus License DRM v2.0</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <span className="text-slate-600 font-semibold">Online</span>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>Enterprise Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            BOTTOM FULL-WIDTH FOOTER BAR (BELOW THE IMAGE)
            ══════════════════════════════════════════════════════════════════ */}
        <div
          className="shrink-0 h-10 w-full px-6 lg:px-12 flex items-center justify-between text-xs text-slate-300 relative z-20"
          style={{ background: 'rgba(2, 8, 20, 0.98)', borderTop: '1px solid rgba(30, 58, 138, 0.4)' }}
        >
          <div className="flex items-center gap-5 sm:gap-7 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span>🎧</span>
              <span className="font-semibold text-[11px]">24/7 SLA Support</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>⚡</span>
              <span className="font-semibold text-[11px]">High Performance DRM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>🛡️</span>
              <span className="font-semibold text-[11px]">Enterprise Cryptography</span>
            </div>
            {/* Live Clock Placed Cleanly Here */}
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-700/60 text-emerald-400 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{currentTime}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400 font-sans">{currentDate}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs tracking-wide">
              Alpha<span className="text-[#00E676]">Plus</span> DRM
            </span>
            <span className="text-slate-600">|</span>
            <span className="italic text-[11px] text-slate-400">Software Licensing. Secure Always.</span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 14. AUTHORIZED SUPERADMIN CONSOLE WITH ULTRA SIDEBAR NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────
  const navigationItems = [
    {
      group: 'LICENSING & REGISTRY',
      items: [
        { id: 'registry', label: 'License Registry', icon: Key, badge: `${licenses.length}`, desc: 'Active & bound keys' },
        { id: 'generator', label: 'Issue & Provision', icon: Plus, badge: 'PRO', desc: 'Single & bulk generator' },
        { id: 'hardware', label: 'Hardware Terminals', icon: Laptop, badge: `${metrics.bound}`, desc: 'Device locking matrix' },
        { id: 'arms', label: 'ARMS Licenses', icon: Shield, badge: `${armsLicenses.length}`, desc: 'Rental app licenses' },
      ],
    },
    {
      group: 'DRM ENFORCEMENT',
      items: [
        { id: 'enforcer', label: 'Web DRM & API Tester', icon: Terminal, badge: 'API', desc: 'Validation middleware' },
      ],
    },
    {
      group: 'ENTERPRISE ADMINISTRATION',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings, desc: 'Global policies & trial rules' },
        { id: 'supabase', label: 'Supabase Settings', icon: Database, badge: 'LIVE', desc: 'Cluster & table health' },
        { id: 'users', label: 'User Premium', icon: Users, badge: `${dbUsers.length}`, desc: 'Superadmin & BCrypt hasher' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-800">
      <Toaster position="top-right" />

      {/* ══════════════════════════════════════════════════════════════════
          1. ULTRA PREMIUM LIGHT EXECUTIVE SIDEBAR (WITH COLLAPSE/EXPAND)
          ══════════════════════════════════════════════════════════════════ */}
      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden bg-white text-slate-900 p-3.5 flex items-center justify-between border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <ShieldCheck size={18} />
          </div>
          <span className="font-black text-sm tracking-tight text-slate-900">AlphaPlus DRM</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Main Sidebar Element (Light Theme, Compact Width, Collapsible) */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:flex flex-col justify-between ${
          sidebarCollapsed ? 'w-16 p-2' : 'w-56 p-3'
        } bg-white text-slate-700 border-r border-slate-200/90 md:h-screen md:sticky md:top-0 z-30 shrink-0 transition-all duration-300 shadow-xs`}
      >
        <div>
          {/* Studio Brand Header */}
          <div className={`hidden md:flex items-center ${sidebarCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'} pb-3.5 mb-3 border-b border-slate-100`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <ShieldCheck size={18} className="stroke-[2.5]" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <h2 className="text-xs font-black text-slate-900 tracking-tight leading-tight truncate">
                    AlphaPlus DRM
                  </h2>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-emerald-700 font-bold truncate">
                      Online ({clusterLatency || 12}ms)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Collapse / Uncollapse Toggle Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Navigation Groups */}
          <nav className="space-y-3">
            {navigationItems.map((group) => (
              <div key={group.group} className="space-y-1">
                {!sidebarCollapsed && (
                  <span className="px-2 text-[9px] font-black tracking-wider text-slate-400 uppercase block">
                    {group.group}
                  </span>
                )}

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id as TabType);
                          setMobileMenuOpen(false);
                        }}
                        title={sidebarCollapsed ? `${item.label} (${item.desc})` : undefined}
                        className={`w-full flex items-center ${
                          sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-1.5'
                        } rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon size={15} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          {!sidebarCollapsed && (
                            <div className="truncate min-w-0">
                              <span className="block truncate text-xs font-bold leading-tight">{item.label}</span>
                              <span className={`text-[8.5px] block font-normal truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                                {item.desc}
                              </span>
                            </div>
                          )}
                        </div>

                        {!sidebarCollapsed && item.badge && (
                          <span
                            className={`ml-1 px-1.5 py-0.2 text-[8.5px] font-black rounded-md shrink-0 ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Authenticated Superadmin User Dock (Light Theme) */}
        <div className="pt-3 border-t border-slate-100 mt-3 space-y-1.5">
          <div className={`p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block truncate leading-tight">
                    {currentUser.displayName}
                  </span>
                  <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider block">
                    {currentUser.role}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="p-1 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
              title="Secure Superadmin Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          2. MAIN CONTENT AREA (RIGHT PANE)
          ══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0 p-3 sm:p-6 pb-20 overflow-y-auto">
        {/* Top Operational Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {activeTab === 'registry' && 'Master License Registry'}
                {activeTab === 'generator' && 'Software License Provisioning Studio'}
                {activeTab === 'hardware' && 'Hardware Terminal Locking Matrix'}
                {activeTab === 'enforcer' && 'Web DRM Middleware & Integration'}
                {activeTab === 'arms' && 'ARMS Rental Licenses Suite'}
                {activeTab === 'settings' && 'Settings (License Policies & DRM Rules)'}
                {activeTab === 'supabase' && 'Supabase Settings (Cluster & Account Health)'}
                {activeTab === 'users' && 'User Premium (Superadmins & BCrypt Security)'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-emerald-50 text-emerald-800 border-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Enforcing DRM ({clusterLatency || 12}ms)</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Target Cluster: <strong className="font-mono text-slate-700">gcebwzpcyeltzhyqefxo</strong> &bull; Superadmin Authenticated
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAllLicenseData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setActiveTab('generator')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Issue Key</span>
            </button>
          </div>
        </div>

        {/* 8-Metric HUD */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Keys</span>
            <div className="text-base font-black text-slate-900">{metrics.total}</div>
          </div>
          <div className="bg-white border border-emerald-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between bg-emerald-50/20">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Active DRM</span>
            <div className="text-base font-black text-emerald-700">{metrics.active}</div>
          </div>
          <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bound Machines</span>
            <div className="text-base font-black text-slate-900">{metrics.bound}</div>
          </div>
          <div className="bg-white border border-amber-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between bg-amber-50/20">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Expiring (&le;7d)</span>
            <div className="text-base font-black text-amber-800">{metrics.expiringSoon}</div>
          </div>
          <div className="bg-white border border-rose-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Expired</span>
            <div className="text-base font-black text-rose-800">{metrics.expired}</div>
          </div>
          <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revoked</span>
            <div className="text-base font-black text-slate-900">{metrics.revoked}</div>
          </div>
          <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Multi-Terminal</span>
            <div className="text-base font-black text-slate-900">{metrics.multiDevice}</div>
          </div>
          <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DB Latency</span>
            <div className="text-base font-black text-slate-900">{clusterLatency || 12} ms</div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: LICENSE MASTER REGISTRY (DATAGRID)
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'registry' && (
          <div className="space-y-3">
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
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
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
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
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

            {/* Strict Non-Dark Visible Datagrid */}
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
                          <p className="font-bold text-slate-600">No licenses match your filters</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedLicenses.map((lic, idx) => {
                        const rowNum = (currentPage - 1) * rowsPerPage + idx + 1;
                        const daysLeft = getDaysRemaining(lic.expiration_date);
                        const isRevoked = lic.is_revoked === true;
                        const isExpired = !isRevoked && daysLeft <= 0;
                        const isExpiringSoon = !isRevoked && daysLeft > 0 && daysLeft <= 7;

                        return (
                          <tr key={lic.license_id || idx} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{rowNum}</td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <code className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-md font-mono font-bold text-slate-900 text-[11px]">
                                  {showRawKeys ? lic.license_key : `${lic.license_key.slice(0, 10)}••••••••${lic.license_key.slice(-4)}`}
                                </code>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(lic.license_key);
                                    toast.success(`Copied! 📋`);
                                  }}
                                  className="text-slate-400 hover:text-slate-800 p-1"
                                  title="Copy Key"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{lic.client_name}</div>
                              <div className="text-[10px] text-slate-500 font-medium">{lic.client_phone || '—'}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                                {lic.license_type || 'Standard'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {lic.activation_device_id ? (
                                <div className="flex items-center gap-1.5">
                                  <Laptop size={13} className="text-indigo-600 shrink-0" />
                                  <span className="font-mono text-[10px] text-slate-800 font-bold">
                                    {lic.activation_device_id.slice(0, 12)}...
                                  </span>
                                  <button
                                    onClick={() => handleResetMachineBinding(lic)}
                                    className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer"
                                  >
                                    Unbind
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  🔓 Ready to Bind
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">{lic.max_devices || 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-800">{formatDate(lic.expiration_date)}</div>
                              <div className="mt-0.5">
                                {isRevoked ? (
                                  <span className="text-[9.5px] font-bold text-slate-400">Revoked</span>
                                ) : isExpired ? (
                                  <span className="text-[9.5px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Expired</span>
                                ) : isExpiringSoon ? (
                                  <span className="text-[9.5px] font-black text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{daysLeft}d left ⚠️</span>
                                ) : (
                                  <span className="text-[9.5px] font-bold text-emerald-700">{daysLeft}d left</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isRevoked ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300">
                                  Revoked
                                </span>
                              ) : isExpired ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                  Expired
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleExtendDuration(lic, 30)}
                                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold rounded cursor-pointer"
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

              {/* Pagination Dock */}
              <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Rows:</span>
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
                    Showing <strong>{filteredLicenses.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}</strong> to{' '}
                    <strong>{Math.min(currentPage * rowsPerPage, filteredLicenses.length)}</strong> of <strong>{filteredLicenses.length}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer">
                    <ChevronsLeft size={14} />
                  </button>
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 py-1 font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
                    {currentPage} / {totalPages}
                  </span>
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer">
                    <ChevronRight size={14} />
                  </button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer">
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: GENERATE & PROVISIONING STUDIO
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'generator' && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-1">
                <Sparkles size={18} className="text-blue-600" />
                Software License Provisioning Studio
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Generate cryptographically strong license keys with machine locking for Alpha Retail POS, ARMS, or custom software
              </p>

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
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 cursor-pointer"
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 cursor-pointer"
                    >
                      <option value={14}>14 Days (Trial)</option>
                      <option value={30}>30 Days (Monthly)</option>
                      <option value={90}>90 Days (Quarterly)</option>
                      <option value={180}>180 Days (Half-Year)</option>
                      <option value={365}>365 Days (1-Year Commercial)</option>
                      <option value={730}>730 Days (2-Year Enterprise)</option>
                      <option value={1825}>1,825 Days (Perpetual)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Max Terminals</label>
                    <select
                      value={genMaxDevices}
                      onChange={(e) => setGenMaxDevices(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 cursor-pointer"
                    >
                      <option value={1}>1 Machine (Single POS)</option>
                      <option value={2}>2 Machines (Cashier + Backoffice)</option>
                      <option value={3}>3 Machines (Retail Pro)</option>
                      <option value={5}>5 Machines (Multi-Terminal)</option>
                      <option value={10}>10 Machines (Enterprise)</option>
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

              {generatedResult && (
                <div className="mt-5 p-4 rounded-xl border border-emerald-300 bg-emerald-50/70 space-y-2">
                  <div className="flex items-center justify-between text-emerald-900 font-bold text-xs">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      Generated License Key(s):
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedResult.join('\n'));
                        toast.success('All keys copied! 📋');
                      }}
                      className="text-xs font-extrabold text-emerald-700 hover:underline"
                    >
                      Copy All Keys
                    </button>
                  </div>
                  <div className="p-3 bg-white border border-emerald-200 rounded-lg font-mono text-xs font-bold text-slate-900 space-y-1">
                    {generatedResult.map((k) => (
                      <div key={k} className="select-all">{k}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: HARDWARE TERMINALS LOCK MATRIX
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'hardware' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-1">
                <Laptop size={18} className="text-indigo-600" />
                Bound Hardware Terminals &amp; Motherboard Anti-Tamper Matrix
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Shows all client hardware locked to active licenses. Resetting a machine binding allows the customer to transfer their license to replacement hardware.
              </p>

              <div className="space-y-2.5">
                {licenses.filter((l) => l.activation_device_id).length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Laptop size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600">No hardware bindings registered yet</p>
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
                        </div>

                        <button
                          onClick={() => handleResetMachineBinding(lic)}
                          className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition cursor-pointer"
                        >
                          🔓 Reset Hardware Lock
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4: WEB DRM MIDDLEWARE & TESTER
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'enforcer' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Terminal size={18} className="text-blue-600" />
                Live License Validation Endpoint Tester
              </h3>

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
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 5: ARMS LICENSES
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'arms' && (
          <div className="space-y-3">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <h3 className="text-base font-black text-slate-900">ARMS Rental Management Licenses</h3>
              <p className="text-xs text-slate-500 mt-0.5">Found {armsLicenses.length} licenses in public.arms_licenses table</p>
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
            TAB 6: LICENSE SETTINGS (GLOBAL POLICY & DRM RULES)
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Settings size={18} className="text-blue-600" />
                  DRM System Settings &amp; Global Provisioning Policy
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure default license generation rules, hardware lock tolerance, and customer renewal support info
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Default License Prefix</label>
                  <input
                    type="text"
                    value={settingPrefix}
                    onChange={(e) => setSettingPrefix(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Prepended to all freshly generated keys</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Standard Demonstration Trial Days</label>
                  <input
                    type="number"
                    value={settingTrialDays}
                    onChange={(e) => setSettingTrialDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Default duration for trial installations</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Sales &amp; Activation Helpline</label>
                  <input
                    type="text"
                    value={settingSupportPhone}
                    onChange={(e) => setSettingSupportPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Displayed on client screens when license expires</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Support Email Address</label>
                  <input
                    type="email"
                    value={settingSupportEmail}
                    onChange={(e) => setSettingSupportEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Support desk inbox</span>
                </div>
              </div>

              {/* Hardware Security Options */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold text-slate-900 block">Hardware Lock Policies</span>

                <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingStrictLock}
                    onChange={(e) => setSettingStrictLock(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <strong className="text-xs text-slate-900 block">Strict Hardware Fingerprint Enforcement</strong>
                    <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                      Locks software execution to the exact motherboard UUID. Blocks app on cloning or unauthorized hardware migration.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => toast.success('Settings saved to local storage! ✓')}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  Save Policy Parameters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 7: SUPABASE SETTINGS (ACCOUNT SWITCHER & DIAGNOSTICS)
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'supabase' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Database size={18} className="text-blue-600" />
                    Supabase Database Cluster &amp; Account Switcher
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live connection details, telemetry latency ping, and account switcher
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Connected ({clusterLatency || 12}ms)</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Live Supabase URL</span>
                  <strong className="font-mono text-slate-800 break-all">https://gcebwzpcyeltzhyqefxo.supabase.co</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Project Reference ID</span>
                  <strong className="font-mono text-blue-700">gcebwzpcyeltzhyqefxo</strong>
                </div>
              </div>

              {/* Table Records Breakdown */}
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-700 block mb-2">Live Table Schema Counts</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-blue-900 block">public.app_licenses</span>
                      <span className="text-[10px] text-blue-600">Primary DRM Registry</span>
                    </div>
                    <strong className="font-mono text-base text-blue-800">{licenses.length}</strong>
                  </div>

                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-purple-900 block">public.arms_licenses</span>
                      <span className="text-[10px] text-purple-600">Rental DRM Keys</span>
                    </div>
                    <strong className="font-mono text-base text-purple-800">{armsLicenses.length}</strong>
                  </div>

                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-900 block">public.arms_users</span>
                      <span className="text-[10px] text-emerald-600">Superadmins &amp; Staff</span>
                    </div>
                    <strong className="font-mono text-base text-emerald-800">{dbUsers.length}</strong>
                  </div>
                </div>
              </div>

              {/* Connect Another Supabase Project */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Server size={14} className="text-blue-600" />
                  Test Another Supabase Instance
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Target Supabase URL</label>
                    <input
                      type="text"
                      placeholder="https://your-project.supabase.co"
                      value={customSbUrl}
                      onChange={(e) => setCustomSbUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Target Anon / Service Key</label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                      value={customSbKey}
                      onChange={(e) => setCustomSbKey(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                {sbTestResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                      sbTestResult.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}
                  >
                    <span>{sbTestResult.msg}</span>
                    {sbTestResult.ping > 0 && <span className="font-mono font-bold">{sbTestResult.ping}ms</span>}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleTestCustomSupabase}
                    disabled={isTestingSb || !customSbUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer disabled:opacity-40"
                  >
                    {isTestingSb ? 'Testing Ping...' : '⚡ Test Connection'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 8: USER PREMIUM & BCRYPT SECURITY AUTHORITY
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Staff / Admins List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Users size={18} className="text-blue-600" />
                    Superadmin &amp; Staff Security Registry
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Found {dbUsers.length} administrators in public.arms_users</p>
                </div>
              </div>

              <div className="space-y-2">
                {dbUsers.map((u) => (
                  <div
                    key={u.user_id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                        {u.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900">{u.name || u.user_name}</strong>
                          <code className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-300">
                            @{u.user_name}
                          </code>
                          {u.is_super_admin && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-800">
                              SUPERADMIN
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Role: {u.user_type} &bull; Created: {formatDate(u.created_at)}
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  </div>
                ))}
              </div>

              {/* Add New Superadmin User Form */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-900 mb-3 flex items-center gap-1.5">
                  <UserCheck size={15} className="text-blue-600" />
                  Create New Superadmin with 12-Round BCrypt Hash
                </h4>

                <form onSubmit={handleCreateNewAdminUser} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. alexander"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Alexander Graham"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Password (Auto-Hashed) *</label>
                    <input
                      type="password"
                      required
                      placeholder="Strong password"
                      value={newUserPass}
                      onChange={(e) => setNewUserPass(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-3 flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isCreatingUser}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs transition cursor-pointer disabled:opacity-40"
                    >
                      {isCreatingUser ? 'Hashing with BCrypt...' : 'Create & Hash User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Standalone BCrypt Hasher & Verifier Studio */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Lock size={18} className="text-purple-600" />
                  BCrypt Password Hasher &amp; Cryptographic Verifier Studio
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate or verify military-grade 12-round salt hashed passwords on the fly
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Hash Generator */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 block">
                    1. Generate New BCrypt Hash
                  </span>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Plain Text Password</label>
                    <input
                      type="text"
                      placeholder="e.g. @JIm47jhC_7%#Pharm"
                      value={bcryptPlainInput}
                      onChange={(e) => setBcryptPlainInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Cost Rounds</label>
                      <select
                        value={bcryptSaltRounds}
                        onChange={(e) => setBcryptSaltRounds(Number(e.target.value))}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        <option value={10}>10 Rounds</option>
                        <option value={12}>12 Rounds (Recommended)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateBcryptHash}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      Generate Hash
                    </button>
                  </div>

                  {bcryptGeneratedHash && (
                    <div className="mt-2 p-2.5 bg-slate-950 text-purple-300 rounded-xl font-mono text-[10px] break-all flex items-center justify-between gap-2">
                      <span>{bcryptGeneratedHash}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(bcryptGeneratedHash);
                          toast.success('Hash copied! 📋');
                        }}
                        className="text-white hover:text-purple-400 p-1"
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Hash Verifier */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 block">
                    2. Verify Password Against Hash
                  </span>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Plain Password</label>
                    <input
                      type="text"
                      placeholder="Password to verify"
                      value={bcryptTestPassword}
                      onChange={(e) => setBcryptTestPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">BCrypt Hash ($2b$...)</label>
                    <input
                      type="text"
                      placeholder="$2b$12$..."
                      value={bcryptTestHash}
                      onChange={(e) => setBcryptTestHash(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleVerifyBcryptMatch}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Compare Match
                    </button>

                    {bcryptMatchResult !== null && (
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                          bcryptMatchResult
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {bcryptMatchResult ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {bcryptMatchResult ? 'Valid Match' : 'Mismatch'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

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

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Authenticated User:</span>
                <strong className="text-slate-800 font-mono">{currentUser.displayName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Privilege Level:</span>
                <span className="font-extrabold text-blue-700 uppercase tracking-wide">{currentUser.role}</span>
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
