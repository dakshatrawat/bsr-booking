package com.bsr.bsr_booking.agent.dto;

public enum AgentAction {
    UPDATE_OWN_ACCOUNT,
    GET_MY_BOOKINGS,
    AVAILABLE_ROOMS,
    GET_ROOM_BY_ID,
    CREATE_BOOKING,
    SMALL_TALK,
    UNKNOWN;

    public static AgentAction fromValue(String value) {
        if (value == null) {
            return UNKNOWN;
        }
        return switch (value.trim().toUpperCase()) {
            case "UPDATE_OWN_ACCOUNT", "UPDATE_ACCOUNT" -> UPDATE_OWN_ACCOUNT;
            case "GET_MY_BOOKINGS", "GET_ALL_MY_BOOKINGS", "GET_BOOKINGS" -> GET_MY_BOOKINGS;
            case "AVAILABLE_ROOMS", "GET_AVAILABLE_ROOMS" -> AVAILABLE_ROOMS;
            case "GET_ROOM_BY_ID", "ROOM_DETAILS" -> GET_ROOM_BY_ID;
            case "CREATE_BOOKING", "BOOK_ROOM" -> CREATE_BOOKING;
            case "SMALL_TALK" -> SMALL_TALK;
            default -> UNKNOWN;
        };
    }
}

