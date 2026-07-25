# 🌬️ ዮዲት ባክንድ ሰርቨር

የ **ዮዲት የ12 ሳምንት የጤና ጉዞ** ዌብ አፕሊኬሽን ሙሉ ባክንድ እና አስተዳዳሪ ፓነል።

---

## 🔧 ባህሪያት (Features)

| ባህሪ | ማብራሪያ |
|-------|----------|
| 🔐 **Auth System** | ምዝገባ → አስተዳዳሪ ማጽደቅ → ሎጊን → ቬሪፍኬሽን ኮድ → JWT |
| 🔢 **Verification Codes** | ባለ 6 አሃዝ ኮድ፣ 10 ደቂቃ በሆላ ያበቃል፣ የተሳሳተ ከሆነ እንደገና ይጠየቃል |
| 👥 **Admin Panel** | ሁሉንም ዩዘሮች ማየት፣ ማጽደቅ፣ ማገድ፣ ማንጠልጠል |
| 📊 **User Data** | የእያንዳንዱን ዩዘር የጤና ዳታ ማየት |
| 💬 **Messaging** | ለአንድ ወይም ለሁሉም ዩዘሮች መልክት መላክ፣ ማንበባቸውን ማወቅ |
| 🟢 **Online Status** | ዩዘሮች ኦንላይን እንደሆኑ በቅጽበት ማየት (WebSocket) |
| 🔔 **Notifications** | ኮድ፣ መልክት፣ ማጽደቅ በቅጽበት በኖቲፍኬሽን መቀበል |
| 📱 **Multi-device** | በተለያየ ስልክ/ኮምፒውተር ሎጊን ሲያደርጉ የራሳቸውን ዳታ ያገኛሉ |
| ☁️ **Cloud Sync** | ዳታ በሰርቨር ላይ ይቀመጣል፣ በየ15 ሰከንድ ይመሳሰላል |
| 🚫 **Block Users** | ዩዘሮችን ማገድ እና እገዳ ማንሳት |
| 🔄 **Offline Fallback** | ሰርቨሩ ካልተገኘ በ localStorage ይቀጥላል |

---

## 📦 መጫኛ (Installation)

```bash
# 1. ወደ ፕሮጀክቱ ውስጥ ግባ
cd yodit-backend

# 2. Dependencies ጫን
npm install

# 3. ሰርቨሩን አስጀምር
npm start
```

ሰርቨሩ በ **http://localhost:3000** ላይ ይሰራል።

---

## 🔑 አስተዳዳሪ መግቢያ

- **አድራሻ፦** http://localhost:3000/admin
- **ኢሜይል፦** `admin@yodit.app`
- **የይለፍ ቃል፦** `Admin@Yodit2024!`

> ⚠️ እነዚህን በ `.env` ፋይል ውስጥ መቀየር ትችላለህ።

---

## 🌐 ፊት ኤንድ ማዋቀር

የአሁኑን `yyy-1-4.html` ከባክንዱ ጋር ለማገናኘት፦

1. `yyy-1-4.html` ወደ `/yodit-backend/public/` ኮፒ አድርግ
2. ከ `</body>` በፊት እነዚህን መስመሮች ጨምር፦

```html
<script src="/socket.io/socket.io.js"></script>
<script src="yodit-api.js"></script>
<script src="yodit-integration.js"></script>
```

---

## 📁 የፋይል መዋቅር

```
yodit-backend/
├── server.js              ← ዋና ሰርቨር (Express + Socket.IO)
├── db.js                  ← SQLite ዳታቤዝ
├── package.json           ← Dependencies
├── .env                   ← ውቅረት (configuration)
├── .gitignore
├── middleware/
│   └── auth.js            ← JWT authentication middleware
├── routes/
│   ├── auth.js            ← ምዝገባ፣ ሎጊን፣ ቬሪፍኬሽን
│   ├── admin.js           ← አስተዳዳሪ ፓነል፣ ዩዘር ማኔጅመንት
│   └── user.js            ← ዩዘር ዳታ ሲንክ
└── public/
    ├── admin.html         ← አስተዳዳሪ ዳሽቦርድ
    ├── yodit-api.js       ← API ክላይንት ላይብረሪ
    ├── yodit-integration.js ← ፊት ኤንድ ኢንተግሬሽን ስክሪፕት
    ├── sw.js              ← ሰርቪስ ወርከር (push notifications)
    ├── manifest.json      ← PWA manifest
    └── icon.svg           ← አዶ
```

---

## 🔌 API Endpoints

### Auth
| Method | Path | ማብራሪያ |
|--------|------|----------|
| POST | `/api/auth/register` | ምዝገባ |
| POST | `/api/auth/login` | ሎጊን (ቬሪፍኬሽን ኮድ ይልካል) |
| POST | `/api/auth/verify` | ኮድ አረጋግጥና JWT ተቀበል |
| POST | `/api/auth/resend-code` | አዲስ ኮድ እንደገና ላክ |
| GET | `/api/auth/me` | የዩዘር መረጃ |

### User Data
| Method | Path | ማብራሪያ |
|--------|------|----------|
| GET | `/api/user/data` | ዳታ አምጣ |
| POST | `/api/user/data` | ዳታ አስቀምጥ |
| GET | `/api/user/sync` | ከሰርቨር ሲንክ አድርግ |

### Admin
| Method | Path | ማብራሪያ |
|--------|------|----------|
| GET | `/api/admin/users` | ሁሉንም ዩዘሮች አምጣ |
| POST | `/api/admin/users/:email/approve` | ዩዘር አጽድቅ |
| POST | `/api/admin/users/:email/block` | ዩዘር አግድ |
| POST | `/api/admin/users/:email/unblock` | እገዳ አንሳ |
| GET | `/api/admin/users/:email/data` | የዩዘር ዳታ አምጣ |
| POST | `/api/admin/message` | መልክት ላክ |
| GET | `/api/admin/messages/stats` | የመልክቶች ስታትስ |

---

## ⚙️ ውቅረት (.env)

```env
PORT=3000
JWT_SECRET=yodit-super-secret-key-change-in-production-2024
ADMIN_EMAIL=admin@yodit.app
ADMIN_PASSWORD=Admin@Yodit2024!
CODE_EXPIRY_MINUTES=10
```

---

## 🛡️ ደህንነት

- ✅ JWT authentication (30 ቀን expiry)
- ✅ ቬሪፍኬሽን ኮድ ከ10 ደቂቃ በሆላ ያበቃል
- ✅ ኮድ ለአንድ ጊዜ ብቻ ይሰራል
- ✅ የታገዱ ዩዘሮች መግባት አይችሉም
- ✅ ያልጸደቁ ዩዘሮች አይገቡም
- ✅ Socket.IO በ JWT የተጠበቀ ነው
- ✅ SQLite WAL mode ለ concurrent access

---

## 🔄 WebSocket Events

| Event | Direction | ማብራሪያ |
|-------|-----------|----------|
| `authenticate` | Client → Server | JWT በመጠቀም ማረጋገጥ |
| `verification_code` | Server → Client | የቬሪፍኬሽን ኮድ ይልካል |
| `account_approved` | Server → Client | መለያ መጽደቁን ያሳውቃል |
| `account_blocked` | Server → Client | መለያ መታገዱን ያሳውቃል |
| `new_message` | Server → Client | አዲስ መልክት ያሳውቃል |
| `new_registration` | Server → Admin | አዲስ ምዝገባ ለአስተዳዳሪ |
| `user_online` | Server → Admin | ዩዘር ኦንላይን ሆኗል |
| `user_offline` | Server → Admin | ዩዘር ኦፍላይን ሆኗል |
| `online_count` | Server → All | የኦንላይን ብዛት |
| `message_read` | Server → Admin | መልክት መነበቡን ያሳውቃል |

---

## 🚀 Production Deployment

```bash
# 1. .env ውስጥ የይለፍ ቃላትን ቀይር
# 2. npm install --production
# 3. በ process manager አስጀምር (pm2 ወይም systemd)

npm install -g pm2
pm2 start server.js --name yodit
pm2 save
pm2 startup
```

---

✨ በ **ተስፋፂሆን (IVAR)** በ 2018 ዓ.ም የተሰራ — ለ **ዮዲት**
