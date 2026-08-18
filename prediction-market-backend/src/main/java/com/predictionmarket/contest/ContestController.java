package com.predictionmarket.contest;

import com.predictionmarket.dto.ContestDtos.ContestDto;
import com.predictionmarket.security.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET /api/contests/{id} -> one question, as the player is allowed to see it.
 *
 * There is intentionally no "list all contests" endpoint for players. Questions
 * are reached through their event, which is what the home screen shows.
 */
@RestController
@RequestMapping("/api/contests")
public class ContestController {

    private final ContestService contestService;

    public ContestController(ContestService contestService) {
        this.contestService = contestService;
    }

    @GetMapping("/{id}")
    public ContestDto one(@PathVariable Long id) {
        return contestService.getForPlayer(id, CurrentUser.id());
    }
}
