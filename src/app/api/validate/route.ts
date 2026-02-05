import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { license_key, machine_id } = await request.json();

        if (!license_key) {
            return NextResponse.json(
                { valid: false, error: 'License key is required' },
                { status: 400 }
            );
        }

        // Find the license
        const { data: license, error } = await supabase
            .from('licenses')
            .select('*')
            .eq('license_key', license_key.trim().toUpperCase())
            .single();

        if (error || !license) {
            return NextResponse.json(
                { valid: false, error: 'Invalid license key' },
                { status: 404 }
            );
        }

        // Check if license is active
        if (!license.is_active) {
            return NextResponse.json(
                { valid: false, error: 'License has been deactivated' },
                { status: 403 }
            );
        }

        // Check if suspended
        if (license.is_suspended) {
            return NextResponse.json(
                { valid: false, error: 'License has been suspended' },
                { status: 403 }
            );
        }

        // Check expiry
        const now = new Date();
        const expiryDate = new Date(license.expiry_date);
        if (now > expiryDate) {
            return NextResponse.json(
                { valid: false, error: 'License has expired', expired: true },
                { status: 403 }
            );
        }

        // Check machine binding
        if (license.machine_id && machine_id && license.machine_id !== machine_id) {
            return NextResponse.json(
                { valid: false, error: 'License is bound to a different machine' },
                { status: 403 }
            );
        }

        // If not bound yet, bind to this machine
        if (!license.machine_id && machine_id) {
            await supabase
                .from('licenses')
                .update({
                    machine_id: machine_id,
                    activation_date: new Date().toISOString()
                })
                .eq('license_id', license.license_id);

            // Log activation
            await supabase.from('license_activations').insert({
                license_id: license.license_id,
                machine_id: machine_id,
                activation_type: 'activate',
                success: true
            });
        }

        // Calculate days remaining
        const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return NextResponse.json({
            valid: true,
            license: {
                type: license.license_type,
                client: license.client_name,
                expiry: license.expiry_date,
                daysRemaining: daysRemaining,
                features: license.features || []
            }
        });

    } catch (err) {
        console.error('License validation error:', err);
        return NextResponse.json(
            { valid: false, error: 'Validation failed' },
            { status: 500 }
        );
    }
}

// GET - Check license status (for hotel app to query)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machine_id');

    if (!machineId) {
        return NextResponse.json({ valid: false, error: 'Machine ID required' }, { status: 400 });
    }

    try {
        const { data: license, error } = await supabase
            .from('licenses')
            .select('*')
            .eq('machine_id', machineId)
            .eq('is_active', true)
            .single();

        if (error || !license) {
            return NextResponse.json({ valid: false, licensed: false });
        }

        const now = new Date();
        const expiryDate = new Date(license.expiry_date);
        const isExpired = now > expiryDate;
        const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return NextResponse.json({
            valid: !isExpired,
            licensed: true,
            license: {
                type: license.license_type,
                client: license.client_name,
                expiry: license.expiry_date,
                daysRemaining: daysRemaining,
                expired: isExpired
            }
        });
    } catch (err) {
        return NextResponse.json({ valid: false, error: 'Check failed' }, { status: 500 });
    }
}
