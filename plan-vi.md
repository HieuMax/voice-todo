Dưới đây là bản kế hoạch triển khai chi tiết dựa trên các yêu cầu tính năng bạn đã đề ra, bao gồm: **Kiến trúc hệ thống**, **Tech Stack**, **Cấu trúc dự án** và **Chi tiết các bước thực hiện theo từng lớp**.

---

### 1. Kiến trúc hệ thống (Architecture)

Ứng dụng được thiết kế theo mô hình **Client-Serverless (Jamstack kết hợp BaaS)**, tối ưu hóa cho trải nghiệm di động (PWA):

* **Frontend (PWA Client):** Chạy trực tiếp trên trình duyệt di động (Safari trên iOS hoặc Chrome trên Android). Giao diện tối ưu dạng Mobile-First bằng Tailwind CSS. Sử dụng **Web Speech API** tích hợp sẵn của trình duyệt để xử lý nhận diện giọng nói trực tiếp tại thiết bị, kết hợp module Regex tự phát triển để phân tích câu lệnh tiếng Việt (Local Parser).
* **Backend & Database (BaaS - Supabase):** Sử dụng PostgreSQL của Supabase làm cơ sở dữ liệu lưu trữ các tác vụ (todos) thông qua Supabase JavaScript Client (giao tiếp qua REST API/Realtime).
* **Hosting & Deployment:** Triển khai trên **Vercel** với chứng chỉ SSL tự động (Yêu cầu bắt buộc về HTTPS để trình duyệt và iOS cấp quyền truy cập Micro cho Web Speech API).

---

### 2. Tech Stack (Công nghệ sử dụng)

* **Framework:** Next.js (App Router) - Giúp xây dựng giao diện nhanh chóng, hỗ trợ cấu hình PWA và dễ dàng quản lý client/server component.
* **Language:** TypeScript - Đảm bảo kiểu dữ liệu rõ ràng cho các đối tượng task và parser.
* **Styling:** Tailwind CSS - Xây dựng giao diện di động gọn nhẹ, linh hoạt.
* **Database & Auth (Chuẩn bị):** Supabase (PostgreSQL).
* **Speech Recognition:** Native Web Speech API (`window.webkitSpeechRecognition`).
* **Deployment:** Vercel.

---

### 3. Cấu trúc thư mục dự án (Project Structure)

```text
my-voice-todo-app/
├── public/
│   ├── manifest.json
│   └── icons/               # Icon ứng dụng khi Add to Home Screen trên iOS
├── src/
│   ├── app/
│   │   ├── globals.css      # Cấu hình Tailwind và style chung
│   │   ├── layout.tsx       # Root layout, cấu hình thẻ meta PWA cho iOS
│   │   └── page.tsx         # Trang chính của ứng dụng (UI tổng hợp)
│   ├── components/
│   │   ├── TodoList.tsx     # Danh sách hiển thị các task
│   │   ├── TodoItem.tsx     # Thành phần từng dòng task (tick, xóa)
│   │   └── VoiceButton.tsx  # Nút bấm thu âm lớn dạng nổi ở đáy màn hình
│   ├── hooks/
│   │   └── useSpeechRecognition.ts # Custom hook xử lý Web Speech API
│   ├── lib/
│   │   ├── supabase.ts      # Khởi tạo Supabase client
│   │   └── todoParser.ts    # Module Regex bóc tách thời gian và tên task
│   └── types/
│       └── todo.ts          # Định nghĩa kiểu dữ liệu (TypeScript Interfaces)
├── .env.local               # Lưu trữ biến môi trường Supabase
├── tailwind.config.ts       # Cấu hình Tailwind CSS
└── package.json

```

---

### 4. Kế hoạch chi tiết thực hiện (Theo 4 Lớp)

#### Lớp 1: Khởi tạo Hạ tầng & Cấu hình

* **Task 1.1: Khởi tạo Project Next.js**
* Chạy lệnh tạo dự án tích hợp sẵn TypeScript và Tailwind CSS.
* Dọn dẹp các file CSS mặc định trong `src/app/globals.css` và làm trống nội dung `src/app/page.tsx` để tạo màn hình trắng (blank canvas).


* **Task 1.2: Thiết lập Supabase Database**
* Tạo dự án mới trên Supabase (Free Tier).
* Truy cập SQL Editor và chạy câu lệnh tạo bảng:
```sql
create table todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid, -- Cho phép null nếu chưa làm hệ thống tài khoản
  task text not null,
  reminder_time time,
  is_completed boolean default false,
  created_at timestamptz default now()
);

```


* Lấy `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` cấu hình vào file `.env.local`.


* **Task 1.3: Cấu hình PWA Manifest & Meta Tags trên iOS**
* Tạo file `public/manifest.json` định nghĩa tên app, `display: standalone`, icon, màu sắc giao diện.
* Bổ sung các thẻ meta vào `src/app/layout.tsx` để ép iOS Safari ẩn thanh địa chỉ và chạy chế độ app toàn màn hình:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

```





---

#### Lớp 2: Xử lý Core Logic (Phần lõi ứng dụng)

* **Task 2.1: Xây dựng Custom Hook `useSpeechRecognition.ts**`
* Khởi tạo đối tượng `window.webkitSpeechRecognition` (cần kiểm tra `typeof window !== 'undefined'` và hỗ trợ browser fallback nếu cần).
* Cấu hình thông số: `lang = 'vi-VN'`, `continuous = false`, `interimResults = false`.
* Quản lý các sự kiện vòng đời: `onstart` (bật trạng thái nghe), `onend` (tắt trạng thái nghe), `onerror` (bắt lỗi chưa cấp quyền micro), và `onresult` (lấy `event.results[0][0].transcript` trả về chuỗi text thô).


* **Task 2.2: Xây dựng Module Local Parser (`todoParser.ts`)**
* Viết hàm nhận vào chuỗi text thô từ giọng nói.
* Sử dụng Regular Expressions (Regex) để nhận diện các mốc thời gian tiếng Việt phổ biến (Ví dụ: *"lúc 8 giờ"*, *"9 giờ sáng"*, *"19 giờ 30"*, *"tối nay 8 giờ"*).
* Chuẩn hóa thời gian tìm được về định dạng chuẩn `HH:mm`.
* Dùng phương thức `replace` để loại bỏ cụm từ chỉ thời gian và các từ đệm phổ biến (*"nhắc tôi"*, *"cần làm"*, *"nhớ"*), giữ lại chuỗi hành động làm tên Task sạch sẽ.
* Trả về object định dạng: `{ task: string, time: string | null }`.



---

#### Lớp 3: Giao diện UI/UX & Tích hợp (Tối ưu cho iPhone)

* **Task 3.1: Thiết kế giao diện Layout Mobile-First**
* Sử dụng Tailwind CSS tạo khung giao diện bo gọn như ứng dụng di động: `max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col`.
* Xây dựng khu vực hiển thị danh sách (`TodoList` & `TodoItem`) bao gồm checkbox hoàn thành, tên task, thời gian nhắc nhở (nếu có) và nút xóa.


* **Task 3.2: Xây dựng Nút Thu âm (Trigger Button)**
* Thiết kế nút Micro lớn, nổi bật ở góc dưới cùng màn hình (Floating Action Button), thuận tiện thao tác một tay trên điện thoại.
* Thêm hiệu ứng animation động (hiệu ứng sóng lan tỏa `ping`/`pulse` hoặc đổi màu đỏ/xanh) khi `isListening = true` để phản hồi trực quan cho người dùng.
* Gắn sự kiện `onClick` trực tiếp gọi hàm `start()` của hook nhận diện giọng nói (đáp ứng đúng yêu cầu bảo mật tương tác trực tiếp của Safari trên iOS để xin cấp quyền micro lần đầu).



---

#### Lớp 4: Kết nối Dữ liệu & Deploy (Hoàn thiện)

* **Task 4.1: Tích hợp luồng chạy (Data Flow Integration)**
* Liên kết sự kiện: Khi `onresult` trả về văn bản -> Gọi hàm `todoParser(text)` để bóc tách ra Object sạch `{ task, time }`.
* Gọi Supabase Client thực hiện lệnh chèn dữ liệu (`supabase.from('todos').insert([{ task, reminder_time: time }])`).
* Cập nhật React State ngay lập tức để hiển thị task mới lên màn hình mà không cần tải lại trang (reload).


* **Task 4.2: Deploy lên Vercel & Kiểm thử PWA trên iPhone**
* Đẩy mã nguồn lên kho lưu trữ GitHub cá nhân.
* Import dự án vào Vercel, cấu hình khai báo các biến môi trường Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_KEY`) trên bảng điều khiển của Vercel.
* Mở trình duyệt **Safari trên iPhone**, truy cập vào URL do Vercel cung cấp.
* Thử nghiệm bấm nút thu âm, cấp quyền Micro khi Safari hỏi, kiểm tra tính năng nhận diện giọng nói tiếng Việt và tự động lưu vào Supabase.
* Bấm vào nút chia sẻ của Safari và chọn **"Add to Home Screen"** để biến ứng dụng web thành một Native PWA app mượt mà trên màn hình chính iPhone.