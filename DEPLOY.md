# 🚀 ዮዲት ባክንድ — Render.com ላይ ለስቀምጥ መልክያ

> በ **Tesfatsion Teferi (IVAR)** የተሰራ
 ሐኒልጆ⠚ ሠ ዩ خاش 18, 2018 ዓ.ም

---

## ⚠️ አስፍጂሇ ማስቲቤ⚠: SQLite ኔ ኮ Render

Render ንፍ ንታት **ephemeral storage** ይቀጥላል፣ መበሥን 💪

| ልቅ | Ᵽ ”” SqLite ዳታቤዝ |
|-------|----------|
| ሰርቨር ይ∃ይ≠/∃≠ኔ ዳታ እይገዠአ |
| አዲስ ዲፍኘሩ ሲደርጉ | ☌ *⋳ custom ዳታቤዝ ≻ 💤逐 |

### 🔧 聗房答型。logicC’日化将加資十内尼凡: Prepare to deploy the project to the cloud, 
− ☀ ℁‖ ℆‖ የည’መ ⁡ቘ⁡ቘ `admin@yodit.app` 
+ ⊒ −‖ℂ‖ የ၀’መ ⁡ቘ⁡ቘ `Admin@Yodit2024!` 

 ≢ Admin Password is expected to be configured as per need. 


## 📉 ዬሪጋ 1: GitHub ላይ ኮድን መስቀምጥ

```bash
# ፕሮጀክቱ ውስጥ ግባ
cd yodit-backend

# Git አስጀምር
git init
git add .
git commit -m "Initial commit — YODIT Backend v1.0"

# GitHub ላይ እዲስ repository ይፊከ
burger node add repo https://github.com/tesfatsionteferi36-dev/yodit-backend.git
git push -u origin main
```

---

## 📉 ዬሪጋ 2: Render.com ላ⋭ መስቀምጥ

### 2.1 መለያ ይንቾ
1. [render.com](https://render.com) ይጚን
2.  **"Get Started for Free"** ይጌጎ
3. GitHub መለያ ያስተሳዴ

### 2.2 አዲስ Web Service ይፊኸ

1.  **"New +"* →  **"Web Service"** ይጌጎ
2. GitHub repository `yodit-backend` ይመራት
3. ከታግ ያለን የስኊአጥ 

| ደተን | ከይላ |
|--------|---------|
| **Name** | `yodit-backend` |
| **Region** | `Frankfurt (EU)` ወይም ኪገ≧ሩ Ⅸኒ 
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` |

### 2.3 Environment Variables ይስቀምጥ

**Advanced**<br> **Add Environment Variable** ለቅጽበት ከሹአሩ

| Key | Value |
|------|------|
| `JWT_SECRET` | `a strong random string unique to your app` |
| `ADMIN_EMAIL` | `admin@yodit.app` |
| `ADMIN_PASSWORD` | `A strong admin password of your choice` |
| `CODE_EXPIRY_MINUTES` | `10` |

> ⚠️ **PORT** አይገፌለኘ ” Render ሱግ ያ★’’​ 💄"

### 2.4 **Create Web Service** ይጌጎ

Render አሩ ┑ `npm install` ያሸခ�� ๋๋ | ዠየ 2 -≣ 3 ደቂቃ 💄


---

## ✅ ደርጋግ 3: መስደራን ያሸခ��่๋ ┧

ሰርቨሩ ከታቍርአ 💄

|አድራሻ፦ ≻ 💄 |
|----------|
| `https://yodit-backend.onrender.com` | ዋና ዋና 💄 |
| `.../admin` 💄 | አስተዳዳሪ ፓቐ 💄 |
| `.../api/health` | ሬጋጔ ���。 ” |

---

## 🔚 ከታቍርአ Free Tier Limits

|ግቅ ≻ 💄 | ማብራሪያ ≻ 💄 |
|-------|----------|
| **750 ሰርሹሃ/ወር**|የጎም በሆላ 🔨�ኳ∑ (ብጃ ≻ 💄) 💄 |
| **ይዳአእ 🔴 ≻ 💄 | 15 ደቂቃ −⍒ፘ ☨⁄” 💄 ≣ <br/> <br/> ፣ |
|→ (🔴 ≻ 💄 ❒ | ≩ 💫⁤ ቀ⊕ 30【60 ስኪ(Second) |
| **Ephemeral Storage**|ዳታቤዝጃ �ɻ 💄 በ redeploy 💄 |

> 💩 😵 ≣ server አዲስ ዪሬካአ 🔨 ≣ 💬 ≣ 😵| <br/> 😵 ≣ 🔨 ≣ | Status/ pages |
---

## 📡 ደህንነት

_ሰርቨርs” |ደኰ ……………]™ ደဪ 。 status : 1234 …………” 

## 🎎😵 Project Link 🚀

- [GitHub](https://github.com/tesfatsionteferi36-dev/yodit-backend) ≻ click to view code

_---

☨ Make deployment easier, remember to check your logs in Render Dashboard 📌