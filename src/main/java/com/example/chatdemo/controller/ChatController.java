// src/main/java/com/example/chatdemo/controller/ChatController.java
package com.example.chatdemo.controller;

import com.example.chatdemo.model.ChatMessage;
import com.example.chatdemo.model.MessageStatus;
import com.example.chatdemo.model.StatusUpdate;
import com.example.chatdemo.service.ChatService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Controller
public class ChatController {

    private final ChatService chatService;
    private final SimpMessageSendingOperations messagingTemplate;

    public ChatController(ChatService chatService, SimpMessageSendingOperations messagingTemplate) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload ChatMessage chatMessage) {
        // Assign a unique ID, timestamp, and initial status
        ChatMessage savedMessage = new ChatMessage(
            UUID.randomUUID().toString(),
            chatMessage.senderId(),
            chatMessage.receiverId(),
            chatMessage.senderDisplayName(),
            chatMessage.content(),
            Instant.now(),
            MessageStatus.SENT,
            chatMessage.destructTime()
        );

        chatService.addMessage(savedMessage);

        String chatKey = ChatService.getChatKey(savedMessage.senderId(), savedMessage.receiverId());
        String topic = "/topic/chat/" + chatKey;

        // Broadcast the message to both sender and receiver
        messagingTemplate.convertAndSend(topic, savedMessage);
    }
    
    @MessageMapping("/chat.readReceipt")
    public void handleReadReceipt(@Payload StatusUpdate update) {
        boolean updated = chatService.updateMessageStatus(update.messageId(), update.chatKey(), update.status());
        if (updated) {
            String[] users = update.chatKey().split("-");
            String originalSender = users[0];
            // Determine the original sender to send the status update to
            List<ChatMessage> history = chatService.getChatHistory(users[0], users[1]);
            for (ChatMessage msg : history) {
                if(msg.messageId().equals(update.messageId())) {
                    originalSender = msg.senderId();
                    break;
                }
            }
            // Send the status update to the original sender's private queue
            messagingTemplate.convertAndSendToUser(originalSender, "/queue/status", update);
        }
    }

    @GetMapping("/api/chat/history/{user1}/{user2}")
    public ResponseEntity<List<ChatMessage>> getChatHistory(@PathVariable String user1, @PathVariable String user2) {
        return ResponseEntity.ok(chatService.getChatHistory(user1, user2));
    }
}