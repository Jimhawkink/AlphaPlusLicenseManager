import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Handle CORS Preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Machine-ID, X-App-Version',
        },
    });
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Machine-ID, X-App-Version',
};

// POST - Validate and/or Activate License on Machine
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const {
            license_key,
            machine_id,
            device_id,
            device_model,
            device_manufacturer,
            app_name,
            app_version,
        } = body;

        const effectiveKey = (license_key || '').toString().trim().toUpperCase();
        const effectiveMachineId = (machine_id || device_id || '').toString().trim();

        if (!effectiveKey) {
            return NextResponse.json(
                { valid: false, error: 'License key is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const now = new Date();

        // ─────────────────────────────────────────────────────────────
        // 1. PRIMARY: Check public.app_licenses
        // ─────────────────────────────────────────────────────────────
        const { data: appLic, error: appErr } = await supabaseAdmin
            .from('app_licenses')
            .select('*')
            .eq('license_key', effectiveKey)
            .maybeSingle();

        if (appLic && !appErr) {
            // Check revocation
            if (appLic.is_revoked) {
                return NextResponse.json(
                    {
                        valid: false,
                        error: `License has been revoked${appLic.revoked_reason ? ': ' + appLic.revoked_reason : ''}`,
                        revoked: true,
                        revoked_at: appLic.revoked_at,
                    },
                    { status: 403, headers: corsHeaders }
                );
            }

            // Expiration check
            if (appLic.expiration_date) {
                const exp = new Date(appLic.expiration_date);
                if (now > exp) {
                    return NextResponse.json(
                        {
                            valid: false,
                            error: `License expired on ${exp.toLocaleDateString()}`,
                            expired: true,
                            expiry: appLic.expiration_date,
                        },
                        { status: 403, headers: corsHeaders }
                    );
                }
            }

            // Machine Binding Check
            if (appLic.activation_device_id && effectiveMachineId) {
                // If already bound to a different machine
                if (appLic.activation_device_id !== effectiveMachineId) {
                    // Check if max_devices allows multiple
                    const maxDev = Number(appLic.max_devices) || 1;
                    if (maxDev <= 1) {
                        return NextResponse.json(
                            {
                                valid: false,
                                error: 'License is locked to another hardware terminal. Please reset machine binding in License Manager.',
                                bound_device: appLic.activation_device_id,
                                locked: true,
                            },
                            { status: 403, headers: corsHeaders }
                        );
                    }
                }
            }

            // If not yet bound or this is the first activation with machine_id
            let finalExpiry = appLic.expiration_date;
            const updatePayload: Record<string, any> = {
                last_check_date: now.toISOString(),
            };

            if (!appLic.is_activated || !appLic.activation_device_id) {
                const duration = Number(appLic.duration_days) || 365;
                if (!appLic.expiration_date) {
                    const calcExp = new Date();
                    calcExp.setDate(calcExp.getDate() + duration);
                    finalExpiry = calcExp.toISOString();
                    updatePayload.expiration_date = finalExpiry;
                }

                updatePayload.is_activated = true;
                updatePayload.activation_date = now.toISOString();
                updatePayload.activation_device_id = effectiveMachineId || appLic.activation_device_id;
                updatePayload.activation_count = (Number(appLic.activation_count) || 0) + 1;
                if (device_manufacturer) updatePayload.device_manufacturer = device_manufacturer;
                if (device_model) updatePayload.device_model = device_model;
            }

            // Save updates
            await supabaseAdmin
                .from('app_licenses')
                .update(updatePayload)
                .eq('license_id', appLic.license_id);

            const expDate = finalExpiry ? new Date(finalExpiry) : null;
            const daysRemaining = expDate
                ? Math.max(0, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                : 9999;

            return NextResponse.json(
                {
                    valid: true,
                    message: 'License verified successfully',
                    license: {
                        id: appLic.license_id,
                        key: appLic.license_key,
                        type: appLic.license_type,
                        client_name: appLic.client_name,
                        client_phone: appLic.client_phone,
                        expiry: finalExpiry,
                        daysRemaining,
                        boundMachineId: updatePayload.activation_device_id || appLic.activation_device_id,
                        maxDevices: appLic.max_devices || 1,
                        isActivated: true,
                    },
                },
                { status: 200, headers: corsHeaders }
            );
        }

        // ─────────────────────────────────────────────────────────────
        // 2. SECONDARY: Check public.arms_licenses fallback
        // ─────────────────────────────────────────────────────────────
        const { data: armsLic, error: armsErr } = await supabaseAdmin
            .from('arms_licenses')
            .select('*')
            .eq('license_key', effectiveKey)
            .maybeSingle();

        if (armsLic && !armsErr) {
            if (!armsLic.is_active) {
                return NextResponse.json(
                    { valid: false, error: 'License is inactive or suspended' },
                    { status: 403, headers: corsHeaders }
                );
            }

            const exp = new Date(armsLic.expiry_date);
            if (now > exp) {
                return NextResponse.json(
                    { valid: false, error: `License expired on ${exp.toLocaleDateString()}`, expired: true },
                    { status: 403, headers: corsHeaders }
                );
            }

            // Machine check
            if (armsLic.machine_id && effectiveMachineId && armsLic.machine_id !== effectiveMachineId) {
                return NextResponse.json(
                    { valid: false, error: 'License bound to a different machine' },
                    { status: 403, headers: corsHeaders }
                );
            }

            // Bind if empty
            if (!armsLic.machine_id && effectiveMachineId) {
                await supabaseAdmin
                    .from('arms_licenses')
                    .update({
                        machine_id: effectiveMachineId,
                        activated_at: now.toISOString(),
                    })
                    .eq('license_id', armsLic.license_id);
            }

            const daysRemaining = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

            return NextResponse.json(
                {
                    valid: true,
                    message: 'ARMS License verified successfully',
                    license: {
                        id: armsLic.license_id,
                        key: armsLic.license_key,
                        type: 'Enterprise ARMS',
                        client_name: armsLic.client_name,
                        expiry: armsLic.expiry_date,
                        daysRemaining,
                        boundMachineId: armsLic.machine_id || effectiveMachineId,
                        features: armsLic.features || [],
                    },
                },
                { status: 200, headers: corsHeaders }
            );
        }

        return NextResponse.json(
            { valid: false, error: 'Invalid license key. Key does not exist in registry.' },
            { status: 404, headers: corsHeaders }
        );
    } catch (err: any) {
        console.error('License validation endpoint error:', err);
        return NextResponse.json(
            { valid: false, error: 'Server validation error: ' + err.message },
            { status: 500, headers: corsHeaders }
        );
    }
}

// GET - Query Status by Machine ID or License Key
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machine_id') || searchParams.get('device_id');
    const licenseKey = searchParams.get('license_key') || searchParams.get('key');

    if (!machineId && !licenseKey) {
        return NextResponse.json(
            { valid: false, error: 'machine_id or license_key query param required' },
            { status: 400, headers: corsHeaders }
        );
    }

    try {
        const now = new Date();

        if (licenseKey) {
            const { data } = await supabaseAdmin
                .from('app_licenses')
                .select('*')
                .eq('license_key', licenseKey.trim().toUpperCase())
                .maybeSingle();

            if (data) {
                const expDate = data.expiration_date ? new Date(data.expiration_date) : null;
                const isExpired = expDate ? now > expDate : false;
                const daysRemaining = expDate
                    ? Math.max(0, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                    : 9999;

                return NextResponse.json(
                    {
                        valid: !data.is_revoked && !isExpired,
                        licensed: true,
                        license: {
                            key: data.license_key,
                            client: data.client_name,
                            expiry: data.expiration_date,
                            daysRemaining,
                            isRevoked: data.is_revoked,
                            isActivated: data.is_activated,
                            boundDevice: data.activation_device_id,
                        },
                    },
                    { headers: corsHeaders }
                );
            }
        }

        if (machineId) {
            const { data } = await supabaseAdmin
                .from('app_licenses')
                .select('*')
                .eq('activation_device_id', machineId)
                .eq('is_revoked', false)
                .maybeSingle();

            if (data) {
                const expDate = data.expiration_date ? new Date(data.expiration_date) : null;
                const isExpired = expDate ? now > expDate : false;
                const daysRemaining = expDate
                    ? Math.max(0, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                    : 9999;

                return NextResponse.json(
                    {
                        valid: !isExpired,
                        licensed: true,
                        license: {
                            key: data.license_key,
                            client: data.client_name,
                            expiry: data.expiration_date,
                            daysRemaining,
                            isActivated: true,
                        },
                    },
                    { headers: corsHeaders }
                );
            }
        }

        return NextResponse.json(
            { valid: false, licensed: false, message: 'No active license found for specified terminal' },
            { headers: corsHeaders }
        );
    } catch (err: any) {
        return NextResponse.json(
            { valid: false, error: 'Query error: ' + err.message },
            { status: 500, headers: corsHeaders }
        );
    }
}
