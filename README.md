# 👻 FanTrack

**Your Universal Task Space**

FanTrack is an offline-first web app for organizing your life. Includes an AI assistant powered by Google Gemini.

## ✨ Features

### 🎨 Design and Experience
* **Glassmorphism UI**: A modern, translucent interface with smooth animations and vibrant backgrounds.
* **Offline-First**: All data is securely stored in your browser's localStorage. Internet access is required only for the AI.
* **Responsive**: Works perfectly on both phones and desktops.

### 🛠 Tracker Types
* **🛒 Shopping**: Lists of items with prices and quantities. Automatic totals.
* **✈️ Travel**: Packing checklists with travel budget planning.
* **✅ Tasks**: A classic to-do list with filtering and sorting.
* **💪 Habits**:
* **Calendar Grid**: Visualize your progress by day of the month.
* **Collapse**: Accordion view – expand to mark a day, collapse for a more compact view.
* **Bulk Management**: Expand/Collapse All button for easy management of large lists.
* **Archive**: Hide completed habits but keep their history.
* **📝 Notes**: Space for free-flowing text.

### 🤖 Intelligence
* **AI Assistant (BYOK)**: Integration with Google Gemini.
* *Generate*: Ask to create a "Monthly Workout Plan" or "Lasagna Grocery List." * *Smart Add*: AI-generated habits are added directly to your list.
* *Privacy*: Your API key is stored locally only.

### ⚙️ Important
* **Backup**: Export and Import all data to JSON.
* **Localization**: Full support for Russian and English.

## 🔐 AI and Privacy

To enable AI suggestions:
1. Open **Settings** (gear icon).
2. Paste your **Google Gemini API Key**.
* Get the key: [Google AI Studio](https://aistudio.google.com/).
3. The key is stored only in the user's browser.

## 🛠 Technologies

* **Core**: React 19, TypeScript
* **Styling**: Tailwind CSS (with custom glass effects)
* **Icons**: Lucide React
* **AI**: Google GenAI SDK