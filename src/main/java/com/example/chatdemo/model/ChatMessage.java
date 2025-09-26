// src/main/java/com/example/chatdemo/model/ChatMessage.java
package com.example.chatdemo.model;

import java.time.Instant;

public record ChatMessage(
    String sender,
    String receiver,
    String content,
    Instant timestamp
) {}