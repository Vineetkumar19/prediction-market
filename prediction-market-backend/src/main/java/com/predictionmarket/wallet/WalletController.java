package com.predictionmarket.wallet;

import com.predictionmarket.dto.WalletDtos.TransactionDto;
import com.predictionmarket.dto.WalletDtos.WalletDto;
import com.predictionmarket.security.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * GET /api/wallet              -> { available, locked, total }
 * GET /api/wallet/transactions -> the caller's ledger, newest first
 *
 * Both are scoped to the caller. There is no /api/wallet/{userId} - a player
 * has no business reading anyone else's balance.
 */
@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping
    public WalletDto balance() {
        return walletService.balanceOf(CurrentUser.id());
    }

    @GetMapping("/transactions")
    public List<TransactionDto> transactions() {
        return walletService.transactionsOf(CurrentUser.id());
    }
}
