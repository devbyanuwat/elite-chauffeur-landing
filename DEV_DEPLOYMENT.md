# Dev Branch Preview Deployment

Branch `dev` → image `:dev` → `dev-web.sabuygo.com`
Branch `main` → image `:latest` → `sabuygo.com`

---

## Git Branching Flow

```
main   ──── production (sabuygo.com)
dev    ──── preview    (dev-web.sabuygo.com)
```

Push ไป `dev` → GitHub Actions build image `:dev` → Watchtower pull อัตโนมัติ ภายใน 5 นาที

---

## First-Time Setup (ทำครั้งเดียว)

### 1. Cloudflare DNS

เพิ่ม A record ใหม่:

| Type | Name    | Content        | Proxy |
|------|---------|----------------|-------|
| A    | dev-web | `<KVM1-IP>`    | ON    |

> ใช้ IP เดียวกับ `sabuygo.com` — NPM จะ route แยกตาม domain

### 2. Nginx Proxy Manager (NPM)

เข้า NPM Admin UI: `http://<server-ip>:81`

เพิ่ม Proxy Host ใหม่:

| Field             | Value                    |
|-------------------|--------------------------|
| Domain Names      | `dev-web.sabuygo.com`    |
| Forward Hostname  | `elite-chauffeur-landing-dev` |
| Forward Port      | `80`                     |
| SSL Certificate   | wildcard `*.sabuygo.com` (ถ้ามี) หรือ request ใหม่ |
| Force SSL         | ON                       |
| HTTP/2 Support    | ON                       |

### 3. Deploy landing-dev container บน Server

SSH เข้า KVM 1 แล้วรัน:

```bash
cd /path/to/docker-compose
docker compose up -d landing-dev
```

ตรวจสอบว่า container รัน:

```bash
docker ps | grep landing-dev
```

---

## Day-to-Day Workflow

### Deploy ไป Dev

```bash
git checkout dev
# แก้ไขไฟล์...
git add .
git commit -m "feat: ..."
git push origin dev
```

GitHub Actions จะ build `:dev` tag อัตโนมัติ
Watchtower pull ภายใน 5 นาที → `dev-web.sabuygo.com` อัพเดท

### Promote Dev → Production

```bash
git checkout main
git merge dev
git push origin main
```

GitHub Actions จะ build `:latest` → `sabuygo.com` อัพเดท

---

## Files ที่เกี่ยวข้อง

| File | หน้าที่ |
|------|---------|
| `.github/workflows/deploy.yml` | CI/CD — build + push image ตาม branch |
| `docker-compose.yml` | `landing` (prod) + `landing-dev` (dev) services |

---

## Troubleshooting

**landing-dev ไม่อัพเดท:**
```bash
docker logs elite-chauffeur-landing-dev
docker pull ghcr.io/addminsabuy-dotcom/elite-chauffeur-landing:dev
docker compose up -d landing-dev
```

**ดู Watchtower log:**
```bash
docker logs watchtower --tail 50
```

**ตรวจสอบ image tag ที่ GHCR:**
`https://github.com/orgs/addminsabuy-dotcom/packages/container/package/elite-chauffeur-landing`
