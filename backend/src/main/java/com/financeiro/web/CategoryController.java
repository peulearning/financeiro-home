package com.financeiro.web;

import com.financeiro.domain.enums.CategoryType;
import com.financeiro.security.CurrentUser;
import com.financeiro.service.CategoryService;
import com.financeiro.web.dto.CategoryRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final CurrentUser currentUser;

    @GetMapping
    public List<CategoryRequest.Response> list(
            @RequestParam(required = false) CategoryType type,
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return categoryService.list(currentUser.householdId(), type, includeInactive);
    }

    @PostMapping
    public ResponseEntity<CategoryRequest.Response> create(@Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.create(currentUser.householdId(), request));
    }

    @PutMapping("/{id}")
    public CategoryRequest.Response update(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return categoryService.update(currentUser.householdId(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        categoryService.deactivate(currentUser.householdId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reactivate")
    public CategoryRequest.Response reactivate(@PathVariable Long id) {
        return categoryService.reactivate(currentUser.householdId(), id);
    }
}
