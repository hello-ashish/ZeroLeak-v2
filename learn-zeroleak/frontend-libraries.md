# Frontend Libraries Analysis - ZeroLeak

This document provides an in-depth analysis of every library (dependency and devDependency) used in the ZeroLeak frontend (`frontend/package.json`). Each entry explains **what** the library is, **why** it is used, **where** it is applied in the codebase, and **how** it functions within the context of the platform.

---

## 1. Core Framework & Routing

### `react` & `react-dom`
* **What**: The core library for building user interfaces (React) and the package that serves as the entry point to the DOM and server renderers for React (`react-dom`).
* **Why**: ZeroLeak's frontend is a Single Page Application (SPA). React provides a component-based architecture, efficient DOM updates (Virtual DOM), and state management capabilities necessary for a highly interactive application.
* **Where**: Used universally across all `.jsx` files and components. `react-dom` is specifically used in the main entry point (usually `main.jsx` or `index.jsx`) to render the root application component into the HTML file.
* **How**: Developers create functional components, use hooks (`useState`, `useEffect`) to manage state, and return JSX which React efficiently renders to the browser screen.

### `react-router-dom`
* **What**: The standard routing library for React applications.
* **Why**: Since the frontend is an SPA, the browser doesn't load new HTML pages when navigating. `react-router-dom` intercepts URL changes and renders the appropriate React component, giving the illusion of multi-page navigation while maintaining state and speed.
* **Where**: Configured in the main application file (e.g., `App.jsx`) and used in layout files (like `StudentLayout.jsx`, `AdminLayout.jsx`).
* **How**: It uses components like `<BrowserRouter>`, `<Routes>`, `<Route>`, and `<Link>`. It enables nested routing (e.g., an Admin dashboard layout with interchangeable child views) and route protection (e.g., preventing access to `/admin/*` without an admin token).

---

## 2. Networking & Real-time Communication

### `axios`
* **What**: A promise-based HTTP client for the browser and Node.js.
* **Why**: Used to make API requests to the ZeroLeak backend. It is preferred over the native `fetch` API because it automatically transforms JSON data, has better error handling, and supports request/response interceptors (which are highly useful for attaching JWT tokens to headers).
* **Where**: Used extensively in almost all pages and hooks (`src/StudentLogin.jsx`, `src/pages/admin/AdminDashboardPage.jsx`, `src/hooks/useZMail.jsx`, etc.).
* **How**: `axios.get()`, `axios.post()`, etc., are called within `useEffect` hooks to fetch data on component mount, or inside form submit handlers to send data to the server.

### `socket.io-client`
* **What**: The client-side library for Socket.IO, enabling real-time, bidirectional communication with the backend.
* **Why**: Essential for features that require instantaneous updates without the user refreshing the page.
* **Where**: Used in `src/pages/admin/AdminProctoringPage.jsx`, `src/hooks/useZMail.jsx`, and `src/hooks/useProctoring.js`.
* **How**: Establishes a persistent WebSocket connection to the backend. It listens for events emitted by the server (e.g., a student raising a flag, a new ZMail message arriving) and updates the React state to reflect these changes in the UI immediately.

---

## 3. UI Components, Icons & Data Visualization

### `lucide-react`
* **What**: A beautiful, consistent, open-source icon toolkit designed specifically for React.
* **Why**: Icons dramatically improve the user interface and user experience by providing visual cues. `lucide-react` is lightweight, customizable (size, color, stroke width), and has a vast library of modern icons.
* **Where**: Used heavily across the entire application, especially in navigation menus, buttons, status indicators, and alerts (e.g., `src/TakeExam.jsx`, `src/pages/admin/AdminLayout.jsx`, `src/components/Toast.jsx`).
* **How**: Icons are imported as React components (e.g., `import { ShieldCheck, Mail } from 'lucide-react'`) and rendered inline within the JSX.

### `recharts`
* **What**: A composable charting library built on React components.
* **Why**: To provide visual analytics and dashboards. Raw data is hard to interpret; charts make it easy for admins, auditors, and students to understand performance, anomalies, and exam statistics at a glance.
* **Where**: Used in dashboard and analytics pages like `src/pages/admin/AdminDashboardPage.jsx`, `src/pages/student/StudentPerformancePage.jsx`, and `src/pages/admin/AdminGradebookPage.jsx`.
* **How**: Uses specialized React components like `<ResponsiveContainer>`, `<BarChart>`, `<AreaChart>`, mapping JSON data arrays directly to visual graphs with automatic scaling and tooltips.

### `cmdk`
* **What**: A fast, accessible, and unstyled command menu (command palette) component for React.
* **Why**: Provides a "Spotlight" or "Alfred" like search interface (often triggered by Cmd+K or Ctrl+K), allowing power users (like Admins) to quickly navigate the platform, find students, or execute actions without using the mouse.
* **Where**: Used in `src/components/CommandPalette.jsx`.
* **How**: It provides primitives that the developer styles. When the shortcut is pressed, a modal appears where typing filters a list of actionable items.

---

## 4. Utilities & Data Processing

### `date-fns`
* **What**: A modern JavaScript date utility library.
* **Why**: The native JavaScript `Date` object is notoriously difficult to work with. `date-fns` provides pure functions to format, parse, manipulate, and compare dates efficiently.
* **Where**: Used in dashboards and audit pages (`src/pages/admin/AdminDashboardPage.jsx`, `src/pages/auditor/AuditorExamsPage.jsx`) to format dates for display.
* **How**: Functions like `format(date, 'MMM dd, yyyy')` are used to render timestamps fetched from the backend into human-readable strings in the UI.

### `papaparse`
* **What**: A fast and powerful CSV (Comma-Separated Values) parser for the browser.
* **Why**: To allow administrators or professors to bulk-import data (like creating a batch of students) by uploading an Excel/CSV file, rather than typing them in one by one.
* **Where**: Used in `src/pages/professor/ProfessorCreateBatchPage.jsx` and `src/pages\\admin\\AdminStudentsPage.jsx`.
* **How**: The library reads an uploaded `.csv` file via the browser's File API and instantly converts the rows into a JSON array, which is then sent to the backend via `axios`.

### `html2canvas` & `jspdf`
* **What**: `html2canvas` takes a "screenshot" of a DOM element. `jspdf` is a library to generate PDF files in client-side JavaScript.
* **Why**: Enables users (like admins or professors) to export gradebooks, reports, or visual analytics directly to a downloadable PDF without requiring backend PDF generation logic.
* **Where**: Used in `src/pages/admin/AdminGradebookPage.jsx`.
* **How**: When a user clicks "Export to PDF", `html2canvas` captures the visual state of the gradebook table/chart and converts it to an image. This image is then embedded into a PDF document using `jspdf` and downloaded to the user's computer.

### `katex`
* **What**: A fast math typesetting library for the web.
* **Why**: While present in the `package.json`, it is likely intended for rendering complex mathematical equations and formulas in examination questions, allowing physics or math exams to display correctly.
* **Where**: Included in dependencies, meant for question rendering components.

---

## 5. Build Tools & Development (DevDependencies)

### `vite` & `@vitejs/plugin-react`
* **What**: A next-generation frontend tooling build tool.
* **Why**: It replaces older tools like Webpack or Create React App. Vite provides a significantly faster and leaner development experience. It features near-instant Hot Module Replacement (HMR) and highly optimized production builds using Rollup.
* **How**: The `vite` command starts the dev server. The `@vitejs/plugin-react` enables fast refresh and JSX compilation. Running `vite build` bundles all the React code, CSS, and libraries into highly minified static files ready for deployment.

### `oxlint`
* **What**: A suite of high-performance linters for JavaScript and TypeScript, written in Rust.
* **Why**: Used to quickly catch syntax errors, potential bugs, and enforce coding standards across the team without the performance overhead often associated with ESLint.
* **How**: Executed via the `npm run lint` script (`oxlint`), scanning the codebase and reporting violations in the terminal.

### `@types/react` & `@types/react-dom`
* **What**: TypeScript definition files for React.
* **Why**: Even if the project primarily uses JavaScript (`.jsx`), these definitions provide powerful IntelliSense, autocomplete, and inline documentation in modern IDEs like VS Code, significantly improving developer productivity.
