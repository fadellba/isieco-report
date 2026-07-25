<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\Intervention\CreateInterventionDTO;
use App\DTOs\Intervention\UpdateInterventionDTO;
use App\Enums\InterventionStatutEnum;
use App\Enums\SignalementStatutEnum;
use App\Models\Intervention;
use App\Repositories\Contracts\InterventionRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final class InterventionService
{
    public function __construct(
        private readonly InterventionRepositoryInterface $repository,
        private readonly SignalementService $signalementService,
        private readonly HistoriquePointService $pointsService,
    ) {
    }

    public function create(CreateInterventionDTO $dto): Intervention
    {
        return DB::transaction(function () use ($dto): Intervention {
            /** @var Intervention $intervention */
            $intervention = $this->repository->create($dto->toArray());

            // Transition the signalement status to 'en_intervention'
            $signalement = $intervention->affectation->signalement;
            $this->signalementService->transitionTo($signalement, SignalementStatutEnum::EN_INTERVENTION);

            return $intervention;
        });
    }

    public function update(Intervention $intervention, UpdateInterventionDTO $dto): Intervention
    {
        return DB::transaction(function () use ($intervention, $dto): Intervention {
            /** @var Intervention $updated */
            $updated = $this->repository->update($intervention, $dto->toArray());

            // Add photos if provided
            if (!empty($dto->photos)) {
                foreach ($dto->photos as $url) {
                    $updated->photos()->create([
                        'url' => $url,
                    ]);
                }
            }

            $signalement = $updated->affectation->signalement;

            // If intervention is finished, signalement is transitioned to 'termine'
            if ($dto->statut === InterventionStatutEnum::TERMINEE) {
                $this->signalementService->transitionTo($signalement, SignalementStatutEnum::TERMINE);
            }

            return $updated->load('photos');
        });
    }

    public function cloturer(Intervention $intervention): Intervention
    {
        return DB::transaction(function () use ($intervention): Intervention {
            $signalement = $intervention->affectation->signalement;

            // Transition the signalement to 'cloture'
            $this->signalementService->transitionTo($signalement, SignalementStatutEnum::CLOTURE);

            // Award 100 points to the citizen who created the signalement (RG34, RG35)
            $this->pointsService->awardPoints(
                $signalement->user_id,
                100,
                'Signalement clôturé',
                "Points attribués pour la résolution du signalement #{$signalement->id}"
            );

            return $intervention;
        });
    }

    public function findOrFail(int|string $id): Intervention
    {
        /** @var Intervention */
        return $this->repository->findOrFail($id);
    }

    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function delete(Intervention $intervention): bool
    {
        return $this->repository->delete($intervention);
    }
}
