package com.blackbox.messenger.client;

import com.blackbox.messenger.common.JsonUtil;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

public class MessageHandler {
    private static final Logger LOGGER = Logger.getLogger(MessageHandler.class.getName());
    private final BlackboxGUI gui;
    private final EncryptionService encryptionService;

    public MessageHandler(BlackboxGUI gui, EncryptionService encryptionService) {
        this.gui = gui;
        this.encryptionService = encryptionService;
    }

    public void handleMessage(String message) {
        try {
            Map<String, Object> msg = JsonUtil.parseJson(message);
            String command = (String) msg.get("command");

            switch (command) {
                case "BROADCAST":
                    gui.displayMessage((String) msg.get("message"));
                    break;
                case "MESSAGE":
                    handleEncryptedMessage((String) msg.get("sender"), (String) msg.get("encrypted"));
                    break;
                case "USER_LIST":
                    gui.updateUserList((List<String>) msg.get("users"));
                    break;
                case "ERROR":
                    gui.displayError((String) msg.get("message"));
                    break;
                default:
                    LOGGER.warning("Unknown command: " + command);
            }
        } catch (Exception e) {
            LOGGER.severe("Error processing message: " + e.getMessage());
            gui.displayError("Error processing message");
        }
    }

    private void handleEncryptedMessage(String sender, String encrypted) {
        try {
            String decrypted = encryptionService.decryptMessage(encrypted);
            gui.displayMessage(sender + ": " + decrypted);
        } catch (Exception e) {
            LOGGER.severe("Error decrypting message: " + e.getMessage());
            gui.displayError("Error decrypting message from " + sender);
        }
    }
}