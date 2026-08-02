<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\Intervention\CreateInterventionDTO;
use App\DTOs\Intervention\UpdateInterventionDTO;
use App\Enums\InterventionStatutEnum;
use App\Enums\SignalementStatutEnum;
use App\Exceptions\Business\InvalidTransitionException;
use App\Models\Intervention;
use App\Repositories\Contracts\InterventionRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final readonly class InterventionService
{
    public function __construct(
        private InterventionRepositoryInterface $repository,
        private SignalementService              $signalementService,
        private HistoriquePointService          $pointsService,
    ) {
    }

    public function create(CreateInterventionDTO $dto): Intervention
    {
        return DB::transaction(function () use ($dto): Intervention {
            $intervention = $this->repository->create(
                $dto->toArray()
            );

            $signalement = $intervention
                ->load('affectation.signalement')
                ->affectation
                ->signalement;

            if ($signalement->statut !== SignalementStatutEnum::AFFECTE) {
                throw new InvalidTransitionException(
                    $signalement->statut->value,
                    SignalementStatutEnum::EN_INTERVENTION->value
                );
            }

            $this->signalementService->transitionTo(
                $signalement,
                SignalementStatutEnum::EN_INTERVENTION
            );

            return $intervention->load([
                'affectation',
                'photos',
            ]);
        });
    }

    public function update(
        Intervention $intervention,
        UpdateInterventionDTO $dto
    ): Intervention {
        return DB::transaction(function () use ($intervention, $dto): \Illuminate\Database\Eloquent\Model {
            $updated = $this->repository->update(
                $intervention,
                $dto->toArray()
            );

            if (!empty($dto->photos)) {
                foreach ($dto->photos as $url) {
                    $updated->photos()->create([
                        'url' => $url,
                    ]);
                }
            }

            $signalement = $updated
                ->load('affectation.signalement')
                ->affectation
                ->signalement;

            if ($dto->statut === InterventionStatutEnum::TERMINEE) {
                $this->signalementService->transitionTo(
                    $signalement,
                    SignalementStatutEnum::TERMINE
                );
            }

            return $updated->load('photos');
        });
    }

    public function cloturer(Intervention $intervention): Intervention
    {
        return DB::transaction(function () use ($intervention): Intervention {
            $signalement = $intervention
                ->load('affectation.signalement')
                ->affectation
                ->signalement;

            $this->signalementService->transitionTo(
                $signalement,
                SignalementStatutEnum::CLOTURE
            );

            $this->pointsService->awardPoints(
                $signalement->user_id,
                100,
                'Signalement clôturé',
                "Points attribués pour la résolution du signalement #{$signalement->id}"
            );

            return $intervention;
        });
    }

    public function findOrFail(int|string $id): \Illuminate\Database\Eloquent\Model
    {
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
