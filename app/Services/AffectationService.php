<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\Affectation\CreateAffectationDTO;
use App\Enums\SignalementStatutEnum;
use App\Exceptions\Business\SignalementNotValidatedException;
use App\Models\Affectation;
use App\Repositories\Contracts\AffectationRepositoryInterface;
use App\Repositories\Contracts\SignalementRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final class AffectationService
{
    public function __construct(
        private readonly AffectationRepositoryInterface $repository,
        private readonly SignalementRepositoryInterface $signalementRepository,
        private readonly SignalementService $signalementService,
    ) {
    }

    public function create(CreateAffectationDTO $dto): Affectation
    {
        return DB::transaction(function () use ($dto): Affectation {
            /** @var \App\Models\Signalement $signalement */
            $signalement = $this->signalementRepository->findOrFail($dto->signalement_id);

            if (!$signalement->statut->peutEtreAffecte()) {
                throw new SignalementNotValidatedException();
            }

            /** @var Affectation $affectation */
            $affectation = $this->repository->create($dto->toArray());

            // Transition the signalement status to 'affecte' — cycle-vie-signalement.md
            $this->signalementService->transitionTo($signalement, SignalementStatutEnum::AFFECTE);

            return $affectation;
        });
    }

    public function findOrFail(int|string $id): Affectation
    {
        /** @var Affectation */
        return $this->repository->findOrFail($id);
    }

    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function delete(Affectation $affectation): bool
    {
        return $this->repository->delete($affectation);
    }
}
