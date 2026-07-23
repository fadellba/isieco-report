<?php

declare(strict_types=1);

namespace App\Http\Requests\Intervention;

use App\DTOs\Intervention\CreateInterventionDTO;
use App\Enums\InterventionStatutEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

final class StoreInterventionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date_heure_debut' => ['required', 'date_format:Y-m-d H:i:s'],
            'affectation_id' => ['required', 'integer', 'exists:affectations,id'],
            'statut' => ['sometimes', new Enum(InterventionStatutEnum::class)],
            'observation' => ['nullable', 'string'],
        ];
    }

    public function toDTO(): CreateInterventionDTO
    {
        return new CreateInterventionDTO(
            date_heure_debut: $this->validated('date_heure_debut'),
            affectation_id: (int) $this->validated('affectation_id'),
            statut: $this->filled('statut')
                ? InterventionStatutEnum::from($this->validated('statut'))
                : InterventionStatutEnum::EN_COURS,
            observation: $this->validated('observation'),
        );
    }
}
