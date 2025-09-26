// src/main/java/com/example/chatdemo/controller/UserController.java
package com.example.chatdemo.controller;

import com.example.chatdemo.model.User;
import com.example.chatdemo.service.ChatService;
import com.example.chatdemo.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final ChatService chatService;

    public UserController(UserService userService, ChatService chatService) {
        this.userService = userService;
        this.chatService = chatService;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signUp(@RequestBody Map<String, String> payload) {
        try {
            // The service now takes displayName and password, and generates the ID
            User user = userService.signUp(payload.get("displayName"), payload.get("password"));
            // Return the full user object so the frontend can display the new ID
            return ResponseEntity.ok(Map.of("sessionId", user.sessionId(), "displayName", user.displayName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        Optional<User> userOpt = userService.login(payload.get("sessionId"), payload.get("password"));
        return userOpt.<ResponseEntity<?>>map(
                user -> ResponseEntity.ok(Map.of("sessionId", user.sessionId(), "displayName", user.displayName()))
            )
            .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials."));
    }
    
    @GetMapping("/contacts/{sessionId}")
    public ResponseEntity<List<User>> getContacts(@PathVariable String sessionId) {
        return ResponseEntity.ok(userService.getAllUsersExcept(sessionId));
    }

    @DeleteMapping("/{sessionId}")
    public ResponseEntity<?> deleteUser(@PathVariable String sessionId) {
        userService.deleteUser(sessionId);
        chatService.anonymizeUserMessages(sessionId);
        return ResponseEntity.ok("User account deleted and messages anonymized.");
    }
}