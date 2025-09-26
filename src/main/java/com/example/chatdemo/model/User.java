// src/main/java/com/example/chatdemo/model/User.java
package com.example.chatdemo.model;

public record User(
    String sessionId,    // Unique username
    String displayName,
    String passwordHash
) {}