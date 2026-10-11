# Voice Todo - Open Source

Ứng dụng web (PWA) ghi công việc bằng giọng nói tiếng Việt. Nói tự nhiên, hệ thống
nhận diện giọng nói ngay trên trình duyệt, tách thời gian nhắc và lưu vào danh sách.

## Tính năng

- Nhận diện giọng nói tiếng Việt (`vi-VN`) bằng Web Speech API có sẵn của trình duyệt.
- Bộ phân tích cú pháp (regex) tách giờ nhắc, ví dụ:
  - "Nhắc tôi mua sữa lúc 8 giờ sáng" -> `Mua sữa` lúc `08:00`
  - "Họp nhóm 19 giờ 30" -> `Họp nhóm` lúc `19:30`
  - "Gọi mẹ tối nay 8 giờ" -> `Gọi mẹ` lúc `20:00`
- Đánh dấu hoàn thành, xóa công việc, giao diện mobile-first.
- PWA: cài lên màn hình chính (Add to Home Screen) và chạy toàn màn hình.
- Lưu trữ trên Supabase; nếu chưa cấu hình, app tự chạy ở chế độ demo với
  `localStorage`.

## Chạy dự án

```bash
npm install
npm run dev
```

Mở http://localhost:3000.

> Lưu ý: Web Speech API cần **HTTPS** hoặc `localhost`. Trên iOS nên dùng Safari.

## Cấu hình Supabase

1. Tạo project trên [Supabase](https://supabase.com) (Free tier).
2. Mở SQL Editor và chạy:

```sql
create table todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  task text not null,
  reminder_time time,
  is_completed boolean default false,
  created_at timestamptz default now()
);

-- Bảo mật: mỗi người chỉ truy cập được công việc của mình.
alter table todos enable row level security;

create policy "select own todos"
  on todos for select using (auth.uid() = user_id);
create policy "insert own todos"
  on todos for insert with check (auth.uid() = user_id);
create policy "update own todos"
  on todos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own todos"
  on todos for delete using (auth.uid() = user_id);
```

3. Sao chép `.env.example` thành `.env.local` và điền khóa:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

- `NEXT_PUBLIC_*` là khóa công khai (an toàn để lộ trong trình duyệt).
- `SUPABASE_SERVICE_ROLE_KEY` là khóa **bí mật**, chỉ dùng ở máy chủ để tạo tài
  khoản (route `/api/auth/register`). **Không** thêm tiền tố `NEXT_PUBLIC_`.
  Lấy tại Supabase → Project Settings → API → `service_role` key.

Bỏ trống các biến này nếu chỉ muốn chạy thử nhanh (chế độ demo, không cần đăng nhập).

> Vì sao cần `service_role`? Tài khoản dùng email nội bộ `ten@voicetodo.app`,
> và Supabase chặn các domain rỗng/giả trên luồng đăng ký công khai
> (`email_address_invalid`). Route đăng ký tạo người dùng qua Admin API
> với `email_confirm: true`, nên không cần gửi email và đăng nhập được ngay.

## Đăng nhập

- Người dùng tự đăng ký bằng **tên đăng nhập** (3-20 ký tự: chữ thường, số, dấu `_`)
  và **mật khẩu** (tối thiểu 8 ký tự).
- Supabase Auth xử lý mã hóa mật khẩu và phiên đăng nhập an toàn
  (mật khẩu không bao giờ được lưu ở dạng thô).
- Row Level Security đảm bảo mỗi tài khoản chỉ đọc/ghi được công việc của chính mình.

Tài khoản đã đăng ký không cần dùng email thật; không cần bật/tắt xác nhận email.

## Triển khai

Đẩy mã nguồn lên GitHub, import vào Vercel và thêm ba biến môi trường
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` trong dashboard.

## Cấu trúc

```
src/
├── app/            # layout, page, globals.css, api/auth/register
├── components/     # LoginScreen, TodoApp, TodoList, TodoItem, VoiceButton
├── hooks/          # useAuth, useSpeechRecognition
├── lib/            # auth, username, supabase, supabaseAdmin, todos, todoParser
└── types/          # todo, web-speech
```
