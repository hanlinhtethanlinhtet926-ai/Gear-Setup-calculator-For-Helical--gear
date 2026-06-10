const aiForm = document.getElementById("aiForm");
const userInput = document.getElementById("userInput");
const chatContainer = document.getElementById("chatContainer");
const sendBtn = document.getElementById("sendBtn");

// OpenRouter API Key
const OPENROUTER_API_KEY = "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";

let messages = [];
let brainLoaded = false;

// Load Brain.txt
async function loadBrain() {
    try {
        const response = await fetch("./Brain.txt");

        if (!response.ok) {
            throw new Error("Brain.txt not found");
        }

        const brainContent = await response.text();

        messages = [
            {
                role: "system",
                content: brainContent
            }
        ];

        brainLoaded = true;

        console.log("Brain.txt loaded successfully.");
    } catch (error) {
        console.error("Failed to load Brain.txt:", error);

        messages = [
            {
                role: "system",
                content: "You are an Engineering AI Assistant."
            }
        ];

        brainLoaded = true;
    }
}

// Add chat message
function addMessage(text, isUser = false) {
    const wrapper = document.createElement("div");

    wrapper.className = isUser
        ? "flex justify-end"
        : "flex justify-start";

    const bubble = document.createElement("div");

    bubble.className = isUser
        ? "bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-none max-w-[85%] shadow-sm"
        : "bg-white border border-indigo-100 p-4 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm";

    bubble.innerHTML = text.replace(/\n/g, "<br>");

    wrapper.appendChild(bubble);
    chatContainer.appendChild(wrapper);

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Typing indicator
function addTypingIndicator() {
    const wrapper = document.createElement("div");

    wrapper.className = "flex justify-start";
    wrapper.id = "typingIndicator";

    wrapper.innerHTML = `
        <div class="bg-white border border-indigo-100 p-4 rounded-2xl rounded-tl-none shadow-sm">
            🤖 Thinking...
        </div>
    `;

    chatContainer.appendChild(wrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeTypingIndicator() {
    const typing = document.getElementById("typingIndicator");

    if (typing) {
        typing.remove();
    }
}

// Ask AI
async function askAI(prompt) {
    try {
        addTypingIndicator();

        messages.push({
            role: "user",
            content: prompt
        });

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "Helical Gear Calculator"
                },
                body: JSON.stringify({
                    model: "deepseek/deepseek-chat-v3-0324:free",
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000
                })
            }
        );

        const data = await response.json();

        removeTypingIndicator();

        if (!response.ok) {
            console.error(data);

            addMessage(
                "❌ Error: " +
                (data.error?.message || "Unknown error")
            );

            return;
        }

        const aiReply =
            data.choices?.[0]?.message?.content ||
            "No response received.";

        messages.push({
            role: "assistant",
            content: aiReply
        });

        addMessage(aiReply);

    } catch (error) {
        console.error(error);

        removeTypingIndicator();

        addMessage("❌ Failed to contact AI service.");
    }
}

// Form submit
aiForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!brainLoaded) {
        addMessage("⚠️ Brain.txt is still loading.");
        return;
    }

    const prompt = userInput.value.trim();

    if (!prompt) return;

    addMessage(prompt, true);

    userInput.value = "";

    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";

    await askAI(prompt);

    sendBtn.disabled = false;

    sendBtn.innerHTML = `
        Send
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
    `;
});

// Initialize
window.addEventListener("load", async () => {
    await loadBrain();
});
