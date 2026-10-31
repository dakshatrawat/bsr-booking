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
import com.bsr.bsr_booking.exceptions.InvalidBookingStateAndDateException;
import com.bsr.bsr_booking.exceptions.NotFoundException;
import com.bsr.bsr_booking.services.BookingService;
import com.bsr.bsr_booking.services.RoomService;
import com.bsr.bsr_booking.services.UserService;
import com.bsr.bsr_booking.repositories.RoomRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
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

    // Session-scoped conversation memory (in-memory; replace with distributed store if needed).
    // Keys are scoped per authenticated user (or per client-supplied session id when anonymous)
    // and entries expire after SESSION_TTL_MS.
    private static final Map<String, SessionEntry> sessionStore = new ConcurrentHashMap<>();
    private static final long SESSION_TTL_MS = 30 * 60 * 1000L;
    private static final int MAX_SESSIONS = 5000;

    private record SessionEntry(ConversationContext ctx, long touchedAt) {}

    private static final String PROMPT_TEMPLATE = """
            You are an AI booking assistant for Bhagat Singh Resort (hotel/resort). Purpose: hotel room discovery, availability checking, and booking. You must infer intent from casual language and perform slot-filling (intent, roomNumber, checkInDate, checkOutDate). Keep context from prior turns; do NOT re-ask for slots already provided. Return ONLY one JSON.

            Allowed actions + params:
            - update_own_account: {firstName?, lastName?, email?, phoneNumber?}
            - get_my_bookings: {}
            - available_rooms: {checkInDate (YYYY-MM-DD), checkOutDate (YYYY-MM-DD), roomType? in [SINGLE, DOUBLE, SUIT, TRIPLE]}
            - get_room_by_id: {id (number)}
            - create_booking: {roomId (number), checkInDate (YYYY-MM-DD), checkOutDate (YYYY-MM-DD)}
            Disallowed: deleteOwnAccount, addRoom, password changes, any admin-only op.

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
        List<AgentChatMessage> messages = request == null || request.getMessages() == null
                ? List.of()
                : request.getMessages().stream().filter(Objects::nonNull).toList();
        if (request == null || messages.isEmpty()) {
            return AgentChatResponse.builder()
                    .reply("Hi! Tell me if you want available rooms, to book, or to view your bookings.")
                    .action(AgentAction.SMALL_TALK)
                    .build();
        }

        String key = sessionKey(request.getSessionId());
        ConversationContext prior = loadSession(key);
        ConversationContext ctx = mergeContext(prior, deriveContext(messages));
        String content = messages.get(messages.size() - 1).getContent();

        // Lightweight intent + context parsing first to reduce LLM calls
        AgentDecision quick;
        boolean confirmed = false;
        if (prior.pendingBooking != null && isConfirmation(content)) {
            quick = new AgentDecision();
            quick.setAction("create_booking");
            quick.setParams(new HashMap<>(prior.pendingBooking));
            confirmed = true;
        } else {
            quick = fallbackDecision(content, ctx);
        }
        if (quick != null) {
            return runDecision(quick, ctx, key, confirmed);
        }

        String modelOutput;
        try {
            modelOutput = geminiClient.generateText(buildPrompt(messages, ctx));
        } catch (Exception e) {
            log.error("Gemini call failed", e);
            return AgentChatResponse.builder()
                    .reply("I couldn't reach the assistant just now. Please try again in a few seconds.")
                    .action(AgentAction.UNKNOWN)
                    .build();
        }

        AgentDecision decision = parseDecision(modelOutput);
        if (isBanned(decision.getAction() == null ? "" : decision.getAction())) {
            return AgentChatResponse.builder()
                    .reply("Sorry, that action is not allowed from the chatbot.")
                    .action(AgentAction.UNKNOWN)
                    .build();
        }

        return runDecision(decision, ctx, key, false);
    }

    private AgentChatResponse runDecision(AgentDecision decision, ConversationContext ctx, String key, boolean confirmed) {
        try {
            AgentChatResponse resp = executeDecision(decision, ctx, confirmed);
            saveSession(key, mergeState(ctx, decision));
            return resp;
        } catch (Exception e) {
            log.error("Failed to execute agent action {}", resolveAction(decision), e);
            return AgentChatResponse.builder()
                    .reply(errorReply(e))
                    .action(AgentAction.fromValue(resolveAction(decision)))
                    .build();
        }
    }

    private String errorReply(Exception e) {
        boolean userFacing = e instanceof IllegalArgumentException
                || e instanceof NotFoundException
                || e instanceof InvalidBookingStateAndDateException;
        if (userFacing && StringUtils.hasText(e.getMessage())) {
            return e.getMessage();
        }
        return "I couldn't complete that yet. Please confirm the room and dates, and I'll try again.";
    }

    private boolean isConfirmation(String content) {
        return content != null && content.matches(
                "(?i)\\s*(yes|y|yeah|yep|yup|confirm|confirmed|ok|okay|sure|go ahead|book it|please do)\\W*");
    }

    // ---- session handling ----

    private String sessionKey(String sessionId) {
        String sid = StringUtils.hasText(sessionId) ? sessionId.trim() : "";
        if (isAuthenticated()) {
            return "u:" + SecurityContextHolder.getContext().getAuthentication().getName() + ":" + sid;
        }
        return sid.isEmpty() ? null : "s:" + sid;
    }

    private ConversationContext loadSession(String key) {
        if (key == null) {
            return new ConversationContext();
        }
        SessionEntry entry = sessionStore.get(key);
        if (entry == null || System.currentTimeMillis() - entry.touchedAt() > SESSION_TTL_MS) {
            return new ConversationContext();
        }
        return entry.ctx();
    }

    private void saveSession(String key, ConversationContext ctx) {
        if (key == null) {
            return;
        }
        long now = System.currentTimeMillis();
        if (sessionStore.size() >= MAX_SESSIONS) {
            sessionStore.entrySet().removeIf(e -> now - e.getValue().touchedAt() > SESSION_TTL_MS);
            if (sessionStore.size() >= MAX_SESSIONS) {
                sessionStore.clear();
            }
        }
        sessionStore.put(key, new SessionEntry(ctx, now));
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
        // Password changes are intentionally not accepted through the chatbot.
        return UserDTO.builder()
                .firstName(getString(params, "firstName"))
                .lastName(getString(params, "lastName"))
                .email(getString(params, "email"))
                .phoneNumber(getString(params, "phoneNumber"))
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
        LocalDate date = tryParseDate(value);
        if (date == null) {
            throw new IllegalArgumentException("Invalid date for " + key + ". Use a format like 2026-01-31 or 31 Jan 2026");
        }
        return date;
    }

    private LocalDate tryParseDate(String value) {
        String normalized = value.trim().replace(",", " ").replace(".", "").replaceAll("\\s+", " ");
        for (String candidate : List.of(normalized, normalized.replace(" ", ""))) {
            for (DateTimeFormatter formatter : DATE_FORMATTERS) {
                try {
                    return LocalDate.parse(candidate, formatter);
                } catch (DateTimeParseException ignored) {
                    // try next formatter
                }
            }
        }
        return null;
    }

    private Long parseLong(Map<String, Object> params, String key) {
        String value = getString(params, key);
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException("Missing required number: " + key);
        }
        try {
            return Long.parseLong(value.trim());
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
                return Long.parseLong(id.trim());
            } catch (NumberFormatException ignored) {
                // continue
            }
        }

        // Fallback to roomNumber -> lookup id
        String roomNumberStr = getString(params, "roomNumber");
        if (StringUtils.hasText(roomNumberStr)) {
            try {
                Integer roomNumber = Integer.parseInt(roomNumberStr.trim());
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
        if (params == null) {
            return null;
        }
        Object value = params.get(key);
        if (value == null) {
            return null;
        }
        // JSON numbers like 5.0 should still read as "5"
        if (value instanceof Number n) {
            double d = n.doubleValue();
            if (!Double.isInfinite(d) && d == Math.rint(d)) {
                return String.valueOf(n.longValue());
            }
        }
        return value.toString();
    }

    private static DateTimeFormatter fmt(String pattern) {
        return new DateTimeFormatterBuilder()
                .parseCaseInsensitive()
                .appendPattern(pattern)
                .toFormatter(Locale.ENGLISH)
                .withResolverStyle(ResolverStyle.STRICT);
    }

    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            fmt("uuuu-M-d"),
            fmt("uuuu/M/d"),
            fmt("d-M-uuuu"),
            fmt("d/M/uuuu"),
            fmt("d MMM uuuu"),
            fmt("d MMMM uuuu"),
            fmt("dMMMuuuu"),
            fmt("dMMMMuuuu"),
            fmt("MMM d uuuu"),
            fmt("MMMM d uuuu")
    );

    private static final String MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
    private static final Pattern DATE_PATTERN = Pattern.compile(
            "(?i)\\b(\\d{4}-\\d{1,2}-\\d{1,2}"
                    + "|\\d{4}/\\d{1,2}/\\d{1,2}"
                    + "|\\d{1,2}[/-]\\d{1,2}[/-]\\d{4}"
                    + "|\\d{1,2}\\s*" + MONTH + "\\s*,?\\s*\\d{4}"
                    + "|" + MONTH + "\\s+\\d{1,2}\\s*,?\\s*\\d{4})\\b");
    private static final Pattern ROOM_PATTERN = Pattern.compile("room\\s*(number\\s*)?(\\d{1,5})", Pattern.CASE_INSENSITIVE);
    private static final Pattern ANY_NUMBER = Pattern.compile("\\b(\\d{3,5})\\b");

    private AgentDecision parseDecision(String modelOutput) {
        try {
            // Attempt strict parse first
            AgentDecision d = objectMapper.readValue(modelOutput, AgentDecision.class);
            normalizeDecision(d);
            return d;
        } catch (Exception ex) {
            log.warn("Strict parse of model output failed, trying to extract JSON");
            log.debug("Model output: {}", modelOutput);
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
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null
                && auth.isAuthenticated()
                && !"anonymousUser".equalsIgnoreCase(String.valueOf(auth.getPrincipal()));
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

    private boolean mentionsBook(String lower) {
        // "my bookings" / "booking history" is a lookup, not a new booking
        if (lower.contains("my booking") || lower.contains("bookings")) {
            return false;
        }
        return lower.contains("book") || lower.contains("reserve");
    }

    private boolean mentionsRooms(String lower) {
        return lower.contains("rooms") || lower.contains("available");
    }

    private AgentDecision smallTalk(String response) {
        AgentDecision d = new AgentDecision();
        d.setAction("small_talk");
        d.setResponse(response);
        return d;
    }

    private AgentDecision actionDecision(String action, ConversationContext ctx, boolean withRoom, String response) {
        AgentDecision d = new AgentDecision();
        d.setAction(action);
        Map<String, Object> params = new HashMap<>();
        params.put("checkInDate", ctx.checkIn);
        params.put("checkOutDate", ctx.checkOut);
        if (withRoom) {
            params.put("roomNumber", ctx.roomNumber.toString());
        }
        d.setParams(params);
        d.setResponse(response);
        return d;
    }

    /**
     * Rule-based handling for clear booking/availability messages. Returns null when the latest
     * message carries no booking signal so the LLM can handle it.
     */
    private AgentDecision fallbackDecision(String content, ConversationContext ctx) {
        if (!StringUtils.hasText(content)) return null;
        content = content.trim();

        if (content.matches("(?i)(hi|hello|hey)\\W*")) {
            return smallTalk("Hi! Tell me if you want available rooms, to book, or to view your bookings.");
        }

        // Only act when the latest message itself carries a signal; otherwise stale
        // history would re-trigger searches on messages like "thanks".
        String lower = content.toLowerCase(Locale.ROOT);
        boolean hasSignal = mentionsBook(lower)
                || mentionsRooms(lower)
                || !extractDates(content).isEmpty()
                || extractRoomNumber(content) != null;
        if (!hasSignal) return null;

        if (ctx.intent == ConversationIntent.BOOK_ROOM) {
            if (ctx.roomNumber == null && !ctx.hasDates()) {
                return smallTalk("To book, tell me the room number and the check-in/check-out dates.");
            }
            if (ctx.roomNumber == null) {
                return smallTalk("Which room number should I book?");
            }
            if (!ctx.hasDates()) {
                return smallTalk("Please provide check-in and check-out dates for the booking.");
            }
            return actionDecision("create_booking", ctx, true, null);
        }

        if (ctx.intent == ConversationIntent.VIEW_ROOMS) {
            if (!ctx.hasDates()) {
                return smallTalk("Share check-in and check-out dates to see available rooms.");
            }
            return actionDecision("available_rooms", ctx, false,
                    "Searching available rooms from " + ctx.checkIn + " to " + ctx.checkOut + ".");
        }

        return null;
    }

    /** Returns up to two dates as ISO strings. Explicit dates win over relative keywords. */
    private List<String> extractDates(String text) {
        List<String> results = new ArrayList<>();

        Matcher m = DATE_PATTERN.matcher(text);
        while (m.find() && results.size() < 2) {
            LocalDate d = tryParseDate(m.group(1));
            if (d != null) {
                results.add(d.toString());
            }
        }

        if (results.isEmpty()) {
            String lower = text.toLowerCase(Locale.ROOT);
            LocalDate start = null;
            if (lower.contains("tomorrow")) {
                start = LocalDate.now().plusDays(1);
            } else if (lower.contains("today") || lower.contains("tonight")) {
                start = LocalDate.now();
            }
            if (start != null) {
                results.add(start.toString());
                results.add(start.plusDays(1).toString());
            }
        }
        return results;
    }

    private Integer extractRoomNumber(String text) {
        // Strip dates first so a year like 2026 is never mistaken for a room number
        String cleaned = DATE_PATTERN.matcher(text).replaceAll(" ");
        Matcher m = ROOM_PATTERN.matcher(cleaned);
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(2));
            } catch (NumberFormatException ignored) {}
        }
        // fallback: any 3-5 digit number in the text
        Matcher any = ANY_NUMBER.matcher(cleaned);
        if (any.find()) {
            try {
                return Integer.parseInt(any.group(1));
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    /** Later dates replace earlier ones; a single later date completes or restarts the stay. */
    private void applyDates(ConversationContext ctx, List<String> dates) {
        if (dates.isEmpty()) return;
        if (dates.size() >= 2) {
            ctx.checkIn = dates.get(0);
            ctx.checkOut = dates.get(1);
            return;
        }
        String d = dates.get(0);
        if (ctx.checkIn != null && d.compareTo(ctx.checkIn) > 0) {
            ctx.checkOut = d;
        } else {
            ctx.checkIn = d;
            ctx.checkOut = null;
        }
    }

    private ConversationContext deriveContext(List<AgentChatMessage> messages) {
        ConversationContext ctx = new ConversationContext();
        for (AgentChatMessage m : messages) {
            String content = m.getContent() == null ? "" : m.getContent();
            if ("assistant".equalsIgnoreCase(m.getRole())) {
                ctx.lastAssistant = content;
                continue;
            }
            ctx.lastUser = content;

            String lower = content.toLowerCase(Locale.ROOT);
            if (mentionsRooms(lower)) {
                ctx.intent = ConversationIntent.VIEW_ROOMS;
            }
            if (mentionsBook(lower)) {
                ctx.intent = ConversationIntent.BOOK_ROOM;
            }

            applyDates(ctx, extractDates(content));

            Integer rn = extractRoomNumber(content);
            if (rn != null) {
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
        // Booking params awaiting the user's "yes"; null when nothing is pending
        Map<String, Object> pendingBooking;

        boolean hasDates() {
            return checkIn != null && checkOut != null;
        }
    }

    private AgentChatResponse executeDecision(AgentDecision decision, ConversationContext ctx, boolean confirmed) {
        AgentAction action = AgentAction.fromValue(resolveAction(decision));

        // No backend call needed for small talk / unknown
        if (action == AgentAction.SMALL_TALK || action == AgentAction.UNKNOWN) {
            String reply = StringUtils.hasText(decision.getResponse())
                    ? decision.getResponse()
                    : (action == AgentAction.SMALL_TALK ? "Could you clarify what you want to do?" : defaultReply(action));
            return AgentChatResponse.builder()
                    .reply(reply)
                    .action(action)
                    .build();
        }

        if (requiresAuth(action) && !isAuthenticated()) {
            return AgentChatResponse.builder()
                    .reply("Please log in to perform this action.")
                    .action(AgentAction.UNKNOWN)
                    .build();
        }

        AgentChatResponse slotResponse = ensureSlots(decision, action, ctx);
        if (slotResponse != null) {
            return slotResponse;
        }

        if (action == AgentAction.CREATE_BOOKING && !confirmed) {
            Map<String, Object> p = decision.getParams();
            String room = StringUtils.hasText(getString(p, "roomNumber")) ? getString(p, "roomNumber")
                    : StringUtils.hasText(getString(p, "roomId")) ? getString(p, "roomId")
                    : getString(p, "id");
            ctx.pendingBooking = new HashMap<>(p);
            return AgentChatResponse.builder()
                    .reply("Please confirm: book room " + room + " from " + getString(p, "checkInDate")
                            + " to " + getString(p, "checkOutDate") + "? Reply \"yes\" to confirm.")
                    .action(AgentAction.SMALL_TALK)
                    .build();
        }
        ctx.pendingBooking = null;

        Response backendResponse = executeAction(action, decision.getParams());
        String reply = buildReply(action, decision.getResponse(), backendResponse);
        return AgentChatResponse.builder()
                .reply(reply)
                .action(action)
                .backendResponse(backendResponse)
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
            // The amount is deliberately not put in the URL; the payment flow must price by reference server-side.
            String link = frontendPaymentUrl;
            if (StringUtils.hasText(link)) {
                String sep = link.contains("?") ? "&" : "?";
                link = link + sep + "bookingRef=" + URLEncoder.encode(ref, StandardCharsets.UTF_8);
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
        if (derived.checkOut != null) {
            merged.checkOut = derived.checkOut;
        } else if (derived.checkIn != null) {
            // new check-in only: keep the stored check-out only if it still follows it
            merged.checkOut = base.checkOut != null && base.checkOut.compareTo(derived.checkIn) > 0 ? base.checkOut : null;
        } else {
            merged.checkOut = base.checkOut;
        }
        merged.roomNumber = derived.roomNumber != null ? derived.roomNumber : base.roomNumber;
        merged.lastUser = derived.lastUser != null ? derived.lastUser : base.lastUser;
        merged.lastAssistant = derived.lastAssistant != null ? derived.lastAssistant : base.lastAssistant;
        // pendingBooking is intentionally not carried over: any message other than "yes" cancels it
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
        merged.pendingBooking = ctx.pendingBooking;
        return merged;
    }

    private ConversationIntent resolveIntent(AgentDecision d, ConversationContext ctx) {
        String intent = resolveAction(d).toLowerCase(Locale.ROOT);
        if (intent.contains("bookings")) return ctx.intent; // get_my_bookings is a lookup
        if (intent.contains("book")) return ConversationIntent.BOOK_ROOM;
        if (intent.contains("available") || intent.contains("room")) return ConversationIntent.VIEW_ROOMS;
        if (intent.contains("update")) return ConversationIntent.NONE;
        return ctx.intent;
    }

    private String pickString(Map<String, Object> params, String key, String fallback) {
        String v = getString(params, key);
        return StringUtils.hasText(v) ? v : fallback;
    }

    private Integer pickRoom(Map<String, Object> params, Integer fallback) {
        String v = getString(params, "roomNumber");
        if (StringUtils.hasText(v)) {
            try { return Integer.parseInt(v.trim()); } catch (NumberFormatException ignored) {}
        }
        return fallback;
    }
}
