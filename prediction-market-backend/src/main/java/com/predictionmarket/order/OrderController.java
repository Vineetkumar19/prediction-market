package com.predictionmarket.order;

import com.predictionmarket.dto.OrderDtos.MyOrderDto;
import com.predictionmarket.dto.OrderDtos.OrderDto;
import com.predictionmarket.dto.OrderDtos.PlaceOrderRequest;
import com.predictionmarket.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * POST /api/orders     { contestId, side, shares } -> Order
 * GET  /api/orders/my                              -> Order[] with .contest
 *
 * The user id comes from the JWT, never from the request body - otherwise
 * anyone could place an order out of somebody else's wallet.
 */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public OrderDto place(@Valid @RequestBody PlaceOrderRequest request) {
        return orderService.place(CurrentUser.id(), request);
    }

    @GetMapping("/my")
    public List<MyOrderDto> mine() {
        return orderService.myOrders(CurrentUser.id());
    }
}
