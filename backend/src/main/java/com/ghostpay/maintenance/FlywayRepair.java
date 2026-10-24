package com.ghostpay.maintenance;

import org.flywaydb.core.Flyway;

public final class FlywayRepair {
    private FlywayRepair() {
    }

    public static void main(String[] args) {
        Flyway.configure()
            .dataSource(
                requiredEnvironment("DATABASE_URL"),
                requiredEnvironment("DATABASE_USERNAME"),
                requiredEnvironment("DATABASE_PASSWORD"))
            .locations("classpath:db/migration")
            .load()
            .repair();
    }

    private static String requiredEnvironment(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " must be explicitly configured for Flyway repair");
        }
        return value;
    }
}
