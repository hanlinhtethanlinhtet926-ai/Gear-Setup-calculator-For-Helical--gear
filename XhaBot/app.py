import os
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# =========================
# Load Environment Variables
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")

# Load .env file if it exists for local development
load_dotenv(dotenv_path=ENV_PATH)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "google/gemma-4-26b-a4b-it:free")

if not OPENROUTER_API_KEY:
    raise ValueError(
        "OPENROUTER_API_KEY not found! Please set it as an environment variable "
        "or create a .env file in the project root."
    )

# =========================
# Load System Prompt
# =========================
BRAIN_PATH = os.path.join(BASE_DIR, "Brain.txt")
try:
    with open(BRAIN_PATH, "r", encoding="utf-8") as f:
        SYSTEM_PROMPT = f.read()
    print(f"[INFO] Loaded system prompt from: {BRAIN_PATH}")
except Exception as e:
    print(f"[ERROR] Could not read system prompt from {BRAIN_PATH}: {e}")
    print("[WARNING] Using default system prompt.")
    SYSTEM_PROMPT = "You are XhaBot, a helpful and friendly AI assistant. Keep your responses concise and clear."


# =========================
# Flask App
# =========================
app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates",
    static_url_path="/static"
)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# =========================
# Routes
# =========================
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Invalid request."}), 400

    user_message = data.get("message", "").strip()
    history = data.get("history", [])

    if not user_message:
        return jsonify({"error": "Message cannot be empty."}), 400

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": f"{request.scheme}://{request.host}",
        "X-Title": "XhaBot"
    }

    payload = {
        "model": MODEL_NAME,
        "messages": [{
            "role": "system",
            "content": SYSTEM_PROMPT
        }] + history + [{
            "role": "user",
            "content": user_message
        }]
    }

    try:
        response = requests.post(
            OPENROUTER_API_URL,
            headers=headers,
            json=payload,
            timeout=60
        )

        response.raise_for_status()

        result = response.json()

        return jsonify(result)

    except requests.exceptions.HTTPError as http_err:
        error_message = "An HTTP error occurred"
        try:
            error_message = http_err.response.json().get("error", {}).get("message", http_err.response.text)
        except Exception:
            error_message = http_err.response.text
        return jsonify({"error": error_message}), http_err.response.status_code

    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": str(e)
        }), 500


# =========================
# Run
# =========================
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True
    )
