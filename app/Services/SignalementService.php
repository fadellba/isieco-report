<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\Signalement\CreateSignalementDTO;
use App\DTOs\Signalement\UpdateSignalementDTO;
use App\Enums\SignalementStatutEnum;
use App\Exceptions\Business\InvalidTransitionException;
use App\Models\Signalement;
use App\Repositories\Contracts\SignalementRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final class SignalementService
{
    public function __construct(
        private readonly SignalementRepositoryInterface $repository,
    ) {
    }

    public function create(CreateSignalementDTO $dto): Signalement
    {
        return DB::transaction(function () use ($dto): Signalement {
            /** @var Signalement $signalement */
            $signalement = $this->repository->create($dto->toArray());

            // Attach waste types with pivot data
            if (!empty($dto->type_dechets)) {
                $attachData = [];
                foreach ($dto->type_dechets as $item) {
                    $attachData[$item['type_dechet_id']] = [
                        'quantite_estime' => $item['quantite_estime'],
                        'volume_estime' => $item['volume_estime'],
                        'dangerosite' => $item['dangerosite'],
                        'remarque' => $item['remarque'] ?? null,
                    ];
                }
                $signalement->typeDechets()->attach($attachData);
            }

            // Create photos
            if (!empty($dto->photos)) {
                foreach ($dto->photos as $url) {
                    $signalement->photos()->create([
                        'url' => $url,
                    ]);
                }
            }

            return $signalement->load(['typeDechets', 'photos']);
        });
    }

    public function update(Signalement $signalement, UpdateSignalementDTO $dto): Signalement
    {
        return DB::transaction(function () use ($signalement, $dto): Signalement {
            if ($dto->statut !== null && $dto->statut !== $signalement->statut) {
                $this->validateTransition($signalement->statut, $dto->statut);
            }

            /** @var Signalement */
            return $this->repository->update($signalement, $dto->toArray());
        });
    }

    public function transitionTo(Signalement $signalement, SignalementStatutEnum $newStatut): Signalement
    {
        return DB::transaction(function () use ($signalement, $newStatut): Signalement {
            if ($signalement->statut !== $newStatut) {
                $this->validateTransition($signalement->statut, $newStatut);
                /** @var Signalement */
                return $this->repository->update($signalement, ['statut' => $newStatut->value]);
            }
            return $signalement;
        });
    }

    private function validateTransition(SignalementStatutEnum $current, SignalementStatutEnum $next): void
    {
        $allowed = $current->transitionsAutorisees();
        if (!in_array($next, $allowed, true)) {
            throw new InvalidTransitionException($current->value, $next->value);
        }
    }

    public function findOrFail(int|string $id): Signalement
    {
        /** @var Signalement */
        return $this->repository->findOrFail($id);
    }

    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function delete(Signalement $signalement): bool
    {
        return $this->repository->delete($signalement);
    }
}
