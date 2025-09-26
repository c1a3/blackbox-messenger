// src/main/java/com/example/chatdemo/model/StatusUpdate.java
package com.example.chatdemo.model;

public record StatusUpdate(
    String messageId,
    String chatKey, // e.g., "Alice-Bob"
    MessageStatus status
) {}