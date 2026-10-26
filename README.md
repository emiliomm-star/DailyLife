# DailyLife

Dashboard personal con tres apartados (Gimnasio, Go To Work, Compras del mes) y un chat previsto para una fase posterior.

Especificación: [docs/especificacion-requisitos.md](docs/especificacion-requisitos.md)

## Estructura

```
DailyLife/
├── frontend/   React + TypeScript (Vite). Se despliega en Cloudflare Pages.
├── backend/    Django + Django REST Framework (API).
└── docs/       Documentación del proyecto.
```

## Arranque en local

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python manage.py runserver
```

Base de datos (Supabase) y variables de entorno: pendiente de configurar.
