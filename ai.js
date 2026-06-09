// ai.js - Integration with OpenRouter.ai

const PROXY_URL = "http://localhost:3000/api/chat"; // Your Node.js proxy endpoint

document.addEventListener('DOMContentLoaded', () => {
    const aiForm = document.getElementById('aiForm');
    const userInput = document.getElementById('userInput');
    const chatContainer = document.getElementById('chatContainer');
    const sendBtn = document.getElementById('sendBtn');

    aiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;

        // Add user message to UI
        appendMessage('user', message);
        userInput.value = '';
        setLoading(true);

        try {
            const response = await fetch(PROXY_URL, { // Send request to your proxy
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "message": message
                })
            });

            const data = await response.json();
            const aiText = data.choices[0].message.content;
            appendMessage('assistant', aiText);
        } catch (error) {
            console.error("AI Error:", error);
            // Check if the error is likely due to the server not being started
            if (error instanceof TypeError && error.message.includes('fetch')) {
                appendMessage('assistant', "Error: Cannot connect to the local proxy server. Make sure you have run 'node server.js' in your terminal.");
            } else {
                appendMessage('assistant', "Sorry, I encountered an error connecting to the intelligence module.");
            }
        } finally {
            setLoading(false);
        }
    });

    function appendMessage(role, text) {
        const wrapper = document.createElement('div');
        wrapper.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} message-bubble`;
        
        const bubble = document.createElement('div');
        bubble.className = role === 'user' 
            ? 'bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-none max-w-[85%] shadow-md text-sm'
            : 'bg-white border border-indigo-100 p-4 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm text-sm text-gray-700';
        
        bubble.innerText = text;
        wrapper.appendChild(bubble);
        chatContainer.appendChild(wrapper);
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function setLoading(isLoading) {
        if (isLoading) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = `<span class="animate-pulse">Thinking...</span>`;
        } else {
            sendBtn.disabled = false;
            sendBtn.innerHTML = `Send <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
        }
    }
});