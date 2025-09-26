// src/main/java/com/example/chatdemo/service/ChatService.java
package com.example.chatdemo.service;

import com.example.chatdemo.model.ChatMessage;
import com.example.chatdemo.model.MessageStatus;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ChatService {
    private final ConcurrentHashMap<String, CopyOnWriteArrayList<ChatMessage>> chatHistories = new ConcurrentHashMap<>();
    private final SimpMessageSendingOperations messagingTemplate;

    public ChatService(SimpMessageSendingOperations messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public static String getChatKey(String user1, String user2) {
        return Arrays.stream(new String[]{user1, user2}).sorted().reduce((a, b) -> a + "-" + b).orElse("");
    }

    public void addMessage(ChatMessage message) {
        String chatKey = getChatKey(message.senderId(), message.receiverId());
        chatHistories.computeIfAbsent(chatKey, k -> new CopyOnWriteArrayList<>()).add(message);
    }

    public List<ChatMessage> getChatHistory(String user1, String user2) {
        return chatHistories.getOrDefault(getChatKey(user1, user2), new CopyOnWriteArrayList<>());
    }

    public boolean updateMessageStatus(String messageId, String chatKey, MessageStatus status) {
        CopyOnWriteArrayList<ChatMessage> history = chatHistories.get(chatKey);
        if (history == null) return false;

        for (int i = 0; i < history.size(); i++) {
            ChatMessage msg = history.get(i);
            if (msg.messageId().equals(messageId) && msg.status().ordinal() < status.ordinal()) {
                ChatMessage updatedMsg = new ChatMessage(
                    msg.messageId(), msg.senderId(), msg.receiverId(), msg.senderDisplayName(),
                    msg.content(), msg.timestamp(), status, msg.destructTime()
                );
                history.set(i, updatedMsg);
                return true;
            }
        }
        return false;
    }
    
    public void anonymizeUserMessages(String sessionId) {
        chatHistories.forEach((chatKey, messages) -> {
            for (int i = 0; i < messages.size(); i++) {
                ChatMessage msg = messages.get(i);
                if (Objects.equals(msg.senderId(), sessionId)) {
                    ChatMessage anonymizedMsg = new ChatMessage(
                        msg.messageId(), "Deleted User", "Deleted User", "Deleted User",
                        msg.content(), msg.timestamp(), msg.status(), msg.destructTime()
                    );
                    messages.set(i, anonymizedMsg);
                }
            }
        });
    }

    public void cleanupExpiredMessages() {
        Instant now = Instant.now();
        chatHistories.forEach((chatKey, messages) -> {
            boolean removed = messages.removeIf(msg -> msg.destructTime() != null && msg.destructTime().isBefore(now));
            if (removed) {
                // Notify both clients in the chat that the history has been updated
                String[] users = chatKey.split("-");
                if (users.length == 2) {
                    messagingTemplate.convertAndSendToUser(users[0], "/queue/history-update", chatKey);
                    messagingTemplate.convertAndSendToUser(users[1], "/queue/history-update", chatKey);
                }
            }
        });
    }
}