package com.blackbox.messenger.common;

import java.util.logging.Logger;

public class LoggerConfig {
    public static Logger getLogger(String name) {
        return Logger.getLogger(name);
    }
}