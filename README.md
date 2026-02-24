# MeshMeet 🚀

**MeshMeet** is a high-performance, modern video conferencing application designed for seamless real-time collaboration. Built with **Next.js**, **Socket.IO**, and **WebRTC**, it provides a robust peer-to-peer communication experience with minimal latency.

![MeshMeet Banner](public/favicon.ico) <!-- You can add a proper banner later -->

## ✨ Key Features

- 🎥 **Real-time Video & Audio:** High-quality P2P media streams.
- 💬 **Instant Signaling:** Low-latency room management via Socket.IO.
- 🤝 **Peer-to-Peer:** Direct browser-to-browser communication using WebRTC.
- 👥 **Multi-User Support:** Easily handle multiple participants in a single room.
- 🔒 **Secure & Modern:** Built with React 18 and Next.js 15 for a sleek, responsive UI.
- 🌍 **Deployment Ready:** Optimized for platforms like Render and Vercel.

## 🛠️ Tech Stack

- **Frontend:** [Next.js](https://nextjs.org/), [React](https://reactjs.org/), [Tailwind CSS](https://tailwindcss.com/)
- **State Management:** React Context API
- **Real-time Communication:** [Socket.IO](https://socket.io/), [WebRTC](https://webrtc.org/)
- **Media Handling:** [PeerJS](https://peerjs.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/meet.git
   cd meet
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Copy `.env.local.example` to `.env.local` and fill in your credentials (e.g., TURN server if needed).
   ```bash
   cp .env.local.example .env.local
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Deployment

MeshMeet is designed to be easily deployed on **Render**.

1. Connect your GitHub repository to Render.
2. Use the provided `render.yaml` for a "Blueprint" deployment.
3. Configure your Environment Variables in the Render dashboard.

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Built with ❤️ by [Nikhil](https://github.com/your-username)
