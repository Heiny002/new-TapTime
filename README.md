# TapTime!

A multiplayer real-time strategy game where 4 teams compete to be the last team standing. Each team has a castle that can be attacked or repaired, and players must work together to protect their castle while trying to destroy others.

## Features

- Real-time multiplayer gameplay
- 3D environment with team-specific camera views
- Interactive castle management (attack/repair)
- Team-based gameplay
- Responsive design for both desktop and mobile
- Beautiful 3D graphics using Three.js

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/taptime.git
cd taptime
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## How to Play

1. Enter your username and join the game
2. Wait for other players to join
3. When ready, enter the strategy room
4. Once all teams are ready, the battle begins
5. Click/tap on castles to:
   - Attack enemy castles (decreases health by 1)
   - Repair your own castle (increases health by 1)
6. Work with your team to be the last castle standing

## Controls

- Mouse/Touch:
  - Click/tap to attack/repair
  - Drag to rotate camera
  - Scroll/pinch to zoom
- Keyboard:
  - 1-4 keys for quick camera views
  - Space for camera reset

## Technical Details

- Built with Node.js and Express
- Real-time communication using Socket.IO
- 3D graphics powered by Three.js
- Responsive design with modern CSS

## Development

To run the development server with auto-reload:
```bash
npm run dev
```

## Testing

To run tests:
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 