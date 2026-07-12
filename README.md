# EduTrack 🎓📱

EduTrack is a smart, mobile-first Progressive Web Application (PWA) and native Android application designed to help students and parents track, simulate, and manage education loans, interest accruals, moratorium periods, document vault storage, and AI-driven loan counseling.

---

## 🚀 Key Features

* **Central Loan Dashboard**: Real-time aggregation of sanctioned principal amounts, outstanding balances, dynamic accrued interest, and upcoming EMI due dates.
* **Moratorium Countdown Tracker**: Displays active moratorium periods, tracks daily interest accrual, and alerts you about capitalization dates.
* **Dynamic Amortization Tables**: Generate custom payment schedules showing principal vs. interest breakdown for both simple and compound interest schemes.
* **AI Chat Coach**: Integrated conversational counselor (powered by OpenAI GPT-4o) that answers questions on moratorium extensions, repayments, and bank policies.
* **Vault Document Uploads**: Secure storage for loan sanction letters, interest certificates, and receipts, complete with AI-powered document summary scanners.
* **Automated Reminder Scheduler**: A background worker daemon that automatically generates in-app notifications for upcoming EMIs based on custom warning periods.
* **Data Backup & Exporter**: Export your entire loan ledger, payment history, and documents into structured CSV or JSON backups.
* **Cross-Platform Delivery**: Run as a responsive browser application or build directly into a native Android APK using Capacitor.

---

## 🛠️ Technology Stack

### Frontend (Client)
* **Core Framework**: React 18, TypeScript, Vite
* **Styling & UI**: Tailwind CSS v4, Lucide Icons, Framer Motion (for animations)
* **State Management**: Zustand
* **Native Wrapper**: Capacitor JS (Android SDK integration)

### Backend (Server)
* **API Framework**: FastAPI (Python 3.11+)
* **Database & ORM**: SQLite (development) & SQLAlchemy ORM
* **Security & Auth**: JWT (JSON Web Tokens), bcrypt password hashing
* **Serialization**: Pydantic v2 (CamelCase serialization mapper)
* **Background Tasks**: Python Threading Scheduler

---

## 💻 Getting Started (Local Setup)

Follow these steps to run the frontend and backend servers on your local computer.

### 1. Prerequisites
Ensure you have the following installed on your machine:
* [Python 3.11+](https://www.python.org/)
* [Node.js 18+](https://nodejs.org/)

---

### 2. Backend Server Setup
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. (Optional) Set up your environment variables by creating a `.env` file in the `backend` folder:
   ```env
   OPENAI_API_KEY=sk-proj-yourOpenAiKeyForAiChatAndOcr
   ```
5. Launch the backend API server:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   *Note: Binding to `0.0.0.0` allows your mobile phone to connect to the backend over Wi-Fi.*

---

### 3. Frontend Client Setup
1. Navigate to the `frontend` folder:
   ```bash
   cd ../frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Configure the local network connection in `src/lib/api.ts`:
   * To connect from a mobile phone, replace the `API_BASE_URL` IP address with your computer's actual Wi-Fi network IP (e.g. `http://192.168.1.15:8000`).
   * For local PC browser usage only, you can leave it as `http://localhost:8000`.
4. Launch the frontend development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to **`http://localhost:5173`**.

---

## 📱 Building & Running the Android APK

EduTrack is equipped with Capacitor to compile web assets into a native Android application.

### 1. Sync Web Assets
1. Compile the production bundle from the `frontend` folder:
   ```bash
   npm run build
   ```
2. Copy the assets to the Android native project folder:
   ```bash
   npx cap copy android
   ```

### 2. Compile APK
1. Ensure your Java JDK (`JAVA_HOME`) and Android SDK (`ANDROID_HOME`) environment variables are configured.
2. Navigate to the native folder and run Gradle build:
   ```bash
   cd android
   # On Windows:
   .\gradlew assembleDebug
   # On Mac/Linux:
   ./gradlew assembleDebug
   ```
3. Your final installable debug APK will be generated at:
   📂 **`frontend/android/app/build/outputs/apk/debug/app-debug.apk`**

---

## 🔒 Security & Best Practices
* Passwords are encrypted on the backend using salted `bcrypt` algorithms.
* API endpoints are protected using JWT authorization headers attached to client requests.
* SQLite handles structured relational queries with foreign key constraints, mapping one-to-many payments, reminders, notifications, and documents dynamically.
