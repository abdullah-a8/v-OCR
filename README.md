# vOCR - AI-Powered OCR Application

A modern, mobile-first web application for extracting text from images and PDFs using DeepSeek OCR via DeepInfra.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **AI-Powered OCR**: Extract text from images and PDFs using DeepSeek OCR
- **Mobile-First Design**: Optimized for all devices with responsive UI
- **Batch Processing**: Process multiple files sequentially with progress tracking
- **Beautiful Previews**: Rendered markdown output with syntax highlighting
- **Secure API Keys**: Client-side encryption before storage in Supabase
- **Authentication**: Email/password authentication with Better Auth
- **ZIP Downloads**: Download batch results as a compressed archive
- **Real-time Feedback**: Toast notifications for all user actions

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19
- **UI**: shadcn/ui components + Tailwind CSS 4
- **Authentication**: Better Auth with Supabase PostgreSQL
- **Database**: Supabase (encrypted API key storage)
- **OCR**: DeepSeek OCR via DeepInfra API
- **Notifications**: Sonner
- **Markdown**: react-markdown with syntax highlighting

## Getting Started

### Prerequisites

- Node.js 20+ or Bun 1.3+
- A [Supabase](https://supabase.com) account and project
- A [DeepInfra](https://deepinfra.com) account with API access

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd v-ocr
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and fill in your credentials:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `BETTER_AUTH_SECRET`: Generate with `openssl rand -base64 32`

4. Run database migrations:
   ```bash
   # Run Better Auth migrations
   bunx better-auth migrate

   # Run application migrations
   # Copy SQL from supabase/migrations/001_create_user_api_keys.sql
   # and run in Supabase SQL Editor
   ```

5. Start the development server:
   ```bash
   bun dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

For detailed setup instructions, see [docs/SETUP.md](docs/SETUP.md).

## Usage

1. **Sign Up**: Create an account with email and password
2. **Add API Key**: Go to Settings and add your DeepInfra API key
3. **Upload Files**: Drag and drop or browse for images/PDFs (10MB max per file)
4. **Extract Text**: Click "Extract Text" to process your documents
5. **View Results**:
   - Single file: Beautiful markdown preview with copy button
   - Multiple files: Batch processor with ZIP download

## File Support

- **Images**: JPG, PNG, WebP (10MB max)
- **Documents**: PDF (10MB max)
- **Batch Limit**: Up to 10 files at once

## Security

- **API Keys**: Encrypted client-side using Web Crypto API before storage
- **Database**: Double-layer encryption (client-side + Supabase encryption at rest)
- **Authentication**: Secure password hashing with Better Auth
- **Row Level Security**: Supabase RLS policies ensure user data isolation

## Project Structure

```
v-ocr/
├── app/
│   ├── page.tsx              # Main OCR interface
│   ├── layout.tsx            # Root layout with Sonner
│   ├── auth/                 # Authentication pages
│   └── settings/             # API key management
├── components/
│   ├── ocr-uploader.tsx      # File upload component
│   ├── ocr-preview.tsx       # Markdown preview
│   ├── batch-processor.tsx   # Multi-file processing
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── auth.ts               # Better Auth server config
│   ├── auth-client.ts        # Better Auth client hooks
│   ├── deepseek-client.ts    # DeepInfra API wrapper
│   ├── encryption.ts         # Client-side encryption
│   ├── api-key-service.ts    # API key CRUD operations
│   └── supabase.ts           # Supabase client
└── supabase/
    └── migrations/           # Database schemas
```

## Development

```bash
# Run development server
bun dev

# Type checking
bun run build

# Linting
bun run lint
```

## Environment Variables

See `.env.example` for all required variables:

- `DATABASE_URL` - Supabase PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `BETTER_AUTH_SECRET` - Secret for Better Auth sessions
- `BETTER_AUTH_URL` - Application base URL (default: http://localhost:3000)
- `NEXT_PUBLIC_APP_URL` - Public application URL

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- [DeepSeek](https://github.com/deepseek-ai/DeepSeek-OCR) for the OCR model
- [DeepInfra](https://deepinfra.com) for API hosting
- [Better Auth](https://github.com/better-auth/better-auth) for authentication
- [Supabase](https://supabase.com) for backend infrastructure
- [shadcn/ui](https://ui.shadcn.com) for beautiful components
