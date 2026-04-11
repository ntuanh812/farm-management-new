# CLAUDE.md — Farm Management Frontend

## Project Overview

**FarmPro Pig** — Ứng dụng quản lý trang trại chăn nuôi heo (SPA). Toàn bộ UI bằng tiếng Việt. Hiện tại dùng mock data, chưa kết nối backend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 7 |
| Routing | React Router DOM 7 |
| State | Zustand 5 |
| UI Library | Ant Design 6 |
| Charts | Recharts 3 |
| HTTP | Axios (chưa dùng, chuẩn bị cho backend) |
| Date | Day.js |
| Styling | SCSS (module hóa) |

## Commands

```bash
npm run dev       # Dev server tại http://localhost:5173
npm run build     # Build production → /dist
npm run lint      # ESLint check
npm run preview   # Preview production build
```

## Project Structure

```
src/
├── components/layout/    # AppLayout, Sidebar, Topbar, PageHeader
├── domain/pigFarm.js     # Enum & constants của domain
├── pages/
│   ├── auth/             # Login, ForgotPassword, ResetPassword, VerifyOtp
│   ├── dashboard/        # DashBoard.jsx
│   ├── pig/              # PigManage, PigBarns, PigDead, PigFattening, PigstyHistory
│   ├── reproduction/     # PigBreeding, PigFarrowing
│   ├── materials/        # Bran (thức ăn), Medicine (thuốc)
│   └── health/           # PigVaccination
├── routers/AppRouter.jsx # Định nghĩa toàn bộ routes
├── store/pigFarmStore.js # Zustand store duy nhất
└── styles/               # SCSS có cấu trúc (base, components, pages)
```

## Path Alias

Import dùng `@` thay cho `./src`:
```js
import { usePigFarmStore } from '@/store/pigFarmStore'
import PageHeader from '@/components/layout/PageHeader'
```

## Routing

- **Public** (không có layout): `/login`, `/forgot-password`, `/reset-password`, `/verify-otp`
- **Protected** (có AppLayout — sidebar + topbar):
  - `/dashboard`
  - `/pigmanage`, `/pigmanage/barns`, `/pigmanage/pigsty-history`, `/pigmanage/pig-dead`, `/pigmanage/pig-fattening`
  - `/breeding/pig-breeding`, `/breeding/pig-farrowing`
  - `/materials/bran`, `/materials/medicine`
  - `/vaccination/schedule-vaccine`

## State Management (Zustand)

Store duy nhất tại `src/store/pigFarmStore.js`. Các collection chính:

```js
barns, staff, pigs, movements, deaths, saleBatches,
feedUsages, medicineUsages, vaccinations, activities
```

Actions hiện có: `addPig(data)`, `recordSaleBatch({ pigIds, soldAt, pricePerKg })`

Hook sử dụng:
```js
const { pigs, barns, addPig } = usePigFarmStore()
```

## Domain Models (`src/domain/pigFarm.js`)

```js
PigCategory:      SOW | BOAR | PIGLET | FATTENING
LifecycleStatus:  ACTIVE | SOLD | DEAD
BreedingStatus:   READY | PREGNANT
FatteningPhase:   RAISING | READY
```

## Styling Conventions

- SCSS module hóa: `base/` → `components/` → `pages/`, entry point là `style.scss`
- Palette nông nghiệp: primary xanh lá (#2d5a27), accent vàng lúa (#f4a261), danger đỏ chuồng (#c44536)
- Variables SCSS tại `styles/base/_variables.scss`
- Reset Ant Design: `antd/dist/reset.css` được import trong `main.jsx`

## Component Patterns

- **Form:** Dùng `Form.useForm()` từ Ant Design, validate required fields
- **Table:** Ant Design `Table` với columns định nghĩa theo pattern `{ title, dataIndex, key, render }`
- **Modal:** `useState` để kiểm soát open/close, submit form trong modal
- **Filter/Search:** `useState` + `useMemo` để lọc data local
- **Delete:** `Popconfirm` của Ant Design trước khi xóa
- **Status:** Ant Design `Tag` với màu tương ứng từ palette

## Backend Integration (Chưa thực hiện)

- Axios đã cài sẵn, chưa có API calls
- Auth pages hiện dùng `alert()` giả lập
- Store được thiết kế sẵn để thay mock data bằng API calls
- Cấu trúc data khớp với schema MySQL dự kiến

## Notes

- Toàn bộ text UI bằng **tiếng Việt**
- Ngày tháng format: `DD/MM/YYYY`
- Không có test files hiện tại
- Không có `.env` file — khi tích hợp backend cần thêm `VITE_API_URL`
