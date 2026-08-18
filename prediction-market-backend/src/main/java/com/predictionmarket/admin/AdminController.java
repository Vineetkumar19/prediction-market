package com.predictionmarket.admin;

import com.predictionmarket.contest.Contest;
import com.predictionmarket.dto.AdminDtos.AdminStatsDto;
import com.predictionmarket.dto.AdminDtos.AdminUserDto;
import com.predictionmarket.dto.ContestDtos.AdminContestDto;
import com.predictionmarket.dto.ContestDtos.CreateContestRequest;
import com.predictionmarket.dto.ContestDtos.ResolveRequest;
import com.predictionmarket.dto.EventDtos.AdminEventDto;
import com.predictionmarket.dto.EventDtos.CreateEventRequest;
import com.predictionmarket.dto.WalletDtos.AdjustTokensRequest;
import com.predictionmarket.dto.WalletDtos.AdminTransactionDto;
import com.predictionmarket.dto.WalletDtos.WalletDto;
import com.predictionmarket.event.EventService;
import com.predictionmarket.security.CurrentUser;
import com.predictionmarket.settlement.SettlementService;
import com.predictionmarket.wallet.WalletService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Everything under /api/admin.
 *
 * Spring Security already requires ROLE_ADMIN for this whole path (see
 * SecurityConfig), so a player calling any of these gets a 403 before the
 * method runs. CurrentUser.requireAdmin() inside the mutating methods is a
 * second, deliberate check - the kind of endpoint that hands out tokens or
 * pays out a settlement should not depend on a single line of config staying
 * correct forever.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final EventService eventService;
    private final WalletService walletService;
    private final SettlementService settlementService;

    public AdminController(AdminService adminService,
                           EventService eventService,
                           WalletService walletService,
                           SettlementService settlementService) {
        this.adminService = adminService;
        this.eventService = eventService;
        this.walletService = walletService;
        this.settlementService = settlementService;
    }

    /* ---- overview ------------------------------------------------------- */

    @GetMapping("/stats")
    public AdminStatsDto stats() {
        return adminService.stats();
    }

    /* ---- events --------------------------------------------------------- */

    @GetMapping("/events")
    public List<AdminEventDto> events() {
        return eventService.listForAdmin();
    }

    @PostMapping("/events")
    public AdminEventDto createEvent(@Valid @RequestBody CreateEventRequest request) {
        CurrentUser.requireAdmin();
        return eventService.create(request);
    }

    @PostMapping("/events/{id}/toggle")
    public AdminEventDto toggleEvent(@PathVariable Long id) {
        CurrentUser.requireAdmin();
        return eventService.toggle(id);
    }

    /* ---- questions ------------------------------------------------------ */

    @GetMapping("/contests")
    public List<AdminContestDto> contests() {
        return adminService.contests();
    }

    @PostMapping("/contests")
    public AdminContestDto createContest(@Valid @RequestBody CreateContestRequest request) {
        CurrentUser.requireAdmin();
        return adminService.createContest(request);
    }

    @PostMapping("/contests/{id}/publish")
    public AdminContestDto publish(@PathVariable Long id) {
        CurrentUser.requireAdmin();
        return adminService.publish(id);
    }

    @PostMapping("/contests/{id}/cancel")
    public AdminContestDto cancel(@PathVariable Long id) {
        String actor = CurrentUser.requireAdmin().getUserId();
        Contest contest = settlementService.cancel(id, actor);
        return adminService.viewContest(contest.getId());
    }

    @PostMapping("/contests/{id}/resolve")
    public AdminContestDto resolve(@PathVariable Long id, @Valid @RequestBody ResolveRequest request) {
        String actor = CurrentUser.requireAdmin().getUserId();
        Contest contest = settlementService.settle(id, request.finalValue(), actor);
        return adminService.viewContest(contest.getId());
    }

    /* ---- users and tokens ----------------------------------------------- */

    @GetMapping("/users")
    public List<AdminUserDto> users() {
        return adminService.users();
    }

    @PostMapping("/users/{id}/tokens")
    public WalletDto adjustTokens(@PathVariable Long id, @Valid @RequestBody AdjustTokensRequest request) {
        return walletService.adjustTokens(CurrentUser.requireAdmin(), id, request.amount(), request.reason());
    }

    /* ---- global ledger -------------------------------------------------- */

    @GetMapping("/transactions")
    public List<AdminTransactionDto> transactions() {
        return walletService.allTransactions();
    }
}
