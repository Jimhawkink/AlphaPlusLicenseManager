# Alpha Plus License Manager

A standalone license management system for Alpha Plus applications.

## Features
- 🔐 Create and manage software licenses
- 📊 Admin dashboard with license overview
- ⏳ Trial, Standard, and Enterprise license types
- 🔗 Machine binding (device-specific activation)
- 📝 Activation logging

## Getting Started

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```

Open [http://localhost:3003](http://localhost:3003) to access the admin panel.

## Environment Variables

This project uses the same Supabase database as the hotel app. The credentials are pre-configured.

## License Types
| Type | Duration |
|------|----------|
| Trial | 30 days |
| Standard | 1 year |
| Enterprise | 2 years |

## Usage
1. Open the admin dashboard
2. Click "Create License"
3. Fill in client details
4. Copy the generated license key
5. Give the key to your client to activate their system
