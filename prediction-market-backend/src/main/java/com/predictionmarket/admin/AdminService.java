package com.predictionmarket.admin;

import com.predictionmarket.common.ApiException;
import com.predictionmarket.common.Enums.ContestStatus;
import com.predictionmarket.common.Enums.Role;
import com.predictionmarket.contest.Contest;
import com.predictionmarket.contest.ContestMapper;
import com.predictionmarket.contest.ContestRepository;
import com.predictionmarket.dto.AdminDtos.AdminStatsDto;
import com.predictionmarket.dto.AdminDtos.AdminUserDto;
import com.predictionmarket.dto.ContestDtos.AdminContestDto;
import com.predictionmarket.dto.ContestDtos.CreateContestRequest;
import com.predictionmarket.event.EventEntity;
import com.predictionmarket.event.EventRepository;
import com.predictionmarket.order.OrderEntity;
import com.predictionmarket.order.OrderRepository;
import com.predictionmarket.user.User;
import com.predictionmarket.user.UserRepository;
import com.predictionmarket.wallet.Wallet;
import com.predictionmarket.wallet.WalletService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Everything only the admin may do or see.
 *
 * This is the one place market-wide numbers are assembled. Spring Security
 * already blocks /api/admin/** for non-admins; keeping the aggregate code here
 * rather than in the shared contest service means a player-facing endpoint
 * cannot accidentally start returning them later.
 */
@Service
public class AdminService {

    private final UserRepository userRepository;
    private final ContestRepository contestRepository;
    private final EventRepository eventRepository;
    private final OrderRepository orderRepository;
    private final WalletService walletService;
    private final ContestMapper mapper;

    public AdminService(UserRepository userRepository,
                        ContestRepository contestRepository,
                        EventRepository eventRepository,
                        OrderRepository orderRepository,
                        WalletService walletService,
                        ContestMapper mapper) {
        this.userRepository = userRepository;
        this.contestRepository = contestRepository;
        this.eventRepository = eventRepository;
        this.orderRepository = orderRepository;
        this.walletService = walletService;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public AdminStatsDto stats() {
        return new AdminStatsDto(
                userRepository.countByRole(Role.USER),
                eventRepository.count(),
                contestRepository.countByStatusIn(List.of(ContestStatus.OPEN, ContestStatus.PARTIAL)),
                contestRepository.count(),
                walletService.sumIssued(),
                walletService.sumLocked(),
                orderRepository.countByRemainingSharesGreaterThan(0));
    }

    @Transactional(readOnly = true)
    public List<AdminUserDto> users() {
        List<User> users = userRepository.findAllByOrderByCreatedAtDesc();
        Map<Long, Wallet> wallets = walletService.walletsByUser(users.stream().map(User::getId).toList());

        return users.stream().map(u -> {
            Wallet w = wallets.get(u.getId());
            long available = w == null ? 0 : w.getAvailable();
            long locked = w == null ? 0 : w.getLocked();
            return new AdminUserDto(u.getId(), u.getUserId(), u.getName(), u.getRole(), u.getCreatedAt(),
                    available, locked, available + locked);
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<AdminContestDto> contests() {
        List<Contest> contests = contestRepository.findAllByOrderByCreatedAtDesc();
        if (contests.isEmpty()) {
            return List.of();
        }

        Map<Long, String> eventTitles = eventRepository.findAll().stream()
                .collect(Collectors.toMap(EventEntity::getId, EventEntity::getTitle));

        Map<Long, List<OrderEntity>> ordersByContest =
                orderRepository.findByContestIdIn(contests.stream().map(Contest::getId).toList())
                        .stream()
                        .collect(Collectors.groupingBy(OrderEntity::getContestId));

        return contests.stream()
                .map(c -> mapper.toAdminDto(c, eventTitles.get(c.getEventId()),
                        ordersByContest.getOrDefault(c.getId(), List.of())))
                .toList();
    }

    @Transactional
    public AdminContestDto createContest(CreateContestRequest request) {
        EventEntity event = eventRepository.findById(request.eventId())
                .orElseThrow(() -> ApiException.badRequest("Choose an event first."));

        Instant now = Instant.now();
        Instant start = request.startTime() != null ? request.startTime() : now;
        Instant deadline = request.matchingDeadline() != null
                ? request.matchingDeadline()
                : now.plus(24, ChronoUnit.HOURS);
        Instant end = request.endTime() != null ? request.endTime() : deadline.plus(24, ChronoUnit.HOURS);

        if (!deadline.isAfter(now)) {
            throw ApiException.badRequest("The matching deadline must be in the future.");
        }
        if (end.isBefore(deadline)) {
            throw ApiException.badRequest("The end time cannot be before the matching deadline.");
        }

        String question = request.question().trim();

        Contest contest = contestRepository.save(new Contest(
                event.getId(),
                shortTitleFrom(question),
                question,
                request.imageUrl() == null ? "" : request.imageUrl().trim(),
                request.sharePrice(),
                start, deadline, end,
                request.publish() ? ContestStatus.OPEN : ContestStatus.DRAFT));

        return mapper.toAdminDto(contest, event.getTitle(), List.of());
    }

    /**
     * The admin no longer types a separate short title - one question box is
     * enough. Compact lists still want something short, so this trims the
     * question at a word boundary rather than mid-word.
     */
    private String shortTitleFrom(String question) {
        String cleaned = question.replaceAll("\\s+", " ").trim();
        if (cleaned.length() <= 60) {
            return cleaned;
        }
        int cut = cleaned.lastIndexOf(' ', 60);
        return cleaned.substring(0, cut > 20 ? cut : 60).trim() + "...";
    }

    /** Moves a draft question to OPEN so players can see and enter it. */
    @Transactional
    public AdminContestDto publish(Long contestId) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> ApiException.notFound("Question not found."));

        if (contest.getStatus().isTerminal()) {
            throw ApiException.conflict("That question is finished and cannot be reopened.");
        }
        if (contest.getStatus() == ContestStatus.DRAFT) {
            contest.setStatus(ContestStatus.OPEN);
            contestRepository.save(contest);
        }

        String eventTitle = eventRepository.findById(contest.getEventId())
                .map(EventEntity::getTitle).orElse(null);

        return mapper.toAdminDto(contest, eventTitle, orderRepository.findByContestId(contestId));
    }

    @Transactional(readOnly = true)
    public AdminContestDto viewContest(Long contestId) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> ApiException.notFound("Question not found."));
        String eventTitle = eventRepository.findById(contest.getEventId())
                .map(EventEntity::getTitle).orElse(null);
        return mapper.toAdminDto(contest, eventTitle, orderRepository.findByContestId(contestId));
    }
}
