# Especificación de requisitos: Dashboard personal

**Versión:** 0.2 (borrador) · **Fecha:** 26/10/2026

---

## 1. Objetivo

Crear una aplicación web personal, disponible en todo momento, que muestre en un **dashboard** varios apartados de seguimiento personal.

La aplicación debe poder crecer: añadir un módulo nuevo no debe obligar a rehacer los existentes.

---

## 2. Usuarios e idiomas

- Hay **dos usuarios** autorizados. No existe registro público.
- Cada usuario entra con su propia cuenta (usuario y contraseña).
- **Ambos usuarios ven todos los datos** de la aplicación.
- La aplicación está disponible en **español e inglés**.

---

## 3. Alcance actual

| Apartado | Qué hace |
|---|---|
| **Gimnasio** | Gestionar rutinas de musculación (masculinas y femeninas) con varios estados. |
| **Go To Work** | Registrar estados relacionados con el trabajo (por ejemplo, "Ya tomé el metro"). |
| **Compras del mes** | Registrar gastos y mostrarlos en gráficos, con comparativas y tendencias de ahorro mensual. |

**Fase posterior:** el chat (ver sección 9).

---

## 4. Requisitos funcionales

### 4.1 Acceso y dashboard

| ID | Requisito |
|---|---|
| RF-01 | El usuario puede iniciar sesión con usuario y contraseña. Solo los dos usuarios autorizados pueden entrar. |
| RF-02 | El usuario puede cerrar sesión. |
| RF-03 | Tras entrar, se muestra un dashboard con un menú para acceder a cada apartado. |
| RF-04 | El usuario puede cambiar entre **modo oscuro** (activo por defecto) y **modo claro**. |
| RF-05 | El usuario puede cambiar el idioma entre **español** e **inglés**. |

### 4.2 Gimnasio

| ID | Requisito |
|---|---|
| RF-06 | Crear, ver, editar y borrar **rutinas de musculación**, desde la propia aplicación. |
| RF-07 | Cada rutina se clasifica como **masculina** o **femenina**. |
| RF-08 | Cada rutina tiene un **estado** (por ejemplo: borrador, activa, archivada). Los estados concretos están por confirmar. |
| RF-09 | Filtrar las rutinas por clasificación y por estado. |

### 4.3 Go To Work

| ID | Requisito |
|---|---|
| RF-10 | Mostrar una lista de **estados de trabajo** que el usuario puede marcar con un solo toque. Ejemplos: "Ya tomé el metro", "Ya llegué al trabajo", "Voy a desayunar", "Salí del trabajo", "Ya estoy en casa". |
| RF-11 | Cada vez que se marca un estado, se guarda con la **fecha y hora**. |
| RF-12 | Ver el historial de estados del día y de días anteriores. |
| RF-13 | Crear, editar y borrar los estados disponibles en la lista. |

### 4.4 Compras del mes

| ID | Requisito |
|---|---|
| RF-14 | Registrar, editar y borrar gastos (fecha, importe, categoría). |
| RF-15 | Mostrar **gráficos** de la relación de gasto del mes actual. |
| RF-16 | Mostrar **comparativas** de diferencias entre meses. |
| RF-17 | Mostrar **tendencias de ahorro mensual**. |

---

## 5. Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | **Disponibilidad:** la aplicación está accesible en todo momento desde internet. |
| RNF-02 | **Escalabilidad:** cada apartado es un módulo independiente. Añadir uno nuevo solo requiere registrarlo en el menú y crear sus pantallas y datos. El módulo de compras crecerá, así que debe diseñarse para ampliarse. |
| RNF-03 | **Seguridad:** acceso solo con inicio de sesión; comunicación por HTTPS; contraseñas nunca en texto plano; datos protegidos en Supabase; claves de API solo en el backend. |
| RNF-04 | **Privacidad:** los datos personales no se comparten con terceros. |
| RNF-05 | **Usabilidad:** la aplicación funciona bien en móvil y en escritorio. |
| RNF-06 | **Idiomas:** todos los textos se pueden traducir (español e inglés) sin tocar la lógica de la aplicación. |
| RNF-07 | **Rendimiento:** las pantallas cargan en unos 3 segundos o menos con una conexión normal. |

---

## 6. Arquitectura (resumen)

```
Usuario → React (Cloudflare Pages) → API Django → Supabase (PostgreSQL)
```

- **Frontend:** React, desplegado en Cloudflare Pages.
- **Backend:** Django, expone una API REST.
- **Base de datos:** Supabase (PostgreSQL en la nube).

---

## 7. Fuera de alcance (por ahora)

- Registro de nuevos usuarios.
- Aplicaciones móviles nativas.
- Notificaciones o recordatorios.
- Chat (se hará en una fase posterior).

---

## 8. Preguntas abiertas

1. **Gimnasio:** ¿qué estados tienen las rutinas? ¿Los propuestos (borrador, activa, archivada) o otros?
2. **Compras:** ¿las categorías son fijas o las defines tú? ¿Quieres importar extractos bancarios?
3. **Go To Work:** ¿quieres ver también tiempos entre estados (por ejemplo, cuánto tardaste en el metro)?

---

## 9. Fase posterior: chat

Pendiente de definir en una fase posterior. Idea inicial, que se decidirá entonces:

- El chat **no reentrena un modelo de IA**. Cada pregunta se traduce en una búsqueda sobre los datos guardados, y el modelo redacta la respuesta a partir de ellos.
- Motivo: reentrenar es caro, lento y poco preciso con datos concretos como fechas o importes.
- Solo se envían al servicio de IA los datos necesarios para responder cada pregunta.
