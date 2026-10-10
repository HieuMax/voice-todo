Here is the complete detailed implementation plan translated into English:

---

### 1. System Architecture

The application is designed following a **Client-Serverless (Jamstack combined with BaaS)** model, optimized for mobile user experience (PWA):

* **Frontend (PWA Client):** Runs directly on mobile browsers (Safari on iOS or Chrome on Android). Mobile-first UI optimized using Tailwind CSS. Uses the browser's built-in **Web Speech API** for real-time local speech recognition, combined with a custom Regular Expression module for parsing Vietnamese voice commands (Local Parser).
* **Backend & Database (BaaS - Supabase):** Uses Supabase PostgreSQL as the database to store tasks through the Supabase JavaScript Client (via REST API/Realtime).
* **Hosting & Deployment:** Deployed on **Vercel** with automatic SSL certificates (Mandatory requirement for HTTPS so browsers and iOS can grant Microphone permissions to the Web Speech API).

---

### 2. Tech Stack

* **Framework:** Next.js (App Router) - Enables fast UI development, built-in PWA configuration, and easy client/server component management.
* **Language:** TypeScript - Ensures clear data typing for task objects and parsers.
* **Styling:** Tailwind CSS - Builds a lightweight and flexible mobile user interface.
* **Database & Auth (Preparation):** Supabase (PostgreSQL).
* **Speech Recognition:** Native Web Speech API (`window.webkitSpeechRecognition`).
* **Deployment:** Vercel.

---

### 3. Project Structure

```text
voice-todo/
├── public/
│   ├── manifest.json
│   └── icons/               # App icons when Add to Home Screen on iOS
├── src/
│   ├── app/
│   │   ├── globals.css      # Tailwind configurations and global styles
│   │   ├── layout.tsx       # Root layout, PWA meta tags configuration for iOS
│   │   └── page.tsx         # Main application page (UI composition)
│   ├── components/
│   │   ├── TodoList.tsx     # Current todo task list display
│   │   ├── TodoItem.tsx     # Individual task row component (tick, delete)
│   │   └── VoiceButton.tsx  # Floating mic trigger button at the bottom of the screen
│   ├── hooks/
│   │   └── useSpeechRecognition.ts # Custom hook handling Web Speech API
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client initialization
│   │   └── todoParser.ts    # Regex module for parsing time and task name
│   └── types/
│       └── todo.ts          # TypeScript interfaces for data types
├── .env.local               # Supabase environment variables storage
├── tailwind.config.ts       # Tailwind CSS configuration
└── package.json

```

---

### 4. Detailed Implementation Plan (Across 4 Layers)

#### Layer 1: Infrastructure & Configuration Setup

* **Task 1.1: Initialize Next.js Project**
* Run command to create a new project integrated with TypeScript and Tailwind CSS.
* Clean up default CSS files in `src/app/globals.css` and clear `src/app/page.tsx` to create a blank canvas.


* **Task 1.2: Set Up Supabase Database**
* Create a new project on Supabase (Free Tier).
* Go to the SQL Editor and run the table creation query:
```sql
create table todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid, -- Allow null if user authentication is not implemented yet
  task text not null,
  reminder_time time,
  is_completed boolean default false,
  created_at timestamptz default now()
);

```


* Retrieve `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` and configure them in `.env.local`.


* **Task 1.3: Configure PWA Manifest & iOS Meta Tags**
* Create `public/manifest.json` defining app name, `display: standalone`, icons, and theme colors.
* Add meta tags into `src/app/layout.tsx` to force iOS Safari to hide the address bar and run in full-screen standalone app mode:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

```





---

#### Layer 2: Core Logic Processing

* **Task 2.1: Build Custom Hook `useSpeechRecognition.ts**`
* Initialize `window.webkitSpeechRecognition` object (with `typeof window !== 'undefined'` check and browser fallback support if needed).
* Configure parameters: `lang = 'vi-VN'`, `continuous = false`, `interimResults = false`.
* Manage lifecycle events: `onstart` (set listening state), `onend` (reset idle state), `onerror` (log microphone permission errors), and `onresult` (extract `event.results[0][0].transcript` raw text string).


* **Task 2.2: Build Local Parser Module (`todoParser.ts`)**
* Write a function that accepts raw text string from speech.
* Use Regular Expressions (Regex) to scan and extract common Vietnamese time expressions (e.g., *"lúc 8 giờ"*, *"9 giờ sáng"*, *"19 giờ 30"*, *"tối nay 8 giờ"*).
* Normalize the extracted time to standard `HH:mm` format.
* Use the `replace` method to remove time phrases and filler words (e.g., *"nhắc tôi"*, *"cần làm"*, *"nhớ"*), extracting a clean action string as the Task name.
* Return a clean object: `{ task: string, time: string | null }`.



---

#### Layer 3: UI/UX Design & Integration (Optimized for iPhone)

* **Task 3.1: Design Mobile-First Layout**
* Use Tailwind CSS to structure a mobile-bounded container: `max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col`.
* Build the task list display area (`TodoList` & `TodoItem`) including completion checkbox, task name, reminder time (if any), and delete button.


* **Task 3.2: Build the Trigger Button (Microphone Button)**
* Design a large, prominent floating micro button at the bottom center of the screen (Floating Action Button) for easy one-handed mobile operation.
* Add dynamic animation effects (`ping`/`pulse` wave animations or color changes) when `isListening = true` to give the user visual feedback that the system is recording.
* Attach an `onClick` event directly invoking the hook's `start()` method (satisfying Safari's strict direct user interaction requirement to prompt for microphone permission).



---

#### Layer 4: Data Connection & Deployment (Completion)

* **Task 4.1: Data Flow Integration**
* Connect events: When `onresult` returns text -> Call function `todoParser(text)` to extract clean object `{ task, time }`.
* Call Supabase Client to directly insert data (`supabase.from('todos').insert([{ task, reminder_time: time }])`).
* Update React State immediately to display the new task on the screen without reloading the page.


* **Task 4.2: Deploy to Vercel & PWA Testing on iPhone**
* Push source code to a personal GitHub repository.
* Import the project into Vercel, and configure Supabase environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_KEY`) on the Vercel dashboard.
* Open **Safari on iPhone**, visit the Vercel-provided URL.
* Test clicking the microphone button, grant microphone permission when Safari prompts, test Vietnamese voice recognition, and automatic saving to Supabase.
* Tap the Safari share button and select **"Add to Home Screen"** to turn the web app into a smooth native PWA app on the iPhone home screen.