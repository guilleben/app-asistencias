# Asistencias

Sistema de asistencias de empleados construido con Next.js, PWA (Serwist) y PostgreSQL (Prisma).

## Requisitos

- Node.js 20+
- Docker (opcional, para Postgres local)
- npm

## Setup local

1. Clonar el repositorio e instalar dependencias:

```bash
npm install
```

2. Configurar variables de entorno:

```bash
cp .env.example .env.local
```

3. Levantar PostgreSQL local (opcional):

```bash
docker compose up -d
```

Alternativa: usar una URL de [Neon Postgres](https://neon.tech) en `DATABASE_URL`.

4. Aplicar el schema y generar el cliente Prisma:

```bash
npm run db:generate
npm run db:push
```

5. Iniciar el servidor de desarrollo:

```bash
npm run dev
```

6. Verificar:

- App: [http://localhost:3000](http://localhost:3000)
- Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- Manifest: [http://localhost:3000/manifest.webmanifest](http://localhost:3000/manifest.webmanifest)

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (incluye service worker PWA) |
| `npm run start` | Servidor de producción |
| `npm run db:generate` | Genera el cliente Prisma |
| `npm run db:push` | Sincroniza schema con la base de datos |
| `npm run db:migrate` | Crea y aplica migraciones |
| `npm run db:studio` | Abre Prisma Studio |

## PWA

Serwist genera el service worker en build de producción. Para probar la PWA:

```bash
npm run build
npm run start
```

Luego en Chrome DevTools → **Application** → **Manifest** / **Service Workers**.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Serwist** — PWA / service worker
- **Prisma 7** + **PostgreSQL** (Neon en producción)
- **date-fns** — utilidades de fechas semanales/mensuales
- **shadcn/ui** — componentes UI

## Etapas del proyecto

- **Etapa 1** (actual): Setup del proyecto, PWA, DB y dependencias
- **Etapa 2**: ABM de empleados/asistencias y lógica de negocio
- **Etapa 3**: Deploy a Vercel + Neon via Marketplace

### Deploy (etapa 3)

```bash
vercel link
vercel integration add neon
vercel env pull .env.local --yes
npm run db:migrate
vercel deploy
```
