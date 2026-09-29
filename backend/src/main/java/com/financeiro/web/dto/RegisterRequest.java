package com.financeiro.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Informe seu nome")
        @Size(max = 120, message = "Nome muito longo")
        String name,

        @NotBlank(message = "Informe o e-mail")
        @Email(message = "E-mail invalido")
        @Size(max = 180)
        String email,

        @NotBlank(message = "Informe a senha")
        @Size(min = 8, message = "A senha deve ter ao menos 8 caracteres")
        @Size(max = 72, message = "A senha deve ter no maximo 72 caracteres")
        String password,

        /** Nome do espaco a criar. Obrigatorio apenas quando nao houver inviteCode. */
        @Size(max = 120)
        String householdName,

        /** Codigo opcional para entrar em um espaco compartilhado existente. */
        @Size(max = 12)
        String inviteCode
) {
}
