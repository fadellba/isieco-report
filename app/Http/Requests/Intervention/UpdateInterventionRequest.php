<?php

declare(strict_types=1);

namespace App\Http\Requests\Intervention;

use App\DTOs\Intervention\UpdateInterventionDTO;
use App\Enums\InterventionStatutEnum;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

final class UpdateInterventionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date_heure_fin' => ['sometimes', 'date_format:Y-m-d H:i:s'],
            'statut' => ['sometimes', new Enum(InterventionStatutEnum::class)],
            'compte_rendu' => ['sometimes', 'string'],
            'observation' => ['nullable', 'string'],
            'photos' => ['sometimes', 'array'],
            'photos.*' => ['string', 'url'],
        ];
    }

    public function toDTO(): UpdateInterventionDTO
    {
        return new UpdateInterventionDTO(
            date_heure_fin: $this->validated('date_heure_fin'),
            statut: $this->filled('statut') ? InterventionStatutEnum::from($this->validated('statut')) : null,
            compte_rendu: $this->validated('compte_rendu'),
            observation: $this->validated('observation'),
            photos: $this->validated('photos', []),
        );
    }
}
