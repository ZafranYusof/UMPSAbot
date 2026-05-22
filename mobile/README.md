# UMPSA Chatbot - Flutter Mobile App

A Flutter mobile application for the UMPSA (Universiti Malaysia Pahang Al-Sultan Abdullah) AI Chatbot.

## Features

- 💬 **AI Chat** — Ask anything about UMPSA and get instant answers
- 🌐 **Bilingual** — Supports English and Bahasa Melayu
- 🌙 **Dark/Light Mode** — UMPSA-branded dark theme by default
- 📚 **Source Citations** — See where answers come from
- 💡 **Smart Suggestions** — Clickable suggestion chips for follow-up questions
- 📜 **Chat History** — Browse and resume past conversations
- 🔌 **Offline Detection** — Shows banner when no internet connection
- 👤 **Guest Mode** — No login required, start chatting immediately

## Getting Started

### Prerequisites

- Flutter SDK >= 3.10.0
- Dart SDK >= 3.0.0
- Android Studio or VS Code with Flutter extension
- An Android device or emulator

### Installation

1. **Clone the repository:**
   ```bash
   cd umpsa-chatbot/mobile
   ```

2. **Install dependencies:**
   ```bash
   flutter pub get
   ```

3. **Create assets directory:**
   ```bash
   mkdir -p assets/images
   ```
   Add your UMPSA logo as `assets/images/umpsa_logo.png` (optional).

4. **Run the app:**
   ```bash
   flutter run
   ```

### Configuration

The app connects to the UMPSA Chatbot API:
- **Production:** `https://umpsa-chatbot-api.onrender.com/api`
- **Local dev:** `http://localhost:5005/api`

To switch environments, modify `ApiService` in `lib/services/api_service.dart`.

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── app.dart                  # App widget, themes, navigation
├── screens/
│   ├── splash_screen.dart    # Animated splash screen
│   ├── onboarding_screen.dart # First-time onboarding (3 slides)
│   ├── chat_screen.dart      # Main chat interface
│   ├── history_screen.dart   # Conversation history list
│   └── settings_screen.dart  # App settings
├── widgets/
│   ├── chat_bubble.dart      # Message bubble widget
│   ├── typing_indicator.dart # Animated typing dots
│   ├── suggestion_chips.dart # Clickable suggestion chips
│   └── source_citation.dart  # Collapsible source list
├── services/
│   ├── api_service.dart      # HTTP API client (Dio)
│   └── storage_service.dart  # Local storage (SharedPreferences)
├── models/
│   ├── message.dart          # Message data model
│   └── conversation.dart     # Conversation data model
└── providers/
    ├── chat_provider.dart    # Chat state management
    └── settings_provider.dart # Settings state management
```

## Architecture

- **State Management:** Provider (ChangeNotifier)
- **HTTP Client:** Dio with timeout and error handling
- **Local Storage:** SharedPreferences for conversations and settings
- **Navigation:** Named routes with Navigator

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send a message |
| POST | `/api/auth/login` | Login (optional) |
| POST | `/api/auth/register` | Register (optional) |

### Chat Request Body
```json
{
  "message": "What courses does UMPSA offer?",
  "sessionId": "uuid-v4",
  "language": "en"
}
```

### Chat Response
```json
{
  "content": "UMPSA offers various courses...",
  "sources": ["Academic Handbook 2024", "UMPSA Website"],
  "suggestions": ["Tell me about engineering courses", "What about fees?"],
  "confidence": 0.92,
  "intent": "course_inquiry"
}
```

## Theming

- **Primary:** Dark Blue (#003366) — UMPSA brand color
- **Accent:** Gold (#D4AF37) — UMPSA accent
- **Dark Mode:** Deep navy background with blue-tinted surfaces
- **Light Mode:** Clean white with blue accents

## Dependencies

| Package | Purpose |
|---------|---------|
| provider | State management |
| dio | HTTP client |
| shared_preferences | Local storage |
| uuid | Session ID generation |
| connectivity_plus | Network status |
| animated_text_kit | Text animations |
| intl | Date formatting |
| flutter_animate | Smooth animations |

## Building

```bash
# Debug APK
flutter build apk --debug

# Release APK
flutter build apk --release

# App Bundle (for Play Store)
flutter build appbundle
```

## License

This project is part of the UMPSA Chatbot system.
