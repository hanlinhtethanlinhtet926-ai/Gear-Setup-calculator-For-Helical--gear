document.addEventListener("DOMContentLoaded", () => {
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const chatBox = document.getElementById("chat-box");
    const sendButton = chatForm.querySelector("button");

    let chatHistory = [];
    let waiting = false;
    let isTyping = false;

    chatForm.addEventListener("submit", sendMessage);

    async function sendMessage(e) {
        e.preventDefault();

        if (waiting || isTyping) return;

        const message = userInput.value.trim();

        if (!message) return;

        appendMessage(message, "user");
        chatHistory.push({ role: "user", content: message });

        userInput.value = "";
        userInput.focus();

        setWaiting(true);

        const loadingMessage = appendMessage("Thinking...", "bot loading");

        try {
            const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message,
                history: chatHistory.slice(0, -1) // Send history excluding the current message
            })
        });

            const text = await response.text();
            const data = text ? JSON.parse(text) : {};

            if (!response.ok) {
                loadingMessage.remove();
                appendMessage(
                    data.error || `Server Error (${response.status})`,
                    "bot error"
                );
                setWaiting(false);
                return;
            }

            let reply = "Sorry, I couldn't generate a response.";

            loadingMessage.remove();

            if (
                data.choices &&
                data.choices.length > 0 &&
                data.choices[0].message
            ) {
                reply = data.choices[0].message.content;
            } else if (data.error) {
                reply = data.error;
            }

            await typeMessage(reply, "bot");
            chatHistory.push({ role: "assistant", content: reply });

        } catch (error) {
            console.error(error);

            loadingMessage.remove();

            appendMessage(
                "Unable to connect to the server.",
                "bot"
            );
        } finally {
            setWaiting(false);
        }
    }

    function setWaiting(isWaiting) {
        waiting = isWaiting;
        const isDisabled = isWaiting || isTyping;
        userInput.disabled = isDisabled;
        sendButton.disabled = isDisabled;
    }

    async function typeMessage(fullText, sender) {
        return new Promise(resolve => {
            isTyping = true;
            setWaiting(true); // Keep input disabled

            const div = document.createElement("div");
            sender.split(" ").forEach(cls => div.classList.add(cls));
            chatBox.appendChild(div);

            let i = 0;
            const speed = 15; // Milliseconds per character

            function typeWriter() {
                if (i < fullText.length) {
                    // Use textContent for the typing part to avoid re-parsing HTML constantly
                    div.textContent = fullText.substring(0, i + 1);
                    chatBox.scrollTop = chatBox.scrollHeight;
                    i++;
                    setTimeout(typeWriter, speed);
                } else {
                    // Once typing is complete, parse the full markdown content
                    div.innerHTML = marked.parse(fullText);
                    div.querySelectorAll('pre code').forEach(block => {
                        hljs.highlightElement(block);
                    });
                    addCopyButtons(div);
                    chatBox.scrollTop = chatBox.scrollHeight;
                    isTyping = false;
                    setWaiting(false); // Re-enable input
                    resolve();
                }
            }
            typeWriter();
        });
    }

    function appendMessage(text, sender) {
        const div = document.createElement("div");

        sender.split(" ").forEach(cls => div.classList.add(cls));

        if (sender.includes("loading")) {
            div.innerHTML = `Thinking <div class="typing-dots"><span></span><span></span><span></span></div>`;
        } else if (sender.startsWith("bot")) {
            div.innerHTML = marked.parse(text);
            addCopyButtons(div);
            // Apply syntax highlighting to all code blocks
            div.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        } else {
            div.textContent = text;
        }

        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
        return div;
    }

    function addCopyButtons(container) {
        container.querySelectorAll('pre').forEach(pre => {
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-btn';
            copyButton.textContent = 'Copy';
            copyButton.onclick = () => {
                const code = pre.querySelector('code').innerText;
                navigator.clipboard.writeText(code).then(() => {
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
                });
            };
            pre.appendChild(copyButton);
        });
    }

    // Configure marked to work with highlight.js
    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        }
    });
});