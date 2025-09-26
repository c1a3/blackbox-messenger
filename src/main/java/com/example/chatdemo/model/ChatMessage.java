// src/main/java/com/example/chatdemo/model/ChatMessage.java
package com.example.chatdemo.model;

import java.time.Instant;

public record ChatMessage(
    String messageId,
    String senderId,
    String receiverId,
    String senderDisplayName,
    String content,
    Instant timestamp,
    MessageStatus status,
    Instant destructTime // Can be null
) {}