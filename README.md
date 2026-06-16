# BigQuery Release Notes Hub 🚀

A modern, fast, and responsive web application built with **Python Flask** on the backend and **Vanilla HTML, CSS, and JavaScript** on the frontend. It fetches the official Google Cloud BigQuery Release Notes Atom XML feed, parses the lumped HTML updates into separate granular cards, and provides a sleek interface to search, filter, and share specific updates directly to X (formerly Twitter).

---

## ✨ Features

*   **Atom Feed Aggregation**: Automatically fetches the official XML feed from `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`.
*   **Granular Update Parser**: Splits unified daily release logs into separate sub-items (e.g., separating Features, Changed, Deprecated, and Notices) for clean individual reading and sharing.
*   **In-Memory caching**: Caches parsed results for 10 minutes to minimize network traffic and page load times. Automatically falls back to stale cache if the network fails.
*   **Sleek Glassmorphism Dashboard**: Custom styling with deep dark tones, neon ambient glow elements, and dynamic loading skeletons.
*   **Real-time Client-side Search**: Instantly filters updates as you type and highlights matching search terms in yellow/indigo.
*   **X / Twitter Share Modal**: Select any individual update to customize a generated text draft. It displays a real-time character counter (warning if you exceed 280 characters) and redirects to the X Web Intent editor with a single click.

---

## 📂 Project Structure

```text
├── app.py                  # Flask web server, XML feed parser, caching logic
├── templates/
│   └── index.html          # Clean structure for the single-page application dashboard
├── static/
│   ├── css/
│   │   └── style.css       # Layout styles, glassmorphism panel CSS, and ambient animations
│   └── js/
│       └── app.js          # Controller handling API calls, search/filter, and sharing
├── .gitignore              # Files to ignore (e.g. Virtualenvs, caches, logs)
└── README.md               # Project documentation
```

---

## 🛠️ Tech Stack

*   **Backend**: Python 3.14+ / Flask 3.1+
*   **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism), Vanilla ES6 JavaScript
*   **Icons**: SVG elements embedded inline
*   **Upstream Feed**: Google Cloud Platform BigQuery RSS/Atom Feed

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Python 3 installed. You can verify this in your terminal:
```bash
python --version
```

### 2. Installation
Install the required dependencies (Flask, Requests, and Feedparser):
```bash
pip install flask requests feedparser
```

### 3. Running the Server
Start the development server:
```bash
python app.py
```
By default, the server runs on:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🌐 API Reference

### `GET /api/release-notes`
Fetches and returns the structured release notes.

**Response Schema (`application/json`):**
```json
{
  "entries": [
    {
      "id": "tag:google.com,2016:bigquery-release-notes#June_15_2026",
      "date": "June 15, 2026",
      "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_15_2026",
      "updated": "2026-06-15T00:00:00-07:00",
      "updates": [
        {
          "type": "Feature",
          "html": "<p>Use Gemini Cloud Assist to analyze your SQL queries...</p>",
          "text": "Use Gemini Cloud Assist to analyze your SQL queries..."
        }
      ]
    }
  ],
  "cached": true,
  "timestamp": 1781571408.0
}
```

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).
