package com.blackbox.messenger.client;

import com.blackbox.messenger.common.JsonUtil;
import jakarta.websocket.*;
import java.io.IOException;
import java.net.URI;
import java.security.KeyPair;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

@ClientEndpoint
public class BlackboxClient {
    private static final Logger LOGGER = Logger.getLogger(BlackboxClient.class.getName());
    private Session session;
    private final String username;
    private final EncryptionService encryptionService;
    private final MessageHandler messageHandler;
    private final BlackboxGUI gui;

    public BlackboxClient(String username, BlackboxGUI gui) {
        this.username = username;
        this.encryptionService = new EncryptionService();
        this.messageHandler = new MessageHandler(gui, encryptionService);
        this.gui = gui;
        connectToServer();
    }

    @OnOpen
    public void onOpen(Session session) {
        this.session = session;
        LOGGER.info("Connected to server");
        try {
            KeyPair keyPair = encryptionService.generateKeyPair();
            Map<String, String> msg = new HashMap<>();
            msg.put("command", "REGISTER");
            msg.put("username", username);
            msg.put("publicKey", encryptionService.encodeKey(keyPair.getPublic()));
            sendMessage(JsonUtil.toJson(msg));
            Map<String, String> userListMsg = new HashMap<>();
            userListMsg.put("command", "GET_USERS");
            sendMessage(JsonUtil.toJson(userListMsg));
        } catch (Exception e) {
            LOGGER.severe("Error registering: " + e.getMessage());
            gui.displayError("Error registering");
        }
    }

    @OnMessage
    public void onMessage(String message) {
        messageHandler.handleMessage(message);
    }

    @OnClose
    public void onClose(Session session) {
        LOGGER.info("Disconnected from server");
        gui.displayMessage("Disconnected from server");
    }

    @OnError
    public void onError(Session session, Throwable throwable) {
        LOGGER.severe("Error: " + throwable.getMessage());
        gui.displayError("Error: " + throwable.getMessage());
    }

    public void sendEncryptedMessage(String recipient, String message) {
        try {
            String encrypted = encryptionService.encryptMessage(message);
            Map<String, String> msg = new HashMap<>();
            msg.put("command", "MESSAGE");
            msg.put("sender", username);
            msg.put("recipient", recipient);
            msg.put("encrypted", encrypted);
            sendMessage(JsonUtil.toJson(msg));
        } catch (Exception e) {
            LOGGER.severe("Error sending message: " + e.getMessage());
            gui.displayError("Error sending message");
        }
    }

    public void sendMessage(String message) {
        try {
            if (session != null && session.isOpen()) {
                session.getBasicRemote().sendText(message);
            }
        } catch (IOException e) {
            LOGGER.severe("Error sending message: " + e.getMessage());
            gui.displayError("Error sending message");
        }
    }

    private void connectToServer() {
        try {
            WebSocketContainer container = ContainerProvider.getWebSocketContainer();
            session = container.connectToServer(this, new URI("ws://localhost:8080/chat"));
        } catch (Exception e) {
            LOGGER.severe("Error connecting to server: " + e.getMessage());
            gui.displayError("Failed to connect to server");
        }
    }
}