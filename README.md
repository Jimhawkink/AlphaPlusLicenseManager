# Alpha Plus License & DRM Manager Studio 🔐🛡️

Enterprise Software DRM, Hardware Fingerprint Locking, and Multi-Tier License Authority for Alpha Retail POS, ARMS, and Cloud Applications.

## 🚀 Key Capabilities

- **Cyber-Shield Superadmin Authority**: Authenticated access with session management and multi-credential verification.
- **Hardware Machine Lock Enforcement**: Binds software to unique hardware motherboard/terminal UUIDs to prevent unauthorized sharing.
- **1-Click Hardware Unbinding**: Seamlessly migrate licenses to replacement POS machines when hardware is serviced or upgraded.
- **Multi-Tier Provisioning Engine**: Single or bulk provisioning for Trial, Annual Commercial, Enterprise, and Perpetual licenses.
- **Cross-Domain Validation API (`/api/validate`)**: High-performance REST validation with complete CORS support for Web, Mobile, and Desktop clients.
- **New Supabase Cluster Integration**: Directly linked to `gcebwzpcyeltzhyqefxo.supabase.co` supporting both `public.app_licenses` and `public.arms_licenses`.

---

## 🛠️ Superadmin Access

- **Portal URL**: `https://alpha-plus-license-manager.vercel.app`
- **Default Accounts**:
  - Username: `jimhawkins` | Passphrase: `admin123` or `AlphaPlus@2026!`
  - Username: `superadmin` | Passphrase: `AlphaPlus@2026!`

---

## 📡 Live Validation Endpoint

### `POST /api/validate`
Validates license key and binds to client hardware.

```json
{
  "license_key": "ALPHA-RETAIL-XXXX-XXXX-XXXX-XXXX",
  "machine_id": "YOUR-HARDWARE-UUID",
  "device_model": "POS Terminal X1",
  "device_manufacturer": "Alpha Retail Edge"
}
```

#### Response (`200 OK`):
```json
{
  "valid": true,
  "message": "License verified successfully",
  "license": {
    "key": "ALPHA-RETAIL-XXXX-XXXX-XXXX-XXXX",
    "type": "ALPHA-RETAIL-PRO",
    "client_name": "Vinrose Hardware Ltd",
    "expiry": "2027-11-23T00:00:00.000Z",
    "daysRemaining": 365,
    "boundMachineId": "YOUR-HARDWARE-UUID",
    "maxDevices": 1,
    "isActivated": true
  }
}
```

---

## 💻 Tech Stack
- **Next.js 14** (App Router)
- **TypeScript 5**
- **Tailwind CSS 3.4**
- **Supabase JS Client** (Cluster `gcebwzpcyeltzhyqefxo`)
- **Lucide Icons**
