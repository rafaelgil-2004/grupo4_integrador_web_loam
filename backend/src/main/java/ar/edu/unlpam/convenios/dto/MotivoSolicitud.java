package ar.edu.unlpam.convenios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class MotivoSolicitud{

    @NotBlank(message = "La rescisión requiere un fundamento")
    @Size(max = 255)
    private String motivo;
}