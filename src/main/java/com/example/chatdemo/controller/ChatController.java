// src/main/java/com/example/chatdemo/controller/ChatController.java
package com.example.chatdemo.controller;

import com.example.chatdemo.model.ChatMessage;
import com.example.chatdemo.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.time.Instant;
import java.util.List;

@Controller
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private SimpMessageSendingOperations messagingTemplate; // Used for sending messages to a specific topic

    /**
     * Handles incoming chat messages sent to the "/app/chat.sendMessage" destination.
     * The message is saved and then broadcast to the appropriate topic.
     * @param chatMessage The message payload from the client.
     */
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload ChatMessage chatMessage) {
        // Create a new message with a server-side timestamp
        ChatMessage messageWithTimestamp = new ChatMessage(
            chatMessage.sender(),
            chatMessage.receiver(),
            chatMessage.content(),
            Instant.now()
        );

        // Save the message to our in-memory store
        chatService.addMessage(messageWithTimestamp);

        // Construct the topic name and broadcast the message
        String topic = "/topic/chat/" + ChatService.getChatKey(messageWithTimestamp.sender(), messageWithTimestamp.receiver());
        messagingTemplate.convertAndSend(topic, messageWithTimestamp);
    }

    /**
     * REST endpoint to retrieve chat history between two users.
     * @param user1 The first user's ID.
     * @param user2 The second user's ID.
     * @return A list of chat messages.
     */
    @GetMapping("/api/chat/history/{user1}/{user2}")
    public ResponseEntity<List<ChatMessage>> getChatHistory(@PathVariable String user1, @PathVariable String user2) {
        return ResponseEntity.ok(chatService.getChatHistory(user1, user2));
    }
}