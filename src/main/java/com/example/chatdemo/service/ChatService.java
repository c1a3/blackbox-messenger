// src/main/java/com/example/chatdemo/service/ChatService.java
package com.example.chatdemo.service;

import com.example.chatdemo.model.ChatMessage;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ChatService {

    // In-memory store for chat histories. Key is a sorted combination of two user IDs.
    private final ConcurrentHashMap<String, List<ChatMessage>> chatHistories = new ConcurrentHashMap<>();

    // Mock users
    public static final List<String> MOCK_USERS = Arrays.asList("Alice", "Bob", "Charlie");

    /**
     * Pre-populates chat history between Alice and Bob for demonstration.
     */
    @PostConstruct
    private void initializeMockHistory() {
        String chatKey = getChatKey("Alice", "Bob");
        List<ChatMessage> history = new CopyOnWriteArrayList<>(); // Thread-safe list
        history.add(new ChatMessage("Alice", "Bob", "Hey Bob, how's the project going?", Instant.now().minusSeconds(300)));
        history.add(new ChatMessage("Bob", "Alice", "Hey Alice! Going well. Almost done with the backend.", Instant.now().minusSeconds(240)));
        history.add(new ChatMessage("Alice", "Bob", "Great to hear! Need any help with the frontend?", Instant.now().minusSeconds(180)));
        history.add(new ChatMessage("Bob", "Alice", "Actually, that would be great. I'll push my changes in a bit.", Instant.now().minusSeconds(120)));
        chatHistories.put(chatKey, history);
    }

    /**
     * Adds a message to the corresponding chat history.
     * @param message The ChatMessage to add.
     */
    public void addMessage(ChatMessage message) {
        String chatKey = getChatKey(message.sender(), message.receiver());
        // Get or create a new thread-safe list for the chat history
        chatHistories.computeIfAbsent(chatKey, k -> new CopyOnWriteArrayList<>()).add(message);
    }

    /**
     * Retrieves the chat history between two users.
     * @param user1 The first user.
     * @param user2 The second user.
     * @return A list of ChatMessage objects, or an empty list if no history exists.
     */
    public List<ChatMessage> getChatHistory(String user1, String user2) {
        String chatKey = getChatKey(user1, user2);
        return chatHistories.getOrDefault(chatKey, new ArrayList<>());
    }

    /**
     * Generates a consistent, order-independent key for a chat session between two users.
     * @param user1 The first user.
     * @param user2 The second user.
     * @return A string key (e.g., "Alice-Bob").
     */
    public static String getChatKey(String user1, String user2) {
        return Arrays.stream(new String[]{user1, user2}).sorted().reduce((a, b) -> a + "-" + b).orElse("");
    }
}