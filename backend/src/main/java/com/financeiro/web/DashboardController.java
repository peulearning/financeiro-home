package com.financeiro.web;

import com.financeiro.security.CurrentUser;
import com.financeiro.service.DashboardService;
import com.financeiro.web.dto.DashboardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final CurrentUser currentUser;

    @GetMapping
    public DashboardResponse summary(@RequestParam(required = false) YearMonth month) {
        return dashboardService.build(currentUser.householdId(), month);
    }
}
