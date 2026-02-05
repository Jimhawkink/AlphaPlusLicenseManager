'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface License {
    license_id: string;
    license_key: string;
    license_type: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    machine_id: string | null;
    activation_date: string | null;
    expiry_date: string;
    is_active: boolean;
    is_suspended: boolean;
    created_at: string;
}

export default function LicenseAdminPage() {
    const [licenses, setLicenses] = useState<License[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);

    // Form state
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [licenseType, setLicenseType] = useState('trial');

    useEffect(() => {
        loadLicenses();
    }, []);

    const loadLicenses = async () => {
        try {
            const { data, error } = await supabase
                .from('licenses')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLicenses(data || []);
        } catch (err) {
            console.error('Error loading licenses:', err);
            toast.error('Failed to load licenses');
        } finally {
            setLoading(false);
        }
    };

    const generateLicenseKey = (): string => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const segments = [];
        for (let i = 0; i < 4; i++) {
            let segment = '';
            for (let j = 0; j < 4; j++) {
                segment += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            segments.push(segment);
        }
        return 'APS-' + segments.join('-');
    };

    const getExpiryDate = (type: string): string => {
        const now = new Date();
        switch (type) {
            case 'trial':
                now.setDate(now.getDate() + 30);
                break;
            case 'standard':
                now.setFullYear(now.getFullYear() + 1);
                break;
            case 'enterprise':
                now.setFullYear(now.getFullYear() + 2);
                break;
            default:
                now.setDate(now.getDate() + 30);
        }
        return now.toISOString();
    };

    const createLicense = async () => {
        if (!clientName.trim()) {
            toast.error('Client name is required');
            return;
        }

        setCreating(true);
        try {
            const licenseKey = generateLicenseKey();
            const expiryDate = getExpiryDate(licenseType);

            const { error } = await supabase.from('licenses').insert({
                license_key: licenseKey,
                license_type: licenseType,
                client_name: clientName.trim(),
                client_email: clientEmail.trim() || null,
                client_phone: clientPhone.trim() || null,
                expiry_date: expiryDate,
                is_active: true,
                is_suspended: false,
                features: ['pos', 'hotel', 'reports']
            });

            if (error) throw error;

            toast.success(`License created: ${licenseKey}`);

            // Copy to clipboard
            navigator.clipboard.writeText(licenseKey);
            toast.success('License key copied to clipboard!');

            setShowCreateModal(false);
            setClientName('');
            setClientEmail('');
            setClientPhone('');
            setLicenseType('trial');
            loadLicenses();
        } catch (err) {
            console.error('Error creating license:', err);
            toast.error('Failed to create license');
        } finally {
            setCreating(false);
        }
    };

    const toggleLicense = async (license: License) => {
        try {
            const { error } = await supabase
                .from('licenses')
                .update({ is_active: !license.is_active })
                .eq('license_id', license.license_id);

            if (error) throw error;
            toast.success(license.is_active ? 'License deactivated' : 'License activated');
            loadLicenses();
        } catch (err) {
            toast.error('Failed to update license');
        }
    };

    const resetMachine = async (licenseId: string) => {
        try {
            const { error } = await supabase
                .from('licenses')
                .update({ machine_id: null, activation_date: null })
                .eq('license_id', licenseId);

            if (error) throw error;
            toast.success('Machine binding reset - license can be activated on new device');
            loadLicenses();
        } catch (err) {
            toast.error('Failed to reset machine');
        }
    };

    const copyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        toast.success('License key copied!');
    };

    const getDaysRemaining = (expiryDate: string): number => {
        const now = new Date();
        const expiry = new Date(expiryDate);
        const diff = expiry.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const formatDate = (date: string | null): string => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString();
    };

    return (
        <div className="min-h-screen p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        🔐 License Manager
                    </h1>
                    <p className="text-gray-400 mt-1">Create and manage software licenses</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <span className="text-xl">➕</span>
                    Create License
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="card">
                    <p className="text-gray-400 text-sm">Total Licenses</p>
                    <p className="text-3xl font-bold text-white">{licenses.length}</p>
                </div>
                <div className="card">
                    <p className="text-gray-400 text-sm">Active</p>
                    <p className="text-3xl font-bold text-green-400">
                        {licenses.filter(l => l.is_active && getDaysRemaining(l.expiry_date) > 0).length}
                    </p>
                </div>
                <div className="card">
                    <p className="text-gray-400 text-sm">Expiring Soon (7 days)</p>
                    <p className="text-3xl font-bold text-amber-400">
                        {licenses.filter(l => {
                            const days = getDaysRemaining(l.expiry_date);
                            return days > 0 && days <= 7;
                        }).length}
                    </p>
                </div>
                <div className="card">
                    <p className="text-gray-400 text-sm">Expired</p>
                    <p className="text-3xl font-bold text-red-400">
                        {licenses.filter(l => getDaysRemaining(l.expiry_date) <= 0).length}
                    </p>
                </div>
            </div>

            {/* Licenses Table */}
            <div className="card overflow-x-auto">
                <h2 className="text-xl font-bold mb-4">📋 All Licenses</h2>
                {loading ? (
                    <div className="text-center py-10">
                        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                        <p className="text-gray-400 mt-2">Loading...</p>
                    </div>
                ) : licenses.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <p className="text-4xl mb-2">📭</p>
                        <p>No licenses found. Click "Create License" to add one.</p>
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>License Key</th>
                                <th>Client</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Expiry</th>
                                <th>Days Left</th>
                                <th>Machine</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {licenses.map((license) => {
                                const daysLeft = getDaysRemaining(license.expiry_date);
                                return (
                                    <tr key={license.license_id}>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <code className="bg-slate-800 px-2 py-1 rounded text-sm">
                                                    {license.license_key}
                                                </code>
                                                <button
                                                    onClick={() => copyKey(license.license_key)}
                                                    className="text-gray-400 hover:text-white"
                                                    title="Copy"
                                                >
                                                    📋
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                <p className="font-medium">{license.client_name}</p>
                                                <p className="text-gray-400 text-xs">{license.client_phone || license.client_email || '-'}</p>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${license.license_type === 'enterprise' ? 'badge-success' : license.license_type === 'standard' ? 'badge-warning' : 'bg-blue-500/20 text-blue-400'}`}>
                                                {license.license_type}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${license.is_active && daysLeft > 0 ? 'badge-success' : 'badge-danger'}`}>
                                                {!license.is_active ? 'Disabled' : daysLeft <= 0 ? 'Expired' : 'Active'}
                                            </span>
                                        </td>
                                        <td>{formatDate(license.expiry_date)}</td>
                                        <td>
                                            <span className={daysLeft <= 7 ? 'text-amber-400' : daysLeft <= 0 ? 'text-red-400' : 'text-green-400'}>
                                                {daysLeft > 0 ? `${daysLeft} days` : 'Expired'}
                                            </span>
                                        </td>
                                        <td>
                                            {license.machine_id ? (
                                                <span className="text-xs text-gray-400">
                                                    {license.machine_id.substring(0, 8)}...
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">Not bound</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => toggleLicense(license)}
                                                    className={`text-xs px-2 py-1 rounded ${license.is_active ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
                                                >
                                                    {license.is_active ? 'Disable' : 'Enable'}
                                                </button>
                                                {license.machine_id && (
                                                    <button
                                                        onClick={() => resetMachine(license.license_id)}
                                                        className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400"
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="card max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold mb-4">➕ Create New License</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 block mb-1">Client Name *</label>
                                <input
                                    type="text"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    className="input"
                                    placeholder="Enter client name"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 block mb-1">Email</label>
                                <input
                                    type="email"
                                    value={clientEmail}
                                    onChange={(e) => setClientEmail(e.target.value)}
                                    className="input"
                                    placeholder="client@email.com"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 block mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={clientPhone}
                                    onChange={(e) => setClientPhone(e.target.value)}
                                    className="input"
                                    placeholder="07xxxxxxxx"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 block mb-1">License Type</label>
                                <select
                                    value={licenseType}
                                    onChange={(e) => setLicenseType(e.target.value)}
                                    className="input"
                                >
                                    <option value="trial">Trial (30 days)</option>
                                    <option value="standard">Standard (1 year)</option>
                                    <option value="enterprise">Enterprise (2 years)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 bg-gray-700 text-white py-3 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createLicense}
                                disabled={creating}
                                className="flex-1 btn-primary"
                            >
                                {creating ? 'Creating...' : 'Create License'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
