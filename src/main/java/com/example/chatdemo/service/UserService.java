// src/main/java/com/example/chatdemo/service/UserService.java
package com.example.chatdemo.service;

import com.example.chatdemo.model.User;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
public class UserService {
    private final ConcurrentHashMap<String, User> users = new ConcurrentHashMap<>();
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /**
     * Creates a new user with a randomly generated Session ID.
     * @param displayName The user's chosen display name.
     * @param password The user's chosen password.
     * @return The newly created User object, including the generated sessionId.
     */
    public User signUp(String displayName, String password) {
        String sessionId;
        // Ensure the generated ID is unique
        do {
            sessionId = generateRandomSessionId();
        } while (users.containsKey(sessionId));

        String passwordHash = passwordEncoder.encode(password);
        User newUser = new User(sessionId, displayName, passwordHash);
        users.put(sessionId, newUser);
        return newUser;
    }
    
    /**
     * Generates a unique 15-digit session ID as a String.
     * @return A random 15-digit number string.
     */
    private String generateRandomSessionId() {
        long min = 100_000_000_000_000L; // 10^14
        long max = 999_999_999_999_999L; // 10^15 - 1
        long randomNum = ThreadLocalRandom.current().nextLong(min, max + 1);
        return String.valueOf(randomNum);
    }

    public Optional<User> login(String sessionId, String password) {
        User user = users.get(sessionId);
        if (user != null && passwordEncoder.matches(password, user.passwordHash())) {
            return Optional.of(user);
        }
        return Optional.empty();
    }
    
    public Optional<User> findBySessionId(String sessionId) {
        return Optional.ofNullable(users.get(sessionId));
    }

    public void deleteUser(String sessionId) {
        users.remove(sessionId);
    }
    
    public List<User> getAllUsersExcept(String sessionId) {
        return users.values().stream()
            .filter(user -> !user.sessionId().equals(sessionId))
            .collect(Collectors.toList());
    }
}