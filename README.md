<div align="center">

  <img src="frontend/public/enactus-logo.png" alt="Enactus Logo" width="120" style="border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);" />

  # Enactus Event Ticket Manager

  **A modern, full-stack event ticketing and management portal designed for Enactus.**

  [![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
  [![License](https://img.shields.io/badge/License-Apache--2.0-F59E0B.svg)](LICENSE)

</div>

---

## 📌 Overview

**Enactus Event Ticket Manager** is a full-featured web application built to streamline how Enactus chapters and teams organize, publish, and manage event ticketing. Designed with a sleek signature dark and Enactus gold aesthetic, the platform connects organizers with participants, provides actionable analytics, and supports quick data reporting through browser-native CSV export.

---

## ✨ Features

- **🎨 Enactus Signature Branding**: Cohesive dark theme (`#0a0a0a`) with signature Enactus gold (`#F59E0B`), official logo integration, and responsive layout.
- **🛡️ Role-Based Access Control (RBAC)**:
  - **System Admin**: Review and approve/decline event submissions, manage registered users, update roles, and view overall statistics.
  - **Event Organizer**: Create, edit, and publish events; view real-time sales and capacity analytics; manage ticket inventory.
  - **Standard User**: Browse upcoming events, reserve/purchase tickets, and access booking records.
- **📥 One-Click CSV Export**:
  - Export filtered or complete event catalogs (title, date, price, tickets sold, organizer).
  - Export registered user registries with assigned roles and joined dates.
  - Export organizer analytics and revenue summaries with UTF-8 BOM encoding for seamless Excel compatibility.
- **📊 Interactive Analytics**: Visual chart dashboards (Chart.js) displaying ticket allocation, remaining capacity, and event revenues.
- **🔐 Secure Authentication**: JWT token authentication with secure cookies, OTP-based password reset via email, and protected API routes.
- **☁️ Cloud Media Uploads**: Integrated with Cloudinary for fast and reliable event and profile image hosting.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 18](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Material-UI (MUI)](https://mui.com/), and custom CSS
- **Charts & UI**: [Chart.js](https://www.chartjs.org/) & [react-chartjs-2](https://react-chartjs-2.js.org/), [Swiper](https://swiperjs.com/)
- **Routing & State**: [React Router v7](https://reactrouter.com/), Context API, Axios

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) with [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcrypt`, `cookie-parser`
- **File Storage**: `multer`, `multer-storage-cloudinary`, Cloudinary SDK
- **Mailing**: `nodemailer` for OTP delivery

---

## 📂 Project Structure

```
Event-Ticketing-System/
├── backend/
│   ├── config/            # Database connection configuration
│   ├── controllers/       # Route controllers (Event, User, Booking)
│   ├── middleware/        # Authentication and authorization guards
│   ├── models/            # Mongoose schemas (User, Event, Booking, Session)
│   ├── routes/            # Express API route declarations
│   └── index.js           # Server entry point
├── frontend/
│   ├── public/            # Static assets & Enactus logo
│   └── src/
│       ├── assets/        # Media assets
│       ├── components/    # Reusable UI (Navbar, Contact, Loader, Swiper)
│       ├── context/       # Authentication context provider
│       ├── pages/         # Application pages (Admin, Event, Booking, Auth)
│       ├── stylesheets/   # Custom component stylesheets
│       ├── utils/         # Helpers (CSV export, image crop)
│       ├── App.jsx        # Root application and route layout
│       └── main.jsx       # Client entry point
├── .env.example           # Environment variable template
├── package.json           # Backend dependencies and scripts
└── README.md              # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)
- [Git](https://git-scm.com/)

---

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/day0bot/enactus-event-ticket-manager.git
   cd enactus-event-ticket-manager
   ```

2. **Install backend dependencies:**
   ```bash
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Configure environment variables:**
   Create a `.env` file in the root directory based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Fill in your configuration:
   ```env
   PORT=8000
   MONGO_URI=your_mongodb_connection_string
   SECRET_KEY=your_jwt_secret_key
   EMAIL_USER=your_email@example.com
   EMAIL_PASS=your_email_password_or_app_token
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

---

### Running the Application

1. **Start the backend server:**
   ```bash
   npm run dev
   ```
   *The backend will be running at `http://localhost:8000`.*

2. **Start the frontend application:**
   In a separate terminal:
   ```bash
   cd frontend
   npm run dev
   ```
   *The client will be running at `http://localhost:5173`.*

---

## 📋 Role Capabilities

| Feature | Standard User | Organizer | System Admin |
|:---|:---:|:---:|:---:|
| Browse & Search Events | ✅ | ✅ | ✅ |
| Book / Reserve Tickets | ✅ | ❌ | ❌ |
| Create & Edit Events | ❌ | ✅ | ❌ |
| View Event Sales Analytics | ❌ | ✅ | ✅ |
| Export Analytics to CSV | ❌ | ✅ | ❌ |
| Export My Events to CSV | ❌ | ✅ | ❌ |
| Approve / Reject Events | ❌ | ❌ | ✅ |
| Export All Events to CSV | ❌ | ❌ | ✅ |
| Manage User Roles | ❌ | ❌ | ✅ |
| Export Users to CSV | ❌ | ❌ | ✅ |

---

## 📄 License

This project is licensed under the [Apache-2.0 License](LICENSE).
