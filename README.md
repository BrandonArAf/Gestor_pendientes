<div align="center">
  <img src="https://via.placeholder.com/150/0f0f11/38EB3B?text=P" alt="Logo Logo" width="100" />
  <h1>Gestor de Pendientes</h1>
  <p><strong>Bandeja unificada y elegante para la gestión de atención al cliente</strong></p>
</div>

<br>

## 🚀 Características
El **Gestor de Pendientes** es una aplicación de escritorio ultrarrápida y privada construida en Electron, diseñada desde cero para equipos de atención al cliente u oficinas. 

- 🔥 **Interfaz Glassmorphism**: Interfaz nativa, animada, ultra responsive y hermosa sin dependencias externas pesadas.
- 🔔 **Notificaciones Inteligentes**: Prevención de spam. Las notificaciones se te entregan exactamente cuando el tiempo de atención expiró, y tienen ciclos de recordatorio inteligentes si decides ignorarlas.
- 📆 **Filtros por Fecha y Canal**: Permite organizar tareas por correos recibidos, llamadas perdidas, mensajes de WhatsApp e Instagram, o seguimientos post-venta en fechas concretas.
- 👀 **Vista de Ticket (Bandeja Exclusiva)**: Al abrir una tarea, la pantalla se oscurece y se resalta solo la información fundamental, con correos y números telefónicos listos para usar.
- 💪 **Persistencia de Datos Privada**: La base de datos es nativa, almacenada en la carpeta oculta `.userData` de Windows, asegurando que tus teléfonos, correos y bases de datos JAMÁS salgan de tu ordenador.
- ⚡ **Auto-arranque (Autolaunch)**: Levanta silenciosamente con Windows.

---

## 🛠 Instalación Local
Si vas a clonar el proyecto y montar tu entorno, sigue estos pasos:

1. Asegúrate de instalar y tener corriendo la versión LTS de [Node.js](https://nodejs.org/es/).
2. Clona el repositorio oficial (o ábrelo si descargaste el .zip de un tercero).
   ```bash
   git clone https://github.com/BrandonArAf/Gestor_pendientes.git
   cd Gestor_pendientes
   ```
3. Ejecuta la instalación de dependencias nativas de NodeJS.
   ```bash
   npm install
   ```
4. Lanza la aplicación (Modo Producción Local).
   ```bash
   npm start
   ```

---

## 💻 Entorno de Desarrollo (Dev)
Para ver la consola de desarrollo (DevTools) adjunta, utiliza:
```bash
npm run dev
```

Las preferencias y datos se guardan estrictamente bajo la carpeta base `%AppData%/Pendientes`. 

### 🛡️ Sobre la Privacidad de los Datos (Privacy First)
Este Repositorio **no contiene** datos empresariales. En particular, los archivos `tasks.json` y los registros de error/notificaciones han sido completamente excluidos a través de Git y se encuentran blindados y encriptados en el entorno local del usuario. 

---

<p align="center"><i>Desarrollado con destreza bajo metodologías nativas de Electron y CSS Puro.</i></p>
