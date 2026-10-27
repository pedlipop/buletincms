# 📰 TheBulletin CMS (公司月刊排版系统)

> A modern, high-performance visual CMS and newsletter designer tailored for enterprise and industrial park editorial teams. Built with React, TypeScript, Tailwind CSS, Vite, and Express.

---

## ✨ Features

### 🎨 Visual Drag & Drop Canvas
- **Dynamic Photo Grid Layouts**: Smart layout calculation supporting 1 to 6+ images per section (single hero, horizontal split, 2-col, 3-col, 4-col, 2x2 grid, mosaic).
- **Custom Picture Frames & Stickers**: Upload transparent PNG frames/stickers with layer ordering (`Behind`, `Mask`, `In Front`), scale adjustments, and canvas-level panning.
- **Fluid Canvas Zoom**: Smooth wheel zooming (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + Scroll), floating zoom widget, fit-to-screen, and quick presets (50% to 200%).
- **Micro-Animations & Tactile Feedback**: Staggered card entrances, smooth selection rings, and refined UI transitions.

### ✍️ Precision Typography & Text Inspector
- **Manual Font Size Setting**: Type any exact pixel value (`px`), use tactile `−` / `+` steppers, or pick from quick presets (`12`, `14`, `16`, `18`, `20`, `24`, `28`, `32`).
- **Font Reader & Custom Font Loader**: Import local font files (`.ttf`, `.otf`, `.woff`, `.woff2`) dynamically onto the canvas.
- **Enlarged Color Swatches**: Comfortably sized 24px color palette with curated enterprise tones + native custom color picker.
- **Highlighting & Formatting**: Bold, Italic, Underline, Strikethrough, full text alignments (Left, Center, Right, Justify), and pastel highlight markers.

### 📑 Continuous High-Res Export
- **One-Page Continuous PDF Export**: Seamless, zero-gap single-page vector rasterization without awkward page-break chops.
- **High-Definition PNG Download**: Crisp, print-ready image export.
- **Anti-Overflow Protection**: Container-level whitespace locking ensures headlines and nameplates never wrap or clip.

### 🌐 Dual Storage Backend (PostgreSQL + Local JSON Fallback)
- **Zero-Config Local Mode**: Automatically creates and uses `data/local_db.json` when running locally without a database.
- **Production PostgreSQL Support**: Direct integration with PostgreSQL (e.g., Railway, Supabase, Neon) with resilient SSL auto-detection and connection pooling.
- **Bilingual Interface**: One-click switch between **中文 (Chinese)** and **English**.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm** or **pnpm** / **yarn**

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/pedlipop/buletincms.git
cd buletincms

# Install dependencies
npm install
```

### 3. Running in Development Mode
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Running Full-Stack (Server + Built Frontend)
```bash
# Build frontend
npm run build

# Start production Express server
npm start
```
The server will start at `http://localhost:3001` (or the port defined by `process.env.PORT`).

---

## ⚙️ Environment Variables (Optional)

Create a `.env` file in the project root if you want to connect to a remote PostgreSQL database:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Port for the Express backend server | `3001` |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://user:pass@host:port/db`) | _Fallback to local JSON_ |

> **Note**: If `DATABASE_URL` is omitted, the app will run locally and store all bulletins and assets in `data/local_db.json`.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons, Zustand
- **Export Engine**: `modern-screenshot`
- **Backend / API**: Express 5, `pg` (node-postgres), CORS
- **Database**: PostgreSQL (Production) / JSON File Store (Local Development)

---

## 📁 Project Structure

```text
BULETINCMS/
├── data/                    # Local JSON storage fallback
├── dist/                    # Compiled production build
├── src/
│   ├── components/          # React components
│   │   ├── CanvasRenderer.tsx   # Canvas view & export rasterizer
│   │   ├── EditableText.tsx     # ContentEditable rich text engine
│   │   ├── HomeDashboard.tsx    # Bulletin list, drafts & templates
│   │   ├── ImageSlot.tsx        # Photo container with custom frames
│   │   ├── LeftSidebar.tsx      # Blocks palette & asset library
│   │   ├── RightInspector.tsx   # Typography, color & layout inspector
│   │   └── TopNav.tsx           # Global actions, zoom, theme & export
│   ├── data/                # Presets, color themes & starter templates
│   ├── store/               # Zustand state management
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx              # Root component & export modal logic
│   └── main.tsx             # Application entry point
├── server.js                # Express API & PostgreSQL adapter
├── package.json
└── README.md
```

---

## 📄 License

This project is proprietary and maintained for internal editorial and communication design. All rights reserved.
