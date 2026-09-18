# ZeroLeak Anti-Cheating System: Project Documentation & Testing Guide

## 1. Features Added
- **Browser Event Detection**: Monitors tab switching, window blur/focus, fullscreen exit, and context menu (right-click) usage.
- **Clipboard Monitoring**: Detects and blocks copy, cut, and paste attempts during the exam.
- **Warning System**: Displays a customizable warning modal on detecting a violation.
- **Threshold-based Enforcement**: Automatically terminates the exam attempt and blocks the student account after a configured number of warnings (default: 3).
- **Incident Logging**: Records cheating incidents with severity and descriptions in the database.
- **Admin Dashboard**: Provides administrators with a view of cheating incidents, blocked students, and the ability to unblock students.
- **Continuous Session Ping**: Pings the server periodically to ensure the student's status is active and not blocked.

## 2. Files Created
### Backend
- **Path**: `backend/src/models/cheatingIncident.models.js`
  - **Name**: `cheatingIncident.models.js`
  - **Why**: To persistently store cheating events linked to a student and an exam.
  - **What**: Defines the Mongoose schema for `CheatingIncident`, including fields for student, exam, attempt, violation type, severity, description, action taken, and review status.
- **Path**: `backend/src/controllers/cheating.controllers.js`
  - **Name**: `cheating.controllers.js`
  - **Why**: To encapsulate all business logic related to cheating incidents and enforcement.
  - **What**: Contains methods for recording incidents (`recordIncident`), terminating attempts (`terminateAttempt`), and retrieving data for admins (`getIncidents`, `getBlockedStudents`, `unblockStudent`).
- **Path**: `backend/src/routes/cheating.routes.js`
  - **Name**: `cheating.routes.js`
  - **Why**: To expose API endpoints for anti-cheating operations.
  - **What**: Defines routes protected by JWT middleware for both students (submitting incidents) and admins/auditors (reviewing incidents).

### Frontend
- **Path**: `frontend/src/utils/useAntiCheating.js`
  - **Name**: `useAntiCheating.js`
  - **Why**: To cleanly separate browser detection logic from UI components.
  - **What**: A custom React hook that sets up event listeners for `visibilitychange`, `blur`, `fullscreenchange`, `copy`, `cut`, `paste`, and `contextmenu`. It throttles events and calls an `onViolation` callback when cheating is detected.
- **Path**: `frontend/src/pages/admin/AdminCheatingDetection.jsx`
  - **Name**: `AdminCheatingDetection.jsx`
  - **Why**: To provide administrators with an interface to manage cheating and blocked students.
  - **What**: Renders tables and metrics for cheating incidents and blocked students, fetching real data from the backend APIs, and allows admins to unblock students.

## 3. Files Modified
### Backend
- **Path**: `backend/src/app.js`
  - **What was changed**: Imported and mounted `cheatingRouter` at `/api/anti-cheating`.
  - **Why**: To make the new cheating APIs accessible to the frontend.
- **Path**: `backend/src/middlewares/auth.middleware.js`
  - **What was changed**: Corrected JWT expiration handling to return proper `401` status codes instead of generic errors or unhandled exceptions.
  - **Why**: To stop frontend components from infinitely retrying requests with expired tokens, fixing terminal and UI flooding.

### Frontend
- **Path**: `frontend/src/TakeExam.jsx`
  - **What was changed**: Integrated the `useAntiCheating` hook, added warning modals, and implemented logic to call backend incident and termination APIs when the warning threshold is exceeded. Prevented resumption of terminated exams using `localStorage` flags and backend checks.
  - **Why**: To actively monitor students taking exams and enforce the anti-cheating policy seamlessly within the existing exam flow.
- **Path**: `frontend/src/components/Toast.jsx`
  - **What was changed**: Fixed toast rendering loops.
  - **Why**: To prevent continuous error toasts upon API failures like `401 Unauthorized`.
- **Path**: `frontend/src/App.jsx`
  - **What was changed**: Added a new route `/admin/cheating` pointing to `AdminCheatingDetection`.
  - **Why**: To integrate the admin cheating dashboard into the main application routing.
- **Path**: `frontend/src/pages/admin/AdminLayout.jsx`
  - **What was changed**: Added a link to the cheating detection dashboard in the sidebar.
  - **Why**: To allow admins to easily navigate to the cheating detection page.
- **Path**: `frontend/src/pages/auditor/AuditorDashboardPage.jsx`
  - **What was changed**: Connected existing dashboard cards to real API telemetry and added links to the cheating detection page.
  - **Why**: To integrate anti-cheating insights into the auditor's view.

## 4. How It Works
The complete flow in simple English:

1. **Student starts exam**: The student begins an assessment. The `TakeExam` component requests fullscreen mode and activates the `useAntiCheating` hook.
2. **Cheating detection**: The browser listens for actions like tab switching, window blurring, exiting fullscreen, or attempting to copy/paste.
3. **Warning**: If an action is detected, the frontend logs an incident to the backend asynchronously (`/api/anti-cheating/incident`) and displays a warning modal to the student. The warning counter increases.
4. **Incident saved**: The backend stores the incident in the database (`CheatingIncident` collection) along with the violation type and severity.
5. **Exam terminated**: If the student reaches the maximum number of warnings (default 3), the frontend immediately clears the timer, removes local session data, and calls the termination API (`/api/anti-cheating/terminate`).
6. **Student blocked**: The backend marks the exam result as "Terminated" and updates the student's record to `isBlocked: true`. If a blocked student tries to reconnect, the backend denies access (returning 403) and the frontend shows a "Restricted" screen.
7. **Admin sees incident**: Administrators and Auditors can log into their dashboards and navigate to the Cheating Detection page. Here, they see a real-time list of all incidents and blocked students fetched from the backend. Admins can click "Unblock" to restore a student's access.

## 5. API Summary

| HTTP Method | Endpoint | Purpose | Access Level |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/anti-cheating/incident` | Record a cheating violation during an active exam. | **Student** (Authenticated) |
| **POST** | `/api/anti-cheating/terminate` | Terminate an active exam attempt and block the student. | **Student** (Authenticated) |
| **GET** | `/api/anti-cheating/incidents` | Fetch paginated list of cheating incidents with optional filters. | **Admin & Auditor** |
| **GET** | `/api/anti-cheating/blocked-students` | Fetch paginated list of students whose accounts are currently blocked. | **Admin & Auditor** |
| **POST** | `/api/anti-cheating/unblock/:studentId` | Unblock a specific student and dismiss their pending incidents. | **Admin Only** |

## 6. How To Test

Follow this step-by-step manual testing guide:

1. **Start backend**: Open a terminal, navigate to `backend/`, and run `npm run dev`.
2. **Start frontend**: Open another terminal, navigate to `frontend/`, and run `npm run dev`.
3. **Login as Admin**: Go to `http://localhost:5173/admin/login` and log in with an admin account.
4. **Open Cheating Detection page**: Navigate to the "Cheating Detection" link in the sidebar to verify the page loads without infinite toasts.
5. **Login as Student**: Open a **new incognito window** or a different browser, go to `http://localhost:5173/student/login` and log in as a student.
6. **Start exam**: Go to your dashboard and start an active exam. The browser should prompt for fullscreen mode.
7. **Test tab switching**: Press `Alt+Tab` or click into another application, then return to the exam. A warning modal should appear.
8. **Test fullscreen exit**: Press `Esc` to exit fullscreen. Another warning should appear.
9. **Test copy/paste restrictions**: Try to highlight text and press `Ctrl+C`, or try to right-click on the screen. The action should be blocked and a warning may trigger.
10. **Test warning system**: Acknowledge the warnings and note the counter incrementing.
11. **Test automatic exam termination**: Trigger a total of 3 warnings. The exam should immediately terminate, showing the "Assessment Terminated" screen. Try refreshing the page; you should not be able to resume the exam.
12. **Check Admin incident records**: Go back to your Admin window and refresh the Cheating Detection page. The recent incidents should appear in the table.
13. **Check blocked student records**: Scroll down on the Admin page to view the Blocked Students table. The student you just tested with should be listed here. You can click "Unblock" to restore their access.
14. **Test expired JWT fix**: Log in as a student, then manually delete or alter your `studentToken` in `localStorage` via browser developer tools. Try to perform an action. You should be cleanly logged out or shown a single error, without terminal flooding or infinite UI toasts.

## 7. Important Limitations
The browser-based anti-cheating system relies entirely on standard Web APIs and DOM events. Therefore, it has inherent limitations:

- **Mobile camera cheating**: The browser cannot detect if a student is using a physical smartphone to take photos of the screen.
- **External screenshots**: Operating system-level screen capture tools (like Snipping Tool or Print Screen) often bypass browser events.
- **Secondary devices**: The system cannot detect if a student is reading answers from a second laptop or textbook placed off-camera.
- **Virtual Machines / Hardware spoofing**: Advanced techniques running the browser inside a restricted VM cannot be detected by these standard web hooks.
- **Guarantee**: This system provides *deterrence* and detects basic, common cheating methods (Googling answers in another tab), but it does **not guarantee 100% cheating prevention**.

## 8. Final Verification

- **Features Actually Working**:
  - Tab switching and window blur detection.
  - Fullscreen exit detection.
  - Copy/paste and context menu blocking.
  - Warning counter and modal display.
  - Automatic exam termination at the threshold.
  - Student blocking and prevention of exam resumption.
  - Admin dashboard displaying real data for incidents and blocked students.
  - Admin unblocking functionality.
  - Fix for the infinite expired JWT loops and toast errors.

- **Features Partially Working**:
  - Print detection (highly dependent on the specific browser's implementation of `beforeprint`).

- **Bugs Remaining**:
  - No critical bugs remain regarding the anti-cheating flow or the infinite JWT requests. The implementation gracefully handles errors and state restoration.

- **Files to Open to Understand the System**:
  - `frontend/src/utils/useAntiCheating.js` (Core browser detection logic)
  - `frontend/src/TakeExam.jsx` (Integration of warnings and termination into the exam UI)
  - `backend/src/controllers/cheating.controllers.js` (Core backend business logic for recording and terminating)
  - `backend/src/models/cheatingIncident.models.js` (Database schema for incidents)
