package com.bsr.bsr_booking.agent.service;

import com.bsr.bsr_booking.agent.dto.AgentAction;
import com.bsr.bsr_booking.agent.dto.AgentChatMessage;
import com.bsr.bsr_booking.agent.dto.AgentChatRequest;
import com.bsr.bsr_booking.agent.dto.AgentChatResponse;
import com.bsr.bsr_booking.agent.dto.AgentDecision;
import com.bsr.bsr_booking.dtos.BookingDTO;
import com.bsr.bsr_booking.dtos.Response;
import com.bsr.bsr_booking.dtos.UserDTO;
import com.bsr.bsr_booking.enums.RoomType;
import com.bsr.bsr_booking.services.BookingService;
import com.bsr.bsr_booking.services.RoomService;
import com.bsr.bsr_booking.services.UserService;
import com.bsr.bsr_booking.repositories.RoomRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.StringJoiner;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgentService {

    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;
    private final UserService userService;
    private final RoomService roomService;
    private final BookingService bookingService;
    private final RoomRepository roomRepository;
    @Value("${frontend.payment.url:https://your-frontend-domain/payment}")
    private String frontendPaymentUrl;

    // Session-scoped conversation memory (in-memory; replace with distributed store if needed)
    private final Map<String, ConversationContext> sessionStore = new ConcurrentHashMap<>();

    private static final String PROMPT_TEMPLATE = """
            You are an AI booking assistant for Bhagat Singh Resort (hotel/resort). Purpose: hotel room discovery, availability checking, and booking. You must infer intent from casual language and perform slot-filling (intent, roomNumber, checkInDate, checkOutDate). Keep context from prior turns; do NOT re-ask for slots already provided. Return ONLY one JSON.
            
            Allowed actions + params:
            - update_own_account: {firstName?, lastName?, email?, phoneNumber?, password?}
            - get_my_bookings: {}
            - available_rooms: {checkInDate (YYYY-MM-DD), checkOutDate (YYYY-MM-DD), roomType? in [SINGLE, DOUBLE, SUIT, TRIPLE]}
            - get_room_by_id: {id (number)}
            - create_booking: {roomId (number), checkInDate (YYYY-MM-DD), checkOutDate (YYYY-MM-DD)}
            Disallowed: deleteOwnAccount, addRoom, any admin-only op.
            
            Business / domain:
            - Hotel name: Bhagat Singh Resort
            - Type: Hotel / Resort
            - Contact: available on website (phone/email)
            - Owner/Management: Resort staff (not AI)
            - Scope: Booking assistance, availability, hotel questions; not a general chatbot.
            
            Guidelines:
            - Understand generic asks like "rooms", "show rooms", "available rooms" without requiring perfect sentences.
            - Reuse dates/room intent already mentioned in conversation; do NOT ask again if known.
            - If booking slots are missing, ask ONLY for the missing ones (e.g., if dates known, ask for roomNumber).
            - If availability dates are missing, ask once for both dates.
            - If the user says "book on same date"/"book this"/"book one"/"reserve a room" after viewing rooms, reuse the last known dates; only ask for room number if missing.
            - Avoid repetitive wording; be concise and specific.
            - If action not allowed, set action "small_talk" with a brief refusal.
            - If unclear, use "small_talk" with a short, specific clarifying question.
            
            Respond with exactly:
            {"action":"<allowed_or_small_talk>","params":{...},"response":"<short user-facing reply>"}
            
            Conversation so far:
            %s
            Latest user message: "%s"
            """;

    public AgentChatResponse handleChat(AgentChatRequest request) {
        String sessionId = StringUtils.hasText(request.getSessionId()) ? request.getSessionId() : "default";
        ConversationContext prior = sessionStore.getOrDefault(sessionId, new ConversationContext());
        ConversationContext ctx = mergeContext(prior, deriveContext(request.getMessages()));
        String prompt = buildPrompt(request.getMessages(), ctx);
        String modelOutput;

        // First try lightweight intent + context parsing to reduce LLM calls
        AgentDecision quick = fallbackDecision(request);
        if (quick != null) {
            AgentChatResponse resp = executeDecision(quick, "fallback", ctx);
            sessionStore.put(sessionId, mergeState(ctx, quick));
            return resp;
        }

        try {
            modelOutput = geminiClient.generateText(prompt);
        } catch (Exception e) {
            log.error("Gemini call failed", e);
            AgentDecision fallback = fallbackDecision(request);
            if (fallback != null) {
                AgentChatResponse resp = executeDecision(fallback, "fallback", ctx);
                sessionStore.put(sessionId, mergeState(ctx, fallback));
                return resp;
            }
            return AgentChatResponse.builder()
                    .reply("I couldn't reach the assistant just now. Please try again in a few seconds.")
                    .action(AgentAction.UNKNOWN)
                    .build();
        }

        AgentDecision decision = parseDecision(modelOutput);
        String rawAction = decision.getAction() == null ? "" : decision.getAction();
        if (isBanned(rawAction)) {
            return AgentChatResponse.builder()
                    .reply("Sorry, that action is not allowed from the chatbot.")
                    .action(AgentAction.UNKNOWN)
                    .rawModelOutput(modelOutput)
                    .build();
        }

        AgentAction action = AgentAction.fromValue(rawAction);

        if (action == AgentAction.SMALL_TALK || action == AgentAction.UNKNOWN) {
            return AgentChatResponse.builder()
                    .reply(StringUtils.hasText(decision.getResponse()) ? decision.getResponse()
                            : "Could you clarify what you want to do?")
                    .action(action)
                    .rawModelOutput(modelOutput)
                    .build();
        }

        try {
            if (requiresAuth(action) && !isAuthenticated()) {
                return AgentChatResponse.builder()
                        .reply("Please log in to perform this action.")
                        .action(AgentAction.UNKNOWN)
                        .rawModelOutput(modelOutput)
                        .build();
            }

            AgentChatResponse resp = executeDecision(decision, modelOutput, ctx);
            sessionStore.put(sessionId, mergeState(ctx, decision));
            return resp;
        } catch (Exception e) {
            log.error("Failed to execute agent action {}", action, e);
            return AgentChatResponse.builder()
                    .reply("I couldn't complete that yet. Please confirm the room and dates, and I'll try again.")
                    .action(action)
                    .rawModelOutput(modelOutput)
                    .build();
        }
    }

    private Response executeAction(AgentAction action, Map<String, Object> params) {
        return switch (action) {
            case UPDATE_OWN_ACCOUNT -> userService.updateOwnAccount(toUserDTO(params));
            case GET_MY_BOOKINGS -> userService.getMyBookingHistory();
            case AVAILABLE_ROOMS -> roomService.getAvailableRooms(
                    parseDate(params, "checkInDate"),
                    parseDate(params, "checkOutDate"),
                    parseRoomType(params)
            );
            case GET_ROOM_BY_ID -> roomService.getRoomById(parseLong(params, "id"));
            case CREATE_BOOKING -> bookingService.createBooking(toBookingDTO(params));
            default -> throw new IllegalArgumentException("Unsupported action: " + action);
        };
    }

    private UserDTO toUserDTO(Map<String, Object> params) {
        return UserDTO.builder()
                .firstName(getString(params, "firstName"))
                .lastName(getString(params, "lastName"))
                .email(getString(params, "email"))
                .phoneNumber(getString(params, "phoneNumber"))
                .password(getString(params, "password"))
                .build();
    }

    private BookingDTO toBookingDTO(Map<String, Object> params) {
        Long resolvedRoomId = resolveRoomId(params);
        return BookingDTO.builder()
                .roomId(resolvedRoomId)
                .checkInDate(parseDate(params, "checkInDate"))
                .checkOutDate(parseDate(params, "checkOutDate"))
                .build();
    }

    private RoomType parseRoomType(Map<String, Object> params) {
        String value = getString(params, "roomType");
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return RoomType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid roomType. Use one of: SINGLE, DOUBLE, SUIT, TRIPLE");
        }
    }

    private LocalDate parseDate(Map<String, Object> params, String key) {
        String value = getString(params, key);
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException("Missing required date: " + key);
        }
        String normalized = value.trim().replaceAll("\\s+", " ");
        for (DateTimeFormatter formatter : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(normalized, formatter);
            } catch (DateTimeParseException ignored) {
                // try next formatter
            }
        }
        throw new IllegalArgumentException("Invalid date format for " + key + ". Use YYYY-MM-DD");
    }

    private Long parseLong(Map<String, Object> params, String key) {
        String value = getString(params, key);
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException("Missing required number: " + key);
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid number for " + key);
        }
    }

    private Long resolveRoomId(Map<String, Object> params) {
        // Prefer explicit roomId
        String roomId = getString(params, "roomId");
        if (StringUtils.hasText(roomId)) {
            return parseLong(params, "roomId");
        }

        // Fallback to generic id
        String id = getString(params, "id");
        if (StringUtils.hasText(id)) {
            try {
                return Long.parseLong(id);
            } catch (NumberFormatException ignored) {
                // continue
            }
        }

        // Fallback to roomNumber -> lookup id
        String roomNumberStr = getString(params, "roomNumber");
        if (StringUtils.hasText(roomNumberStr)) {
            try {
                Integer roomNumber = Integer.parseInt(roomNumberStr);
                var room = roomRepository.findByRoomNumber(roomNumber);
                if (room != null) {
                    return room.getId();
                }
                throw new IllegalArgumentException("Room not found for roomNumber: " + roomNumberStr);
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid roomNumber");
            }
        }

        throw new IllegalArgumentException("Missing roomId. Please specify the room.");
    }

    private String getString(Map<String, Object> params, String key) {
        Object value = params.get(key);
        return value == null ? null : value.toString();
    }

    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("yyyy/MM/dd"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("d MMM yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("d MMMM yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("dMMMyyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("MMM d, yyyy").toFormatter(Locale.ENGLISH),
            new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("MMMM d, yyyy").toFormatter(Locale.ENGLISH)
    );

    private static final Pattern DATE_PATTERN = Pattern.compile("(?i)(\\d{1,2}\\s*[A-Za-z]{3,9}\\s*\\d{4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{4}|\\d{1,2}-\\d{1,2}-\\d{4})");
    private static final Pattern ROOM_PATTERN = Pattern.compile("room\\s*(number\\s*)?(\\d{1,5})", Pattern.CASE_INSENSITIVE);
    private static final Pattern ANY_NUMBER = Pattern.compile("\\b(\\d{3,5})\\b");

    private AgentDecision parseDecision(String modelOutput) {
        try {
            // Attempt strict parse first
            AgentDecision d = objectMapper.readValue(modelOutput, AgentDecision.class);
            normalizeDecision(d);
            return d;
        } catch (Exception ex) {
            log.warn("Strict parse failed, trying to extract JSON. Output: {}", modelOutput);
            try {
                int start = modelOutput.indexOf('{');
                int end = modelOutput.lastIndexOf('}');
                if (start >= 0 && end > start) {
                    String json = modelOutput.substring(start, end + 1);
                    AgentDecision d = objectMapper.readValue(json, AgentDecision.class);
                    normalizeDecision(d);
                    return d;
                }
            } catch (Exception ignored) {
                // fall through
            }
        }

        AgentDecision fallback = new AgentDecision();
        fallback.setAction("small_talk");
        fallback.setResponse("Could you rephrase that request?");
        return fallback;
    }

    private void normalizeDecision(AgentDecision d) {
        if (!StringUtils.hasText(d.getAction()) && StringUtils.hasText(d.getIntent())) {
            d.setAction(d.getIntent());
        }
        if (!StringUtils.hasText(d.getIntent()) && StringUtils.hasText(d.getAction())) {
            d.setIntent(d.getAction());
        }
    }

    private String resolveAction(AgentDecision decision) {
        if (StringUtils.hasText(decision.getAction())) return decision.getAction();
        if (StringUtils.hasText(decision.getIntent())) return decision.getIntent();
        return "";
    }

    private boolean isBanned(String rawAction) {
        if (!StringUtils.hasText(rawAction)) {
            return false;
        }
        String normalized = rawAction.toLowerCase(Locale.ROOT);
        return normalized.contains("deleteownaccount")
                || normalized.contains("delete_own_account")
                || normalized.contains("delete-account")
                || normalized.contains("addroom")
                || normalized.contains("add_room")
                || normalized.contains("add-room");
    }

    private boolean requiresAuth(AgentAction action) {
        return switch (action) {
            case UPDATE_OWN_ACCOUNT, GET_MY_BOOKINGS, CREATE_BOOKING -> true;
            default -> false;
        };
    }

    private boolean isAuthenticated() {
        return SecurityContextHolder.getContext().getAuthentication() != null
                && SecurityContextHolder.getContext().getAuthentication().isAuthenticated()
                && !"anonymousUser".equalsIgnoreCase(
                String.valueOf(SecurityContextHolder.getContext().getAuthentication().getPrincipal()));
    }

    private AgentChatResponse ensureSlots(AgentDecision decision, AgentAction action, ConversationContext ctx) {
        Map<String, Object> params = decision.getParams() == null ? new HashMap<>() : decision.getParams();

        // Merge context into params if missing
        if (!StringUtils.hasText(getString(params, "checkInDate")) && ctx.checkIn != null) {
            params.put("checkInDate", ctx.checkIn);
        }
        if (!StringUtils.hasText(getString(params, "checkOutDate")) && ctx.checkOut != null) {
            params.put("checkOutDate", ctx.checkOut);
        }
        if (!StringUtils.hasText(getString(params, "roomNumber")) && ctx.roomNumber != null) {
            params.put("roomNumber", ctx.roomNumber.toString());
        }

        // Update decision params with merged data
        decision.setParams(params);

        if (action == AgentAction.CREATE_BOOKING) {
            boolean hasRoom = StringUtils.hasText(getString(params, "roomId"))
                    || StringUtils.hasText(getString(params, "id"))
                    || StringUtils.hasText(getString(params, "roomNumber"));
            boolean hasCheckIn = StringUtils.hasText(getString(params, "checkInDate"));
            boolean hasCheckOut = StringUtils.hasText(getString(params, "checkOutDate"));

            if (!hasRoom && !hasCheckIn && !hasCheckOut) {
                return AgentChatResponse.builder()
                        .reply("To book, tell me the room number and the check-in/check-out dates.")
                        .action(AgentAction.SMALL_TALK)
                        .build();
            }
            if (!hasRoom) {
                return AgentChatResponse.builder()
                        .reply("Which room number should I book?")
                        .action(AgentAction.SMALL_TALK)
                        .build();
            }
            if (!hasCheckIn || !hasCheckOut) {
                return AgentChatResponse.builder()
                        .reply("Please provide both check-in and check-out dates for the booking.")
                        .action(AgentAction.SMALL_TALK)
                        .build();
            }
        }

        if (action == AgentAction.AVAILABLE_ROOMS) {
            boolean hasCheckIn = StringUtils.hasText(getString(params, "checkInDate"));
            boolean hasCheckOut = StringUtils.hasText(getString(params, "checkOutDate"));
            if (!hasCheckIn || !hasCheckOut) {
                return AgentChatResponse.builder()
                        .reply("Share check-in and check-out dates to see available rooms.")
                        .action(AgentAction.SMALL_TALK)
                        .build();
            }
        }

        return null;
    }

    private AgentDecision fallbackDecision(AgentChatRequest request) {
        List<AgentChatMessage> msgs = request.getMessages();
        if (msgs == null || msgs.isEmpty()) return null;
        AgentChatMessage last = msgs.get(msgs.size() - 1);
        String content = last.getContent() == null ? "" : last.getContent().trim();
        if (!StringUtils.hasText(content)) return null;

        ConversationContext ctx = deriveContext(msgs);

        // Simple greeting fallback
        if (content.matches("(?i)hi|hello|hey")) {
            AgentDecision d = new AgentDecision();
            d.setAction("small_talk");
            d.setResponse("Hi! Tell me if you want available rooms, to book, or to view your bookings.");
            return d;
        }

        // If we already have intent + dates in context, proceed
        if (ctx.intent == ConversationIntent.VIEW_ROOMS && ctx.hasDates()) {
            AgentDecision d = new AgentDecision();
            d.setAction("available_rooms");
            Map<String, Object> params = new HashMap<>();
            params.put("checkInDate", ctx.checkIn);
            params.put("checkOutDate", ctx.checkOut);
            d.setParams(params);
            d.setResponse("Searching available rooms from " + ctx.checkIn + " to " + ctx.checkOut + ".");
            return d;
        }

        if (ctx.intent == ConversationIntent.BOOK_ROOM && ctx.hasDates() && ctx.roomNumber != null) {
            AgentDecision d = new AgentDecision();
            d.setAction("create_booking");
            Map<String, Object> params = new HashMap<>();
            params.put("roomNumber", ctx.roomNumber.toString());
            params.put("checkInDate", ctx.checkIn);
            params.put("checkOutDate", ctx.checkOut);
            d.setParams(params);
            d.setResponse("Booking requested for room " + ctx.roomNumber + " from " + ctx.checkIn + " to " + ctx.checkOut + ".");
            return d;
        }

        // Latest message intent handling
        List<String> dates = extractDates(content);
        Integer roomNumber = extractRoomNumber(content);
        boolean mentionsRooms = content.toLowerCase(Locale.ROOT).contains("rooms")
                || content.toLowerCase(Locale.ROOT).contains("available");
        boolean mentionsBook = content.toLowerCase(Locale.ROOT).contains("book")
                || content.toLowerCase(Locale.ROOT).contains("reserve");
        boolean mentionsSameDate = content.toLowerCase(Locale.ROOT).contains("same date")
                || content.toLowerCase(Locale.ROOT).contains("same day")
                || content.toLowerCase(Locale.ROOT).contains("same dates");
        boolean mentionsBookThis = content.toLowerCase(Locale.ROOT).contains("book this")
                || content.toLowerCase(Locale.ROOT).contains("book one")
                || content.toLowerCase(Locale.ROOT).contains("book on same date");

        if (mentionsBook) {
            ctx.intent = ConversationIntent.BOOK_ROOM;
        } else if (mentionsRooms) {
            ctx.intent = ConversationIntent.VIEW_ROOMS;
        }

        // Update dates in context from latest message
        if (dates.size() >= 1) ctx.checkIn = ctx.checkIn == null ? dates.get(0) : ctx.checkIn;
        if (dates.size() >= 2) ctx.checkOut = ctx.checkOut == null ? dates.get(1) : ctx.checkOut;
        if (roomNumber != null) ctx.roomNumber = ctx.roomNumber == null ? roomNumber : ctx.roomNumber;

        if (ctx.intent == ConversationIntent.BOOK_ROOM && ctx.hasDates() && ctx.roomNumber != null) {
            AgentDecision d = new AgentDecision();
            d.setAction("create_booking");
            Map<String, Object> params = new HashMap<>();
            params.put("roomNumber", ctx.roomNumber.toString());
            params.put("checkInDate", ctx.checkIn);
            params.put("checkOutDate", ctx.checkOut);
            d.setParams(params);
            d.setResponse("Booking requested for room " + ctx.roomNumber + " from " + ctx.checkIn + " to " + ctx.checkOut + ".");
            return d;
        }

        if (ctx.intent == ConversationIntent.VIEW_ROOMS && ctx.hasDates()) {
            AgentDecision d = new AgentDecision();
            d.setAction("available_rooms");
            Map<String, Object> params = new HashMap<>();
            params.put("checkInDate", ctx.checkIn);
            params.put("checkOutDate", ctx.checkOut);
            d.setParams(params);
            d.setResponse("Searching available rooms from " + ctx.checkIn + " to " + ctx.checkOut + ".");
            return d;
        }

        // Transition: viewed rooms to booking on same dates
        if (ctx.intent == ConversationIntent.BOOK_ROOM && ctx.hasDates() && (mentionsSameDate || mentionsBookThis)) {
            if (ctx.roomNumber != null) {
                AgentDecision d = new AgentDecision();
                d.setAction("create_booking");
                Map<String, Object> params = new HashMap<>();
                params.put("roomNumber", ctx.roomNumber.toString());
                params.put("checkInDate", ctx.checkIn);
                params.put("checkOutDate", ctx.checkOut);
                d.setParams(params);
                d.setResponse("Booking requested for room " + ctx.roomNumber + " from " + ctx.checkIn + " to " + ctx.checkOut + ".");
                return d;
            } else {
                AgentDecision d = new AgentDecision();
                d.setAction("small_talk");
                d.setResponse("Sure, which room number would you like to book for those dates?");
                return d;
            }
        }

        // Ask for missing pieces once
        if (ctx.intent == ConversationIntent.VIEW_ROOMS && !ctx.hasDates()) {
            AgentDecision d = new AgentDecision();
            d.setAction("small_talk");
            d.setResponse("Share check-in and check-out dates to see available rooms.");
            return d;
        }

        if (ctx.intent == ConversationIntent.BOOK_ROOM) {
            if (ctx.roomNumber == null && !ctx.hasDates()) {
                AgentDecision d = new AgentDecision();
                d.setAction("small_talk");
                d.setResponse("To book, tell me the room number and the check-in/check-out dates.");
                return d;
            }
            if (ctx.roomNumber == null) {
                AgentDecision d = new AgentDecision();
                d.setAction("small_talk");
                d.setResponse("Which room number should I book?");
                return d;
            }
            if (!ctx.hasDates()) {
                AgentDecision d = new AgentDecision();
                d.setAction("small_talk");
                d.setResponse("Please provide check-in and check-out dates for the booking.");
                return d;
            }
        }

        return null;
    }

    private List<String> extractDates(String text) {
        List<String> results = new ArrayList<>();

        // relative keywords
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.contains("tomorrow")) {
            LocalDate start = LocalDate.now().plusDays(1);
            results.add(start.toString());
            results.add(start.plusDays(1).toString());
        } else if (lower.contains("today") || lower.contains("tonight")) {
            LocalDate start = LocalDate.now();
            results.add(start.toString());
            results.add(start.plusDays(1).toString());
        }

        Matcher m = DATE_PATTERN.matcher(text);
        while (m.find() && results.size() < 2) {
            results.add(m.group(1));
        }
        return results;
    }

    private Integer extractRoomNumber(String text) {
        Matcher m = ROOM_PATTERN.matcher(text);
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(2));
            } catch (NumberFormatException ignored) {}
        }
        // fallback: any 3-5 digit number in the text
        Matcher any = ANY_NUMBER.matcher(text);
        if (any.find()) {
            try {
                return Integer.parseInt(any.group(1));
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    private ConversationContext deriveContext(List<AgentChatMessage> messages) {
        ConversationContext ctx = new ConversationContext();
        for (AgentChatMessage m : messages) {
            String content = m.getContent() == null ? "" : m.getContent().toLowerCase(Locale.ROOT);
            if ("assistant".equalsIgnoreCase(m.getRole())) {
                ctx.lastAssistant = m.getContent();
            }
            if ("user".equalsIgnoreCase(m.getRole())) {
                ctx.lastUser = m.getContent();
            }
            if (content.contains("available") || content.contains("rooms")) {
                ctx.intent = ConversationIntent.VIEW_ROOMS;
            }
            if (content.contains("book")) {
                ctx.intent = ConversationIntent.BOOK_ROOM;
            }

            List<String> dates = extractDates(m.getContent() == null ? "" : m.getContent());
            if (dates.size() >= 1 && ctx.checkIn == null) ctx.checkIn = dates.get(0);
            if (dates.size() >= 2 && ctx.checkOut == null) ctx.checkOut = dates.get(1);

            Integer rn = extractRoomNumber(m.getContent() == null ? "" : m.getContent());
            if (rn != null && ctx.roomNumber == null) {
                ctx.roomNumber = rn;
            }
        }
        return ctx;
    }

    private enum ConversationIntent {
        NONE,
        VIEW_ROOMS,
        BOOK_ROOM
    }

    private static class ConversationContext {
        ConversationIntent intent = ConversationIntent.NONE;
        String checkIn;
        String checkOut;
        Integer roomNumber;
        String lastUser;
        String lastAssistant;

        boolean hasDates() {
            return checkIn != null && checkOut != null;
        }
    }

    private AgentChatResponse executeDecision(AgentDecision decision, String rawModelOutput, ConversationContext providedCtx) {
        AgentAction action = AgentAction.fromValue(resolveAction(decision));
        ConversationContext ctx = providedCtx != null ? providedCtx : new ConversationContext();

        // No backend call needed for small talk / unknown
        if (action == AgentAction.SMALL_TALK || action == AgentAction.UNKNOWN) {
            String reply = StringUtils.hasText(decision.getResponse())
                    ? decision.getResponse()
                    : defaultReply(action);
            return AgentChatResponse.builder()
                    .reply(reply)
                    .action(action)
                    .rawModelOutput(rawModelOutput)
                    .build();
        }

        if (requiresAuth(action) && !isAuthenticated()) {
            return AgentChatResponse.builder()
                    .reply("Please log in to perform this action.")
                    .action(AgentAction.UNKNOWN)
                    .rawModelOutput(rawModelOutput)
                    .build();
        }

        AgentChatResponse slotResponse = ensureSlots(decision, action, ctx);
        if (slotResponse != null) {
            return slotResponse;
        }

        Response backendResponse = executeAction(action, decision.getParams());
        String reply = buildReply(action, decision.getResponse(), backendResponse);
        return AgentChatResponse.builder()
                .reply(reply)
                .action(action)
                .backendResponse(backendResponse)
                .rawModelOutput(rawModelOutput)
                .build();
    }

    private String defaultReply(AgentAction action) {
        return switch (action) {
            case UPDATE_OWN_ACCOUNT -> "Your account was updated.";
            case GET_MY_BOOKINGS -> "Here are your bookings.";
            case AVAILABLE_ROOMS -> "Here are the available rooms.";
            case GET_ROOM_BY_ID -> "Here are the room details.";
            case CREATE_BOOKING -> "Your booking request was processed.";
            default -> "Done.";
        };
    }

    private String buildReply(AgentAction action, String modelReply, Response backendResponse) {
        if (action == AgentAction.CREATE_BOOKING && backendResponse != null && backendResponse.getBooking() != null) {
            var b = backendResponse.getBooking();
            String ref = b.getBookingReference() != null ? b.getBookingReference() : "N/A";
            String total = b.getTotalPrice() != null ? b.getTotalPrice().toString() : "N/A";
            String link = frontendPaymentUrl;
            if (StringUtils.hasText(link)) {
                String sep = link.contains("?") ? "&" : "?";
                link = link + sep + "bookingRef=" + ref + "&amount=" + total;
            }
            String clickable = StringUtils.hasText(link) ? "[Pay now](" + link + ")" : "Please proceed to payment to confirm your booking.";
            return "Booking created. Reference: " + ref + ", total: " + total + ". " + clickable;
        }
        if (StringUtils.hasText(modelReply)) {
            return modelReply;
        }
        return defaultReply(action);
    }

    private String buildPrompt(List<AgentChatMessage> messages, ConversationContext ctx) {
        if (messages == null || messages.isEmpty()) {
            messages = List.of(AgentChatMessage.builder().role("user").content("Help me book a room").build());
        }

        StringJoiner joiner = new StringJoiner("\n");
        for (AgentChatMessage message : messages) {
            joiner.add(message.getRole() + ": " + message.getContent());
        }

        String latestUserContent = messages.get(messages.size() - 1).getContent();

        String contextBlock = """
                Context:
                intent: %s
                checkInDate: %s
                checkOutDate: %s
                roomNumber: %s
                lastUser: %s
                lastAssistant: %s
                """.formatted(
                ctx.intent,
                ctx.checkIn,
                ctx.checkOut,
                ctx.roomNumber,
                ctx.lastUser,
                ctx.lastAssistant
        );

        return PROMPT_TEMPLATE.formatted(joiner.toString() + "\n" + contextBlock, latestUserContent);
    }

    private ConversationContext mergeContext(ConversationContext base, ConversationContext derived) {
        ConversationContext merged = new ConversationContext();
        merged.intent = derived.intent != ConversationIntent.NONE ? derived.intent : base.intent;
        merged.checkIn = derived.checkIn != null ? derived.checkIn : base.checkIn;
        merged.checkOut = derived.checkOut != null ? derived.checkOut : base.checkOut;
        merged.roomNumber = derived.roomNumber != null ? derived.roomNumber : base.roomNumber;
        merged.lastUser = derived.lastUser != null ? derived.lastUser : base.lastUser;
        merged.lastAssistant = derived.lastAssistant != null ? derived.lastAssistant : base.lastAssistant;
        return merged;
    }

    private ConversationContext mergeState(ConversationContext ctx, AgentDecision decision) {
        ConversationContext merged = new ConversationContext();
        merged.intent = resolveIntent(decision, ctx);
        merged.checkIn = pickString(decision.getParams(), "checkInDate", ctx.checkIn);
        merged.checkOut = pickString(decision.getParams(), "checkOutDate", ctx.checkOut);
        merged.roomNumber = pickRoom(decision.getParams(), ctx.roomNumber);
        merged.lastUser = ctx.lastUser;
        merged.lastAssistant = ctx.lastAssistant;
        return merged;
    }

    private ConversationIntent resolveIntent(AgentDecision d, ConversationContext ctx) {
        String intent = resolveAction(d).toLowerCase(Locale.ROOT);
        if (intent.contains("book")) return ConversationIntent.BOOK_ROOM;
        if (intent.contains("available") || intent.contains("room")) return ConversationIntent.VIEW_ROOMS;
        if (intent.contains("booking")) return ConversationIntent.VIEW_ROOMS;
        if (intent.contains("update")) return ConversationIntent.NONE;
        if (intent.contains("small")) return ctx.intent;
        return ctx.intent;
    }

    private String pickString(Map<String, Object> params, String key, String fallback) {
        String v = getString(params, key);
        return StringUtils.hasText(v) ? v : fallback;
    }

    private Integer pickRoom(Map<String, Object> params, Integer fallback) {
        String v = getString(params, "roomNumber");
        if (StringUtils.hasText(v)) {
            try { return Integer.parseInt(v); } catch (NumberFormatException ignored) {}
        }
        return fallback;
    }
}

